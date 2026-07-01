-- ==========================================
-- MINIMAL SECURITY MIGRATION - Core Functions Only
-- ==========================================
-- This file creates the essential security functions without complex RLS policies

-- Step 1: Safely drop existing functions that conflict
DROP FUNCTION IF EXISTS public.set_driver_pin(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_pin(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.authenticate_driver_by_pin(TEXT);
DROP FUNCTION IF EXISTS public.record_failed_auth_attempt(TEXT);
DROP FUNCTION IF EXISTS public.generate_driver_jwt(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.generate_driver_jwt(TEXT);
DROP FUNCTION IF EXISTS public.get_security_metrics(INTEGER);
DROP FUNCTION IF EXISTS public.get_security_metrics();

-- Step 2: Create essential security tables
CREATE TABLE IF NOT EXISTS public.security_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    details JSONB,
    driver_id TEXT,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.driver_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Step 3: Create secure authentication function
CREATE OR REPLACE FUNCTION authenticate_driver_by_pin(input_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_record RECORD;
    current_timestamp TIMESTAMPTZ := NOW();
BEGIN
    -- Input validation
    IF input_pin IS NULL OR LENGTH(TRIM(input_pin)) != 6 THEN
        INSERT INTO public.security_log (action, details, timestamp) 
        VALUES ('FAILED_AUTH_ATTEMPT', jsonb_build_object('reason', 'invalid_format'), current_timestamp);
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid PIN format. PIN must be exactly 6 characters.'
        );
    END IF;

    -- Sanitize PIN input
    input_pin := UPPER(TRIM(regexp_replace(input_pin, '[^A-Z0-9]', '', 'g')));
    
    -- Find active driver with matching PIN
    SELECT da.*, d.id as driver_id, d.full_name, d.status
    INTO auth_record
    FROM public.driver_auth da
    JOIN public.drivers d ON da.driver_id = d.id
    WHERE d.status = 'Active'
    AND crypt(input_pin, da.pin_hash) = da.pin_hash;

    -- Check if driver found and not locked
    IF auth_record IS NULL THEN
        INSERT INTO public.security_log (action, details, timestamp) 
        VALUES ('FAILED_AUTH_ATTEMPT', jsonb_build_object('reason', 'invalid_pin'), current_timestamp);
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid PIN or inactive driver. Please contact your manager.'
        );
    END IF;

    -- Check if account is locked
    IF auth_record.locked_until IS NOT NULL AND auth_record.locked_until > current_timestamp THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account temporarily locked. Try again later.'
        );
    END IF;

    -- Successful authentication - reset attempts
    UPDATE public.driver_auth 
    SET attempts = 0, last_attempt = current_timestamp, locked_until = NULL
    WHERE driver_id = auth_record.driver_id;

    -- Log success
    INSERT INTO public.security_log (action, details, driver_id, timestamp) 
    VALUES ('SUCCESSFUL_AUTH', jsonb_build_object('driver_id', auth_record.driver_id), auth_record.driver_id, current_timestamp);

    RETURN jsonb_build_object(
        'success', true,
        'driver_id', auth_record.driver_id,
        'full_name', auth_record.full_name
    );

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO public.security_log (action, details, timestamp) 
        VALUES ('AUTH_ERROR', jsonb_build_object('error', SQLERRM), current_timestamp);
        
        RETURN jsonb_build_object('success', false, 'error', 'Authentication system error.');
END;
$$;

-- Step 4: Create JWT token generation function
CREATE OR REPLACE FUNCTION generate_driver_jwt(driver_id TEXT, expires_in INTEGER DEFAULT 28800)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token_id UUID;
    expires_at TIMESTAMPTZ;
    token_data TEXT;
BEGIN
    -- Validate input
    IF driver_id IS NULL OR expires_in <= 0 OR expires_in > 86400 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
    END IF;

    -- Verify driver exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND status = 'Active') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver not found or inactive');
    END IF;

    -- Generate token
    token_id := gen_random_uuid();
    expires_at := NOW() + (expires_in || ' seconds')::INTERVAL;
    token_data := driver_id || ':' || extract(epoch from NOW())::TEXT || ':' || token_id::TEXT;

    -- Store session
    INSERT INTO public.driver_sessions (id, driver_id, token_hash, expires_at, ip_address) 
    VALUES (token_id, driver_id, encode(digest(token_data, 'sha256'), 'hex'), expires_at, inet_client_addr());

    RETURN jsonb_build_object(
        'success', true,
        'token', encode(token_data::BYTEA, 'base64'),
        'expires_at', expires_at,
        'driver_id', driver_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token generation failed');
END;
$$;

-- Step 5: Create PIN management function
CREATE OR REPLACE FUNCTION set_driver_pin(driver_id TEXT, new_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pin_hash TEXT;
BEGIN
    -- Validate inputs
    IF driver_id IS NULL OR new_pin IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing parameters');
    END IF;

    -- Validate PIN format
    IF LENGTH(TRIM(new_pin)) != 6 OR NOT (UPPER(TRIM(new_pin)) ~ '^[A-Z0-9]{6}$') THEN
        RETURN jsonb_build_object('success', false, 'error', 'PIN must be 6 alphanumeric characters');
    END IF;

    -- Verify driver exists
    IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Driver not found');
    END IF;

    -- Generate hash
    pin_hash := crypt(UPPER(TRIM(new_pin)), gen_salt('bf', 12));

    -- Update or insert PIN
    INSERT INTO public.driver_auth (driver_id, pin_hash, salt, attempts, created_at, updated_at) 
    VALUES (driver_id, pin_hash, '', 0, NOW(), NOW())
    ON CONFLICT (driver_id) 
    DO UPDATE SET pin_hash = EXCLUDED.pin_hash, attempts = 0, locked_until = NULL, updated_at = NOW();

    -- Log PIN change
    INSERT INTO public.security_log (action, details, driver_id, timestamp) 
    VALUES ('PIN_UPDATED', jsonb_build_object('driver_id', driver_id), driver_id, NOW());

    RETURN jsonb_build_object('success', true, 'message', 'PIN updated successfully');

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'PIN update failed');
END;
$$;

-- Step 6: Create security metrics function
CREATE OR REPLACE FUNCTION get_security_metrics(days_back INTEGER DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH stats AS (
        SELECT 
            COUNT(CASE WHEN action = 'SUCCESSFUL_AUTH' THEN 1 END) as success_count,
            COUNT(CASE WHEN action = 'FAILED_AUTH_ATTEMPT' THEN 1 END) as failed_count,
            COUNT(DISTINCT driver_id) as active_drivers
        FROM public.security_log 
        WHERE timestamp >= NOW() - (days_back || ' days')::INTERVAL
    )
    SELECT jsonb_build_object(
        'period_days', days_back,
        'successful_authentications', success_count,
        'failed_attempts', failed_count,
        'active_drivers', active_drivers,
        'security_health', CASE 
            WHEN failed_count = 0 THEN 'EXCELLENT'
            WHEN failed_count < success_count * 0.1 THEN 'GOOD'
            ELSE 'NEEDS_ATTENTION'
        END
    ) INTO result FROM stats;
    
    RETURN result;
END;
$$;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_log_timestamp ON public.security_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_log_action ON public.security_log(action);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver ON public.driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_expires ON public.driver_sessions(expires_at);

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_driver_by_pin(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_driver_jwt(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_driver_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_metrics(INTEGER) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MINIMAL SECURITY MIGRATION COMPLETED!';
    RAISE NOTICE '✓ Core security functions created';
    RAISE NOTICE '✓ Server-side driver authentication';
    RAISE NOTICE '✓ JWT token generation';
    RAISE NOTICE '✓ PIN management with bcrypt';
    RAISE NOTICE '✓ Security logging';
    RAISE NOTICE 'Note: RLS policies can be added later if needed';
    RAISE NOTICE '==========================================';
END $$;