-- Migration: 20260919150000_calculator_shipping_methods_freight_rates.sql
-- Description: Ensure get_calculator_availability_v1 returns valid numeric base_amount and currency
-- for every available shipping method on the selected route. Only return shipping methods that have
-- an active valid base freight rate configured on that route.

CREATE OR REPLACE FUNCTION public.get_calculator_availability_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
    v_category_id TEXT;
    v_condition_id TEXT;
    v_powertrain_id TEXT;
    v_purchase_source_id TEXT;
    v_purchase_location_id UUID;
    v_origin_port_id UUID;
    v_destination_port_id UUID;
    v_include_inland_towing BOOLEAN := true;
    
    v_states JSONB := '[]'::JSONB;
    v_locations JSONB := '[]'::JSONB;
    v_origin_ports JSONB := '[]'::JSONB;
    v_dest_ports JSONB := '[]'::JSONB;
    v_methods JSONB := '[]'::JSONB;
    v_eligible_powertrains JSONB := '[]'::JSONB;
    v_eligible_conditions JSONB := '[]'::JSONB;
    v_category_adjustments JSONB := '[]'::JSONB;
    v_has_powertrain_compat BOOLEAN := false;
    v_has_condition_compat BOOLEAN := false;
BEGIN
    v_category_id := COALESCE(NULLIF(TRIM(input_json->>'vehicle_category_id'), ''), 'sedan');
    v_condition_id := COALESCE(NULLIF(TRIM(input_json->>'condition_id'), ''), 'operable');
    v_powertrain_id := COALESCE(NULLIF(TRIM(input_json->>'powertrain_id'), ''), 'petrol');
    v_purchase_source_id := NULLIF(TRIM(input_json->>'purchase_source_id'), '');
    
    IF (input_json->>'include_inland_towing') IS NOT NULL THEN
        v_include_inland_towing := (input_json->>'include_inland_towing')::BOOLEAN;
    END IF;

    BEGIN
        v_purchase_location_id := (input_json->>'purchase_location_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_purchase_location_id := NULL;
    END;

    BEGIN
        v_origin_port_id := (input_json->>'origin_port_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_origin_port_id := NULL;
    END;

    BEGIN
        v_destination_port_id := (input_json->>'destination_port_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_destination_port_id := NULL;
    END;

    -- 1. Check Category Compatibilities for Powertrains & Conditions
    SELECT EXISTS (
        SELECT 1 FROM public.vehicle_category_compatibilities
        WHERE vehicle_category_id = v_category_id AND target_type = 'powertrain' AND is_active = true
    ) INTO v_has_powertrain_compat;

    SELECT EXISTS (
        SELECT 1 FROM public.vehicle_category_compatibilities
        WHERE vehicle_category_id = v_category_id AND target_type = 'condition' AND is_active = true
    ) INTO v_has_condition_compat;

    -- Eligible Powertrains
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'name_ar', p.name_ar,
                'icon', p.icon,
                'display_order', p.display_order
            ) ORDER BY p.display_order ASC, p.name ASC
        ),
        '[]'::JSONB
    )
    INTO v_eligible_powertrains
    FROM public.powertrains p
    WHERE p.is_active = true AND p.is_archived = false
      AND (
        NOT v_has_powertrain_compat
        OR p.id IN (
            SELECT target_id FROM public.vehicle_category_compatibilities
            WHERE vehicle_category_id = v_category_id AND target_type = 'powertrain' AND is_active = true
        )
      );

    -- Eligible Conditions
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'name_ar', c.name_ar,
                'description', c.description,
                'description_ar', c.description_ar,
                'icon', c.icon,
                'display_order', c.display_order
            ) ORDER BY c.display_order ASC, c.name ASC
        ),
        '[]'::JSONB
    )
    INTO v_eligible_conditions
    FROM public.vehicle_conditions c
    WHERE c.is_active = true AND c.is_archived = false
      AND (
        NOT v_has_condition_compat
        OR c.id IN (
            SELECT target_id FROM public.vehicle_category_compatibilities
            WHERE vehicle_category_id = v_category_id AND target_type = 'condition' AND is_active = true
        )
      );

    -- Category Pricing Adjustments
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', a.id,
                'attribute_type', a.attribute_type,
                'attribute_id', a.attribute_id,
                'context', a.context,
                'amount_usd', a.amount_usd,
                'reason_en', a.reason_en,
                'reason_ar', a.reason_ar
            ) ORDER BY a.display_order ASC
        ),
        '[]'::JSONB
    )
    INTO v_category_adjustments
    FROM public.attribute_price_adjustments a
    WHERE a.is_active = true
      AND a.effective_from <= CURRENT_DATE
      AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
      AND (
        (a.attribute_type = 'vehicle_category' AND a.attribute_id = v_category_id)
        OR (a.attribute_type = 'powertrain' AND a.attribute_id = v_powertrain_id)
        OR (a.attribute_type = 'vehicle_condition' AND a.attribute_id = v_condition_id)
      );

    -- 2. Eligible States (states that have active pickup locations with active towing brackets)
    -- Universal across vehicle categories and independent of purchase source
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'code', st.code,
                'name', st.name,
                'display_order', st.display_order,
                'locations_count', st.loc_count
            ) ORDER BY st.display_order ASC, st.name ASC
        ),
        '[]'::JSONB
    )
    INTO v_states
    FROM (
        SELECT 
            s.code,
            s.name,
            s.display_order,
            COUNT(DISTINCT pl.id) AS loc_count
        FROM public.states s
        JOIN public.purchase_locations pl ON pl.state_code = s.code
        JOIN public.towing_rates tr ON pl.id = tr.purchase_location_id
        JOIN public.ports p ON tr.loading_port_id = p.id
        WHERE s.is_active = true AND s.is_archived = false
          AND pl.is_active = true AND pl.is_archived = false
          AND tr.is_active = true
          AND p.is_active = true AND p.is_loading_port = true
          AND tr.effective_from <= CURRENT_DATE
          AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
        GROUP BY s.code, s.name, s.display_order
    ) st;

    -- 3. Eligible Pickup Locations (Universal across vehicle categories and independent of purchase source)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', loc.id,
                'name', loc.name,
                'location_code', loc.location_code,
                'state_code', loc.state_code,
                'city', loc.city,
                'zip_code', loc.zip_code,
                'auction_company', loc.auction_company,
                'purchase_source_id', loc.purchase_source_id,
                'available_ports_count', loc.ports_count
            ) ORDER BY loc.name ASC
        ),
        '[]'::JSONB
    )
    INTO v_locations
    FROM (
        SELECT 
            pl.id, 
            pl.name, 
            pl.location_code,
            pl.state_code, 
            pl.city,
            pl.zip_code,
            pl.auction_company,
            pl.purchase_source_id,
            COUNT(DISTINCT tr.loading_port_id) AS ports_count
        FROM public.purchase_locations pl
        JOIN public.towing_rates tr ON pl.id = tr.purchase_location_id
        JOIN public.ports p ON tr.loading_port_id = p.id
        WHERE pl.is_active = true AND pl.is_archived = false
          AND tr.is_active = true
          AND p.is_active = true AND p.is_loading_port = true
          AND tr.effective_from <= CURRENT_DATE
          AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
        GROUP BY pl.id, pl.name, pl.location_code, pl.state_code, pl.city, pl.zip_code, pl.auction_company, pl.purchase_source_id
    ) loc;

    -- 4. Eligible Origin Loading Ports (Universal across vehicle categories)
    IF v_include_inland_towing THEN
        IF v_purchase_location_id IS NOT NULL THEN
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'name', p.name,
                        'name_ar', p.name_ar,
                        'code', p.code,
                        'state_or_city', p.state_or_city,
                        'country_code', p.country_code,
                        'towing_rate_type', r.rate_type,
                        'towing_fixed_amount', r.fixed_amount,
                        'towing_min_amount', r.min_amount,
                        'towing_max_amount', r.max_amount
                    ) ORDER BY p.name ASC
                ),
                '[]'::JSONB
            )
            INTO v_origin_ports
            FROM (
                SELECT DISTINCT ON (tr.loading_port_id)
                    tr.loading_port_id,
                    tr.rate_type,
                    tr.fixed_amount,
                    tr.min_amount,
                    tr.max_amount
                FROM public.towing_rates tr
                WHERE tr.purchase_location_id = v_purchase_location_id
                  AND tr.is_active = true
                  AND tr.effective_from <= CURRENT_DATE
                  AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
                ORDER BY tr.loading_port_id, tr.created_at DESC
            ) r
            JOIN public.ports p ON r.loading_port_id = p.id
            WHERE p.is_active = true AND p.is_loading_port = true;
        END IF;
    ELSE
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'name_ar', p.name_ar,
                    'code', p.code,
                    'state_or_city', p.state_or_city,
                    'country_code', p.country_code,
                    'towing_rate_type', 'none',
                    'towing_fixed_amount', 0.00,
                    'towing_min_amount', 0.00,
                    'towing_max_amount', 0.00
                ) ORDER BY p.name ASC
            ),
            '[]'::JSONB
        )
        INTO v_origin_ports
        FROM public.ports p
        WHERE p.is_active = true
          AND p.is_loading_port = true
          AND p.country_code = 'USA';
    END IF;

    -- 5. Eligible Destination Ports
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'name_ar', p.name_ar,
                'code', p.code,
                'state_or_city', p.state_or_city,
                'country_code', p.country_code
            ) ORDER BY p.name ASC
        ),
        '[]'::JSONB
    )
    INTO v_dest_ports
    FROM public.ports p
    WHERE p.is_active = true AND p.is_destination_port = true
      AND (
        v_origin_port_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM public.shipping_routes sr
            WHERE sr.origin_port_id = v_origin_port_id
              AND sr.destination_port_id = p.id
              AND sr.is_active = true
        )
      );

    -- 6. Eligible Shipping Methods (Only active methods with an active valid base freight rate on the route)
    IF v_origin_port_id IS NOT NULL AND v_destination_port_id IS NOT NULL THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sm.id,
                    'name', sm.name,
                    'description', sm.description,
                    'base_amount', r.base_amount,
                    'currency', r.currency
                ) ORDER BY r.base_amount ASC, sm.name ASC
            ),
            '[]'::JSONB
        )
        INTO v_methods
        FROM (
            SELECT DISTINCT ON (rfr.shipping_method_id)
                rfr.shipping_method_id,
                rfr.base_amount,
                COALESCE(rfr.currency, 'USD') AS currency
            FROM public.route_freight_rates rfr
            JOIN public.shipping_routes sr ON rfr.route_id = sr.id
            WHERE sr.origin_port_id = v_origin_port_id
              AND sr.destination_port_id = v_destination_port_id
              AND sr.is_active = true
              AND rfr.is_active = true
              AND rfr.base_amount IS NOT NULL
              AND rfr.base_amount > 0
            ORDER BY rfr.shipping_method_id, rfr.created_at DESC
        ) r
        JOIN public.shipping_methods sm ON sm.id = r.shipping_method_id
        WHERE sm.is_active = true;
    ELSE
        v_methods := '[]'::JSONB;
    END IF;

    RETURN jsonb_build_object(
        'states', v_states,
        'eligible_states', v_states,
        'pickup_locations', v_locations,
        'eligible_pickup_locations', v_locations,
        'origin_ports', v_origin_ports,
        'eligible_origin_ports', v_origin_ports,
        'destination_ports', v_dest_ports,
        'eligible_destination_ports', v_dest_ports,
        'shipping_methods', v_methods,
        'eligible_shipping_methods', v_methods,
        'eligible_powertrains', v_eligible_powertrains,
        'eligible_conditions', v_eligible_conditions,
        'category_adjustments', v_category_adjustments
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_calculator_availability_v1(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_calculator_availability_v1(JSONB) TO anon, authenticated;
