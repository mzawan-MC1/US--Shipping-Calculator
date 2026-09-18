-- ==============================================================================
-- Migration: 20260918150000_manageable_attributes_adjustments_surcharges.sql
-- Description:
-- 1. Extend vehicle_categories, powertrains, vehicle_conditions with bilingual names,
--    descriptions, icons, display orders, archive flags, and audit timestamps.
-- 2. Create vehicle_category_compatibilities for category-specific valid powertrains/conditions.
-- 3. Create attribute_price_adjustments for distinct, granular Inland Towing and
--    Ocean Freight adjustments with customer-facing bilingual reasons and effective dates.
-- 4. Extend additional_charge_rules with code, bilingual names/descriptions, applicability
--    criteria, display order, effective dates, CIF/VAT base inclusion flags, and archive flags.
-- 5. Migrate initial adjustments from existing surcharge_rules without fabricating amounts.
-- 6. Update calculate_shipping_quote_v1 to authoritatively apply base tariffs, separate
--    towing adjustments, separate shipping adjustments, and applicable surcharges as distinct line items.
-- 7. Update get_calculator_availability_v1 to enforce category compatibility filtering.
-- 8. Add delete_vehicle_attribute and delete_additional_charge_rule safe deletion helpers.
-- ==============================================================================

-- 1. EXTEND ATTRIBUTE MASTER TABLES
ALTER TABLE public.vehicle_categories
    ADD COLUMN IF NOT EXISTS name_ar TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS description_ar TEXT,
    ADD COLUMN IF NOT EXISTS icon TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.powertrains
    ADD COLUMN IF NOT EXISTS name_ar TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS description_ar TEXT,
    ADD COLUMN IF NOT EXISTS icon TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.vehicle_conditions
    ADD COLUMN IF NOT EXISTS name_ar TEXT,
    ADD COLUMN IF NOT EXISTS description_ar TEXT,
    ADD COLUMN IF NOT EXISTS icon TEXT,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Seed Arabic names & descriptions for default attributes if missing
UPDATE public.vehicle_categories SET name_ar = 'صالون / سيدان', icon = 'car' WHERE id = 'sedan' AND name_ar IS NULL;
UPDATE public.vehicle_categories SET name_ar = 'دفع رباعي / SUV', icon = 'truck' WHERE id = 'suv' AND name_ar IS NULL;
UPDATE public.vehicle_categories SET name_ar = 'فان / شاحنة صغيرة', icon = 'bus' WHERE id = 'van' AND name_ar IS NULL;
UPDATE public.vehicle_categories SET name_ar = 'بيك أب / شاحنة نقل', icon = 'truck' WHERE id = 'pickup' AND name_ar IS NULL;
UPDATE public.vehicle_categories SET name_ar = 'دراجة نارية', icon = 'bike' WHERE id = 'bike' AND name_ar IS NULL;

UPDATE public.powertrains SET name_ar = 'بنزين', icon = 'flame' WHERE id = 'petrol' AND name_ar IS NULL;
UPDATE public.powertrains SET name_ar = 'هايبرد / هجين', icon = 'fuel' WHERE id = 'hybrid' AND name_ar IS NULL;
UPDATE public.powertrains SET name_ar = 'كهربائي بالكامل', icon = 'zap' WHERE id = 'electric' AND name_ar IS NULL;

UPDATE public.vehicle_conditions SET name_ar = 'قابلة للقيادة والتشغيل', description_ar = 'المركبة تعمل وتتحرك بصورة طبيعية دون الحاجة لمعدات رفع خاصة', icon = 'check-circle' WHERE id = 'operable' AND name_ar IS NULL;
UPDATE public.vehicle_conditions SET name_ar = 'لا تعمل (تدحرج وتوجيه)', description_ar = 'المركبة لا تدور لكن عجلاتها تدور بحرية وعجلة القيادة توجه وتتطلب ونش سحب', icon = 'wrench' WHERE id = 'non_runner' AND name_ar IS NULL;
UPDATE public.vehicle_conditions SET name_ar = 'حادث جسيم / سكراب متضرر', description_ar = 'المركبة تعرضت لأضرار هيكلية جسيمة أو تعطل محاور وتحتاج رافعة شوكية', icon = 'shield-alert' WHERE id = 'salvage_damaged' AND name_ar IS NULL;

