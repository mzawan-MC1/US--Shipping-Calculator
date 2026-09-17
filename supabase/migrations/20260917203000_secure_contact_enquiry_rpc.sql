-- Migration: 20260917203000_secure_contact_enquiry_rpc.sql
-- Description: Hardening contact enquiry RPC, concurrency sequence, Option A check constraints, abuse prevention, and explicit privilege boundaries

-- 1. Concurrency-safe sequence for contact form enquiries
CREATE SEQUENCE IF NOT EXISTS public.contact_enquiry_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- 2. Revoke table-level access on customers and enquiries from anon (public access must strictly go through submit_contact_enquiry RPC)
REVOKE ALL ON TABLE public.customers FROM anon;
REVOKE ALL ON TABLE public.enquiries FROM anon;

-- 3. Check constraints on enquiries (Option A: Conditional constraints preserving calculator data integrity)
ALTER TABLE public.enquiries
DROP CONSTRAINT IF EXISTS enquiries_contact_form_requirements_check;

ALTER TABLE public.enquiries
ADD CONSTRAINT enquiries_contact_form_requirements_check
CHECK (
    (source <> 'contact_form') OR (
        subject IS NOT NULL 
        AND message IS NOT NULL 
        AND preferred_contact_method IS NOT NULL 
        AND consent_given_at IS NOT NULL
    )
);

ALTER TABLE public.enquiries
DROP CONSTRAINT IF EXISTS enquiries_source_check;

ALTER TABLE public.enquiries
ADD CONSTRAINT enquiries_source_check
CHECK (source IN ('web_calculator', 'contact_form', 'whatsapp', 'manual'));

