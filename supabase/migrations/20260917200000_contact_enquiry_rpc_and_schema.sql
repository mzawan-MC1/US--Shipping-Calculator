-- Step 1: Add columns to public.enquiries for contact submissions if not exists
ALTER TABLE public.enquiries 
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS preferred_contact_method text,
ADD COLUMN IF NOT EXISTS consent_given_at timestamptz;

-- Step 2: Create secure submit_contact_enquiry RPC
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
  v_message text;
  v_preferred_method text;
  v_consent boolean;
  v_normalized_phone text;
  v_customer_id uuid;
  v_enquiry_id uuid;
  v_ref_no text;
  v_today_prefix text;
  v_seq int;
BEGIN
  -- Extract and validate inputs
  v_full_name := trim(coalesce(input_json->>'full_name', ''));
  v_phone := trim(coalesce(input_json->>'phone', ''));
  v_email := nullif(trim(coalesce(input_json->>'email', '')), '');
  v_subject := nullif(trim(coalesce(input_json->>'subject', '')), '');
  v_message := trim(coalesce(input_json->>'message', ''));
  v_preferred_method := nullif(trim(coalesce(input_json->>'preferred_contact_method', 'phone')), '');
  v_consent := coalesce((input_json->>'consent')::boolean, false);

  IF length(v_full_name) < 2 THEN
    RAISE EXCEPTION 'Full name is required (at least 2 characters)';
  END IF;

  IF length(v_phone) < 7 THEN
    RAISE EXCEPTION 'Valid phone number is required';
  END IF;

  IF length(v_message) < 5 THEN
    RAISE EXCEPTION 'Message is required (at least 5 characters)';
  END IF;

  -- Normalize phone
  v_normalized_phone := public.normalize_phone(v_phone);

  -- Customer Deduplication (by phone first, then email if provided)
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE normalized_phone = v_normalized_phone
  LIMIT 1;

  IF v_customer_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE lower(email) = lower(v_email)
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (full_name, phone, email, normalized_phone)
    VALUES (v_full_name, v_phone, v_email, v_normalized_phone)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update customer name/email if provided and not set
    UPDATE public.customers
    SET full_name = COALESCE(NULLIF(full_name, ''), v_full_name),
        email = COALESCE(email, v_email),
        updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  -- Generate reference number: ENQ-YYYYMMDD-XXXX
  v_today_prefix := 'ENQ-' || to_char(now(), 'YYYYMMDD');
  SELECT count(*) + 1 INTO v_seq
  FROM public.enquiries
  WHERE reference_number LIKE v_today_prefix || '%';

  v_ref_no := v_today_prefix || '-' || lpad(v_seq::text, 4, '0');

  -- Insert enquiry
  INSERT INTO public.enquiries (
    customer_id,
    reference_number,
    status,
    source,
    subject,
    message,
    preferred_contact_method,
    consent_given_at
  ) VALUES (
    v_customer_id,
    v_ref_no,
    'new',
    'contact_form',
    v_subject,
    v_message,
    v_preferred_method,
    CASE WHEN v_consent THEN now() ELSE NULL END
  ) RETURNING id INTO v_enquiry_id;

  RETURN jsonb_build_object(
    'success', true,
    'reference_number', v_ref_no,
    'enquiry_id', v_enquiry_id
  );
END;
$$;

-- Grant EXECUTE to public/anon and authenticated
GRANT EXECUTE ON FUNCTION public.submit_contact_enquiry(jsonb) TO anon, authenticated;
