-- ==============================================================================
-- Migration: 20260915224000_rls_and_calculation_engine.sql
-- Description: Row Level Security policies, indexes, and authoritative calculation engine
-- ==============================================================================

-- ==============================================================================
-- 1. Enable Row Level Security (RLS) on ALL tables
-- ==============================================================================

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powertrains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.route_freight_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.towing_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surcharge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_charge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. Performance Covering Indexes for Foreign Keys
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_fk_additional_charge_rules_country ON public.additional_charge_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_fk_additional_charge_rules_dest_port ON public.additional_charge_rules(destination_port_id);
CREATE INDEX IF NOT EXISTS idx_fk_audit_events_performed_by ON public.audit_events(performed_by);
CREATE INDEX IF NOT EXISTS idx_fk_customer_vehicles_condition ON public.customer_vehicles(condition_id);
CREATE INDEX IF NOT EXISTS idx_fk_customer_vehicles_powertrain ON public.customer_vehicles(powertrain_id);
CREATE INDEX IF NOT EXISTS idx_fk_customer_vehicles_category ON public.customer_vehicles(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_fk_destination_tax_rules_country ON public.destination_tax_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_fk_enquiries_customer ON public.enquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_fk_enquiry_status_history_changed_by ON public.enquiry_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_fk_exchange_rates_created_by ON public.exchange_rates(created_by);
CREATE INDEX IF NOT EXISTS idx_fk_purchase_locations_port ON public.purchase_locations(default_loading_port_id);
CREATE INDEX IF NOT EXISTS idx_fk_quotations_route ON public.quotations(route_id);
CREATE INDEX IF NOT EXISTS idx_fk_role_permissions_permission ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_fk_route_freight_rates_powertrain ON public.route_freight_rates(powertrain_id);
CREATE INDEX IF NOT EXISTS idx_fk_route_freight_rates_method ON public.route_freight_rates(shipping_method_id);
CREATE INDEX IF NOT EXISTS idx_fk_route_freight_rates_category ON public.route_freight_rates(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_fk_staff_role_assignments_assigned_by ON public.staff_role_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_fk_staff_role_assignments_role ON public.staff_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_fk_surcharge_rules_powertrain ON public.surcharge_rules(powertrain_id);
CREATE INDEX IF NOT EXISTS idx_fk_surcharge_rules_category ON public.surcharge_rules(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_fk_surcharge_rules_condition ON public.surcharge_rules(vehicle_condition_id);
CREATE INDEX IF NOT EXISTS idx_fk_towing_rates_port ON public.towing_rates(loading_port_id);
CREATE INDEX IF NOT EXISTS idx_fk_towing_rates_category ON public.towing_rates(vehicle_category_id);
CREATE INDEX IF NOT EXISTS idx_fk_towing_rates_condition ON public.towing_rates(vehicle_condition_id);

-- ==============================================================================
-- 3. Reference & Routing Tables RLS Policies
-- ==============================================================================

CREATE POLICY "Public can view active countries" ON public.countries FOR SELECT USING (is_active = true OR public.has_permission('routes.view'));
CREATE POLICY "Staff can insert countries" ON public.countries FOR INSERT TO authenticated WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can update countries" ON public.countries FOR UPDATE TO authenticated USING (public.has_permission('routes.manage')) WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can delete countries" ON public.countries FOR DELETE TO authenticated USING (public.has_permission('routes.manage'));

CREATE POLICY "Public can view active ports" ON public.ports FOR SELECT USING (is_active = true OR public.has_permission('routes.view'));
CREATE POLICY "Staff can insert ports" ON public.ports FOR INSERT TO authenticated WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can update ports" ON public.ports FOR UPDATE TO authenticated USING (public.has_permission('routes.manage')) WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can delete ports" ON public.ports FOR DELETE TO authenticated USING (public.has_permission('routes.manage'));

CREATE POLICY "Public can view active vehicle categories" ON public.vehicle_categories FOR SELECT USING (is_active = true OR public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert vehicle categories" ON public.vehicle_categories FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update vehicle categories" ON public.vehicle_categories FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete vehicle categories" ON public.vehicle_categories FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Public can view active powertrains" ON public.powertrains FOR SELECT USING (is_active = true OR public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert powertrains" ON public.powertrains FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update powertrains" ON public.powertrains FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete powertrains" ON public.powertrains FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Public can view active vehicle conditions" ON public.vehicle_conditions FOR SELECT USING (is_active = true OR public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert vehicle conditions" ON public.vehicle_conditions FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update vehicle conditions" ON public.vehicle_conditions FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete vehicle conditions" ON public.vehicle_conditions FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Public can view active purchase sources" ON public.purchase_sources FOR SELECT USING (is_active = true OR public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert purchase sources" ON public.purchase_sources FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update purchase sources" ON public.purchase_sources FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete purchase sources" ON public.purchase_sources FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Public can view active purchase locations" ON public.purchase_locations FOR SELECT USING (is_active = true OR public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert purchase locations" ON public.purchase_locations FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update purchase locations" ON public.purchase_locations FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete purchase locations" ON public.purchase_locations FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Public can view active shipping methods" ON public.shipping_methods FOR SELECT USING (is_active = true OR public.has_permission('routes.view'));
CREATE POLICY "Staff can insert shipping methods" ON public.shipping_methods FOR INSERT TO authenticated WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can update shipping methods" ON public.shipping_methods FOR UPDATE TO authenticated USING (public.has_permission('routes.manage')) WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can delete shipping methods" ON public.shipping_methods FOR DELETE TO authenticated USING (public.has_permission('routes.manage'));

CREATE POLICY "Public can view active shipping routes" ON public.shipping_routes FOR SELECT USING (is_active = true OR public.has_permission('routes.view'));
CREATE POLICY "Staff can insert shipping routes" ON public.shipping_routes FOR INSERT TO authenticated WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can update shipping routes" ON public.shipping_routes FOR UPDATE TO authenticated USING (public.has_permission('routes.manage')) WITH CHECK (public.has_permission('routes.manage'));
CREATE POLICY "Staff can delete shipping routes" ON public.shipping_routes FOR DELETE TO authenticated USING (public.has_permission('routes.manage'));

-- ==============================================================================
-- 4. RBAC & Staff Profiles RLS Policies
-- ==============================================================================

CREATE POLICY "Staff can view own profile or view all if authorized" ON public.staff_profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()) OR public.has_permission('staff.view'));
CREATE POLICY "Staff can update own profile" ON public.staff_profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()) OR public.has_permission('staff.manage')) WITH CHECK (id = (SELECT auth.uid()) OR public.has_permission('staff.manage'));
CREATE POLICY "Staff can insert staff profiles" ON public.staff_profiles FOR INSERT TO authenticated WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can delete staff profiles" ON public.staff_profiles FOR DELETE TO authenticated USING (public.has_permission('staff.manage'));

CREATE POLICY "Staff can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can update roles" ON public.roles FOR UPDATE TO authenticated USING (public.has_permission('staff.manage')) WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can delete roles" ON public.roles FOR DELETE TO authenticated USING (public.has_permission('staff.manage'));

CREATE POLICY "Staff can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert role permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can update role permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_permission('staff.manage')) WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can delete role permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_permission('staff.manage'));

CREATE POLICY "Staff can view staff role assignments" ON public.staff_role_assignments FOR SELECT TO authenticated USING (staff_id = (SELECT auth.uid()) OR public.has_permission('staff.view'));
CREATE POLICY "Staff can insert staff role assignments" ON public.staff_role_assignments FOR INSERT TO authenticated WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can update staff role assignments" ON public.staff_role_assignments FOR UPDATE TO authenticated USING (public.has_permission('staff.manage')) WITH CHECK (public.has_permission('staff.manage'));
CREATE POLICY "Staff can delete staff role assignments" ON public.staff_role_assignments FOR DELETE TO authenticated USING (public.has_permission('staff.manage'));

-- ==============================================================================
-- 5. Pricing & Tariffs RLS Policies
-- ==============================================================================

CREATE POLICY "Staff can view freight rates" ON public.route_freight_rates FOR SELECT TO authenticated USING (public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert freight rates" ON public.route_freight_rates FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update freight rates" ON public.route_freight_rates FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete freight rates" ON public.route_freight_rates FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Staff can view towing rates" ON public.towing_rates FOR SELECT TO authenticated USING (public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert towing rates" ON public.towing_rates FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update towing rates" ON public.towing_rates FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete towing rates" ON public.towing_rates FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Staff can view surcharge rules" ON public.surcharge_rules FOR SELECT TO authenticated USING (public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert surcharge rules" ON public.surcharge_rules FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update surcharge rules" ON public.surcharge_rules FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete surcharge rules" ON public.surcharge_rules FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Staff can view destination tax rules" ON public.destination_tax_rules FOR SELECT TO authenticated USING (public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert destination tax rules" ON public.destination_tax_rules FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update destination tax rules" ON public.destination_tax_rules FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete destination tax rules" ON public.destination_tax_rules FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Staff can view additional charge rules" ON public.additional_charge_rules FOR SELECT TO authenticated USING (public.has_permission('pricing.view'));
CREATE POLICY "Staff can insert additional charge rules" ON public.additional_charge_rules FOR INSERT TO authenticated WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can update additional charge rules" ON public.additional_charge_rules FOR UPDATE TO authenticated USING (public.has_permission('pricing.manage')) WITH CHECK (public.has_permission('pricing.manage'));
CREATE POLICY "Staff can delete additional charge rules" ON public.additional_charge_rules FOR DELETE TO authenticated USING (public.has_permission('pricing.manage'));

CREATE POLICY "Public can view active exchange rates" ON public.exchange_rates FOR SELECT USING (is_active = true OR public.has_permission('settings.view'));
CREATE POLICY "Staff can insert exchange rates" ON public.exchange_rates FOR INSERT TO authenticated WITH CHECK (public.has_permission('settings.manage'));
CREATE POLICY "Staff can update exchange rates" ON public.exchange_rates FOR UPDATE TO authenticated USING (public.has_permission('settings.manage')) WITH CHECK (public.has_permission('settings.manage'));
CREATE POLICY "Staff can delete exchange rates" ON public.exchange_rates FOR DELETE TO authenticated USING (public.has_permission('settings.manage'));

-- ==============================================================================
-- 6. Customer PII, Enquiries, and Quotations RLS Policies
-- ==============================================================================

CREATE POLICY "Staff can view customers" ON public.customers FOR SELECT TO authenticated USING (public.has_permission('customers.view'));
CREATE POLICY "Staff can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_permission('customers.manage'));
CREATE POLICY "Staff can update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_permission('customers.manage')) WITH CHECK (public.has_permission('customers.manage'));
CREATE POLICY "Staff can delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_permission('customers.manage'));

CREATE POLICY "Staff can view customer vehicles" ON public.customer_vehicles FOR SELECT TO authenticated USING (public.has_permission('customers.view') OR public.has_permission('enquiries.view'));
CREATE POLICY "Staff can insert customer vehicles" ON public.customer_vehicles FOR INSERT TO authenticated WITH CHECK (public.has_permission('customers.manage') OR public.has_permission('enquiries.manage'));
CREATE POLICY "Staff can update customer vehicles" ON public.customer_vehicles FOR UPDATE TO authenticated USING (public.has_permission('customers.manage') OR public.has_permission('enquiries.manage')) WITH CHECK (public.has_permission('customers.manage') OR public.has_permission('enquiries.manage'));
CREATE POLICY "Staff can delete customer vehicles" ON public.customer_vehicles FOR DELETE TO authenticated USING (public.has_permission('customers.manage') OR public.has_permission('enquiries.manage'));

CREATE POLICY "Staff can view enquiries" ON public.enquiries FOR SELECT TO authenticated USING (public.has_permission('enquiries.view'));
CREATE POLICY "Staff can insert enquiries" ON public.enquiries FOR INSERT TO authenticated WITH CHECK (public.has_permission('enquiries.manage'));
CREATE POLICY "Staff can update enquiries" ON public.enquiries FOR UPDATE TO authenticated USING (public.has_permission('enquiries.manage')) WITH CHECK (public.has_permission('enquiries.manage'));
CREATE POLICY "Staff can delete enquiries" ON public.enquiries FOR DELETE TO authenticated USING (public.has_permission('enquiries.manage'));

CREATE POLICY "Staff can view enquiry status history" ON public.enquiry_status_history FOR SELECT TO authenticated USING (public.has_permission('enquiries.view'));
CREATE POLICY "Staff can insert enquiry status history" ON public.enquiry_status_history FOR INSERT TO authenticated WITH CHECK (public.has_permission('enquiries.manage'));

CREATE POLICY "Staff can view quotations" ON public.quotations FOR SELECT TO authenticated USING (public.has_permission('quotations.view'));
CREATE POLICY "Staff can insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (public.has_permission('quotations.manage'));
CREATE POLICY "Staff can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (public.has_permission('quotations.manage')) WITH CHECK (public.has_permission('quotations.manage'));
CREATE POLICY "Staff can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (public.has_permission('quotations.manage'));

CREATE POLICY "Staff can view quotation line items" ON public.quotation_line_items FOR SELECT TO authenticated USING (public.has_permission('quotations.view'));
CREATE POLICY "Staff can insert quotation line items" ON public.quotation_line_items FOR INSERT TO authenticated WITH CHECK (public.has_permission('quotations.manage'));
CREATE POLICY "Staff can update quotation line items" ON public.quotation_line_items FOR UPDATE TO authenticated USING (public.has_permission('quotations.manage')) WITH CHECK (public.has_permission('quotations.manage'));
CREATE POLICY "Staff can delete quotation line items" ON public.quotation_line_items FOR DELETE TO authenticated USING (public.has_permission('quotations.manage'));

CREATE POLICY "Staff can view audit events" ON public.audit_events FOR SELECT TO authenticated USING (public.has_permission('audit.view'));
CREATE POLICY "Staff can insert audit events" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (true);

-- ==============================================================================
-- 7. Authoritative Calculation Engine: calculate_shipping_quote_v1
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.calculate_shipping_quote_v1(input_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
    v_customer_name TEXT;
    v_phone TEXT;
    v_email TEXT;
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
    v_notes TEXT;
    v_idempotency_key TEXT;

    v_origin_port RECORD;
    v_dest_port RECORD;
    v_route RECORD;
    v_freight_record RECORD;
    v_towing_record RECORD;
    v_category RECORD;
    v_powertrain RECORD;

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
    v_idempotency_key := NULLIF(TRIM(input_json->>'idempotency_key'), '');
    IF v_idempotency_key IS NOT NULL THEN
        SELECT q.*, e.reference_number AS enquiry_reference
        INTO v_existing_quote
        FROM public.quotations q
        JOIN public.enquiries e ON q.enquiry_id = e.id
        WHERE q.idempotency_key = v_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_idempotent_replay', true,
                'quotation_id', v_existing_quote.id,
                'quotation_reference', v_existing_quote.reference_number,
                'enquiry_reference', v_existing_quote.enquiry_reference,
                'snapshot', v_existing_quote.pricing_snapshot
            );
        END IF;
    END IF;

    v_customer_name := TRIM(COALESCE(input_json->>'customer_name', ''));
    v_phone := TRIM(COALESCE(input_json->>'phone', ''));
    v_email := NULLIF(TRIM(COALESCE(input_json->>'email', '')), '');
    v_make := NULLIF(TRIM(COALESCE(input_json->>'make', '')), '');
    v_model := NULLIF(TRIM(COALESCE(input_json->>'model', '')), '');
    v_year := (input_json->>'year')::INT;
    v_notes := NULLIF(TRIM(COALESCE(input_json->>'notes', '')), '');

    IF LENGTH(v_customer_name) < 2 THEN
        RAISE EXCEPTION 'Customer full name is required and must be at least 2 characters.';
    END IF;

    IF LENGTH(v_phone) < 6 THEN
        RAISE EXCEPTION 'Customer phone number is required and must be valid.';
    END IF;

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

    SELECT * INTO v_route
    FROM public.shipping_routes
    WHERE origin_port_id = v_origin_port_id
      AND destination_port_id = v_destination_port_id
      AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active shipping route exists between % and %.', v_origin_port.name, v_dest_port.name;
    END IF;

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

    IF v_condition_id = 'non_runner' THEN
        v_surcharges_total := v_surcharges_total + 150.00;
    ELSIF v_condition_id = 'salvage_damaged' THEN
        v_surcharges_total := v_surcharges_total + 250.00;
    END IF;

    IF v_powertrain_id = 'electric' THEN
        v_surcharges_total := v_surcharges_total + 200.00;
    END IF;

    SELECT rate INTO v_exchange_rate
    FROM public.exchange_rates
    WHERE from_currency = 'USD' AND to_currency = 'AED' AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
        v_exchange_rate := 3.6725;
    END IF;

    v_cif_min := ROUND(v_declared_value_usd + v_ocean_freight + v_surcharges_total + v_towing_min, 2);
    v_cif_max := ROUND(v_declared_value_usd + v_ocean_freight + v_surcharges_total + v_towing_max, 2);

    v_duty_min := ROUND(v_cif_min * 0.05, 2);
    v_duty_max := ROUND(v_cif_max * 0.05, 2);

    v_vat_base_min := ROUND(v_cif_min + v_duty_min + v_vatable_port_charges, 2);
    v_vat_base_max := ROUND(v_cif_max + v_duty_max + v_vatable_port_charges, 2);

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

    v_line_items := jsonb_build_array(
        jsonb_build_object('category', 'ocean_freight', 'description', 'Ocean Freight (' || v_origin_port.name || ' to ' || v_dest_port.name || ')', 'amount_usd', v_ocean_freight),
        jsonb_build_object('category', 'towing', 'description', v_towing_description, 'amount_usd_min', v_towing_min, 'amount_usd_max', v_towing_max, 'is_range', v_is_towing_range),
        jsonb_build_object('category', 'surcharges', 'description', 'Vehicle Condition & Fuel Surcharges', 'amount_usd', v_surcharges_total),
        jsonb_build_object('category', 'customs_clearance', 'description', 'UAE Customs Clearance & Documentation', 'amount_usd', v_customs_clearance_fee),
        jsonb_build_object('category', 'port_handling', 'description', 'Destination Port Terminal Handling & Delivery Order', 'amount_usd', v_port_handling_fee),
        jsonb_build_object('category', 'customs_duty', 'description', 'UAE Customs Duty (5% of CIF)', 'amount_usd_min', v_duty_min, 'amount_usd_max', v_duty_max),
        jsonb_build_object('category', 'import_vat', 'description', 'UAE Import VAT (5% of VAT Base)', 'amount_usd_min', v_vat_min, 'amount_usd_max', v_vat_max)
    );

    v_pricing_snapshot := jsonb_build_object(
        'quotation_reference', v_quote_ref,
        'enquiry_reference', v_enquiry_ref,
        'calculation_timestamp', NOW(),
        'calculation_engine_version', 'v1',
        'customer', jsonb_build_object(
            'full_name', v_customer_name,
            'phone', v_phone,
            'email', v_email
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
            'declared_value_usd', v_declared_value_usd
        ),
        'route', jsonb_build_object(
            'route_id', v_route.id,
            'origin_port_id', v_origin_port.id,
            'origin_port_name', v_origin_port.name,
            'destination_port_id', v_dest_port.id,
            'destination_port_name', v_dest_port.name,
            'shipping_method_id', v_shipping_method_id,
            'transit_days_min', v_route.transit_days_min,
            'transit_days_max', v_route.transit_days_max
        ),
        'financials', jsonb_build_object(
            'currency', 'USD',
            'exchange_rate', v_exchange_rate,
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

    SELECT id INTO v_customer_id FROM public.customers WHERE phone = v_phone LIMIT 1;
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, phone, email, country, city)
        VALUES (v_customer_name, v_phone, v_email, 'ARE', 'Dubai')
        RETURNING id INTO v_customer_id;
    ELSE
        UPDATE public.customers
        SET full_name = v_customer_name,
            email = COALESCE(v_email, email),
            updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;

    INSERT INTO public.customer_vehicles (
        customer_id, vehicle_category_id, powertrain_id, condition_id,
        make, model, year, declared_value_usd
    ) VALUES (
        v_customer_id, v_vehicle_category_id, v_powertrain_id, v_condition_id,
        v_make, v_model, v_year, v_declared_value_usd
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
$func$;

REVOKE EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_shipping_quote_v1(JSONB) TO anon, authenticated;
