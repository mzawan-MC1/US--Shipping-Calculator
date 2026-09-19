-- ==============================================================================
-- Migration: 20260919180000_anonymous_quotes_and_customer_portal_rls.sql
-- Description:
-- 1. Support anonymous price checks in calculate_shipping_quote_v1 (is_anonymous flag)
-- 2. Deduplicate customer profiles by email as unique identity when saving quotes
-- 3. Add Row Level Security (RLS) policies for authenticated customer portal access
-- 4. Add get_customer_portal_data helper RPC for customer dashboard
-- ==============================================================================

-- 1. Update calculate_shipping_quote_v1 to support is_anonymous and email deduplication
CREATE OR REPLACE FUNCTION public.calculate_shipping_quote_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_is_anonymous BOOLEAN := COALESCE((input_json->>'is_anonymous')::BOOLEAN, false);
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
    v_state_name TEXT := 'Unknown';
    v_exchange_rate NUMERIC(10, 5) := 3.6725;
    v_ocean_freight_base NUMERIC(12, 2) := 0.00;
    v_ocean_freight_adj NUMERIC(12, 2) := 0.00;
    v_ocean_freight_total NUMERIC(12, 2) := 0.00;
    v_towing_base_min NUMERIC(12, 2) := 0.00;
    v_towing_base_max NUMERIC(12, 2) := 0.00;
    v_towing_adj NUMERIC(12, 2) := 0.00;
    v_towing_total_min NUMERIC(12, 2) := 0.00;
    v_towing_total_max NUMERIC(12, 2) := 0.00;
    v_is_towing_range BOOLEAN := false;
    v_towing_description TEXT := 'Inland Towing: Not requested ($0.00)';
    v_cif_surcharges NUMERIC(12, 2) := 0.00;
    v_non_cif_vat_surcharges NUMERIC(12, 2) := 0.00;
    v_non_cif_non_vat_surcharges NUMERIC(12, 2) := 0.00;
    v_total_surcharges NUMERIC(12, 2) := 0.00;
    v_customs_clearance_fee NUMERIC(12, 2) := 0.00;
    v_port_handling_fee NUMERIC(12, 2) := 0.00;
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
    v_adj RECORD;
    v_surcharge RECORD;
    v_adj_list JSONB := '[]'::JSONB;
    v_surcharge_list JSONB := '[]'::JSONB;
