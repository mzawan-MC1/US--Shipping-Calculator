-- ==============================================================================
-- Migration: 20260917233000_enforce_tariffs_and_rule_governance.sql
-- Description:
-- 1. Add rule_key and unique active index to quotation_rules
-- 2. Server-side HTML sanitization function with strict tag allowlist and no attributes
-- 3. Atomic quotation rule revision RPC (revise_quotation_rule_v1) & creation RPC
-- 4. Seed surcharge_rules for non-runner, salvage, and electric vehicle
-- 5. Updated calculate_shipping_quote_v1(input_json JSONB):
--    - Remove all hardcoded pricing fallbacks (no 1250 ocean freight, no 350-550 towing)
--    - Return controlled business errors on missing tariffs
--    - Server-side validation of towing inputs
--    - Fix location snapshots: real fields, city is NULL (no city column), never UUID
-- ==============================================================================

-- 1. Add rule_key column to quotation_rules and guarantee single active version
ALTER TABLE public.quotation_rules ADD COLUMN IF NOT EXISTS rule_key TEXT;

UPDATE public.quotation_rules
SET rule_key = lower(regexp_replace(title_en, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE rule_key IS NULL;

ALTER TABLE public.quotation_rules ALTER COLUMN rule_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_rules_unique_active_key
ON public.quotation_rules (rule_key)
WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_quotation_rules_key_version
ON public.quotation_rules (rule_key, version);

-- 2. Server-side HTML sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_rule_html(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_cleaned TEXT;
BEGIN
    IF p_input IS NULL THEN
        RETURN NULL;
    END IF;

    v_cleaned := p_input;

    -- Strip dangerous block tags completely along with their inner contents
    v_cleaned := regexp_replace(v_cleaned, '(?i)<script[^>]*>.*?</script>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<style[^>]*>.*?</style>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<iframe[^>]*>.*?</iframe>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<form[^>]*>.*?</form>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<object[^>]*>.*?</object>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<embed[^>]*>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<img[^>]*>', '', 'g');
    v_cleaned := regexp_replace(v_cleaned, '(?i)<a[^>]*>.*?</a>', '', 'g');

    -- Strip any tags NOT in the strict allowlist: p, br, strong, b, em, i, u, h2, h3, h4, ul, ol, li
    v_cleaned := regexp_replace(v_cleaned, '(?i)<(?!(?:/?(?:p|br|strong|b|em|i|u|h2|h3|h4|ul|ol|li)\b))[^>]*>', '', 'g');

    -- Strip all attributes from allowed tags so no style, class, onclick, etc. remain
    v_cleaned := regexp_replace(v_cleaned, '(?i)<(p|strong|b|em|i|u|h2|h3|h4|ul|ol|li)\s+[^>]*>', '<\1>', 'g');

    -- Clean br tags
    v_cleaned := regexp_replace(v_cleaned, '(?i)<br\s*[^>]*>', '<br>', 'g');

    RETURN TRIM(v_cleaned);
END;
$$;

-- 3. Atomic Rule Revision RPC
CREATE OR REPLACE FUNCTION public.revise_quotation_rule_v1(
    p_rule_id UUID,
    p_title_en TEXT,
    p_title_ar TEXT DEFAULT NULL,
    p_content_en TEXT DEFAULT '',
    p_content_ar TEXT DEFAULT NULL,
    p_display_order INT DEFAULT 1,
    p_effective_from DATE DEFAULT CURRENT_DATE,
    p_effective_until DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_user_id UUID;
    v_current_rule RECORD;
    v_next_version INT;
    v_new_rule_id UUID;
    v_clean_content_en TEXT;
    v_clean_content_ar TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT (public.has_permission('pricing.manage') OR public.has_permission('cms.manage')) THEN
        RAISE EXCEPTION 'Permission denied. You do not have permission to manage quotation rules.';
    END IF;

    -- Lock current rule row
    SELECT * INTO v_current_rule
    FROM public.quotation_rules
    WHERE id = p_rule_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation rule not found.';
    END IF;

    IF v_current_rule.is_archived THEN
        RAISE EXCEPTION 'Cannot revise an archived quotation rule.';
    END IF;

    -- Compute next version
    SELECT COALESCE(MAX(version), v_current_rule.version, 0) + 1
    INTO v_next_version
    FROM public.quotation_rules
    WHERE rule_key = v_current_rule.rule_key;

    -- Sanitize content
    v_clean_content_en := public.sanitize_rule_html(p_content_en);
    v_clean_content_ar := public.sanitize_rule_html(p_content_ar);

    -- Archive existing version
    UPDATE public.quotation_rules
    SET is_active = false,
        is_archived = true,
        effective_to = CURRENT_DATE,
        effective_until = CURRENT_DATE,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_current_rule.id;

    -- Insert new active version
    INSERT INTO public.quotation_rules (
        rule_key,
        title_en,
        title_ar,
        content_en,
        content_ar,
        display_order,
        is_active,
        is_archived,
        effective_from,
        effective_to,
        effective_until,
        version,
        created_at,
        updated_at,
        updated_by
    ) VALUES (
        v_current_rule.rule_key,
        TRIM(p_title_en),
        NULLIF(TRIM(p_title_ar), ''),
        v_clean_content_en,
        v_clean_content_ar,
        COALESCE(p_display_order, v_current_rule.display_order),
        true,
        false,
        COALESCE(p_effective_from, CURRENT_DATE),
        p_effective_until,
        p_effective_until,
        v_next_version,
        NOW(),
        NOW(),
        v_user_id
    )
    RETURNING id INTO v_new_rule_id;

    -- Audit trail
    INSERT INTO public.audit_events (
        performed_by,
        action,
        entity_table,
        entity_id,
        old_data,
        new_data
    ) VALUES (
        v_user_id,
        'update',
        'quotation_rules',
        v_new_rule_id,
        row_to_json(v_current_rule)::JSONB,
        jsonb_build_object(
            'id', v_new_rule_id,
            'rule_key', v_current_rule.rule_key,
            'version', v_next_version,
            'archived_version', v_current_rule.version,
            'archived_rule_id', v_current_rule.id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'old_rule_id', v_current_rule.id,
        'new_rule_id', v_new_rule_id,
        'rule_key', v_current_rule.rule_key,
        'version', v_next_version
    );
END;
$$;

-- Atomic Rule Creation RPC
CREATE OR REPLACE FUNCTION public.create_quotation_rule_v1(
    p_title_en TEXT,
    p_title_ar TEXT DEFAULT NULL,
    p_content_en TEXT DEFAULT '',
    p_content_ar TEXT DEFAULT NULL,
    p_display_order INT DEFAULT 1,
    p_effective_from DATE DEFAULT CURRENT_DATE,
    p_effective_until DATE DEFAULT NULL,
    p_rule_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_user_id UUID;
    v_rule_key TEXT;
    v_new_rule_id UUID;
    v_clean_content_en TEXT;
    v_clean_content_ar TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT (public.has_permission('pricing.manage') OR public.has_permission('cms.manage')) THEN
        RAISE EXCEPTION 'Permission denied. You do not have permission to manage quotation rules.';
    END IF;

    v_rule_key := COALESCE(NULLIF(TRIM(p_rule_key), ''), lower(regexp_replace(TRIM(p_title_en), '[^a-zA-Z0-9]+', '_', 'g')));
    
    v_clean_content_en := public.sanitize_rule_html(p_content_en);
    v_clean_content_ar := public.sanitize_rule_html(p_content_ar);

    INSERT INTO public.quotation_rules (
        rule_key,
        title_en,
        title_ar,
        content_en,
        content_ar,
        display_order,
        is_active,
        is_archived,
        effective_from,
        effective_to,
        effective_until,
        version,
        created_at,
        updated_at,
        updated_by
    ) VALUES (
        v_rule_key,
        TRIM(p_title_en),
        NULLIF(TRIM(p_title_ar), ''),
        v_clean_content_en,
        v_clean_content_ar,
        p_display_order,
        true,
        false,
        COALESCE(p_effective_from, CURRENT_DATE),
        p_effective_until,
        p_effective_until,
        1,
        NOW(),
        NOW(),
        v_user_id
    )
    RETURNING id INTO v_new_rule_id;

    RETURN jsonb_build_object(
        'success', true,
        'rule_id', v_new_rule_id,
        'rule_key', v_rule_key,
        'version', 1
    );
END;
$$;

-- Secure revision and creation RPCs
REVOKE ALL ON FUNCTION public.revise_quotation_rule_v1(UUID, TEXT, TEXT, TEXT, TEXT, INT, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revise_quotation_rule_v1(UUID, TEXT, TEXT, TEXT, TEXT, INT, DATE, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.create_quotation_rule_v1(TEXT, TEXT, TEXT, TEXT, INT, DATE, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quotation_rule_v1(TEXT, TEXT, TEXT, TEXT, INT, DATE, DATE, TEXT) TO authenticated;

-- 4. Seed database surcharge rules if not present
INSERT INTO public.surcharge_rules (
    name, vehicle_category_id, powertrain_id, vehicle_condition_id, charge_type, amount, currency, is_active
)
SELECT 'Non-Runner Vehicle Surcharge', NULL, NULL, 'non_runner', 'fixed', 150.00, 'USD', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.surcharge_rules WHERE vehicle_condition_id = 'non_runner'
);

INSERT INTO public.surcharge_rules (
    name, vehicle_category_id, powertrain_id, vehicle_condition_id, charge_type, amount, currency, is_active
)
SELECT 'Salvage / Damaged Vehicle Surcharge', NULL, NULL, 'salvage_damaged', 'fixed', 250.00, 'USD', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.surcharge_rules WHERE vehicle_condition_id = 'salvage_damaged'
);

INSERT INTO public.surcharge_rules (
    name, vehicle_category_id, powertrain_id, vehicle_condition_id, charge_type, amount, currency, is_active
)
SELECT 'Electric Vehicle (EV) Handling Surcharge', NULL, 'electric', NULL, 'fixed', 200.00, 'USD', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.surcharge_rules WHERE powertrain_id = 'electric'
);

-- 5. Authoritative calculate_shipping_quote_v1 with zero fabricated fallbacks
CREATE OR REPLACE FUNCTION public.calculate_shipping_quote_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_customer_name TEXT;
    v_phone TEXT;
    v_phone_clean TEXT;
    v_email TEXT;
    v_country TEXT;
    v_city TEXT;
    
    v_origin_port_id UUID;
    v_destination_port_id UUID;
    v_vehicle_category_id TEXT;
    v_powertrain_id TEXT;
    v_condition_id TEXT;
    v_shipping_method_id TEXT;
    v_purchase_source_id TEXT;
    v_purchase_location_id UUID;
    v_include_inland_towing BOOLEAN := true;
    v_declared_value_usd NUMERIC(12, 2);
    v_make TEXT;
    v_model TEXT;
    v_year INT;
    v_vin TEXT;
    v_lot_number TEXT;
    v_listing_url TEXT;
    v_notes TEXT;
    v_idempotency_key TEXT;

    v_origin_port RECORD;
    v_dest_port RECORD;
    v_origin_country RECORD;
    v_dest_country RECORD;
    v_route RECORD;
    v_freight_record RECORD;
    v_towing_record RECORD;
    v_purchase_location RECORD;
    v_category RECORD;
    v_powertrain RECORD;
    v_condition RECORD;
    v_purchase_source RECORD;
    v_shipping_method RECORD;

    v_category_name TEXT := 'Sedan';
    v_powertrain_name TEXT := 'Petrol';
    v_condition_name TEXT := 'Operable';
    v_purchase_source_name TEXT := 'Direct Purchase / Dealer';
    v_shipping_method_name TEXT := 'Consolidated Shared Container (LCL)';
    v_purchase_location_name TEXT := NULL;
    v_purchase_location_city TEXT := NULL;
    v_purchase_location_state TEXT := NULL;

    v_exchange_rate NUMERIC(10, 5) := 3.6725;
    v_ocean_freight NUMERIC(12, 2) := 0.00;
    v_towing_min NUMERIC(12, 2) := 0.00;
    v_towing_max NUMERIC(12, 2) := 0.00;
    v_is_towing_range BOOLEAN := false;
    v_towing_description TEXT := 'Inland Towing: Not requested ($0.00)';
    
    v_surcharges_total NUMERIC(12, 2) := 0.00;
    v_customs_clearance_fee NUMERIC(12, 2) := 150.00;
    v_port_handling_fee NUMERIC(12, 2) := 200.00;

    v_cif_min NUMERIC(12, 2);
    v_cif_max NUMERIC(12, 2);
    v_duty_min NUMERIC(12, 2);
    v_duty_max NUMERIC(12, 2);
    v_vat_base_min NUMERIC(12, 2);
    v_vat_base_max NUMERIC(12, 2);
    v_vat_min NUMERIC(12, 2);
    v_vat_max NUMERIC(12, 2);

    v_total_usd_min NUMERIC(12, 2);
    v_total_usd_max NUMERIC(12, 2);
    v_total_aed_min NUMERIC(12, 2);
    v_total_aed_max NUMERIC(12, 2);

    v_customer_id UUID;
    v_existing_customer RECORD;
    v_vehicle_id UUID;
    v_enquiry_id UUID;
    v_quotation_id UUID;
    v_enquiry_ref TEXT;
    v_quote_ref TEXT;
    v_existing_quote RECORD;
    v_pricing_snapshot JSONB;
    v_line_items JSONB := '[]'::JSONB;
    v_rules_snapshot JSONB := '[]'::JSONB;
    v_disclaimer TEXT;
BEGIN
    -- 1. Validate customer inputs
    v_customer_name := TRIM(COALESCE(input_json->>'customer_name', ''));
    v_country := NULLIF(UPPER(TRIM(COALESCE(input_json->>'country', input_json->>'country_code', 'ARE'))), '');
    v_city := NULLIF(TRIM(COALESCE(input_json->>'city', '')), '');
    v_phone := TRIM(COALESCE(input_json->>'phone', ''));
    v_phone_clean := public.normalize_phone(v_phone, v_country);
    v_email := NULLIF(LOWER(TRIM(COALESCE(input_json->>'email', ''))), '');

    IF LENGTH(v_customer_name) < 2 THEN
        RAISE EXCEPTION 'Customer full name is required (minimum 2 characters).';
    END IF;

    IF v_phone_clean IS NULL OR LENGTH(v_phone_clean) < 7 THEN
        RAISE EXCEPTION 'Customer phone number is required and must contain at least 7 digits.';
    END IF;

    -- 2. Idempotency check with caller-ownership validation
    v_idempotency_key := NULLIF(TRIM(input_json->>'idempotency_key'), '');
    IF v_idempotency_key IS NOT NULL THEN
        SELECT q.*, e.reference_number AS enquiry_reference, c.phone AS customer_phone, c.country AS customer_country
        INTO v_existing_quote
        FROM public.quotations q
        JOIN public.enquiries e ON q.enquiry_id = e.id
        JOIN public.customers c ON e.customer_id = c.id
        WHERE q.idempotency_key = v_idempotency_key;

        IF FOUND THEN
            IF public.normalize_phone(v_existing_quote.customer_phone, v_existing_quote.customer_country) = v_phone_clean THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'is_idempotent_replay', true,
                    'quotation_id', v_existing_quote.id,
                    'quotation_reference', v_existing_quote.reference_number,
                    'enquiry_reference', v_existing_quote.enquiry_reference,
                    'snapshot', v_existing_quote.pricing_snapshot
                );
            ELSE
                v_idempotency_key := v_idempotency_key || '-' || gen_random_uuid()::text;
            END IF;
        END IF;
    END IF;

    -- 3. Vehicle & Port Inputs
    v_make := NULLIF(TRIM(COALESCE(input_json->>'make', '')), '');
    v_model := NULLIF(TRIM(COALESCE(input_json->>'model', '')), '');
    v_year := (input_json->>'year')::INT;
    v_vin := NULLIF(UPPER(TRIM(COALESCE(input_json->>'vin', ''))), '');
    v_lot_number := NULLIF(TRIM(COALESCE(input_json->>'lot_number', '')), '');
    v_listing_url := NULLIF(TRIM(COALESCE(input_json->>'listing_url', '')), '');
    v_notes := NULLIF(TRIM(COALESCE(input_json->>'notes', '')), '');

    BEGIN
        v_origin_port_id := (input_json->>'origin_port_id')::UUID;
        v_destination_port_id := (input_json->>'destination_port_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid UUID provided for origin or destination port.';
    END;

    v_vehicle_category_id := COALESCE(input_json->>'vehicle_category_id', 'sedan');
    v_powertrain_id := COALESCE(input_json->>'powertrain_id', 'petrol');
    v_condition_id := COALESCE(input_json->>'condition_id', 'operable');
    v_shipping_method_id := COALESCE(input_json->>'shipping_method_id', 'consolidated_container');
    v_purchase_source_id := NULLIF(TRIM(COALESCE(input_json->>'purchase_source_id', '')), '');

    -- Parse towing flag
    IF (input_json->>'include_inland_towing') IS NOT NULL THEN
        v_include_inland_towing := (input_json->>'include_inland_towing')::BOOLEAN;
    ELSE
        v_include_inland_towing := ((input_json->>'purchase_location_id') IS NOT NULL AND TRIM(input_json->>'purchase_location_id') != '');
    END IF;

    -- Server-side validation of inland towing inputs
    IF v_include_inland_towing THEN
        IF (input_json->>'purchase_location_id') IS NULL OR TRIM(input_json->>'purchase_location_id') = '' THEN
            RAISE EXCEPTION 'Purchase location is required when inland towing is requested.';
        END IF;

        BEGIN
            v_purchase_location_id := (input_json->>'purchase_location_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid purchase location identifier provided.';
        END;

        SELECT * INTO v_purchase_location
        FROM public.purchase_locations
        WHERE id = v_purchase_location_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected pickup location does not exist or is inactive.';
        END IF;

        v_purchase_location_name := v_purchase_location.name;
        v_purchase_location_city := NULL; -- No city column in purchase_locations table
        v_purchase_location_state := v_purchase_location.state_code;
        
        IF v_purchase_location.purchase_source_id IS NOT NULL THEN
            SELECT name INTO v_purchase_source_name
            FROM public.purchase_sources
            WHERE id = v_purchase_location.purchase_source_id;
        END IF;
    ELSE
        -- When towing is disabled, explicitly clear purchase location
        v_purchase_location_id := NULL;
        v_purchase_location_name := 'Not requested';
        v_purchase_location_city := NULL;
        v_purchase_location_state := NULL;
        v_towing_min := 0.00;
        v_towing_max := 0.00;
        v_is_towing_range := false;
        v_towing_description := 'Inland Towing: Not requested ($0.00)';
    END IF;

    v_declared_value_usd := COALESCE((input_json->>'declared_value_usd')::NUMERIC, 0.00);
    IF v_declared_value_usd < 0 THEN
        RAISE EXCEPTION 'Vehicle declared value cannot be negative.';
    END IF;

    -- 4. Authoritative Ports & Countries Lookup
    SELECT * INTO v_origin_port
    FROM public.ports
    WHERE id = v_origin_port_id AND is_active = true AND is_loading_port = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Origin loading port not found or inactive.';
    END IF;

    SELECT * INTO v_dest_port
    FROM public.ports
    WHERE id = v_destination_port_id AND is_active = true AND is_destination_port = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination port not found or inactive.';
    END IF;

    SELECT * INTO v_origin_country
    FROM public.countries
    WHERE code = v_origin_port.country_code;

    SELECT * INTO v_dest_country
    FROM public.countries
    WHERE code = v_dest_port.country_code;

    SELECT * INTO v_category
    FROM public.vehicle_categories
    WHERE id = v_vehicle_category_id;
    IF FOUND THEN
        v_category_name := v_category.name;
    END IF;

    SELECT * INTO v_powertrain
    FROM public.powertrains
    WHERE id = v_powertrain_id;
    IF FOUND THEN
        v_powertrain_name := v_powertrain.name;
    END IF;

    SELECT * INTO v_condition
    FROM public.vehicle_conditions
    WHERE id = v_condition_id;
    IF FOUND THEN
        v_condition_name := v_condition.name;
    END IF;

    IF v_purchase_source_id IS NOT NULL THEN
        SELECT * INTO v_purchase_source
        FROM public.purchase_sources
        WHERE id = v_purchase_source_id;
        IF FOUND THEN
            v_purchase_source_name := v_purchase_source.name;
        END IF;
    END IF;

    SELECT * INTO v_shipping_method
    FROM public.shipping_methods
    WHERE id = v_shipping_method_id;
    IF FOUND THEN
        v_shipping_method_name := v_shipping_method.name;
    END IF;

    -- 5. Shipping Route Lookup
    SELECT * INTO v_route
    FROM public.shipping_routes
    WHERE origin_port_id = v_origin_port_id
      AND destination_port_id = v_destination_port_id
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active shipping route exists between % and %.', v_origin_port.name, v_dest_port.name;
    END IF;

    -- 6. Freight Tariff Lookup (NO FABRICATED FALLBACK)
    SELECT * INTO v_freight_record
    FROM public.route_freight_rates
    WHERE route_id = v_route.id
      AND shipping_method_id = v_shipping_method_id
      AND vehicle_category_id = v_vehicle_category_id
      AND (powertrain_id = v_powertrain_id OR powertrain_id = 'petrol')
      AND is_active = true
      AND effective_from <= CURRENT_DATE
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    ORDER BY (CASE WHEN powertrain_id = v_powertrain_id THEN 0 ELSE 1 END)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active ocean freight tariff is configured for this route, vehicle category, powertrain and shipping method. Please contact us for assistance.';
    END IF;

    v_ocean_freight := v_freight_record.base_amount;

    -- 7. Inland Towing Tariff Lookup (NO FABRICATED FALLBACK)
    IF v_include_inland_towing THEN
        SELECT * INTO v_towing_record
        FROM public.towing_rates
        WHERE purchase_location_id = v_purchase_location_id
          AND loading_port_id = v_origin_port_id
          AND is_active = true
          AND (vehicle_category_id IS NULL OR vehicle_category_id = v_vehicle_category_id)
          AND (vehicle_condition_id IS NULL OR vehicle_condition_id = v_condition_id)
        ORDER BY vehicle_category_id NULLS LAST, vehicle_condition_id NULLS LAST
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No inland towing tariff is configured for the selected pickup location and loading port. Please contact us for assistance.';
        END IF;

        IF v_towing_record.rate_type = 'fixed' THEN
            v_towing_min := v_towing_record.fixed_amount;
            v_towing_max := v_towing_record.fixed_amount;
            v_is_towing_range := false;
            v_towing_description := 'Inland Towing (' || v_purchase_location_name || ' to ' || v_origin_port.name || ')';
        ELSE
            v_towing_min := v_towing_record.min_amount;
            v_towing_max := v_towing_record.max_amount;
            v_is_towing_range := true;
            v_towing_description := 'Inland Towing (' || v_purchase_location_name || ' to ' || v_origin_port.name || ' - Estimated range)';
        END IF;
    END IF;

    -- 8. Surcharges from Active Database Surcharge Rules (NO HARDCODED SURCHARGES)
    SELECT COALESCE(SUM(amount), 0.00) INTO v_surcharges_total
    FROM public.surcharge_rules
    WHERE is_active = true
      AND (
        (vehicle_condition_id = v_condition_id AND powertrain_id IS NULL AND vehicle_category_id IS NULL)
        OR (powertrain_id = v_powertrain_id AND vehicle_condition_id IS NULL AND vehicle_category_id IS NULL)
        OR (vehicle_category_id = v_vehicle_category_id AND vehicle_condition_id IS NULL AND powertrain_id IS NULL)
        OR (vehicle_condition_id = v_condition_id AND powertrain_id = v_powertrain_id)
      );

    -- 9. Exchange Rate
    SELECT rate INTO v_exchange_rate
    FROM public.exchange_rates
    WHERE from_currency = 'USD' AND to_currency = 'AED' AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
        v_exchange_rate := 3.6725;
    END IF;

    -- 10. Calculations (Statutory UAE Customs Duty & VAT):
    -- CIF = vehicle purchase price + eligible shipping/freight + insurance
    v_cif_min := ROUND(v_declared_value_usd + v_ocean_freight + v_surcharges_total + v_towing_min, 2);
    v_cif_max := ROUND(v_declared_value_usd + v_ocean_freight + v_surcharges_total + v_towing_max, 2);

    -- Customs duty = 5% x CIF
    v_duty_min := ROUND(v_cif_min * 0.05, 2);
    v_duty_max := ROUND(v_cif_max * 0.05, 2);

    -- VAT taxable value = CIF + customs duty
    v_vat_base_min := ROUND(v_cif_min + v_duty_min, 2);
    v_vat_base_max := ROUND(v_cif_max + v_duty_max, 2);

    -- UAE import VAT = 5% x VAT taxable value
    v_vat_min := ROUND(v_vat_base_min * 0.05, 2);
    v_vat_max := ROUND(v_vat_base_max * 0.05, 2);

    -- Total shipping & clearance charges payable (Excluding declared vehicle purchase price):
    v_total_usd_min := ROUND(
        v_ocean_freight + v_towing_min + v_surcharges_total + 
        v_customs_clearance_fee + v_port_handling_fee + 
        v_duty_min + v_vat_min, 2
    );

    v_total_usd_max := ROUND(
        v_ocean_freight + v_towing_max + v_surcharges_total + 
        v_customs_clearance_fee + v_port_handling_fee + 
        v_duty_max + v_vat_max, 2
    );

    v_total_aed_min := ROUND(v_total_usd_min * v_exchange_rate, 2);
    v_total_aed_max := ROUND(v_total_usd_max * v_exchange_rate, 2);

    IF v_is_towing_range THEN
        v_disclaimer := 'Inland towing is presented as an estimated bracket. Final towing charge is subject to confirmation based on exact vehicle condition, location access, and carrier availability. Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation.';
    ELSE
        v_disclaimer := 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation. Quotation is valid for 14 days and subject to carrier bunker adjustments.';
    END IF;

    v_enquiry_ref := 'ENQ-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
    v_quote_ref := 'QT-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));

    -- 11. Financial Line Items
    v_line_items := jsonb_build_array(
        jsonb_build_object(
            'category', 'ocean_freight',
            'description', 'Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')',
            'amount_usd', v_ocean_freight
        ),
        jsonb_build_object(
            'category', 'inland_towing',
            'description', v_towing_description,
            'amount_usd_min', v_towing_min,
            'amount_usd_max', v_towing_max,
            'is_range', v_is_towing_range,
            'is_requested', v_include_inland_towing
        ),
        jsonb_build_object(
            'category', 'customs_clearance',
            'description', 'UAE Customs Clearance & Documentation',
            'amount_usd', v_customs_clearance_fee
        ),
        jsonb_build_object(
            'category', 'port_handling',
            'description', 'Port & Terminal Handling Charges',
            'amount_usd', v_port_handling_fee
        ),
        jsonb_build_object(
            'category', 'customs_duty',
            'description', 'UAE Customs Duty (5% of CIF)',
            'amount_usd_min', v_duty_min,
            'amount_usd_max', v_duty_max
        ),
        jsonb_build_object(
            'category', 'import_vat',
            'description', 'UAE Import VAT (5% of VAT Base)',
            'amount_usd_min', v_vat_min,
            'amount_usd_max', v_vat_max
        )
    );

    IF v_surcharges_total > 0 THEN
        v_line_items := jsonb_insert(
            v_line_items,
            '{2}',
            jsonb_build_object('category', 'surcharges', 'description', 'Vehicle Condition & Fuel Surcharges', 'amount_usd', v_surcharges_total)
        );
    END IF;

    -- 12. Active Quotation Rules Snapshot
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'rule_key', r.rule_key,
                'title_en', r.title_en,
                'title_ar', r.title_ar,
                'content_en', r.content_en,
                'content_ar', r.content_ar,
                'display_order', r.display_order,
                'version', r.version
            ) ORDER BY r.display_order ASC
        ),
        '[]'::JSONB
    )
    INTO v_rules_snapshot
    FROM public.quotation_rules r
    WHERE r.is_active = true 
      AND r.is_archived = false 
      AND r.effective_from <= CURRENT_DATE 
      AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE);

    -- 13. Comprehensive Immutable Pricing Snapshot
    v_pricing_snapshot := jsonb_build_object(
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'calculation_timestamp', NOW(),
        'calculation_engine_version', 'v2',
        'customer', jsonb_build_object(
            'full_name', v_customer_name,
            'phone', v_phone_clean,
            'email', v_email,
            'country', v_country,
            'city', v_city
        ),
        'vehicle', jsonb_build_object(
            'category_id', v_vehicle_category_id,
            'category_name', v_category_name,
            'powertrain_id', v_powertrain_id,
            'powertrain_name', v_powertrain_name,
            'condition_id', v_condition_id,
            'condition_name', v_condition_name,
            'make', v_make,
            'model', v_model,
            'year', v_year,
            'vin', v_vin,
            'lot_number', v_lot_number,
            'listing_url', v_listing_url,
            'declared_value_usd', v_declared_value_usd,
            'purchase_source_id', v_purchase_source_id,
            'purchase_source_name', v_purchase_source_name
        ),
        'route', jsonb_build_object(
            'route_id', v_route.id,
            'origin_port_id', v_origin_port.id,
            'origin_port_name', v_origin_port.name,
            'origin_port_name_ar', v_origin_port.name_ar,
            'origin_port_state', v_origin_port.state_or_city,
            'origin_port_code', v_origin_port.code,
            'origin_country_code', v_origin_port.country_code,
            'origin_country_name', COALESCE(v_origin_country.name, 'United States'),
            'origin_country_name_ar', COALESCE(v_origin_country.name_ar, 'الولايات المتحدة الأمريكية'),
            'destination_port_id', v_dest_port.id,
            'destination_port_name', v_dest_port.name,
            'destination_port_name_ar', v_dest_port.name_ar,
            'destination_port_state', v_dest_port.state_or_city,
            'destination_port_code', v_dest_port.code,
            'destination_country_code', v_dest_port.country_code,
            'destination_country_name', COALESCE(v_dest_country.name, 'United Arab Emirates'),
            'destination_country_name_ar', COALESCE(v_dest_country.name_ar, 'الإمارات العربية المتحدة'),
            'shipping_method_id', v_shipping_method_id,
            'shipping_method_name', v_shipping_method_name,
            'transit_days_min', v_route.transit_days_min,
            'transit_days_max', v_route.transit_days_max
        ),
        'towing', jsonb_build_object(
            'is_requested', v_include_inland_towing,
            'location_id', v_purchase_location_id,
            'location_name', CASE 
                WHEN NOT v_include_inland_towing THEN 'Not requested'
                WHEN v_purchase_location_name IS NOT NULL THEN v_purchase_location_name
                ELSE 'Location unavailable'
            END,
            'city', NULL,
            'state_code', CASE WHEN v_include_inland_towing THEN v_purchase_location_state ELSE NULL END,
            'source_name', CASE WHEN v_include_inland_towing THEN v_purchase_source_name ELSE NULL END,
            'fee_min', v_towing_min,
            'fee_max', v_towing_max,
            'is_range', v_is_towing_range,
            'description', v_towing_description
        ),
        'financials', jsonb_build_object(
            'currency', 'USD',
            'exchange_rate', v_exchange_rate,
            'declared_value_usd', v_declared_value_usd,
            'include_inland_towing', v_include_inland_towing,
            'subtotal_ocean_freight', v_ocean_freight,
            'towing_fee_min', v_towing_min,
            'towing_fee_max', v_towing_max,
            'is_towing_range', v_is_towing_range,
            'surcharges_total', v_surcharges_total,
            'ocean_and_towing_subtotal_min', v_ocean_freight + v_towing_min,
            'ocean_and_towing_subtotal_max', v_ocean_freight + v_towing_max,
            'customs_clearance_fee', v_customs_clearance_fee,
            'port_additional_charges', v_port_handling_fee,
            'destination_clearance_subtotal', v_customs_clearance_fee + v_port_handling_fee,
            'cif_value_min', v_cif_min,
            'cif_value_max', v_cif_max,
            'customs_duty_min', v_duty_min,
            'customs_duty_max', v_duty_max,
            'vat_taxable_value_min', v_vat_base_min,
            'vat_taxable_value_max', v_vat_base_max,
            'import_vat_min', v_vat_min,
            'import_vat_max', v_vat_max,
            'uae_government_charges_subtotal_min', v_duty_min + v_vat_min,
            'uae_government_charges_subtotal_max', v_duty_max + v_vat_max,
            'total_charges_usd_min', v_total_usd_min,
            'total_charges_usd_max', v_total_usd_max,
            'total_charges_aed_min', v_total_aed_min,
            'total_charges_aed_max', v_total_aed_max
        ),
        'line_items', v_line_items,
        'rules', v_rules_snapshot,
        'disclaimer', v_disclaimer
    );

    -- 14. Atomic Persistence
    SELECT * INTO v_existing_customer
    FROM public.customers
    WHERE phone = v_phone_clean
    LIMIT 1;

    IF FOUND THEN
        v_customer_id := v_existing_customer.id;
        UPDATE public.customers
        SET full_name = v_customer_name,
            email = COALESCE(v_email, email),
            country = COALESCE(v_country, country),
            city = COALESCE(v_city, city),
            updated_at = NOW()
        WHERE id = v_customer_id;
    ELSE
        INSERT INTO public.customers (full_name, phone, email, country, city)
        VALUES (v_customer_name, v_phone_clean, v_email, v_country, v_city)
        RETURNING id INTO v_customer_id;
    END IF;

    INSERT INTO public.customer_vehicles (
        customer_id, vehicle_category_id, powertrain_id, condition_id,
        make, model, year, vin, lot_number, listing_url, declared_value_usd
    ) VALUES (
        v_customer_id, v_vehicle_category_id, v_powertrain_id, v_condition_id,
        v_make, v_model, v_year, v_vin, v_lot_number, v_listing_url, v_declared_value_usd
    ) RETURNING id INTO v_vehicle_id;

    INSERT INTO public.enquiries (
        reference_number, customer_id, status, source, notes
    ) VALUES (
        v_enquiry_ref, v_customer_id, 'new', 'web_calculator', v_notes
    ) RETURNING id INTO v_enquiry_id;

    INSERT INTO public.enquiry_status_history (
        enquiry_id, old_status, new_status, notes
    ) VALUES (
        v_enquiry_id, NULL, 'new', 'Inbound calculator quote generated'
    );

    INSERT INTO public.quotations (
        reference_number, enquiry_id, version, idempotency_key, route_id,
        pricing_snapshot, currency, exchange_rate,
        subtotal_ocean_freight, towing_fee_min, towing_fee_max, is_towing_range,
        customs_clearance_fee, port_additional_charges,
        cif_value, customs_duty, vat_taxable_value, import_vat,
        total_charges_usd_min, total_charges_usd_max,
        total_charges_aed_min, total_charges_aed_max,
        disclaimer
    ) VALUES (
        v_quote_ref, v_enquiry_id, 1, v_idempotency_key, v_route.id,
        v_pricing_snapshot, 'USD', v_exchange_rate,
        v_ocean_freight, v_towing_min, v_towing_max, v_is_towing_range,
        v_customs_clearance_fee, v_port_handling_fee,
        v_cif_min, v_duty_min, v_vat_base_min, v_vat_min,
        v_total_usd_min, v_total_usd_max,
        v_total_aed_min, v_total_aed_max,
        v_disclaimer
    ) RETURNING id INTO v_quotation_id;

    INSERT INTO public.quotation_line_items (quotation_id, category, description, amount, currency)
    VALUES
        (v_quotation_id, 'ocean_freight', 'Ocean Freight Tariff (' || v_origin_port.name || ' to ' || v_dest_port.name || ')', v_ocean_freight, 'USD'),
        (v_quotation_id, 'towing', v_towing_description, v_towing_min, 'USD'),
        (v_quotation_id, 'customs_clearance', 'UAE Customs Clearance & Documentation', v_customs_clearance_fee, 'USD'),
        (v_quotation_id, 'port_handling', 'Port & Terminal Handling Charges', v_port_handling_fee, 'USD'),
        (v_quotation_id, 'customs_duty', 'UAE Customs Duty (5% of CIF)', v_duty_min, 'USD'),
        (v_quotation_id, 'import_vat', 'UAE Import VAT (5% of VAT Base)', v_vat_min, 'USD');

    IF v_surcharges_total > 0 THEN
        INSERT INTO public.quotation_line_items (quotation_id, category, description, amount, currency)
        VALUES (v_quotation_id, 'surcharges', 'Vehicle Condition & Fuel Surcharges', v_surcharges_total, 'USD');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_idempotent_replay', false,
        'quotation_id', v_quotation_id,
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'snapshot', v_pricing_snapshot
    );
END;
$$;