-- 4. Replace submit_contact_enquiry with hardened input validation, subject normalization, rate limiting, and safe public return payload (no UUIDs)
CREATE OR REPLACE FUNCTION public.submit_contact_enquiry(input_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_full_name text;
    v_phone text;
    v_email text;
    v_subject text;
    v_normalized_subject text;
    v_message text;
    v_pref_method text;
    v_consent boolean;
    v_canonical_phone text;
    v_formatted_phone text;
    v_normalized_phone text;
    v_customer_id uuid;
    v_enquiry_id uuid;
    v_ref_no text;
    v_recent_count integer;
    v_recent_identical integer;
BEGIN
    -- Reject null bytes
    IF (input_json::text) LIKE '%\u0000%' THEN
        RAISE EXCEPTION 'Invalid input characters detected';
    END IF;

    -- Extract values
    v_full_name   := trim(coalesce(input_json->>'full_name', ''));
    v_phone       := trim(coalesce(input_json->>'phone', ''));
    v_email       := lower(trim(coalesce(input_json->>'email', '')));
    v_subject     := lower(trim(coalesce(input_json->>'subject', '')));
    v_message     := trim(coalesce(input_json->>'message', ''));
    v_pref_method := lower(trim(coalesce(input_json->>'preferred_contact_method', 'whatsapp')));

    -- Safe consent parsing
    BEGIN
        v_consent := coalesce((input_json->>'consent')::boolean, false);
    EXCEPTION WHEN OTHERS THEN
        v_consent := false;
    END;

    -- 1. Server-side consent validation
    IF v_consent IS NOT TRUE THEN
        RAISE EXCEPTION 'Consent is required to submit an inquiry';
    END IF;

    -- 2. Full name validation: 2 to 120 characters
    IF length(v_full_name) < 2 OR length(v_full_name) > 120 THEN
        RAISE EXCEPTION 'Full name must be between 2 and 120 characters';
    END IF;

    -- 3. Phone validation: canonicalize digits, require 7 to 20 digits
    v_canonical_phone := regexp_replace(v_phone, '[^0-9]', '', 'g');
    IF length(v_canonical_phone) < 7 OR length(v_canonical_phone) > 20 THEN
        RAISE EXCEPTION 'Valid international phone number with 7 to 20 digits is required';
    END IF;

    -- Format phone cleanly with leading '+'
    IF v_phone LIKE '+%' THEN
        v_formatted_phone := '+' || regexp_replace(v_phone, '[^0-9]', '', 'g');
    ELSE
        v_formatted_phone := '+' || v_canonical_phone;
    END IF;

    -- 4. Preferred contact method validation
    IF v_pref_method NOT IN ('phone', 'whatsapp', 'email') THEN
        v_pref_method := 'whatsapp';
    END IF;

    -- 5. Email validation: if provided or if method is 'email', require valid format and max 254 chars
    IF v_email = '' THEN
        v_email := NULL;
    END IF;

    IF v_pref_method = 'email' AND v_email IS NULL THEN
        RAISE EXCEPTION 'A valid email address is required when email is the preferred contact method';
    END IF;

    IF v_email IS NOT NULL THEN
        IF length(v_email) > 254 OR v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'Invalid email address format';
        END IF;
    END IF;

    -- 6. Subject normalization & validation: maps canonical keys and legacy/display variations to approved enum keys
    IF v_subject IN ('shipping_quote_assistance', 'shipping quotation assistance', 'shipping rate calculation', 'حساب تكلفة الشحن', 'مساعدة في تسعير الشحن') THEN
        v_normalized_subject := 'shipping_quote_assistance';
    ELSIF v_subject IN ('vehicle_pickup_towing', 'vehicle pickup & towing', 'vehicle pickup/towing', 'auction towing & transport', 'نقل وسحب سيارات المزاد', 'سحب ونقل سيارات المزاد') THEN
        v_normalized_subject := 'vehicle_pickup_towing';
    ELSIF v_subject IN ('port_route_information', 'port & route information', 'cargo tracking & status', 'تتبع شحنة جارية', 'معلومات الموانئ والمسارات') THEN
        v_normalized_subject := 'port_route_information';
    ELSIF v_subject IN ('existing_quotation', 'existing quotation', 'existing quotation inquiry', 'customs clearance & duty', 'التخليص الجمركي والرسوم', 'استفسار عن تسعيرة سابقة') THEN
        v_normalized_subject := 'existing_quotation';
    ELSIF v_subject IN ('general_enquiry', 'general inquiry', 'استفسار عام') THEN
        v_normalized_subject := 'general_enquiry';
    ELSIF v_subject IN ('other', 'موضوع آخر') THEN
        v_normalized_subject := 'other';
    ELSE
        RAISE EXCEPTION 'A valid inquiry subject is required';
    END IF;

    -- 7. Message validation: 10 to 5,000 characters
    IF length(v_message) < 10 OR length(v_message) > 5000 THEN
        RAISE EXCEPTION 'Message must be between 10 and 5,000 characters';
    END IF;

    -- 8. Customer lookup & deduplication
    v_normalized_phone := public.normalize_phone(v_formatted_phone);

    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE public.normalize_phone(phone) = v_normalized_phone
    LIMIT 1;

    IF v_customer_id IS NULL AND v_email IS NOT NULL THEN
        SELECT id INTO v_customer_id
        FROM public.customers
        WHERE lower(email) = v_email
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, phone, email)
        VALUES (v_full_name, v_formatted_phone, v_email)
        RETURNING id INTO v_customer_id;
    ELSE
        UPDATE public.customers
        SET full_name = coalesce(nullif(v_full_name, ''), full_name),
            email = coalesce(v_email, email),
            updated_at = now()
        WHERE id = v_customer_id;
    END IF;

    -- 9. Server-side abuse throttling
    SELECT count(*) INTO v_recent_identical
    FROM public.enquiries
    WHERE customer_id = v_customer_id
      AND message = v_message
      AND created_at > now() - interval '5 minutes';

    IF v_recent_identical > 0 THEN
        RAISE EXCEPTION 'A duplicate inquiry has already been received. Please wait before submitting again.';
    END IF;

    SELECT count(*) INTO v_recent_count
    FROM public.enquiries
    WHERE customer_id = v_customer_id
      AND created_at > now() - interval '10 minutes';

    IF v_recent_count >= 3 THEN
        RAISE EXCEPTION 'Too many inquiries received. Please wait a few minutes before trying again or reach out on WhatsApp.';
    END IF;

    -- 10. Concurrency-safe unique reference generation
    v_ref_no := 'ENQ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((nextval('public.contact_enquiry_seq') % 1000000)::text, 6, '0');

    -- 11. Insert inquiry with internal status and source
    INSERT INTO public.enquiries (
        reference_number,
        customer_id,
        status,
        source,
        subject,
        message,
        preferred_contact_method,
        consent_given_at
    ) VALUES (
        v_ref_no,
        v_customer_id,
        'new',
        'contact_form',
        v_normalized_subject,
        v_message,
        v_pref_method,
        now()
    ) RETURNING id INTO v_enquiry_id;

    -- Insert status history for complete audit trail
    INSERT INTO public.enquiry_status_history (
        enquiry_id,
        old_status,
        new_status,
        notes
    ) VALUES (
        v_enquiry_id,
        NULL,
        'new',
        'Contact form submission received'
    );

    -- 12. Return public response strictly containing success and reference_number (NO UUIDs)
    RETURN jsonb_build_object(
        'success', true,
        'reference_number', v_ref_no
    );
END;
$$;

-- 5. Explicit permissions
REVOKE ALL ON FUNCTION public.submit_contact_enquiry(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contact_enquiry(jsonb) TO anon, authenticated;
