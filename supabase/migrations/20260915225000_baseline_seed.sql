-- ==============================================================================
-- Migration: 20260915225000_baseline_seed.sql
-- Description: Baseline reference taxonomy, routes, tariffs, and exchange rates
-- ==============================================================================

-- 1. Countries
INSERT INTO public.countries (code, name, is_active) VALUES
    ('USA', 'United States of America', true),
    ('ARE', 'United Arab Emirates', true)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- 2. Ports
-- Fixed UUIDs for predictable foreign key references in seed
INSERT INTO public.ports (id, code, name, country_code, state_or_city, is_loading_port, is_destination_port, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', 'USNWK', 'Port of New York / Newark', 'USA', 'New Jersey', true, false, true),
    ('10000000-0000-0000-0000-000000000002', 'USSAV', 'Port of Savannah', 'USA', 'Georgia', true, false, true),
    ('10000000-0000-0000-0000-000000000003', 'USHOU', 'Port of Houston', 'USA', 'Texas', true, false, true),
    ('10000000-0000-0000-0000-000000000004', 'USLAX', 'Port of Los Angeles / Long Beach', 'USA', 'California', true, false, true),
    ('20000000-0000-0000-0000-000000000001', 'AEKLF', 'Port of Khor Fakkan', 'ARE', 'Sharjah', false, true, true),
    ('20000000-0000-0000-0000-000000000002', 'AEJEA', 'Port of Jebel Ali', 'ARE', 'Dubai', false, true, true)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- 3. Vehicle Categories
INSERT INTO public.vehicle_categories (id, name, display_order, is_active) VALUES
    ('sedan', 'Sedan / Coupe', 1, true),
    ('suv', 'SUV / Crossover', 2, true),
    ('van', 'Van / Minivan', 3, true),
    ('pickup', 'Pickup Truck', 4, true),
    ('bike', 'Motorcycle / Bike', 5, true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 4. Powertrains
INSERT INTO public.powertrains (id, name, display_order, is_active) VALUES
    ('petrol', 'Petrol / Gasoline', 1, true),
    ('hybrid', 'Hybrid (HEV / PHEV)', 2, true),
    ('electric', 'Electric (EV)', 3, true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 5. Vehicle Conditions
INSERT INTO public.vehicle_conditions (id, name, description, display_order, is_active) VALUES
    ('operable', 'Operable / Running', 'Vehicle starts, runs, and can be driven onto carrier equipment', 1, true),
    ('non_runner', 'Non-Runner / Rolling', 'Vehicle rolls and steers but does not run under own power; winch required', 2, true),
    ('salvage_damaged', 'Salvage / Damaged', 'Severe structural or collision damage; forklift or special equipment required', 3, true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 6. Purchase Sources
INSERT INTO public.purchase_sources (id, name, category, is_active) VALUES
    ('copart', 'Copart Auto Auctions', 'auction', true),
    ('iaai', 'IAAI Insurance Auto Auctions', 'auction', true),
    ('manheim', 'Manheim Wholesale Auctions', 'auction', true),
    ('dealer', 'Dealership / Private Sale', 'dealer', true),
    ('other', 'Other US Location', 'other', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 7. Purchase Locations
INSERT INTO public.purchase_locations (id, purchase_source_id, name, state_code, postal_code, default_loading_port_id, is_active) VALUES
    ('30000000-0000-0000-0000-000000000001', 'copart', 'Copart Atlanta South', 'GA', '30260', '10000000-0000-0000-0000-000000000002', true),
    ('30000000-0000-0000-0000-000000000002', 'copart', 'Copart Dallas South', 'TX', '75241', '10000000-0000-0000-0000-000000000003', true),
    ('30000000-0000-0000-0000-000000000003', 'iaai', 'IAAI Los Angeles / Anaheim', 'CA', '92806', '10000000-0000-0000-0000-000000000004', true),
    ('30000000-0000-0000-0000-000000000004', 'copart', 'Copart Northgate (New Jersey)', 'NJ', '07001', '10000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 8. Shipping Methods
INSERT INTO public.shipping_methods (id, name, description, is_active) VALUES
    ('consolidated_container', 'Consolidated Container (LCL)', 'Economical consolidated container service for vehicles', true),
    ('dedicated_container', 'Dedicated Container (FCL)', 'Exclusive 20ft or 40ft container for expedited delivery and high-value cars', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

-- 9. Shipping Routes
INSERT INTO public.shipping_routes (id, origin_port_id, destination_port_id, transit_days_min, transit_days_max, is_active) VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 30, 36, true),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 28, 34, true),
    ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 32, 38, true),
    ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 30, 36, true),
    ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 35, 42, true),
    ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 32, 40, true),
    ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 42, 50, true),
    ('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 40, 48, true)
ON CONFLICT (origin_port_id, destination_port_id) DO UPDATE SET is_active = true;

-- 10. Route Freight Rates (Seed tariffs for standard routes)
INSERT INTO public.route_freight_rates (route_id, shipping_method_id, vehicle_category_id, powertrain_id, currency, base_amount, effective_from, is_active) VALUES
    -- Route 1: Newark -> Khor Fakkan
    ('40000000-0000-0000-0000-000000000001', 'consolidated_container', 'sedan', 'petrol', 'USD', 1050.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000001', 'consolidated_container', 'suv', 'petrol', 'USD', 1200.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000001', 'consolidated_container', 'van', 'petrol', 'USD', 1400.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000001', 'consolidated_container', 'pickup', 'petrol', 'USD', 1450.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000001', 'consolidated_container', 'bike', 'petrol', 'USD', 650.00, '2026-01-01', true),

    -- Route 2: Newark -> Jebel Ali
    ('40000000-0000-0000-0000-000000000002', 'consolidated_container', 'sedan', 'petrol', 'USD', 1050.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000002', 'consolidated_container', 'suv', 'petrol', 'USD', 1200.00, '2026-01-01', true),

    -- Route 3: Savannah -> Khor Fakkan
    ('40000000-0000-0000-0000-000000000003', 'consolidated_container', 'sedan', 'petrol', 'USD', 1100.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000003', 'consolidated_container', 'suv', 'petrol', 'USD', 1250.00, '2026-01-01', true),

    -- Route 5: Houston -> Khor Fakkan
    ('40000000-0000-0000-0000-000000000005', 'consolidated_container', 'sedan', 'petrol', 'USD', 1150.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000005', 'consolidated_container', 'suv', 'petrol', 'USD', 1300.00, '2026-01-01', true),

    -- Route 7: Los Angeles -> Khor Fakkan
    ('40000000-0000-0000-0000-000000000007', 'consolidated_container', 'sedan', 'petrol', 'USD', 1350.00, '2026-01-01', true),
    ('40000000-0000-0000-0000-000000000007', 'consolidated_container', 'suv', 'petrol', 'USD', 1550.00, '2026-01-01', true);

-- 11. Towing Rates (Demonstrates FIXED and RANGE modes)
INSERT INTO public.towing_rates (
    purchase_location_id, loading_port_id, vehicle_category_id, vehicle_condition_id,
    rate_type, currency, fixed_amount, min_amount, max_amount, is_active
) VALUES
    -- Fixed rate: Northgate NJ to Newark port ($220 fixed)
    ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'sedan', 'operable', 'fixed', 'USD', 220.00, NULL, NULL, true),
    -- Fixed rate: Atlanta South to Savannah port ($280 fixed)
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'sedan', 'operable', 'fixed', 'USD', 280.00, NULL, NULL, true),
    -- Range rate: Dallas South to Houston port ($300 - $480 range)
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'sedan', 'operable', 'range', 'USD', NULL, 300.00, 480.00, true),
    -- Range rate: Anaheim CA to Los Angeles port ($250 - $400 range)
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'sedan', 'operable', 'range', 'USD', NULL, 250.00, 400.00, true);

-- 12. Destination Tax Rules (UAE Statutory: 5% Customs Duty on CIF, 5% Import VAT on VAT base)
INSERT INTO public.destination_tax_rules (country_code, tax_type, name, percentage, calculation_base, is_active) VALUES
    ('ARE', 'customs_duty', 'UAE Customs Duty', 0.0500, 'cif', true),
    ('ARE', 'vat', 'UAE Import VAT', 0.0500, 'vat_base', true);

-- 13. Additional Charge Rules
INSERT INTO public.additional_charge_rules (country_code, name, category, charge_type, amount, currency, is_mandatory, is_included_in_vat_base, is_active) VALUES
    ('ARE', 'UAE Customs Clearance', 'customs_clearance', 'fixed', 150.00, 'USD', true, false, true),
    ('ARE', 'Port Handling & Terminal Receipt', 'port_handling', 'fixed', 200.00, 'USD', true, true, true);

-- 14. Exchange Rates (Baseline USD -> AED)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, is_active) VALUES
    ('USD', 'AED', 3.6725, true);
