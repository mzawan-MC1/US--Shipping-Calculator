-- =============================================================================
-- Migration: 20260918170000_state_and_towing_management.sql
-- Description: State-based pickup location management, category-specific towing,
--              bulk adjustments, and calculator availability alignment.
-- =============================================================================

-- 1. Create states table
CREATE TABLE IF NOT EXISTS public.states (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'USA' REFERENCES public.countries(code) ON UPDATE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 50 US States + DC
INSERT INTO public.states (code, name, country_code, display_order, is_active, is_archived)
VALUES
    ('AL', 'Alabama', 'USA', 1, true, false),
    ('AK', 'Alaska', 'USA', 2, true, false),
    ('AZ', 'Arizona', 'USA', 3, true, false),
    ('AR', 'Arkansas', 'USA', 4, true, false),
    ('CA', 'California', 'USA', 5, true, false),
    ('CO', 'Colorado', 'USA', 6, true, false),
    ('CT', 'Connecticut', 'USA', 7, true, false),
    ('DE', 'Delaware', 'USA', 8, true, false),
    ('DC', 'District of Columbia', 'USA', 9, true, false),
    ('FL', 'Florida', 'USA', 10, true, false),
    ('GA', 'Georgia', 'USA', 11, true, false),
    ('HI', 'Hawaii', 'USA', 12, true, false),
    ('ID', 'Idaho', 'USA', 13, true, false),
    ('IL', 'Illinois', 'USA', 14, true, false),
    ('IN', 'Indiana', 'USA', 15, true, false),
    ('IA', 'Iowa', 'USA', 16, true, false),
    ('KS', 'Kansas', 'USA', 17, true, false),
    ('KY', 'Kentucky', 'USA', 18, true, false),
    ('LA', 'Louisiana', 'USA', 19, true, false),
    ('ME', 'Maine', 'USA', 20, true, false),
    ('MD', 'Maryland', 'USA', 21, true, false),
    ('MA', 'Massachusetts', 'USA', 22, true, false),
    ('MI', 'Michigan', 'USA', 23, true, false),
    ('MN', 'Minnesota', 'USA', 24, true, false),
    ('MS', 'Mississippi', 'USA', 25, true, false),
    ('MO', 'Missouri', 'USA', 26, true, false),
    ('MT', 'Montana', 'USA', 27, true, false),
    ('NE', 'Nebraska', 'USA', 28, true, false),
    ('NV', 'Nevada', 'USA', 29, true, false),
    ('NH', 'New Hampshire', 'USA', 30, true, false),
    ('NJ', 'New Jersey', 'USA', 31, true, false),
    ('NM', 'New Mexico', 'USA', 32, true, false),
    ('NY', 'New York', 'USA', 33, true, false),
    ('NC', 'North Carolina', 'USA', 34, true, false),
    ('ND', 'North Dakota', 'USA', 35, true, false),
    ('OH', 'Ohio', 'USA', 36, true, false),
    ('OK', 'Oklahoma', 'USA', 37, true, false),
    ('OR', 'Oregon', 'USA', 38, true, false),
    ('PA', 'Pennsylvania', 'USA', 39, true, false),
    ('RI', 'Rhode Island', 'USA', 40, true, false),
    ('SC', 'South Carolina', 'USA', 41, true, false),
    ('SD', 'South Dakota', 'USA', 42, true, false),
    ('TN', 'Tennessee', 'USA', 43, true, false),
    ('TX', 'Texas', 'USA', 44, true, false),
    ('UT', 'Utah', 'USA', 45, true, false),
    ('VT', 'Vermont', 'USA', 46, true, false),
    ('VA', 'Virginia', 'USA', 47, true, false),
    ('WA', 'Washington', 'USA', 48, true, false),
    ('WV', 'West Virginia', 'USA', 49, true, false),
    ('WI', 'Wisconsin', 'USA', 50, true, false),
    ('WY', 'Wyoming', 'USA', 51, true, false)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    country_code = EXCLUDED.country_code,
    updated_at = now();

-- 2. Extend purchase_locations
ALTER TABLE public.purchase_locations
    ADD COLUMN IF NOT EXISTS location_code TEXT,
    ADD COLUMN IF NOT EXISTS auction_company TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS zip_code TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Drop NOT NULL on purchase_source_id to allow private yards and non-auction locations
ALTER TABLE public.purchase_locations ALTER COLUMN purchase_source_id DROP NOT NULL;

-- Link state_code to states table
ALTER TABLE public.purchase_locations
    DROP CONSTRAINT IF EXISTS fk_purchase_locations_state,
    ADD CONSTRAINT fk_purchase_locations_state
    FOREIGN KEY (state_code) REFERENCES public.states(code) ON UPDATE CASCADE;

-- Backfill existing 4 locations with stable codes, auction companies, and cities
UPDATE public.purchase_locations SET
    location_code = CASE
        WHEN id = '30000000-0000-0000-0000-000000000001' THEN 'CP-ATL-S'
        WHEN id = '30000000-0000-0000-0000-000000000002' THEN 'CP-DAL-S'
        WHEN id = '30000000-0000-0000-0000-000000000003' THEN 'IAAI-ANA'
        WHEN id = '30000000-0000-0000-0000-000000000004' THEN 'CP-NORTHGATE'
        ELSE UPPER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g'))
    END,
    city = CASE
        WHEN id = '30000000-0000-0000-0000-000000000001' THEN 'Atlanta'
        WHEN id = '30000000-0000-0000-0000-000000000002' THEN 'Dallas'
        WHEN id = '30000000-0000-0000-0000-000000000003' THEN 'Anaheim'
        WHEN id = '30000000-0000-0000-0000-000000000004' THEN 'Avenel'
        ELSE COALESCE(city, 'Unknown')
    END,
    auction_company = CASE
        WHEN id = '30000000-0000-0000-0000-000000000001' THEN 'Copart'
        WHEN id = '30000000-0000-0000-0000-000000000002' THEN 'Copart'
        WHEN id = '30000000-0000-0000-0000-000000000003' THEN 'IAAI'
        WHEN id = '30000000-0000-0000-0000-000000000004' THEN 'Copart'
        ELSE COALESCE(auction_company, 'Other')
    END,
    zip_code = COALESCE(zip_code, postal_code)
WHERE location_code IS NULL;

-- Ensure location_code is unique among non-archived locations
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_locations_code
ON public.purchase_locations(UPPER(location_code)) WHERE (is_archived = false);

CREATE INDEX IF NOT EXISTS idx_purchase_locations_state ON public.purchase_locations(state_code);
CREATE INDEX IF NOT EXISTS idx_purchase_locations_auction ON public.purchase_locations(auction_company);

-- 3. RLS Policies on states & purchase_locations
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active states" ON public.states;
CREATE POLICY "Public can view active states"
ON public.states FOR SELECT
TO anon, authenticated
USING (is_active = true AND is_archived = false);

DROP POLICY IF EXISTS "Staff can view all states" ON public.states;
CREATE POLICY "Staff can view all states"
ON public.states FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Staff can manage states" ON public.states;
CREATE POLICY "Staff can manage states"
ON public.states FOR ALL
TO authenticated
USING (public.has_permission('pricing.manage'))
WITH CHECK (public.has_permission('pricing.manage'));

-- Update public view policy on purchase_locations to check is_archived
DROP POLICY IF EXISTS "Public can view active purchase locations" ON public.purchase_locations;
CREATE POLICY "Public can view active purchase locations"
ON public.purchase_locations FOR SELECT
TO anon, authenticated
USING (is_active = true AND is_archived = false);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.states FROM anon, public;

-- 4. Safe Delete/Archive RPCs
CREATE OR REPLACE FUNCTION public.delete_purchase_location(p_location_id UUID, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
    v_has_rates BOOLEAN := false;
    v_has_quotes BOOLEAN := false;
BEGIN
    IF NOT public.has_permission('pricing.manage') THEN
        RAISE EXCEPTION 'Access denied. You do not have permission to manage locations.';
    END IF;

    IF p_action = 'archive' THEN
        UPDATE public.purchase_locations
        SET is_active = false, is_archived = true, updated_at = now()
        WHERE id = p_location_id;
        RETURN jsonb_build_object('success', true, 'action', 'archived', 'id', p_location_id);
    ELSIF p_action = 'delete' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.towing_rates WHERE purchase_location_id = p_location_id
        ) INTO v_has_rates;

        SELECT EXISTS (
            SELECT 1 FROM public.quotations
            WHERE (pricing_snapshot->'input'->>'purchaseLocationId' = p_location_id::text)
               OR (pricing_snapshot->'towing'->>'location_id' = p_location_id::text)
        ) INTO v_has_quotes;

        IF v_has_rates OR v_has_quotes THEN
            RAISE EXCEPTION 'Cannot permanently delete location because it is referenced in rates or historical quotations. Archive it instead.';
        END IF;

        DELETE FROM public.purchase_locations WHERE id = p_location_id;
        RETURN jsonb_build_object('success', true, 'action', 'deleted', 'id', p_location_id);
    ELSE
        RAISE EXCEPTION 'Invalid action: %, must be archive or delete', p_action;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_purchase_location(UUID, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_purchase_location(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_state(p_code TEXT, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
    v_has_locations BOOLEAN := false;
BEGIN
    IF NOT public.has_permission('pricing.manage') THEN
        RAISE EXCEPTION 'Access denied. You do not have permission to manage states.';
    END IF;

    IF p_action = 'archive' THEN
        UPDATE public.states
        SET is_active = false, is_archived = true, updated_at = now()
        WHERE code = UPPER(TRIM(p_code));
        RETURN jsonb_build_object('success', true, 'action', 'archived', 'code', p_code);
    ELSIF p_action = 'delete' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.purchase_locations WHERE state_code = UPPER(TRIM(p_code))
        ) INTO v_has_locations;

        IF v_has_locations THEN
            RAISE EXCEPTION 'Cannot delete state because it has existing pickup locations. Archive it instead.';
        END IF;

        DELETE FROM public.states WHERE code = UPPER(TRIM(p_code));
        RETURN jsonb_build_object('success', true, 'action', 'deleted', 'code', p_code);
    ELSE
        RAISE EXCEPTION 'Invalid action: %, must be archive or delete', p_action;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_state(TEXT, TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_state(TEXT, TEXT) TO authenticated;

-- 5. Bulk Rate Adjustment RPCs
CREATE OR REPLACE FUNCTION public.preview_bulk_towing_adjustment(p_filters JSONB, p_adjustment JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
    v_adj_type TEXT;
    v_adj_val NUMERIC;
    v_results JSONB := '[]'::JSONB;
BEGIN
    IF NOT public.has_permission('pricing.manage') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    v_adj_type := p_adjustment->>'adjustment_type';
    v_adj_val := (p_adjustment->>'value')::NUMERIC;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', tr.id,
                'location_name', pl.name,
                'location_code', pl.location_code,
                'state_code', pl.state_code,
                'port_name', p.name,
                'port_code', p.code,
                'vehicle_category_id', tr.vehicle_category_id,
                'rate_type', tr.rate_type,
                'old_fixed', tr.fixed_amount,
                'new_fixed', CASE 
                    WHEN tr.rate_type = 'fixed' THEN
                        CASE v_adj_type
                            WHEN 'percentage_increase' THEN ROUND(tr.fixed_amount * (1.0 + (v_adj_val / 100.0)), 2)
                            WHEN 'percentage_decrease' THEN GREATEST(0.00, ROUND(tr.fixed_amount * (1.0 - (v_adj_val / 100.0)), 2))
                            WHEN 'fixed_increase' THEN ROUND(tr.fixed_amount + v_adj_val, 2)
                            WHEN 'fixed_decrease' THEN GREATEST(0.00, ROUND(tr.fixed_amount - v_adj_val, 2))
                            ELSE tr.fixed_amount
                        END
                    ELSE NULL
                END,
                'old_min', tr.min_amount,
                'new_min', CASE 
                    WHEN tr.rate_type = 'range' THEN
                        CASE v_adj_type
                            WHEN 'percentage_increase' THEN ROUND(tr.min_amount * (1.0 + (v_adj_val / 100.0)), 2)
                            WHEN 'percentage_decrease' THEN GREATEST(0.00, ROUND(tr.min_amount * (1.0 - (v_adj_val / 100.0)), 2))
                            WHEN 'fixed_increase' THEN ROUND(tr.min_amount + v_adj_val, 2)
                            WHEN 'fixed_decrease' THEN GREATEST(0.00, ROUND(tr.min_amount - v_adj_val, 2))
                            ELSE tr.min_amount
                        END
                    ELSE NULL
                END,
                'old_max', tr.max_amount,
                'new_max', CASE 
                    WHEN tr.rate_type = 'range' THEN
                        CASE v_adj_type
                            WHEN 'percentage_increase' THEN ROUND(tr.max_amount * (1.0 + (v_adj_val / 100.0)), 2)
                            WHEN 'percentage_decrease' THEN GREATEST(0.00, ROUND(tr.max_amount * (1.0 - (v_adj_val / 100.0)), 2))
                            WHEN 'fixed_increase' THEN ROUND(tr.max_amount + v_adj_val, 2)
                            WHEN 'fixed_decrease' THEN GREATEST(0.00, ROUND(tr.max_amount - v_adj_val, 2))
                            ELSE tr.max_amount
                        END
                    ELSE NULL
                END
            ) ORDER BY pl.state_code ASC, pl.name ASC, p.name ASC
        ),
        '[]'::JSONB
    )
    INTO v_results
    FROM public.towing_rates tr
    JOIN public.purchase_locations pl ON tr.purchase_location_id = pl.id
    JOIN public.ports p ON tr.loading_port_id = p.id
    WHERE (p_filters->>'state_code' IS NULL OR pl.state_code = p_filters->>'state_code')
      AND (p_filters->>'purchase_location_id' IS NULL OR tr.purchase_location_id = (p_filters->>'purchase_location_id')::UUID)
      AND (p_filters->>'loading_port_id' IS NULL OR tr.loading_port_id = (p_filters->>'loading_port_id')::UUID)
      AND (p_filters->>'vehicle_category_id' IS NULL OR tr.vehicle_category_id = p_filters->>'vehicle_category_id')
      AND (p_filters->>'rate_type' IS NULL OR tr.rate_type = p_filters->>'rate_type')
      AND (p_filters->>'is_active' IS NULL OR tr.is_active = (p_filters->>'is_active')::BOOLEAN);

    RETURN v_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.preview_bulk_towing_adjustment(JSONB, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.preview_bulk_towing_adjustment(JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_bulk_towing_adjustment(p_filters JSONB, p_adjustment JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
    v_adj_type TEXT;
    v_adj_val NUMERIC;
    v_effective_from DATE;
    v_effective_to DATE;
    v_rec RECORD;
    v_updated_count INTEGER := 0;
    v_new_fixed NUMERIC;
    v_new_min NUMERIC;
    v_new_max NUMERIC;
BEGIN
    IF NOT public.has_permission('pricing.manage') THEN
        RAISE EXCEPTION 'Access denied. You do not have permission to modify pricing.';
    END IF;

    v_adj_type := p_adjustment->>'adjustment_type';
    v_adj_val := (p_adjustment->>'value')::NUMERIC;
    v_effective_from := COALESCE(NULLIF(p_adjustment->>'effective_from', '')::DATE, CURRENT_DATE);
    v_effective_to := NULLIF(p_adjustment->>'effective_to', '')::DATE;

    FOR v_rec IN
        SELECT tr.*
        FROM public.towing_rates tr
        JOIN public.purchase_locations pl ON tr.purchase_location_id = pl.id
        WHERE (p_filters->>'state_code' IS NULL OR pl.state_code = p_filters->>'state_code')
          AND (p_filters->>'purchase_location_id' IS NULL OR tr.purchase_location_id = (p_filters->>'purchase_location_id')::UUID)
          AND (p_filters->>'loading_port_id' IS NULL OR tr.loading_port_id = (p_filters->>'loading_port_id')::UUID)
          AND (p_filters->>'vehicle_category_id' IS NULL OR tr.vehicle_category_id = p_filters->>'vehicle_category_id')
          AND (p_filters->>'rate_type' IS NULL OR tr.rate_type = p_filters->>'rate_type')
          AND (p_filters->>'is_active' IS NULL OR tr.is_active = (p_filters->>'is_active')::BOOLEAN)
    LOOP
        IF v_rec.rate_type = 'fixed' THEN
            v_new_fixed := CASE v_adj_type
                WHEN 'percentage_increase' THEN ROUND(v_rec.fixed_amount * (1.0 + (v_adj_val / 100.0)), 2)
                WHEN 'percentage_decrease' THEN GREATEST(0.00, ROUND(v_rec.fixed_amount * (1.0 - (v_adj_val / 100.0)), 2))
                WHEN 'fixed_increase' THEN ROUND(v_rec.fixed_amount + v_adj_val, 2)
                WHEN 'fixed_decrease' THEN GREATEST(0.00, ROUND(v_rec.fixed_amount - v_adj_val, 2))
                ELSE v_rec.fixed_amount
            END;
            v_new_min := NULL;
            v_new_max := NULL;
        ELSE
            v_new_fixed := NULL;
            v_new_min := CASE v_adj_type
                WHEN 'percentage_increase' THEN ROUND(v_rec.min_amount * (1.0 + (v_adj_val / 100.0)), 2)
                WHEN 'percentage_decrease' THEN GREATEST(0.00, ROUND(v_rec.min_amount * (1.0 - (v_adj_val / 100.0)), 2))
                WHEN 'fixed_increase' THEN ROUND(v_rec.min_amount + v_adj_val, 2)
                WHEN 'fixed_decrease' THEN GREATEST(0.00, ROUND(v_rec.min_amount - v_adj_val, 2))
                ELSE v_rec.min_amount
            END;
            v_new_max := CASE v_adj_type
                WHEN 'percentage_increase' THEN ROUND(v_rec.max_amount * (1.0 + (v_adj_val / 100.0)), 2)
                WHEN 'percentage_decrease' THEN GREATEST(0.00, ROUND(v_rec.max_amount * (1.0 - (v_adj_val / 100.0)), 2))
                WHEN 'fixed_increase' THEN ROUND(v_rec.max_amount + v_adj_val, 2)
                WHEN 'fixed_decrease' THEN GREATEST(0.00, ROUND(v_rec.max_amount - v_adj_val, 2))
                ELSE v_rec.max_amount
            END;
        END IF;

        IF v_effective_from > CURRENT_DATE THEN
            -- Future dated: expire current rate row day before new rate takes effect
            UPDATE public.towing_rates
            SET effective_to = (v_effective_from - INTERVAL '1 day')::DATE, updated_at = now()
            WHERE id = v_rec.id;

            -- Insert new rate version
            INSERT INTO public.towing_rates (
                purchase_location_id, loading_port_id, vehicle_category_id, vehicle_condition_id,
                rate_type, currency, fixed_amount, min_amount, max_amount,
                effective_from, effective_to, is_active
            ) VALUES (
                v_rec.purchase_location_id, v_rec.loading_port_id, v_rec.vehicle_category_id, v_rec.vehicle_condition_id,
                v_rec.rate_type, v_rec.currency, v_new_fixed, v_new_min, v_new_max,
                v_effective_from, v_effective_to, v_rec.is_active
            );
        ELSE
            -- Immediate update
            UPDATE public.towing_rates
            SET fixed_amount = v_new_fixed,
                min_amount = v_new_min,
                max_amount = v_new_max,
                effective_from = v_effective_from,
                effective_to = v_effective_to,
                updated_at = now()
            WHERE id = v_rec.id;
        END IF;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'message', format('Successfully adjusted %s towing rate(s).', v_updated_count)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_bulk_towing_adjustment(JSONB, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apply_bulk_towing_adjustment(JSONB, JSONB) TO authenticated;

-- 6. Update get_calculator_availability_v1 to return eligible_states and enhanced locations
CREATE OR REPLACE FUNCTION public.get_calculator_availability_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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

    -- Category Pricing Adjustments (Towing & Shipping)
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

    -- 2. Eligible States (states that have active pickup locations with valid active towing brackets)
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
          AND (tr.vehicle_category_id IS NULL OR tr.vehicle_category_id = v_category_id)
          AND (tr.vehicle_condition_id IS NULL OR tr.vehicle_condition_id = v_condition_id)
        GROUP BY s.code, s.name, s.display_order
    ) st;

    -- 3. Eligible Pickup Locations
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
          AND (tr.vehicle_category_id IS NULL OR tr.vehicle_category_id = v_category_id)
          AND (tr.vehicle_condition_id IS NULL OR tr.vehicle_condition_id = v_condition_id)
          AND (v_purchase_source_id IS NULL OR pl.purchase_source_id = v_purchase_source_id)
        GROUP BY pl.id, pl.name, pl.location_code, pl.state_code, pl.city, pl.zip_code, pl.auction_company, pl.purchase_source_id
    ) loc;

    -- 4. Eligible Origin Loading Ports
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
                  AND (tr.vehicle_category_id IS NULL OR tr.vehicle_category_id = v_category_id)
                  AND (tr.vehicle_condition_id IS NULL OR tr.vehicle_condition_id = v_condition_id)
                ORDER BY tr.loading_port_id, tr.vehicle_category_id NULLS LAST, tr.vehicle_condition_id NULLS LAST
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

    -- 6. Eligible Shipping Methods
    IF v_origin_port_id IS NOT NULL AND v_destination_port_id IS NOT NULL THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sm.id,
                    'name', sm.name,
                    'is_active', sm.is_active
                ) ORDER BY sm.name ASC
            ),
            '[]'::JSONB
        )
        INTO v_methods
        FROM public.shipping_methods sm
        WHERE sm.is_active = true
          AND EXISTS (
              SELECT 1 
              FROM public.shipping_routes sr
              JOIN public.route_freight_rates rfr ON rfr.route_id = sr.id
              WHERE sr.origin_port_id = v_origin_port_id
                AND sr.destination_port_id = v_destination_port_id
                AND sr.is_active = true
                AND rfr.shipping_method_id = sm.id
                AND rfr.vehicle_category_id = v_category_id
                AND rfr.is_active = true
                AND rfr.effective_from <= CURRENT_DATE
                AND (rfr.effective_to IS NULL OR rfr.effective_to >= CURRENT_DATE)
          );
    END IF;

    RETURN jsonb_build_object(
        'eligible_states', v_states,
        'eligible_pickup_locations', v_locations,
        'eligible_origin_ports', v_origin_ports,
        'eligible_destination_ports', v_dest_ports,
        'eligible_shipping_methods', v_methods,
        'eligible_powertrains', v_eligible_powertrains,
        'eligible_conditions', v_eligible_conditions,
        'active_adjustments', v_category_adjustments
    );
END;
$$;

-- 7. Update calculate_shipping_quote_v1 to snapshot state, location code and city
CREATE OR REPLACE FUNCTION public.calculate_shipping_quote_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    -- Parameters
    v_customer_name TEXT;
    v_country TEXT;
    v_city TEXT;
    v_phone TEXT;
    v_phone_clean TEXT;
    v_email TEXT;
    v_idempotency_key TEXT;
    v_include_inland_towing BOOLEAN := true;
    v_purchase_location_id UUID;
    v_purchase_source_id TEXT;
    v_origin_port_id UUID;
    v_destination_port_id UUID;
    v_vehicle_category_id TEXT;
    v_powertrain_id TEXT;
    v_condition_id TEXT;
    v_shipping_method_id TEXT;
    v_declared_value_usd NUMERIC(12, 2);

    -- Records
    v_origin_port RECORD;
    v_dest_port RECORD;
    v_purchase_location RECORD;
    v_purchase_source_name TEXT := 'Direct Purchase';
    v_state_name TEXT := 'Unknown';
    v_purchase_location_name TEXT;
    v_purchase_location_city TEXT;
    v_purchase_location_state TEXT;
    v_route RECORD;
    v_freight_record RECORD;
    v_towing_record RECORD;
    v_exchange_rate NUMERIC(10, 4) := 3.6725;

    -- Financial variables
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

    -- Surcharges & Destination fees
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
            IF v_existing_quote.customer_phone != v_phone_clean OR v_existing_quote.customer_country != v_country THEN
                RAISE EXCEPTION 'Idempotency key collision with different customer context.';
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'quotation_id', v_existing_quote.id,
                'quotation_reference', v_existing_quote.reference_number,
                'enquiry_reference', v_existing_quote.enquiry_reference,
                'snapshot', v_existing_quote.pricing_snapshot,
                'is_idempotent_replay', true
            );
        END IF;
    END IF;

    -- 3. Parse Parameters & Locations
    v_origin_port_id := (input_json->>'origin_port_id')::UUID;
    v_destination_port_id := (input_json->>'destination_port_id')::UUID;
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
        WHERE id = v_purchase_location_id AND is_active = true AND is_archived = false;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected pickup location does not exist or is inactive.';
        END IF;

        v_purchase_location_name := v_purchase_location.name;
        v_purchase_location_city := v_purchase_location.city;
        v_purchase_location_state := v_purchase_location.state_code;
        
        -- Look up state full name
        SELECT name INTO v_state_name FROM public.states WHERE code = v_purchase_location.state_code;
        IF v_state_name IS NULL THEN
            v_state_name := v_purchase_location.state_code;
        END IF;

        IF v_purchase_location.auction_company IS NOT NULL AND TRIM(v_purchase_location.auction_company) != '' THEN
            v_purchase_source_name := v_purchase_location.auction_company;
        ELSIF v_purchase_location.purchase_source_id IS NOT NULL THEN
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

    -- 5. Active Shipping Route Lookup
    SELECT * INTO v_route
    FROM public.shipping_routes
    WHERE origin_port_id = v_origin_port_id
      AND destination_port_id = v_destination_port_id
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active shipping route exists between the selected origin and destination ports.';
    END IF;

    -- 6. Ocean Freight Base Tariff Lookup
    SELECT * INTO v_freight_record
    FROM public.route_freight_rates
    WHERE route_id = v_route.id
      AND shipping_method_id = v_shipping_method_id
      AND vehicle_category_id = v_vehicle_category_id
      AND (powertrain_id IS NULL OR powertrain_id = v_powertrain_id)
      AND is_active = true
      AND effective_from <= CURRENT_DATE
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    ORDER BY (CASE WHEN powertrain_id = v_powertrain_id THEN 0 ELSE 1 END)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active ocean freight tariff is configured for this route, vehicle category, powertrain and shipping method. Please contact us for assistance.';
    END IF;

    v_ocean_freight_base := v_freight_record.base_amount;

    -- 7. Inland Towing Base Tariff Lookup
    IF v_include_inland_towing THEN
        SELECT * INTO v_towing_record
        FROM public.towing_rates
        WHERE purchase_location_id = v_purchase_location_id
          AND loading_port_id = v_origin_port_id
          AND is_active = true
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND (vehicle_category_id IS NULL OR vehicle_category_id = v_vehicle_category_id)
          AND (vehicle_condition_id IS NULL OR vehicle_condition_id = v_condition_id)
        ORDER BY vehicle_category_id NULLS LAST, vehicle_condition_id NULLS LAST
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No inland towing tariff is configured for the selected pickup location and loading port. Please contact us for assistance.';
        END IF;

        IF v_towing_record.rate_type = 'fixed' THEN
            v_towing_base_min := v_towing_record.fixed_amount;
            v_towing_base_max := v_towing_record.fixed_amount;
            v_is_towing_range := false;
            v_towing_description := 'Inland Towing (' || v_purchase_location_name || ' to ' || v_origin_port.name || ')';
        ELSE
            v_towing_base_min := v_towing_record.min_amount;
            v_towing_base_max := v_towing_record.max_amount;
            v_is_towing_range := true;
            v_towing_description := 'Inland Towing (' || v_purchase_location_name || ' to ' || v_origin_port.name || ' - Estimated bracket)';
        END IF;
    END IF;

    -- 8. Granular Attribute Price Adjustments
    IF v_include_inland_towing THEN
        FOR v_adj IN
            SELECT * FROM public.attribute_price_adjustments
            WHERE is_active = true
              AND context = 'towing'
              AND effective_from <= CURRENT_DATE
              AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
              AND (
                (attribute_type = 'vehicle_category' AND attribute_id = v_vehicle_category_id)
                OR (attribute_type = 'powertrain' AND attribute_id = v_powertrain_id)
                OR (attribute_type = 'vehicle_condition' AND attribute_id = v_condition_id)
              )
            ORDER BY display_order ASC
        LOOP
            v_towing_adj := v_towing_adj + v_adj.amount_usd;
            v_adj_list := v_adj_list || jsonb_build_object(
                'id', v_adj.id,
                'context', 'towing',
                'attribute_type', v_adj.attribute_type,
                'attribute_id', v_adj.attribute_id,
                'amount_usd', v_adj.amount_usd,
                'reason_en', v_adj.reason_en,
                'reason_ar', v_adj.reason_ar
            );
        END LOOP;
    END IF;

    v_towing_total_min := v_towing_base_min + v_towing_adj;
    v_towing_total_max := v_towing_base_max + v_towing_adj;

    -- Shipping Adjustments
    FOR v_adj IN
        SELECT * FROM public.attribute_price_adjustments
        WHERE is_active = true
          AND context = 'shipping'
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          AND (
            (attribute_type = 'vehicle_category' AND attribute_id = v_vehicle_category_id)
            OR (attribute_type = 'powertrain' AND attribute_id = v_powertrain_id)
            OR (attribute_type = 'vehicle_condition' AND attribute_id = v_condition_id)
          )
        ORDER BY display_order ASC
    LOOP
        v_ocean_freight_adj := v_ocean_freight_adj + v_adj.amount_usd;
        v_adj_list := v_adj_list || jsonb_build_object(
            'id', v_adj.id,
            'context', 'shipping',
            'attribute_type', v_adj.attribute_type,
            'attribute_id', v_adj.attribute_id,
            'amount_usd', v_adj.amount_usd,
            'reason_en', v_adj.reason_en,
            'reason_ar', v_adj.reason_ar
        );
    END LOOP;

    v_ocean_freight_total := v_ocean_freight_base + v_ocean_freight_adj;

    -- 9. Additional Surcharges & Destination Port Fees
    FOR v_surcharge IN
        SELECT * FROM public.additional_charge_rules
        WHERE is_active = true
          AND (destination_port_id IS NULL OR destination_port_id = v_destination_port_id)
          AND (shipping_method_id IS NULL OR shipping_method_id = v_shipping_method_id)
          AND (vehicle_category_id IS NULL OR vehicle_category_id = v_vehicle_category_id)
          AND (powertrain_id IS NULL OR powertrain_id = v_powertrain_id)
          AND (vehicle_condition_id IS NULL OR vehicle_condition_id = v_condition_id)
        ORDER BY display_order ASC, name ASC
    LOOP
        v_total_surcharges := v_total_surcharges + v_surcharge.amount_usd;

        IF v_surcharge.is_included_in_cif THEN
            v_cif_surcharges := v_cif_surcharges + v_surcharge.amount_usd;
        ELSIF v_surcharge.is_included_in_vat_base THEN
            v_non_cif_vat_surcharges := v_non_cif_vat_surcharges + v_surcharge.amount_usd;
        ELSE
            v_non_cif_non_vat_surcharges := v_non_cif_non_vat_surcharges + v_surcharge.amount_usd;
        END IF;

        v_surcharge_list := v_surcharge_list || jsonb_build_object(
            'id', v_surcharge.id,
            'name', v_surcharge.name,
            'name_ar', v_surcharge.name_ar,
            'amount_usd', v_surcharge.amount_usd,
            'is_included_in_cif', v_surcharge.is_included_in_cif,
            'is_included_in_vat_base', v_surcharge.is_included_in_vat_base
        );
    END LOOP;

    -- Standard UAE destination clearance & terminal fees
    v_customs_clearance_fee := 150.00;
    v_port_handling_fee := 200.00;

    -- 10. CIF, Customs Duty, and UAE Import VAT Calculation
    v_cif_min := v_declared_value_usd + v_ocean_freight_total + v_towing_total_min + v_cif_surcharges;
    v_cif_max := v_declared_value_usd + v_ocean_freight_total + v_towing_total_max + v_cif_surcharges;

    v_duty_min := ROUND(v_cif_min * 0.05, 2);
    v_duty_max := ROUND(v_cif_max * 0.05, 2);

    v_vat_base_min := v_cif_min + v_duty_min + v_non_cif_vat_surcharges;
    v_vat_base_max := v_cif_max + v_duty_max + v_non_cif_vat_surcharges;

    v_vat_min := ROUND(v_vat_base_min * 0.05, 2);
    v_vat_max := ROUND(v_vat_base_max * 0.05, 2);

    v_total_usd_min := v_ocean_freight_total + v_towing_total_min + v_total_surcharges + v_customs_clearance_fee + v_port_handling_fee + v_duty_min + v_vat_min;
    v_total_usd_max := v_ocean_freight_total + v_towing_total_max + v_total_surcharges + v_customs_clearance_fee + v_port_handling_fee + v_duty_max + v_vat_max;

    v_total_aed_min := ROUND(v_total_usd_min * v_exchange_rate, 2);
    v_total_aed_max := ROUND(v_total_usd_max * v_exchange_rate, 2);

    -- 11. Customer & Vehicle Persistence
    SELECT id INTO v_customer_id FROM public.customers WHERE phone = v_phone_clean AND country = v_country;
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, phone, email, country, city, source)
        VALUES (v_customer_name, v_phone_clean, v_email, v_country, v_city, 'calculator')
        RETURNING id INTO v_customer_id;
    ELSE
        UPDATE public.customers
        SET full_name = v_customer_name,
            email = COALESCE(v_email, email),
            city = COALESCE(v_city, city),
            updated_at = now()
        WHERE id = v_customer_id;
    END IF;

    INSERT INTO public.customer_vehicles (
        customer_id, vehicle_category_id, powertrain_id, condition_id,
        make, model, year, vin, lot_number, declared_value_usd
    ) VALUES (
        v_customer_id, v_vehicle_category_id, v_powertrain_id, v_condition_id,
        NULLIF(TRIM(input_json->>'make'), ''),
        NULLIF(TRIM(input_json->>'model'), ''),
        (input_json->>'year')::INTEGER,
        NULLIF(UPPER(TRIM(input_json->>'vin')), ''),
        NULLIF(TRIM(input_json->>'lot_number'), ''),
        v_declared_value_usd
    ) RETURNING id INTO v_vehicle_id;

    -- 12. Create Enquiry
    v_enquiry_ref := 'ENQ-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));
    INSERT INTO public.enquiries (
        reference_number, customer_id, status, source, subject, message
    ) VALUES (
        v_enquiry_ref, v_customer_id, 'new', 'calculator',
        'Quotation Request: ' || v_vehicle_category_id || ' (' || v_origin_port.name || ' -> ' || v_dest_port.name || ')',
        COALESCE(input_json->>'notes', 'Auto-generated enquiry from customer shipping calculation.')
    ) RETURNING id INTO v_enquiry_id;

    -- 13. Assemble Granular Line Items
    v_line_items := v_line_items || jsonb_build_object(
        'category', 'base_ocean_freight',
        'description', 'Base Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')',
        'amount_usd', v_ocean_freight_base
    );

    FOR v_adj IN SELECT * FROM jsonb_to_recordset(v_adj_list) AS x(
        id text, context text, attribute_type text, attribute_id text, amount_usd numeric, reason_en text, reason_ar text
    )
    LOOP
        IF v_adj.context = 'shipping' THEN
            v_line_items := v_line_items || jsonb_build_object(
                'category', 'shipping_adjustment',
                'description', v_adj.reason_en,
                'description_ar', v_adj.reason_ar,
                'amount_usd', v_adj.amount_usd,
                'reason', v_adj.reason_en
            );
        END IF;
    END LOOP;

    IF v_include_inland_towing THEN
        v_line_items := v_line_items || jsonb_build_object(
            'category', 'base_inland_towing',
            'description', 'Inland Towing (' || v_purchase_location_name || ', ' || v_state_name || ' to ' || v_origin_port.name || ')',
            'amount_usd_min', v_towing_base_min,
            'amount_usd_max', v_towing_base_max,
            'is_range', v_is_towing_range
        );

        FOR v_adj IN SELECT * FROM jsonb_to_recordset(v_adj_list) AS x(
            id text, context text, attribute_type text, attribute_id text, amount_usd numeric, reason_en text, reason_ar text
        )
        LOOP
            IF v_adj.context = 'towing' THEN
                v_line_items := v_line_items || jsonb_build_object(
                    'category', 'towing_adjustment',
                    'description', v_adj.reason_en,
                    'description_ar', v_adj.reason_ar,
                    'amount_usd', v_adj.amount_usd,
                    'reason', v_adj.reason_en
                );
            END IF;
        END LOOP;
    END IF;

    FOR v_surcharge IN SELECT * FROM jsonb_to_recordset(v_surcharge_list) AS x(
        id text, name text, name_ar text, amount_usd numeric, is_included_in_cif boolean, is_included_in_vat_base boolean
    )
    LOOP
        v_line_items := v_line_items || jsonb_build_object(
            'category', 'surcharge',
            'description', v_surcharge.name,
            'description_ar', v_surcharge.name_ar,
            'amount_usd', v_surcharge.amount_usd,
            'is_cif_component', v_surcharge.is_included_in_cif,
            'is_vat_base_component', v_surcharge.is_included_in_vat_base
        );
    END LOOP;

    v_line_items := v_line_items || jsonb_build_object(
        'category', 'customs_clearance_fee',
        'description', 'Customs Clearance & Documentation',
        'amount_usd', v_customs_clearance_fee
    );

    v_line_items := v_line_items || jsonb_build_object(
        'category', 'port_handling_fee',
        'description', 'Port & Terminal Handling Charges (THC)',
        'amount_usd', v_port_handling_fee
    );

    -- 14. Active Rules Snapshot
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'title_en', qr.title_en,
                'title_ar', qr.title_ar,
                'content_en', qr.content_en,
                'content_ar', qr.content_ar,
                'rule_type', qr.rule_type
            ) ORDER BY qr.display_order ASC
        ),
        '[]'::JSONB
    )
    INTO v_rules_snapshot
    FROM public.quotation_rules qr
    WHERE qr.is_active = true
      AND (qr.applicable_shipping_method IS NULL OR qr.applicable_shipping_method = v_shipping_method_id)
      AND (qr.applicable_vehicle_category IS NULL OR qr.applicable_vehicle_category = v_vehicle_category_id)
      AND (qr.applicable_destination_port_id IS NULL OR qr.applicable_destination_port_id = v_destination_port_id);

    v_disclaimer := 'Authoritative quotation valid for 14 days from calculation. Final towing and terminal amounts subject to physical inspection and carrier confirmation upon vehicle reception.';

    -- 15. Assemble Final Authoritative Pricing Snapshot
    v_pricing_snapshot := jsonb_build_object(
        'quotation_reference', '',
        'enquiry_reference', v_enquiry_ref,
        'calculation_timestamp', now(),
        'currency', 'USD',
        'exchange_rate', v_exchange_rate,
        'route', jsonb_build_object(
            'route_id', v_route.id,
            'origin_port_id', v_origin_port.id,
            'origin_port_name', v_origin_port.name,
            'destination_port_id', v_dest_port.id,
            'destination_port_name', v_dest_port.name,
            'transit_days_min', v_route.transit_days_min,
            'transit_days_max', v_route.transit_days_max,
            'shipping_method', v_shipping_method_id
        ),
        'towing', jsonb_build_object(
            'include_inland_towing', v_include_inland_towing,
            'location_id', v_purchase_location_id,
            'location_code', CASE WHEN v_include_inland_towing THEN v_purchase_location.location_code ELSE NULL END,
            'location_name', v_purchase_location_name,
            'city', v_purchase_location_city,
            'state_code', v_purchase_location_state,
            'state_name', v_state_name,
            'source_name', v_purchase_source_name,
            'is_range', v_is_towing_range,
            'description', v_towing_description,
            'base_min', v_towing_base_min,
            'base_max', v_towing_base_max,
            'adjustments', v_towing_adj,
            'total_min', v_towing_total_min,
            'total_max', v_towing_total_max
        ),
        'financials', jsonb_build_object(
            'declared_value_usd', v_declared_value_usd,
            'ocean_freight_base', v_ocean_freight_base,
            'ocean_freight_adjustments', v_ocean_freight_adj,
            'subtotal_ocean_freight', v_ocean_freight_total,
            'towing_fee_base_min', v_towing_base_min,
            'towing_fee_base_max', v_towing_base_max,
            'towing_adjustments', v_towing_adj,
            'towing_fee_min', v_towing_total_min,
            'towing_fee_max', v_towing_total_max,
            'is_towing_range', v_is_towing_range,
            'include_inland_towing', v_include_inland_towing,
            'surcharges_total', v_total_surcharges,
            'ocean_and_towing_subtotal_min', v_ocean_freight_total + v_towing_total_min,
            'ocean_and_towing_subtotal_max', v_ocean_freight_total + v_towing_total_max,
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

    -- 16. Create Quotation Record
    v_quote_ref := 'MC1-' || TO_CHAR(now(), 'YYYY') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
    v_pricing_snapshot := jsonb_set(v_pricing_snapshot, '{quotation_reference}', to_jsonb(v_quote_ref));

    INSERT INTO public.quotations (
        reference_number, enquiry_id, version, idempotency_key, route_id,
        pricing_snapshot, currency, exchange_rate,
        subtotal_ocean_freight, towing_fee_min, towing_fee_max, is_towing_range,
        customs_clearance_fee, port_additional_charges, cif_value, customs_duty,
        vat_taxable_value, import_vat, total_charges_usd_min, total_charges_usd_max,
        total_charges_aed_min, total_charges_aed_max, disclaimer
    ) VALUES (
        v_quote_ref, v_enquiry_id, 1, v_idempotency_key, v_route.id,
        v_pricing_snapshot, 'USD', v_exchange_rate,
        v_ocean_freight_total, v_towing_total_min, v_towing_total_max, v_is_towing_range,
        v_customs_clearance_fee, v_port_handling_fee, v_cif_max, v_duty_max,
        v_vat_base_max, v_vat_max, v_total_usd_min, v_total_usd_max,
        v_total_aed_min, v_total_aed_max, v_disclaimer
    ) RETURNING id INTO v_quotation_id;

    RETURN jsonb_build_object(
        'success', true,
        'quotation_id', v_quotation_id,
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'snapshot', v_pricing_snapshot
    );
END;
$$;