-- 2. CREATE CATEGORY COMPATIBILITIES TABLE
CREATE TABLE IF NOT EXISTS public.vehicle_category_compatibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_category_id TEXT NOT NULL REFERENCES public.vehicle_categories(id) ON UPDATE CASCADE ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('powertrain', 'condition')),
    target_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    CONSTRAINT uq_cat_compat UNIQUE (vehicle_category_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_compat_cat ON public.vehicle_category_compatibilities(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_cat_compat_target ON public.vehicle_category_compatibilities(target_type, target_id);

-- 3. CREATE ATTRIBUTE PRICE ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.attribute_price_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_type TEXT NOT NULL CHECK (attribute_type IN ('vehicle_category', 'powertrain', 'vehicle_condition')),
    attribute_id TEXT NOT NULL,
    context TEXT NOT NULL CHECK (context IN ('towing', 'shipping')),
    amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_usd >= 0),
    reason_en TEXT NOT NULL,
    reason_ar TEXT,
    admin_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    CONSTRAINT chk_adj_effective CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_adj_lookup ON public.attribute_price_adjustments(attribute_type, attribute_id, context, is_active);
CREATE INDEX IF NOT EXISTS idx_adj_dates ON public.attribute_price_adjustments(effective_from, effective_to);

-- Seed initial adjustments from existing active surcharge rules without inventing amounts:
-- Non-runner condition -> $150 towing adjustment
-- Salvage damaged condition -> $250 towing adjustment
-- Electric powertrain -> $200 shipping adjustment
INSERT INTO public.attribute_price_adjustments (
    attribute_type, attribute_id, context, amount_usd, reason_en, reason_ar, is_active, display_order
)
SELECT 'vehicle_condition', 'non_runner', 'towing', 150.00, 'Non-runner loading & winch fee', 'رسوم سحب وونش تحميل لمركبة لا تعمل', true, 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.attribute_price_adjustments 
    WHERE attribute_type = 'vehicle_condition' AND attribute_id = 'non_runner' AND context = 'towing'
);

INSERT INTO public.attribute_price_adjustments (
    attribute_type, attribute_id, context, amount_usd, reason_en, reason_ar, is_active, display_order
)
SELECT 'vehicle_condition', 'salvage_damaged', 'towing', 250.00, 'Salvage forklift & specialized handling fee', 'رسوم تحميل رافعة شوكية وتجهيزات خاصة للمركبات المتضررة', true, 2
WHERE NOT EXISTS (
    SELECT 1 FROM public.attribute_price_adjustments 
    WHERE attribute_type = 'vehicle_condition' AND attribute_id = 'salvage_damaged' AND context = 'towing'
);

INSERT INTO public.attribute_price_adjustments (
    attribute_type, attribute_id, context, amount_usd, reason_en, reason_ar, is_active, display_order
)
SELECT 'powertrain', 'electric', 'shipping', 200.00, 'Electric vehicle (EV) maritime hazardous battery handling', 'رسوم مناولة بطاريات خطرة للمركبات الكهربائية على متن السفن', true, 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.attribute_price_adjustments 
    WHERE attribute_type = 'powertrain' AND attribute_id = 'electric' AND context = 'shipping'
);

-- 4. EXTEND ADDITIONAL CHARGE RULES TABLE
ALTER TABLE public.additional_charge_rules
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS name_ar TEXT,
    ADD COLUMN IF NOT EXISTS description_en TEXT,
    ADD COLUMN IF NOT EXISTS description_ar TEXT,
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS effective_to DATE,
    ADD COLUMN IF NOT EXISTS shipping_method_id TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_category_id TEXT,
    ADD COLUMN IF NOT EXISTS powertrain_id TEXT,
    ADD COLUMN IF NOT EXISTS condition_id TEXT,
    ADD COLUMN IF NOT EXISTS is_included_in_cif BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_separate_charge BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.additional_charge_rules
SET code = 'UAE_CUSTOMS_CLEARANCE',
    name_ar = 'التخليص الجمركي والمعاملات في الإمارات',
    description_en = 'Official UAE customs clearance entry, validation, and documentation fee.',
    description_ar = 'رسوم التخليص الجمركي الرسمي، المعاينة، وإعداد البيان الجمركي في دولة الإمارات.',
    display_order = 1