BEGIN
    -- 1. Customer inputs handling
    v_country := NULLIF(UPPER(TRIM(COALESCE(input_json->>'country', input_json->>'country_code', 'ARE'))), '');
    v_city := NULLIF(TRIM(COALESCE(input_json->>'city', '')), '');
    v_email := NULLIF(LOWER(TRIM(COALESCE(input_json->>'email', ''))), '');

    IF v_is_anonymous THEN
        v_customer_name := COALESCE(NULLIF(TRIM(input_json->>'customer_name'), ''), 'Guest Inquirer');
        v_phone := COALESCE(NULLIF(TRIM(input_json->>'phone'), ''), '0000000');
        v_phone_clean := '0000000';
    ELSE
        v_customer_name := TRIM(COALESCE(input_json->>'customer_name', ''));
        v_phone := TRIM(COALESCE(input_json->>'phone', ''));
        v_phone_clean := public.normalize_phone(v_phone, v_country);

        IF LENGTH(v_customer_name) < 2 THEN
            RAISE EXCEPTION 'Customer full name is required (minimum 2 characters).';
        END IF;

        IF v_phone_clean IS NULL OR LENGTH(v_phone_clean) < 7 THEN
            RAISE EXCEPTION 'Customer phone number is required and must contain at least 7 digits.';
        END IF;
    END IF;

    -- 2. Idempotency check (only for saved quotes)
    v_idempotency_key := NULLIF(TRIM(input_json->>'idempotency_key'), '');
    IF NOT v_is_anonymous AND v_idempotency_key IS NOT NULL THEN
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

    IF (input_json->>'include_inland_towing') IS NOT NULL THEN
        v_include_inland_towing := (input_json->>'include_inland_towing')::BOOLEAN;
    ELSE
        v_include_inland_towing := ((input_json->>'purchase_location_id') IS NOT NULL AND TRIM(input_json->>'purchase_location_id') != '');
    END IF;

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
        v_purchase_location_city := v_purchase_location.city;
        v_purchase_location_state := v_purchase_location.state_code;

        SELECT name INTO v_state_name FROM public.states WHERE code = v_purchase_location.state_code;
        IF v_state_name IS NULL THEN v_state_name := 'Unknown'; END IF;

        IF v_purchase_location.purchase_source_id IS NOT NULL THEN
            SELECT name INTO v_purchase_source_name
            FROM public.purchase_sources
            WHERE id = v_purchase_location.purchase_source_id;
        END IF;
    ELSE
        v_purchase_location_id := NULL;
        v_purchase_location_name := 'Not requested';
        v_purchase_location_city := NULL;
        v_purchase_location_state := NULL;
        v_towing_base_min := 0.00;
        v_towing_base_max := 0.00;
        v_is_towing_range := false;
        v_towing_description := 'Inland Towing: Not requested ($0.00)';
    END IF;

    v_declared_value_usd := COALESCE((input_json->>'declared_value_usd')::NUMERIC, 0.00);
    IF v_declared_value_usd < 0 THEN
        RAISE EXCEPTION 'Vehicle declared value cannot be negative.';
    END IF;

    -- 4. Authoritative Ports & Countries Lookup
    SELECT * INTO v_origin_port FROM public.ports WHERE id = v_origin_port_id AND is_active = true AND is_loading_port = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Origin loading port not found or inactive.'; END IF;

    SELECT * INTO v_dest_port FROM public.ports WHERE id = v_destination_port_id AND is_active = true AND is_destination_port = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination port not found or inactive.'; END IF;

    SELECT * INTO v_origin_country FROM public.countries WHERE code = v_origin_port.country_code;
    SELECT * INTO v_dest_country FROM public.countries WHERE code = v_dest_port.country_code;

    SELECT * INTO v_category FROM public.vehicle_categories WHERE id = v_vehicle_category_id;
    IF FOUND THEN v_category_name := v_category.name; END IF;

    SELECT * INTO v_powertrain FROM public.powertrains WHERE id = v_powertrain_id;
    IF FOUND THEN v_powertrain_name := v_powertrain.name; END IF;

    SELECT * INTO v_condition FROM public.vehicle_conditions WHERE id = v_condition_id;
    IF FOUND THEN v_condition_name := v_condition.name; END IF;

    IF v_purchase_source_id IS NOT NULL THEN
        SELECT * INTO v_purchase_source FROM public.purchase_sources WHERE id = v_purchase_source_id;
        IF FOUND THEN v_purchase_source_name := v_purchase_source.name; END IF;
    END IF;

    SELECT * INTO v_shipping_method FROM public.shipping_methods WHERE id = v_shipping_method_id;
    IF FOUND THEN v_shipping_method_name := v_shipping_method.name; END IF;

    -- 5. Shipping Route Lookup
    SELECT * INTO v_route FROM public.shipping_routes WHERE origin_port_id = v_origin_port_id AND destination_port_id = v_destination_port_id AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active shipping route exists between % and %.', v_origin_port.name, v_dest_port.name; END IF;

    -- 6. Freight Tariff Lookup
    SELECT * INTO v_freight_record
    FROM public.route_freight_rates
    WHERE route_id = v_route.id
      AND shipping_method_id = v_shipping_method_id
      AND is_active = true
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active ocean freight tariff is configured for this route and shipping method. Please contact us for assistance.';
    END IF;

    v_ocean_freight_base := v_freight_record.base_amount;

    -- 7. Inland Towing Tariff
    IF v_include_inland_towing THEN
        SELECT * INTO v_towing_record
        FROM public.towing_rates
        WHERE purchase_location_id = v_purchase_location_id
          AND loading_port_id = v_origin_port_id
          AND is_active = true
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY created_at DESC
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No inland towing tariff is configured for the selected pickup location and loading port. Please contact us for assistance.';
        END IF;

        IF v_towing_record.rate_type = 'fixed' THEN
            v_towing_base_min := v_towing_record.fixed_amount;
            v_towing_base_max := v_towing_record.fixed_amount;
            v_is_towing_range := false;
            v_towing_description := 'Inland Towing (' || v_purchase_location_name || ', ' || v_state_name || ' to ' || v_origin_port.name || ')';
        ELSE
            v_towing_base_min := v_towing_record.min_amount;
            v_towing_base_max := v_towing_record.max_amount;
            v_is_towing_range := true;
            v_towing_description := 'Inland Towing (' || v_purchase_location_name || ', ' || v_state_name || ' to ' || v_origin_port.name || ' - Estimated bracket)';
        END IF;
    END IF;

    -- 8. Surcharges & Adjustments
    IF v_include_inland_towing THEN
        FOR v_adj IN
            SELECT * FROM public.attribute_price_adjustments
            WHERE is_active = true AND context = 'towing' AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
              AND ((attribute_type = 'vehicle_category' AND attribute_id = v_vehicle_category_id) OR (attribute_type = 'powertrain' AND attribute_id = v_powertrain_id) OR (attribute_type = 'vehicle_condition' AND attribute_id = v_condition_id))
            ORDER BY display_order ASC
        LOOP
            v_towing_adj := v_towing_adj + v_adj.amount_usd;
            v_adj_list := v_adj_list || jsonb_build_object('id', v_adj.id, 'type', v_adj.attribute_type, 'context', 'towing', 'amount_usd', v_adj.amount_usd, 'reason_en', v_adj.reason_en, 'reason_ar', v_adj.reason_ar);
        END LOOP;
    END IF;

    FOR v_adj IN
        SELECT * FROM public.attribute_price_adjustments
        WHERE is_active = true AND context = 'shipping' AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND ((attribute_type = 'vehicle_category' AND attribute_id = v_vehicle_category_id) OR (attribute_type = 'powertrain' AND attribute_id = v_powertrain_id) OR (attribute_type = 'vehicle_condition' AND attribute_id = v_condition_id))
        ORDER BY display_order ASC
    LOOP
        v_ocean_freight_adj := v_ocean_freight_adj + v_adj.amount_usd;
        v_adj_list := v_adj_list || jsonb_build_object('id', v_adj.id, 'type', v_adj.attribute_type, 'context', 'shipping', 'amount_usd', v_adj.amount_usd, 'reason_en', v_adj.reason_en, 'reason_ar', v_adj.reason_ar);
    END LOOP;

    v_ocean_freight_total := v_ocean_freight_base + v_ocean_freight_adj;
    v_towing_total_min := v_towing_base_min + v_towing_adj;
    v_towing_total_max := v_towing_base_max + v_towing_adj;

    -- 9. Additional Surcharges & Destination Port Charges
    FOR v_surcharge IN
        SELECT * FROM public.additional_charge_rules
        WHERE is_active = true AND is_archived = false AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND (destination_port_id IS NULL OR destination_port_id = v_destination_port_id)
          AND (country_code IS NULL OR country_code = v_dest_port.country_code)
          AND (shipping_method_id IS NULL OR shipping_method_id = v_shipping_method_id)
          AND (vehicle_category_id IS NULL OR vehicle_category_id = v_vehicle_category_id)
          AND (powertrain_id IS NULL OR powertrain_id = v_powertrain_id)
          AND (condition_id IS NULL OR condition_id = v_condition_id)
        ORDER BY display_order ASC
    LOOP
        v_total_surcharges := v_total_surcharges + v_surcharge.amount;
        IF v_surcharge.category = 'customs_clearance' THEN
            v_customs_clearance_fee := v_customs_clearance_fee + v_surcharge.amount;
        ELSIF v_surcharge.category = 'port_handling' THEN
            v_port_handling_fee := v_port_handling_fee + v_surcharge.amount;
        END IF;

        IF v_surcharge.is_included_in_cif THEN
            v_cif_surcharges := v_cif_surcharges + v_surcharge.amount;
        ELSIF v_surcharge.is_included_in_vat_base THEN
            v_non_cif_vat_surcharges := v_non_cif_vat_surcharges + v_surcharge.amount;
        ELSE
            v_non_cif_non_vat_surcharges := v_non_cif_non_vat_surcharges + v_surcharge.amount;
        END IF;

        v_surcharge_list := v_surcharge_list || jsonb_build_object('id', v_surcharge.id, 'code', v_surcharge.code, 'name', v_surcharge.name, 'name_ar', v_surcharge.name_ar, 'category', v_surcharge.category, 'amount_usd', v_surcharge.amount, 'is_mandatory', v_surcharge.is_mandatory, 'is_included_in_cif', v_surcharge.is_included_in_cif, 'is_included_in_vat_base', v_surcharge.is_included_in_vat_base);
    END LOOP;

    -- 10. Exchange Rate
    SELECT rate INTO v_exchange_rate FROM public.exchange_rates WHERE from_currency = 'USD' AND to_currency = 'AED' AND is_active = true ORDER BY effective_from DESC LIMIT 1;
    IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN v_exchange_rate := 3.6725; END IF;

    -- 11. CIF & Taxes (CIF does NOT include towing)
    v_cif_min := ROUND(v_declared_value_usd + v_ocean_freight_total + v_cif_surcharges, 2);
    v_cif_max := v_cif_min;
    v_duty_min := ROUND(v_cif_min * 0.05, 2);
    v_duty_max := ROUND(v_cif_max * 0.05, 2);
    v_vat_base_min := ROUND(v_cif_min + v_duty_min + v_non_cif_vat_surcharges, 2);
    v_vat_base_max := ROUND(v_cif_max + v_duty_max + v_non_cif_vat_surcharges, 2);
    v_vat_min := ROUND(v_vat_base_min * 0.05, 2);
    v_vat_max := ROUND(v_vat_base_max * 0.05, 2);

    v_total_usd_min := ROUND(v_ocean_freight_total + v_towing_total_min + v_total_surcharges + v_duty_min + v_vat_min, 2);
    v_total_usd_max := ROUND(v_ocean_freight_total + v_towing_total_max + v_total_surcharges + v_duty_max + v_vat_max, 2);
    v_total_aed_min := ROUND(v_total_usd_min * v_exchange_rate, 2);
    v_total_aed_max := ROUND(v_total_usd_max * v_exchange_rate, 2);

    IF v_is_towing_range THEN
        v_disclaimer := 'Inland towing is presented as an estimated bracket. Final towing charge is subject to confirmation based on exact vehicle condition, location access, and carrier availability. Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation.';
    ELSE
        v_disclaimer := 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation. Quotation is valid for 14 days and subject to carrier bunker adjustments.';
    END IF;

    -- Generate reference numbers
    IF v_is_anonymous THEN
        v_enquiry_ref := 'ENQ-EST-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
        v_quote_ref := 'EST-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
    ELSE
        v_enquiry_ref := 'ENQ-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
        v_quote_ref := 'QT-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
    END IF;

    -- 12. Line Items
    v_line_items := v_line_items || jsonb_build_object('category', 'ocean_freight_base', 'description', 'Base Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')', 'amount_usd', v_ocean_freight_base);

    FOR v_adj IN SELECT * FROM jsonb_to_recordset(v_adj_list) AS x(id UUID, type TEXT, context TEXT, amount_usd NUMERIC, reason_en TEXT, reason_ar TEXT) WHERE x.context = 'shipping' AND x.amount_usd > 0
    LOOP
        v_line_items := v_line_items || jsonb_build_object('category', 'shipping_adjustment', 'description', CASE WHEN v_adj.reason_en IS NOT NULL AND TRIM(v_adj.reason_en) != '' THEN TRIM(v_adj.reason_en) || ' — shipping surcharge' ELSE (CASE v_adj.type WHEN 'vehicle_category' THEN v_category_name WHEN 'powertrain' THEN v_powertrain_name WHEN 'vehicle_condition' THEN v_condition_name ELSE 'Vehicle' END) || ' Handling — shipping surcharge' END, 'description_ar', CASE WHEN v_adj.reason_ar IS NOT NULL AND TRIM(v_adj.reason_ar) != '' THEN TRIM(v_adj.reason_ar) ELSE CASE v_adj.type WHEN 'vehicle_category' THEN COALESCE(v_category.name_ar, v_category_name) WHEN 'powertrain' THEN COALESCE(v_powertrain.name_ar, v_powertrain_name) WHEN 'vehicle_condition' THEN COALESCE(v_condition.name_ar, v_condition_name) ELSE '' END || ' — رسوم شحن إضافية' END, 'amount_usd', v_adj.amount_usd);
    END LOOP;

    v_line_items := v_line_items || jsonb_build_object('category', 'inland_towing_base', 'description', v_towing_description, 'amount_usd_min', v_towing_base_min, 'amount_usd_max', v_towing_base_max, 'is_range', v_is_towing_range, 'is_requested', v_include_inland_towing);

    FOR v_adj IN SELECT * FROM jsonb_to_recordset(v_adj_list) AS x(id UUID, type TEXT, context TEXT, amount_usd NUMERIC, reason_en TEXT, reason_ar TEXT) WHERE x.context = 'towing' AND x.amount_usd > 0
    LOOP
        v_line_items := v_line_items || jsonb_build_object('category', 'towing_adjustment', 'description', CASE WHEN v_adj.reason_en IS NOT NULL AND TRIM(v_adj.reason_en) != '' THEN TRIM(v_adj.reason_en) || ' — towing surcharge' ELSE (CASE v_adj.type WHEN 'vehicle_category' THEN v_category_name WHEN 'powertrain' THEN v_powertrain_name WHEN 'vehicle_condition' THEN v_condition_name ELSE 'Vehicle' END) || ' Handling — towing surcharge' END, 'description_ar', CASE WHEN v_adj.reason_ar IS NOT NULL AND TRIM(v_adj.reason_ar) != '' THEN TRIM(v_adj.reason_ar) ELSE CASE v_adj.type WHEN 'vehicle_category' THEN COALESCE(v_category.name_ar, v_category_name) WHEN 'powertrain' THEN COALESCE(v_powertrain.name_ar, v_powertrain_name) WHEN 'vehicle_condition' THEN COALESCE(v_condition.name_ar, v_condition_name) ELSE '' END || ' — رسوم سحب إضافية' END, 'amount_usd', v_adj.amount_usd);
    END LOOP;

    FOR v_surcharge IN SELECT * FROM jsonb_to_recordset(v_surcharge_list) AS s(id UUID, code TEXT, name TEXT, name_ar TEXT, category TEXT, amount_usd NUMERIC, is_mandatory BOOLEAN, is_included_in_cif BOOLEAN, is_included_in_vat_base BOOLEAN)
    LOOP
        v_line_items := v_line_items || jsonb_build_object('category', v_surcharge.category, 'code', v_surcharge.code, 'description', v_surcharge.name, 'description_ar', v_surcharge.name_ar, 'amount_usd', v_surcharge.amount_usd);
    END LOOP;

    v_line_items := v_line_items || jsonb_build_object('category', 'customs_duty', 'description', 'UAE Customs Duty (5% of CIF)', 'amount_usd_min', v_duty_min, 'amount_usd_max', v_duty_max);
    v_line_items := v_line_items || jsonb_build_object('category', 'import_vat', 'description', 'UAE Import VAT (5% of VAT Base)', 'amount_usd_min', v_vat_min, 'amount_usd_max', v_vat_max);

    -- Rules Snapshot
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'rule_key', r.rule_key, 'title_en', r.title_en, 'title_ar', r.title_ar, 'content_en', r.content_en, 'content_ar', r.content_ar) ORDER BY r.display_order ASC), '[]'::JSONB)
    INTO v_rules_snapshot
    FROM public.quotation_rules r
    WHERE r.is_active = true AND r.is_archived = false AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_DATE) AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE);

    -- 13. Build Snapshot
    v_pricing_snapshot := jsonb_build_object(
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'calculation_timestamp', NOW(),
        'calculation_engine_version', 'v7',
        'is_anonymous', v_is_anonymous,
        'customer', jsonb_build_object('full_name', v_customer_name, 'phone', v_phone_clean, 'email', v_email, 'country', v_country, 'city', v_city),
        'vehicle', jsonb_build_object('category_id', v_vehicle_category_id, 'category_name', v_category_name, 'powertrain_id', v_powertrain_id, 'powertrain_name', v_powertrain_name, 'condition_id', v_condition_id, 'condition_name', v_condition_name, 'make', v_make, 'model', v_model, 'year', v_year, 'vin', v_vin, 'lot_number', v_lot_number, 'listing_url', v_listing_url, 'declared_value_usd', v_declared_value_usd, 'purchase_source_id', v_purchase_source_id, 'purchase_source_name', v_purchase_source_name),
        'route', jsonb_build_object('route_id', v_route.id, 'origin_port_id', v_origin_port.id, 'origin_port_name', v_origin_port.name, 'origin_port_name_ar', v_origin_port.name_ar, 'origin_port_state', v_origin_port.state_or_city, 'origin_port_code', v_origin_port.code, 'origin_country_code', v_origin_port.country_code, 'origin_country_name', COALESCE(v_origin_country.name, 'United States'), 'origin_country_name_ar', COALESCE(v_origin_country.name_ar, 'United States'), 'destination_port_id', v_dest_port.id, 'destination_port_name', v_dest_port.name, 'destination_port_name_ar', v_dest_port.name_ar, 'destination_port_state', v_dest_port.state_or_city, 'destination_port_code', v_dest_port.code, 'destination_country_code', v_dest_port.country_code, 'destination_country_name', COALESCE(v_dest_country.name, 'United Arab Emirates'), 'destination_country_name_ar', COALESCE(v_dest_country.name_ar, 'United Arab Emirates'), 'shipping_method_id', v_shipping_method_id, 'shipping_method_name', v_shipping_method_name, 'transit_days_min', v_route.transit_days_min, 'transit_days_max', v_route.transit_days_max),
        'towing', jsonb_build_object('is_requested', v_include_inland_towing, 'include_inland_towing', v_include_inland_towing, 'location_id', v_purchase_location_id, 'location_code', CASE WHEN v_include_inland_towing THEN v_purchase_location.location_code ELSE NULL END, 'location_name', CASE WHEN NOT v_include_inland_towing THEN 'Not requested' WHEN v_purchase_location_name IS NOT NULL THEN v_purchase_location_name ELSE 'Location unavailable' END, 'city', CASE WHEN v_include_inland_towing THEN v_purchase_location_city ELSE NULL END, 'state_code', CASE WHEN v_include_inland_towing THEN v_purchase_location_state ELSE NULL END, 'state_name', CASE WHEN v_include_inland_towing THEN v_state_name ELSE NULL END, 'auction_company', CASE WHEN v_include_inland_towing THEN v_purchase_location.auction_company ELSE NULL END, 'source_name', CASE WHEN v_include_inland_towing THEN v_purchase_source_name ELSE NULL END, 'base_fee_min', v_towing_base_min, 'base_fee_max', v_towing_base_max, 'adjustments_fee', v_towing_adj, 'fee_min', v_towing_total_min, 'fee_max', v_towing_total_max, 'base_min', v_towing_base_min, 'base_max', v_towing_base_max, 'adjustments', v_towing_adj, 'total_min', v_towing_total_min, 'total_max', v_towing_total_max, 'is_range', v_is_towing_range, 'description', v_towing_description),
        'adjustments', v_adj_list,
        'surcharges_list', v_surcharge_list,
        'financials', jsonb_build_object('currency', 'USD', 'exchange_rate', v_exchange_rate, 'declared_value_usd', v_declared_value_usd, 'include_inland_towing', v_include_inland_towing, 'ocean_freight_base', v_ocean_freight_base, 'ocean_freight_adjustments', v_ocean_freight_adj, 'subtotal_ocean_freight', v_ocean_freight_total, 'towing_fee_base_min', v_towing_base_min, 'towing_fee_base_max', v_towing_base_max, 'towing_adjustments', v_towing_adj, 'towing_fee_min', v_towing_total_min, 'towing_fee_max', v_towing_total_max, 'is_towing_range', v_is_towing_range, 'surcharges_total', v_total_surcharges, 'customs_clearance_fee', v_customs_clearance_fee, 'port_additional_charges', v_port_handling_fee, 'destination_clearance_subtotal', v_customs_clearance_fee + v_port_handling_fee, 'transport_subtotal_min', v_ocean_freight_total + v_towing_total_min, 'transport_subtotal_max', v_ocean_freight_total + v_towing_total_max, 'cif_value_min', v_cif_min, 'cif_value_max', v_cif_max, 'customs_duty_min', v_duty_min, 'customs_duty_max', v_duty_max, 'vat_taxable_value_min', v_vat_base_min, 'vat_taxable_value_max', v_vat_base_max, 'import_vat_min', v_vat_min, 'import_vat_max', v_vat_max, 'uae_government_charges_subtotal_min', v_duty_min + v_vat_min, 'uae_government_charges_subtotal_max', v_duty_max + v_vat_max, 'total_charges_usd_min', v_total_usd_min, 'total_charges_usd_max', v_total_usd_max, 'total_charges_aed_min', v_total_aed_min, 'total_charges_aed_max', v_total_aed_max),
        'line_items', v_line_items,
        'rules', v_rules_snapshot,
        'disclaimer', v_disclaimer
    );

    -- 14. Path A: Anonymous Price Check -> Return without saving
    IF v_is_anonymous THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_anonymous', true,
            'quotation_id', 'anonymous-estimate',
            'quotation_reference', v_quote_ref,
            'enquiry_reference', v_enquiry_ref,
            'snapshot', v_pricing_snapshot
        );
    END IF;

    -- 15. Path B: Saved Official Quotation -> Atomic Persistence with Email Deduplication
    v_existing_customer := NULL;
    IF v_email IS NOT NULL AND TRIM(v_email) != '' THEN
        SELECT * INTO v_existing_customer
        FROM public.customers
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_email))
        LIMIT 1;
    END IF;

    IF v_existing_customer IS NULL AND v_phone_clean IS NOT NULL AND v_phone_clean != '0000000' THEN
        SELECT * INTO v_existing_customer
        FROM public.customers
        WHERE phone = v_phone_clean
        LIMIT 1;
    END IF;

    IF v_existing_customer IS NOT NULL THEN
        v_customer_id := v_existing_customer.id;
        UPDATE public.customers
        SET full_name = v_customer_name,
            phone = CASE WHEN v_phone_clean != '0000000' THEN v_phone_clean ELSE phone END,
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
        v_enquiry_id, NULL, 'new', 'Official quotation generated via web calculator'
    );

    INSERT INTO public.quotations (
        reference_number, enquiry_id, version, idempotency_key, route_id,
        pricing_snapshot, currency, exchange_rate, subtotal_ocean_freight,
        towing_fee_min, towing_fee_max, is_towing_range, customs_clearance_fee,
        port_additional_charges, cif_value, customs_duty, vat_taxable_value,
        import_vat, total_charges_usd_min, total_charges_usd_max,
        total_charges_aed_min, total_charges_aed_max, disclaimer
    ) VALUES (
        v_quote_ref, v_enquiry_id, 1, v_idempotency_key, v_route.id,
        v_pricing_snapshot, 'USD', v_exchange_rate, v_ocean_freight_total,
        v_towing_total_min, v_towing_total_max, v_is_towing_range,
        v_customs_clearance_fee, v_port_handling_fee, v_cif_min,
        v_duty_min, v_vat_base_min, v_vat_min, v_total_usd_min,
        v_total_usd_max, v_total_aed_min, v_total_aed_max, v_disclaimer
    ) RETURNING id INTO v_quotation_id;

    FOR v_adj IN SELECT * FROM jsonb_array_elements(v_line_items) AS elem
    LOOP
        INSERT INTO public.quotation_line_items (
            quotation_id, category, description, amount, currency
        ) VALUES (
            v_quotation_id,
            COALESCE(v_adj.value->>'category', 'tariff'),
            COALESCE(v_adj.value->>'description', 'Shipping Charge'),
            COALESCE((v_adj.value->>'amount_usd')::NUMERIC, (v_adj.value->>'amount_usd_min')::NUMERIC, 0.00),
            'USD'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'snapshot', v_pricing_snapshot
    );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_shipping_quote_v1(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) TO anon, authenticated;

