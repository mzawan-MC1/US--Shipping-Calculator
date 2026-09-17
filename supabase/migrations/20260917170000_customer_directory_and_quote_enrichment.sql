-- ==============================================================================
-- Migration: 20260917170000_customer_directory_and_quote_enrichment.sql
-- Description:
-- - Immutable phone normalization function (normalize_phone)
-- - Hardened customer lookup in calculate_shipping_quote_v1 (phone first, then email)
-- - Enriched human-readable route and port names in pricing_snapshot
-- - Detailed financial breakdown in line items and snapshot
-- - Indexes for normalized phone and email
-- ==============================================================================

-- 1. Helper function for consistent international phone normalization (canonical digits format)
CREATE OR REPLACE FUNCTION public.normalize_phone(raw_phone TEXT, country_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_digits TEXT;
    v_country TEXT;
BEGIN
    IF raw_phone IS NULL OR TRIM(raw_phone) = '' THEN
        RETURN NULL;
    END IF;

    -- Strip all non-digits
    v_digits := regexp_replace(raw_phone, '\D', '', 'g');
    
    -- Strip international prefix 00
    IF v_digits LIKE '00%' THEN
        v_digits := SUBSTRING(v_digits FROM 3);
    END IF;

    v_country := UPPER(TRIM(COALESCE(country_code, 'ARE')));

    -- UAE Normalization: covers 05XXXXXXXX, 5XXXXXXXX, 009715..., +9715..., 97105...
    IF v_country IN ('ARE', 'AE', 'UAE') OR v_digits ~ '^05[0-9]{8}$' OR v_digits ~ '^97105[0-9]{8}$' OR v_digits ~ '^5[0-9]{8}$' THEN
        IF v_digits ~ '^97105[0-9]{8}$' THEN
            -- Fix 971 + 05XXXXXXXX -> 9715XXXXXXXX
            v_digits := '971' || SUBSTRING(v_digits FROM 5);
        ELSIF v_digits ~ '^05[0-9]{8}$' THEN
            -- 05XXXXXXXX (10 digits) -> 9715XXXXXXXX (12 digits)
            v_digits := '971' || SUBSTRING(v_digits FROM 2);
        ELSIF v_digits ~ '^5[0-9]{8}$' THEN
            -- 5XXXXXXXX (9 digits) -> 9715XXXXXXXX (12 digits)
            v_digits := '971' || v_digits;
        ELSIF v_digits ~ '^0[234679][0-9]{7}$' THEN
            -- UAE landlines (02, 04, 06...) -> 971XXXXXXXX
            v_digits := '971' || SUBSTRING(v_digits FROM 2);
        END IF;
    ELSIF v_country IN ('USA', 'US', 'CAN', 'CA') THEN
        IF LENGTH(v_digits) = 10 THEN
            v_digits := '1' || v_digits;
        END IF;
    END IF;

    RETURN v_digits;
END;
$$;

-- 1b. Overloaded 1-argument normalize_phone preserving backwards compatibility & functional index
CREATE OR REPLACE FUNCTION public.normalize_phone(raw_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT public.normalize_phone(raw_phone, 'ARE');
$$;

-- 2. Indexes for customer phone and email matching
CREATE INDEX IF NOT EXISTS idx_customers_normalized_phone_fn
ON public.customers (public.normalize_phone(phone));

CREATE INDEX IF NOT EXISTS idx_customers_email_lower_fn
ON public.customers (LOWER(TRIM(email)))
WHERE email IS NOT NULL;

-- 3. Enhanced calculate_shipping_quote_v1 RPC
CREATE OR REPLACE FUNCTION public.calculate_shipping_quote_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    v_category RECORD;
    v_powertrain RECORD;
    v_purchase_source RECORD;
    v_shipping_method RECORD;

    v_exchange_rate NUMERIC(10, 5) := 3.6725;
    v_ocean_freight NUMERIC(12, 2) := 0.00;
    v_towing_min NUMERIC(12, 2) := 0.00;
    v_towing_max NUMERIC(12, 2) := 0.00;
    v_is_towing_range BOOLEAN := false;
    v_towing_description TEXT := 'No inland towing requested (delivered to port)';
    
    v_surcharges_total NUMERIC(12, 2) := 0.00;
    v_customs_clearance_fee NUMERIC(12, 2) := 150.00;
    v_port_handling_fee NUMERIC(12, 2) := 200.00;
    v_vatable_port_charges NUMERIC(12, 2) := 200.00;

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
    v_disclaimer TEXT;
BEGIN
    -- 1. Validate and normalize customer inputs
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
            -- Only replay if normalized phone matches
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
    
    IF (input_json->>'purchase_location_id') IS NOT NULL AND TRIM(input_json->>'purchase_location_id') != '' THEN
        v_purchase_location_id := (input_json->>'purchase_location_id')::UUID;
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
    WHERE id = v_vehicle_category_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle category not found or inactive: %', v_vehicle_category_id;
    END IF;

    SELECT * INTO v_powertrain
    FROM public.powertrains
    WHERE id = v_powertrain_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Powertrain not found or inactive: %', v_powertrain_id;
    END IF;

    IF v_purchase_source_id IS NOT NULL THEN
        SELECT * INTO v_purchase_source
        FROM public.purchase_sources
        WHERE id = v_purchase_source_id;
    END IF;

    SELECT * INTO v_shipping_method
    FROM public.shipping_methods
    WHERE id = v_shipping_method_id;

    -- 5. Shipping Route Lookup
    SELECT * INTO v_route
    FROM public.shipping_routes
    WHERE origin_port_id = v_origin_port_id
      AND destination_port_id = v_destination_port_id
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active shipping route exists between % and %.', v_origin_port.name, v_dest_port.name;
    END IF;

    -- 6. Freight & Towing Rates
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

    IF FOUND THEN
        v_ocean_freight := v_freight_record.base_amount;
    ELSE
        v_ocean_freight := 1250.00;
    END IF;

    IF v_purchase_location_id IS NOT NULL THEN
        SELECT * INTO v_towing_record
        FROM public.towing_rates
        WHERE purchase_location_id = v_purchase_location_id
          AND loading_port_id = v_origin_port_id
          AND is_active = true
          AND (vehicle_category_id IS NULL OR vehicle_category_id = v_vehicle_category_id)
          AND (vehicle_condition_id IS NULL OR vehicle_condition_id = v_condition_id)
        ORDER BY vehicle_category_id NULLS LAST, vehicle_condition_id NULLS LAST
        LIMIT 1;

        IF FOUND THEN
            IF v_towing_record.rate_type = 'fixed' THEN
                v_towing_min := v_towing_record.fixed_amount;
                v_towing_max := v_towing_record.fixed_amount;
                v_is_towing_range := false;
                v_towing_description := 'Inland Towing to Port (Fixed rate)';
            ELSE
                v_towing_min := v_towing_record.min_amount;
                v_towing_max := v_towing_record.max_amount;
                v_is_towing_range := true;
                v_towing_description := 'Inland Towing to Port (Estimated range - subject to confirmation)';
            END IF;
        ELSE
            v_towing_min := 350.00;
            v_towing_max := 550.00;
            v_is_towing_range := true;
            v_towing_description := 'Inland Towing (Standard zone estimate - subject to confirmation)';
        END IF;
    END IF;

    -- 7. Surcharges
    IF v_condition_id = 'non_runner' THEN
        v_surcharges_total := v_surcharges_total + 150.00;
    ELSIF v_condition_id = 'salvage_damaged' THEN
        v_surcharges_total := v_surcharges_total + 250.00;
    END IF;

    IF v_powertrain_id = 'electric' THEN
        v_surcharges_total := v_surcharges_total + 200.00;
    END IF;

    -- 8. Exchange Rate
    SELECT rate INTO v_exchange_rate
    FROM public.exchange_rates
    WHERE from_currency = 'USD' AND to_currency = 'AED' AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
        v_exchange_rate := 3.6725;
    END IF;

    -- 9. Authoritative Calculations (Statutory UAE Customs Duty & VAT):
    -- CIF = vehicle purchase price + eligible shipping/freight + insurance
    v_cif_min := ROUND(v_declared_value_usd + v_ocean_freight + v_surcharges_total + v_towing_min, 2);
    v_cif_max := ROUND(v_declared_value_usd + v_ocean_freight + v_surcharges_total + v_towing_max, 2);

    -- Customs duty = 5% x CIF
    v_duty_min := ROUND(v_cif_min * 0.05, 2);
    v_duty_max := ROUND(v_cif_max * 0.05, 2);

    -- VAT taxable value = CIF + customs duty
    -- (Clearance, terminal handling, service fees remain separate and are not included in VAT base)
    v_vat_base_min := ROUND(v_cif_min + v_duty_min, 2);
    v_vat_base_max := ROUND(v_cif_max + v_duty_max, 2);

    -- UAE import VAT = 5% x VAT taxable value
    v_vat_min := ROUND(v_vat_base_min * 0.05, 2);
    v_vat_max := ROUND(v_vat_base_max * 0.05, 2);

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
        v_disclaimer := 'Final quotation includes estimated inland towing range. Exact towing amount is confirmed upon auction dispatch. Customs duty (5%) and Import VAT (5%) are statutory government charges calculated on CIF valuation.';
    ELSE
        v_disclaimer := 'Statutory UAE Customs Duty (5%) and Import VAT (5%) are calculated on CIF valuation. Quotation is valid for 14 days and subject to carrier bunker adjustments.';
    END IF;

    v_enquiry_ref := 'ENQ-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
    v_quote_ref := 'QT-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));

    -- 10. Financial Line Items
    v_line_items := jsonb_build_array(
        jsonb_build_object('category', 'ocean_freight', 'description', 'Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')', 'amount_usd', v_ocean_freight),
        jsonb_build_object('category', 'towing', 'description', v_towing_description, 'amount_usd_min', v_towing_min, 'amount_usd_max', v_towing_max, 'is_range', v_is_towing_range),
        jsonb_build_object('category', 'surcharges', 'description', 'Vehicle Condition & Fuel Surcharges', 'amount_usd', v_surcharges_total),
        jsonb_build_object('category', 'customs_clearance', 'description', 'UAE Customs Clearance & Documentation', 'amount_usd', v_customs_clearance_fee),
        jsonb_build_object('category', 'port_handling', 'description', 'Destination Port Terminal Handling & Delivery Order', 'amount_usd', v_port_handling_fee),
        jsonb_build_object('category', 'customs_duty', 'description', 'UAE Customs Duty (5% of CIF)', 'amount_usd_min', v_duty_min, 'amount_usd_max', v_duty_max),
        jsonb_build_object('category', 'import_vat', 'description', 'UAE Import VAT (5% of VAT Base)', 'amount_usd_min', v_vat_min, 'amount_usd_max', v_vat_max)
    );

    -- 11. Comprehensive Human-Readable Pricing Snapshot (No Raw UUIDs or Technical Fallbacks!)
    v_pricing_snapshot := jsonb_build_object(
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'calculation_timestamp', NOW(),
        'calculation_engine_version', 'v1',
        'customer', jsonb_build_object(
            'full_name', v_customer_name,
            'phone', v_phone_clean,
            'email', v_email,
            'country', v_country,
            'city', v_city
        ),
        'vehicle', jsonb_build_object(
            'category_id', v_vehicle_category_id,
            'category_name', v_category.name,
            'powertrain_id', v_powertrain_id,
            'powertrain_name', v_powertrain.name,
            'condition_id', v_condition_id,
            'make', v_make,
            'model', v_model,
            'year', v_year,
            'vin', v_vin,
            'lot_number', v_lot_number,
            'listing_url', v_listing_url,
            'declared_value_usd', v_declared_value_usd,
            'purchase_source_id', v_purchase_source_id,
            'purchase_source_name', COALESCE(v_purchase_source.name, v_purchase_source_id)
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
            'shipping_method_name', COALESCE(v_shipping_method.name, v_shipping_method_id),
            'transit_days_min', v_route.transit_days_min,
            'transit_days_max', v_route.transit_days_max
        ),
        'financials', jsonb_build_object(
            'currency', 'USD',
            'exchange_rate', v_exchange_rate,
            'declared_value_usd', v_declared_value_usd,
            'subtotal_ocean_freight', v_ocean_freight,
            'towing_fee_min', v_towing_min,
            'towing_fee_max', v_towing_max,
            'is_towing_range', v_is_towing_range,
            'surcharges_total', v_surcharges_total,
            'customs_clearance_fee', v_customs_clearance_fee,
            'port_additional_charges', v_port_handling_fee,
            'cif_value_min', v_cif_min,
            'cif_value_max', v_cif_max,
            'customs_duty_min', v_duty_min,
            'customs_duty_max', v_duty_max,
            'vat_taxable_value_min', v_vat_base_min,
            'vat_taxable_value_max', v_vat_base_max,
            'import_vat_min', v_vat_min,
            'import_vat_max', v_vat_max,
            'total_charges_usd_min', v_total_usd_min,
            'total_charges_usd_max', v_total_usd_max,
            'total_charges_aed_min', v_total_aed_min,
            'total_charges_aed_max', v_total_aed_max
        ),
        'line_items', v_line_items,
        'disclaimer', v_disclaimer
    );

    -- 12. Robust Internal Customer Profile Resolution:
    -- Match normalized phone first; if not found, match normalized email
    SELECT id, full_name, email, phone INTO v_existing_customer
    FROM public.customers
    WHERE public.normalize_phone(phone, country) = v_phone_clean
       OR public.normalize_phone(phone) = v_phone_clean
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND AND v_email IS NOT NULL AND v_email <> '' THEN
        SELECT id, full_name, email, phone INTO v_existing_customer
        FROM public.customers
        WHERE LOWER(TRIM(email)) = v_email
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF v_existing_customer.id IS NOT NULL THEN
        v_customer_id := v_existing_customer.id;
        -- Update appropriate contact details without destructive overwrites
        UPDATE public.customers
        SET full_name = COALESCE(NULLIF(v_customer_name, ''), full_name),
            phone = COALESCE(v_phone_clean, phone),
            email = COALESCE(v_email, email),
            country = COALESCE(v_country, country),
            city = COALESCE(v_city, city),
            updated_at = NOW()
        WHERE id = v_customer_id;
    ELSE
        INSERT INTO public.customers (full_name, phone, email, country, city, notes)
        VALUES (v_customer_name, v_phone_clean, v_email, v_country, v_city, v_notes)
        RETURNING id INTO v_customer_id;
    END IF;

    -- 13. Customer Vehicle Record
    INSERT INTO public.customer_vehicles (
        customer_id, vehicle_category_id, powertrain_id, condition_id,
        make, model, year, vin, lot_number, listing_url, declared_value_usd
    ) VALUES (
        v_customer_id, v_vehicle_category_id, v_powertrain_id, v_condition_id,
        v_make, v_model, v_year, v_vin, v_lot_number, v_listing_url, v_declared_value_usd
    ) RETURNING id INTO v_vehicle_id;

    -- 14. Enquiry Record
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

    -- 15. Authoritative Quotation Record
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

    -- 16. Detailed Immutable Line Items
    INSERT INTO public.quotation_line_items (quotation_id, category, description, amount, currency)
    VALUES
        (v_quotation_id, 'ocean_freight', 'Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')', v_ocean_freight, 'USD'),
        (v_quotation_id, 'towing', v_towing_description, v_towing_min, 'USD'),
        (v_quotation_id, 'surcharges', 'Vehicle Condition & Fuel Surcharges', v_surcharges_total, 'USD'),
        (v_quotation_id, 'customs_clearance', 'UAE Customs Clearance & Documentation', v_customs_clearance_fee, 'USD'),
        (v_quotation_id, 'port_handling', 'Destination Port Terminal Handling', v_port_handling_fee, 'USD'),
        (v_quotation_id, 'customs_duty', 'UAE Customs Duty (5% of CIF)', v_duty_min, 'USD'),
        (v_quotation_id, 'import_vat', 'UAE Import VAT (5% of VAT Base)', v_vat_min, 'USD');

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

-- Security & Privileges:
REVOKE ALL ON FUNCTION public.calculate_shipping_quote_v1(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) TO service_role;