WHERE category = 'customs_clearance' AND (code IS NULL OR code = '');

UPDATE public.additional_charge_rules
SET code = 'UAE_PORT_HANDLING',
    name_ar = 'رسوم إذن التسليم ومناولة الميناء',
    description_en = 'Port terminal receipt, container destuffing, and delivery order charges.',
    description_ar = 'رسوم استلام الميناء وتفريغ الحاويات وإذن التسليم الملاحي في الميناء الإماراتي.',
    display_order = 2
WHERE category = 'port_handling' AND (code IS NULL OR code = '');

-- 5. RLS POLICIES FOR NEW & EXTENDED TABLES
ALTER TABLE public.vehicle_category_compatibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_price_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active category compatibilities" ON public.vehicle_category_compatibilities;
CREATE POLICY "Public can view active category compatibilities"
ON public.vehicle_category_compatibilities FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Staff can view all category compatibilities" ON public.vehicle_category_compatibilities;
CREATE POLICY "Staff can view all category compatibilities"
ON public.vehicle_category_compatibilities FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view') OR public.has_permission('pricing.manage'));

DROP POLICY IF EXISTS "Staff can manage category compatibilities" ON public.vehicle_category_compatibilities;
CREATE POLICY "Staff can manage category compatibilities"
ON public.vehicle_category_compatibilities FOR ALL
TO authenticated
USING (public.has_permission('pricing.manage'))
WITH CHECK (public.has_permission('pricing.manage'));

DROP POLICY IF EXISTS "Public can view active attribute price adjustments" ON public.attribute_price_adjustments;
CREATE POLICY "Public can view active attribute price adjustments"
ON public.attribute_price_adjustments FOR SELECT
USING (
    is_active = true
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
);

DROP POLICY IF EXISTS "Staff can view all attribute price adjustments" ON public.attribute_price_adjustments;
CREATE POLICY "Staff can view all attribute price adjustments"
ON public.attribute_price_adjustments FOR SELECT
TO authenticated
USING (public.has_permission('pricing.view') OR public.has_permission('pricing.manage'));

DROP POLICY IF EXISTS "Staff can manage attribute price adjustments" ON public.attribute_price_adjustments;
CREATE POLICY "Staff can manage attribute price adjustments"
ON public.attribute_price_adjustments FOR ALL
TO authenticated
USING (public.has_permission('pricing.manage'))
WITH CHECK (public.has_permission('pricing.manage'));

-- Ensure staff can manage additional_charge_rules
DROP POLICY IF EXISTS "Staff can manage additional charge rules" ON public.additional_charge_rules;
CREATE POLICY "Staff can manage additional charge rules"
ON public.additional_charge_rules FOR ALL
TO authenticated
USING (public.has_permission('pricing.manage'))
WITH CHECK (public.has_permission('pricing.manage'));