-- ==============================================================================
-- 2. Customer Portal Row Level Security (RLS) Policies
-- ==============================================================================

-- Customers table: allow customer to view/update their own profile matching auth.jwt()->>'email'
DROP POLICY IF EXISTS "Customers can view own customer profile" ON public.customers;
CREATE POLICY "Customers can view own customer profile"
ON public.customers FOR SELECT TO authenticated
USING (
    LOWER(TRIM(email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Customers can update own customer profile" ON public.customers;
CREATE POLICY "Customers can update own customer profile"
ON public.customers FOR UPDATE TO authenticated
USING (
    LOWER(TRIM(email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR id = (SELECT auth.uid())
)
WITH CHECK (
    LOWER(TRIM(email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR id = (SELECT auth.uid())
);

-- Enquiries table: customer can view enquiries tied to their customer profile
DROP POLICY IF EXISTS "Customers can view own enquiries" ON public.enquiries;
CREATE POLICY "Customers can view own enquiries"
ON public.enquiries FOR SELECT TO authenticated
USING (
    customer_id IN (
        SELECT id FROM public.customers
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
);

-- Quotations table: customer can view quotations tied to their enquiries
DROP POLICY IF EXISTS "Customers can view own quotations" ON public.quotations;
CREATE POLICY "Customers can view own quotations"
ON public.quotations FOR SELECT TO authenticated
USING (
    enquiry_id IN (
        SELECT e.id FROM public.enquiries e
        JOIN public.customers c ON e.customer_id = c.id
        WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
);

-- Quotation Line Items
DROP POLICY IF EXISTS "Customers can view own quotation line items" ON public.quotation_line_items;
CREATE POLICY "Customers can view own quotation line items"
ON public.quotation_line_items FOR SELECT TO authenticated
USING (
    quotation_id IN (
        SELECT q.id FROM public.quotations q
        JOIN public.enquiries e ON q.enquiry_id = e.id
        JOIN public.customers c ON e.customer_id = c.id
        WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
);

-- ==============================================================================
-- 3. Customer Portal Data Helper RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_customer_portal_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_user_email TEXT;
    v_customer RECORD;
    v_quotes JSONB := '[]'::JSONB;
BEGIN
    v_user_email := LOWER(TRIM(COALESCE((SELECT auth.jwt() ->> 'email'), '')));
    IF v_user_email IS NULL OR v_user_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
    END IF;

    SELECT * INTO v_customer
    FROM public.customers
    WHERE LOWER(TRIM(email)) = v_user_email
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'profile', jsonb_build_object('email', v_user_email),
            'quotations', '[]'::JSONB
        );
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', q.id,
            'reference_number', q.reference_number,
            'enquiry_reference', e.reference_number,
            'created_at', q.created_at,
            'status', e.status,
            'subtotal_ocean_freight', q.subtotal_ocean_freight,
            'total_charges_usd_min', q.total_charges_usd_min,
            'total_charges_usd_max', q.total_charges_usd_max,
            'total_charges_aed_min', q.total_charges_aed_min,
            'total_charges_aed_max', q.total_charges_aed_max,
            'is_towing_range', q.is_towing_range,
            'pricing_snapshot', q.pricing_snapshot
        ) ORDER BY q.created_at DESC
    ), '[]'::JSONB)
    INTO v_quotes
    FROM public.quotations q
    JOIN public.enquiries e ON q.enquiry_id = e.id
    WHERE e.customer_id = v_customer.id;

    RETURN jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'id', v_customer.id,
            'full_name', v_customer.full_name,
            'phone', v_customer.phone,
            'email', v_customer.email,
            'country', v_customer.country,
            'city', v_customer.city,
            'created_at', v_customer.created_at
        ),
        'quotations', v_quotes
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_portal_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_portal_data() TO authenticated;