-- 6. AVAILABILITY RPC WITH CATEGORY COMPATIBILITY FILTERING
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
    
    v_locations JSONB := '[]'::JSONB;
    v_origin_ports JSONB := '[]'::JSONB;
    v_dest_ports JSONB := '[]'::JSONB;
    v_methods JSONB := '[]'::JSONB;
    v_eligible_powertrains JSONB := '[]'::JSONB;
    v_eligible_conditions JSONB := '[]'::JSONB;
    v_category_adjustments JSONB := '[]'::JSONB;
    v_current_route RECORD;
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

    -- Eligible Powertrains: If specific compatibilities configured for this category, restrict to mapped ones; otherwise all active
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

    -- Eligible Conditions: If specific compatibilities configured, restrict to mapped ones; otherwise all active
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

    -- 2. Eligible Pickup Locations
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', loc.id,
                'name', loc.name,
                'state_code', loc.state_code,
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
            pl.state_code, 
            pl.purchase_source_id,
            COUNT(DISTINCT tr.loading_port_id) AS ports_count
        FROM public.purchase_locations pl
        JOIN public.towing_rates tr ON pl.id = tr.purchase_location_id
        JOIN public.ports p ON tr.loading_port_id = p.id
        WHERE pl.is_active = true
          AND tr.is_active = true
          AND p.is_active = true
          AND p.is_loading_port = true
          AND tr.effective_from <= CURRENT_DATE
          AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
          AND (tr.vehicle_category_id IS NULL OR tr.vehicle_category_id = v_category_id)
          AND (tr.vehicle_condition_id IS NULL OR tr.vehicle_condition_id = v_condition_id)
          AND (v_purchase_source_id IS NULL OR pl.purchase_source_id = v_purchase_source_id)
        GROUP BY pl.id, pl.name, pl.state_code, pl.purchase_source_id
    ) loc;

    -- 3. Eligible Origin Loading Ports
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
          AND EXISTS (
              SELECT 1 FROM public.shipping_routes sr 
              WHERE sr.origin_port_id = p.id AND sr.is_active = true
          );
    END IF;

    -- 4. Eligible Destination Ports
    IF v_origin_port_id IS NOT NULL THEN
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'name_ar', p.name_ar,
                    'code', p.code,
                    'state_or_city', p.state_or_city,
                    'country_code', p.country_code,
                    'route_id', sr.id,
                    'transit_days_min', sr.transit_days_min,
                    'transit_days_max', sr.transit_days_max
                ) ORDER BY p.name ASC
            ),
            '[]'::JSONB
        )
        INTO v_dest_ports
        FROM public.shipping_routes sr
        JOIN public.ports p ON sr.destination_port_id = p.id
        WHERE sr.origin_port_id = v_origin_port_id
          AND sr.is_active = true
          AND p.is_active = true
          AND p.is_destination_port = true;
    END IF;

    -- 5. Eligible Shipping Methods
    IF v_origin_port_id IS NOT NULL AND v_destination_port_id IS NOT NULL THEN
        SELECT * INTO v_current_route
        FROM public.shipping_routes
        WHERE origin_port_id = v_origin_port_id
          AND destination_port_id = v_destination_port_id
          AND is_active = true
        LIMIT 1;

        IF FOUND THEN
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', sm.id,
                        'name', sm.name,
                        'base_amount', fr.base_amount,
                        'currency', fr.currency
                    ) ORDER BY sm.name ASC
                ),
                '[]'::JSONB
            )
            INTO v_methods
            FROM (
                SELECT DISTINCT ON (rfr.shipping_method_id)
                    rfr.shipping_method_id,
                    rfr.base_amount,
                    rfr.currency
                FROM public.route_freight_rates rfr
                WHERE rfr.route_id = v_current_route.id
                  AND rfr.is_active = true
                  AND rfr.effective_from <= CURRENT_DATE
                  AND (rfr.effective_to IS NULL OR rfr.effective_to >= CURRENT_DATE)
                  AND rfr.vehicle_category_id = v_category_id
                  AND (rfr.powertrain_id = v_powertrain_id OR rfr.powertrain_id = 'petrol')
                ORDER BY rfr.shipping_method_id, (CASE WHEN rfr.powertrain_id = v_powertrain_id THEN 0 ELSE 1 END)
            ) fr
            JOIN public.shipping_methods sm ON fr.shipping_method_id = sm.id
            WHERE sm.is_active = true;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'eligible_pickup_locations', v_locations,
        'eligible_origin_ports', v_origin_ports,
        'eligible_destination_ports', v_dest_ports,
        'eligible_shipping_methods', v_methods,
        'eligible_powertrains', v_eligible_powertrains,
        'eligible_conditions', v_eligible_conditions,
        'applicable_adjustments', v_category_adjustments
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_calculator_availability_v1(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_calculator_availability_v1(JSONB) TO anon, authenticated;

-- 7. CALCULATION RPC WITH GRANULAR ADJUSTMENTS & SURCHARGES
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
        v_purchase_location_city := NULL;
        v_purchase_location_state := v_purchase_location.state_code;
        
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

    v_ocean_freight_base := v_freight_record.base_amount;

    -- 7. Inland Towing Base Tariff Lookup (NO FABRICATED FALLBACK)
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
    -- Towing Adjustments
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
                'type', v_adj.attribute_type,
                'context', 'towing',
                'amount_usd', v_adj.amount_usd,
                'reason_en', v_adj.reason_en,
                'reason_ar', v_adj.reason_ar
            );
        END LOOP;
    END IF;

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
            'type', v_adj.attribute_type,
            'context', 'shipping',
            'amount_usd', v_adj.amount_usd,
            'reason_en', v_adj.reason_en,
            'reason_ar', v_adj.reason_ar
        );
    END LOOP;

    v_ocean_freight_total := v_ocean_freight_base + v_ocean_freight_adj;
    v_towing_total_min := v_towing_base_min + v_towing_adj;
    v_towing_total_max := v_towing_base_max + v_towing_adj;

    -- 9. Authoritative Additional Surcharges & Destination Port Charges
    FOR v_surcharge IN
        SELECT * FROM public.additional_charge_rules
        WHERE is_active = true
          AND is_archived = false
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
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

        v_surcharge_list := v_surcharge_list || jsonb_build_object(
            'id', v_surcharge.id,
            'code', v_surcharge.code,
            'name', v_surcharge.name,
            'name_ar', v_surcharge.name_ar,
            'category', v_surcharge.category,
            'amount_usd', v_surcharge.amount,
            'is_mandatory', v_surcharge.is_mandatory,
            'is_included_in_cif', v_surcharge.is_included_in_cif,
            'is_included_in_vat_base', v_surcharge.is_included_in_vat_base
        );
    END LOOP;

    -- 10. Exchange Rate
    SELECT rate INTO v_exchange_rate
    FROM public.exchange_rates
    WHERE from_currency = 'USD' AND to_currency = 'AED' AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
        v_exchange_rate := 3.6725;
    END IF;

    -- 11. CIF, Customs Duty (5%), and Import VAT (5%) Calculation
    v_cif_min := ROUND(v_declared_value_usd + v_ocean_freight_total + v_towing_total_min + v_cif_surcharges, 2);
    v_cif_max := ROUND(v_declared_value_usd + v_ocean_freight_total + v_towing_total_max + v_cif_surcharges, 2);

    -- Statutory Customs Duty (5% of CIF)
    v_duty_min := ROUND(v_cif_min * 0.05, 2);
    v_duty_max := ROUND(v_cif_max * 0.05, 2);

    -- VAT Taxable Base = CIF + Customs Duty + any statutory charges designated in VAT Base
    v_vat_base_min := ROUND(v_cif_min + v_duty_min + v_non_cif_vat_surcharges, 2);
    v_vat_base_max := ROUND(v_cif_max + v_duty_max + v_non_cif_vat_surcharges, 2);

    -- UAE Import VAT (5% of VAT Base)
    v_vat_min := ROUND(v_vat_base_min * 0.05, 2);
    v_vat_max := ROUND(v_vat_base_max * 0.05, 2);

    -- Total shipping & clearance charges payable (Excludes vehicle declared value):
    v_total_usd_min := ROUND(
        v_ocean_freight_total + v_towing_total_min + v_total_surcharges + 
        v_duty_min + v_vat_min, 2
    );

    v_total_usd_max := ROUND(
        v_ocean_freight_total + v_towing_total_max + v_total_surcharges + 
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

    -- 12. Construct Immutable Line Items
    -- 12.1 Base Ocean Freight
    v_line_items := v_line_items || jsonb_build_object(
        'category', 'ocean_freight_base',
        'description', 'Base Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')',
        'amount_usd', v_ocean_freight_base
    );

    -- 12.2 Ocean Freight Adjustments (if any)
    FOR v_adj IN
        SELECT * FROM jsonb_to_recordset(v_adj_list) AS x(
            id UUID, type TEXT, context TEXT, amount_usd NUMERIC, reason_en TEXT, reason_ar TEXT
        )
        WHERE x.context = 'shipping'
    LOOP
        v_line_items := v_line_items || jsonb_build_object(
            'category', 'shipping_adjustment',
            'description', 'Shipping Adjustment: ' || v_adj.reason_en,
            'description_ar', v_adj.reason_ar,
            'amount_usd', v_adj.amount_usd
        );
    END LOOP;

    -- 12.3 Base Inland Towing
    v_line_items := v_line_items || jsonb_build_object(
        'category', 'inland_towing_base',
        'description', v_towing_description,
        'amount_usd_min', v_towing_base_min,
        'amount_usd_max', v_towing_base_max,
        'is_range', v_is_towing_range,
        'is_requested', v_include_inland_towing
    );

    -- 12.4 Towing Adjustments (if any)
    FOR v_adj IN
        SELECT * FROM jsonb_to_recordset(v_adj_list) AS x(
            id UUID, type TEXT, context TEXT, amount_usd NUMERIC, reason_en TEXT, reason_ar TEXT
        )
        WHERE x.context = 'towing'
    LOOP
        v_line_items := v_line_items || jsonb_build_object(
            'category', 'towing_adjustment',
            'description', 'Towing Adjustment: ' || v_adj.reason_en,
            'description_ar', v_adj.reason_ar,
            'amount_usd', v_adj.amount_usd
        );
    END LOOP;

    -- 12.5 Port Surcharges & Terminal Handling
    FOR v_surcharge IN
        SELECT * FROM jsonb_to_recordset(v_surcharge_list) AS s(
            id UUID, code TEXT, name TEXT, name_ar TEXT, category TEXT, amount_usd NUMERIC, is_mandatory BOOLEAN, is_included_in_cif BOOLEAN, is_included_in_vat_base BOOLEAN
        )
    LOOP
        v_line_items := v_line_items || jsonb_build_object(
            'category', v_surcharge.category,
            'code', v_surcharge.code,
            'description', v_surcharge.name,
            'description_ar', v_surcharge.name_ar,
            'amount_usd', v_surcharge.amount_usd
        );
    END LOOP;

    -- 12.6 Statutory UAE Customs Duty & Import VAT
    v_line_items := v_line_items || jsonb_build_object(
        'category', 'customs_duty',
        'description', 'UAE Customs Duty (5% of CIF)',
        'amount_usd_min', v_duty_min,
        'amount_usd_max', v_duty_max
    );

    v_line_items := v_line_items || jsonb_build_object(
        'category', 'import_vat',
        'description', 'UAE Import VAT (5% of VAT Base)',
        'amount_usd_min', v_vat_min,
        'amount_usd_max', v_vat_max
    );

    -- 13. Active Quotation Rules Snapshot
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

    -- 14. Immutable Pricing Snapshot
    v_pricing_snapshot := jsonb_build_object(
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'calculation_timestamp', NOW(),
        'calculation_engine_version', 'v3',
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
            'base_fee_min', v_towing_base_min,
            'base_fee_max', v_towing_base_max,
            'adjustments_fee', v_towing_adj,
            'fee_min', v_towing_total_min,
            'fee_max', v_towing_total_max,
            'is_range', v_is_towing_range,
            'description', v_towing_description
        ),
        'adjustments', v_adj_list,
        'surcharges_list', v_surcharge_list,
        'financials', jsonb_build_object(
            'currency', 'USD',
            'exchange_rate', v_exchange_rate,
            'declared_value_usd', v_declared_value_usd,
            'include_inland_towing', v_include_inland_towing,
            'ocean_freight_base', v_ocean_freight_base,
            'ocean_freight_adjustments', v_ocean_freight_adj,
            'subtotal_ocean_freight', v_ocean_freight_total,
            'towing_fee_base_min', v_towing_base_min,
            'towing_fee_base_max', v_towing_base_max,
            'towing_adjustments', v_towing_adj,
            'towing_fee_min', v_towing_total_min,
            'towing_fee_max', v_towing_total_max,
            'is_towing_range', v_is_towing_range,
            'surcharges_total', v_total_surcharges,
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

    -- 15. Atomic Persistence
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
        v_ocean_freight_total, v_towing_total_min, v_towing_total_max, v_is_towing_range,
        v_customs_clearance_fee, v_port_handling_fee,
        v_cif_min, v_duty_min, v_vat_base_min, v_vat_min,
        v_total_usd_min, v_total_usd_max,
        v_total_aed_min, v_total_aed_max,
        v_disclaimer
    ) RETURNING id INTO v_quotation_id;

    -- Line Items Persistence
    FOR v_adj IN SELECT * FROM jsonb_array_elements(v_line_items) AS elem
    LOOP
        INSERT INTO public.quotation_line_items (
            quotation_id,
            category,
            description,
            amount,
            currency
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
        'is_idempotent_replay', false,
        'quotation_id', v_quotation_id,
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'snapshot', v_pricing_snapshot
    );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_shipping_quote_v1(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) TO anon, authenticated, service_role;

-- 8. SAFE DELETION HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.delete_vehicle_attribute(p_type TEXT, p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_ref_count INT := 0;
BEGIN
    IF NOT (public.has_permission('pricing.manage')) THEN
        RAISE EXCEPTION 'Unauthorized: Requires pricing.manage permission.';
    END IF;

    IF p_type = 'vehicle_category' THEN
        SELECT COUNT(*) INTO v_ref_count FROM public.route_freight_rates WHERE vehicle_category_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced by ' || v_ref_count || ' ocean freight tariff(s). Deactivate or archive instead.');
        END IF;

        SELECT COUNT(*) INTO v_ref_count FROM public.towing_rates WHERE vehicle_category_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced by ' || v_ref_count || ' inland towing tariff(s). Deactivate or archive instead.');
        END IF;

        SELECT COUNT(*) INTO v_ref_count FROM public.customer_vehicles WHERE vehicle_category_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced in historical customer vehicles. Archive instead.');
        END IF;

        DELETE FROM public.vehicle_category_compatibilities WHERE vehicle_category_id = p_id;
        DELETE FROM public.attribute_price_adjustments WHERE attribute_type = 'vehicle_category' AND attribute_id = p_id;
        DELETE FROM public.vehicle_categories WHERE id = p_id;
        RETURN jsonb_build_object('success', true, 'can_delete', true);

    ELSIF p_type = 'powertrain' THEN
        SELECT COUNT(*) INTO v_ref_count FROM public.route_freight_rates WHERE powertrain_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced by ' || v_ref_count || ' ocean freight tariff(s). Deactivate or archive instead.');
        END IF;

        SELECT COUNT(*) INTO v_ref_count FROM public.customer_vehicles WHERE powertrain_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced in historical customer vehicles. Archive instead.');
        END IF;

        DELETE FROM public.vehicle_category_compatibilities WHERE target_type = 'powertrain' AND target_id = p_id;
        DELETE FROM public.attribute_price_adjustments WHERE attribute_type = 'powertrain' AND attribute_id = p_id;
        DELETE FROM public.powertrains WHERE id = p_id;
        RETURN jsonb_build_object('success', true, 'can_delete', true);

    ELSIF p_type = 'vehicle_condition' THEN
        SELECT COUNT(*) INTO v_ref_count FROM public.towing_rates WHERE vehicle_condition_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced by ' || v_ref_count || ' inland towing tariff(s). Deactivate or archive instead.');
        END IF;

        SELECT COUNT(*) INTO v_ref_count FROM public.customer_vehicles WHERE condition_id = p_id;
        IF v_ref_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Referenced in historical customer vehicles. Archive instead.');
        END IF;

        DELETE FROM public.vehicle_category_compatibilities WHERE target_type = 'condition' AND target_id = p_id;
        DELETE FROM public.attribute_price_adjustments WHERE attribute_type = 'vehicle_condition' AND attribute_id = p_id;
        DELETE FROM public.vehicle_conditions WHERE id = p_id;
        RETURN jsonb_build_object('success', true, 'can_delete', true);
    ELSE
        RAISE EXCEPTION 'Invalid attribute type: %', p_type;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_vehicle_attribute(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_vehicle_attribute(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_additional_charge_rule(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_rule RECORD;
    v_ref_count INT := 0;
BEGIN
    IF NOT (public.has_permission('pricing.manage')) THEN
        RAISE EXCEPTION 'Unauthorized: Requires pricing.manage permission.';
    END IF;

    SELECT * INTO v_rule FROM public.additional_charge_rules WHERE id = p_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'can_delete', false, 'reason', 'Surcharge rule not found.');
    END IF;

    -- Check if rule has been used in line items
    SELECT COUNT(*) INTO v_ref_count 
    FROM public.quotation_line_items 
    WHERE category = v_rule.category;

    IF v_ref_count > 0 THEN
        UPDATE public.additional_charge_rules
        SET is_active = false, is_archived = true, updated_at = NOW()
        WHERE id = p_id;

        RETURN jsonb_build_object('success', true, 'archived', true, 'can_delete', false, 'reason', 'Surcharge was archived because it is referenced in ' || v_ref_count || ' historical quotation line item(s).');
    END IF;

    DELETE FROM public.additional_charge_rules WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'can_delete', true, 'archived', false);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_additional_charge_rule(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_additional_charge_rule(UUID) TO authenticated;
