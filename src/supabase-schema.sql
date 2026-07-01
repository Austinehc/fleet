-- ==========================================
-- FLEET ASSETS DATABASE SCHEMA FOR SUPABASE
-- Run this in your Supabase SQL Editor.
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create CARS Table
CREATE TABLE IF NOT EXISTS public.cars (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    plate_number TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    vin TEXT NOT NULL,
    mileage INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Available',
    photos TEXT[] DEFAULT '{}',
    purchase_price NUMERIC DEFAULT 0,
    sale_price NUMERIC DEFAULT 0,
    disposed_at TEXT,
    is_disposed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create DRIVERS Table
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    license_number TEXT NOT NULL,
    nrc_number TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    assigned_car_id TEXT REFERENCES public.cars(id) ON DELETE SET NULL,
    profile_picture TEXT,
    access_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create SERVICE LOGS Table
CREATE TABLE IF NOT EXISTS public.service_logs (
    id TEXT PRIMARY KEY,
    car_id TEXT REFERENCES public.cars(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC NOT NULL DEFAULT 0,
    mileage INTEGER NOT NULL,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create REVENUE LOGS Table
CREATE TABLE IF NOT EXISTS public.revenue_logs (
    id TEXT PRIMARY KEY,
    car_id TEXT REFERENCES public.cars(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    driver_id TEXT,
    driver_name TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. Create INSURANCE LOGS Table
CREATE TABLE IF NOT EXISTS public.insurance_logs (
    id TEXT PRIMARY KEY,
    car_id TEXT REFERENCES public.cars(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Road Tax', 'Insurance', 'Fitness', 'Identity')),
    amount NUMERIC NOT NULL DEFAULT 0,
    expiry_date TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SECURITY POLICIES AND USER MANAGEMENT
-- ==========================================

-- Create user management table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'driver')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create driver authentication table with hashed PINs
CREATE TABLE IF NOT EXISTS public.driver_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id TEXT NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id)
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Add document fields to drivers table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS nrc_front TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS nrc_back TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_front TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS license_back TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS sale_price NUMERIC DEFAULT 0;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS disposed_at TEXT;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS is_disposed BOOLEAN DEFAULT FALSE;

-- Enable RLS for Security
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Managers can view all cars" ON public.cars;
DROP POLICY IF EXISTS "Managers can manage cars" ON public.cars;
DROP POLICY IF EXISTS "Managers can view all drivers" ON public.drivers;
DROP POLICY IF EXISTS "Managers can manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view assigned car" ON public.cars;
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.drivers;
DROP POLICY IF EXISTS "Managers can manage service logs" ON public.service_logs;
DROP POLICY IF EXISTS "Drivers can view own car service logs" ON public.service_logs;
DROP POLICY IF EXISTS "Managers can manage revenue logs" ON public.revenue_logs;
DROP POLICY IF EXISTS "Drivers can view/create own revenue logs" ON public.revenue_logs;
DROP POLICY IF EXISTS "Managers can manage driver auth" ON public.driver_auth;
DROP POLICY IF EXISTS "Drivers can verify own PIN" ON public.driver_auth;
DROP POLICY IF EXISTS "Managers can view audit logs" ON public.audit_logs;

-- Remove the insecure "allow all" policies
DROP POLICY IF EXISTS "Allow read access of cars to all" ON public.cars;
DROP POLICY IF EXISTS "Allow write access of cars to all" ON public.cars;
DROP POLICY IF EXISTS "Allow read access of drivers to all" ON public.drivers;
DROP POLICY IF EXISTS "Allow write access of drivers to all" ON public.drivers;
DROP POLICY IF EXISTS "Allow read access of service_logs to all" ON public.service_logs;
DROP POLICY IF EXISTS "Allow write access of service_logs to all" ON public.service_logs;
DROP POLICY IF EXISTS "Allow read access of revenue_logs to all" ON public.revenue_logs;
DROP POLICY IF EXISTS "Allow write access of revenue_logs to all" ON public.revenue_logs;
DROP POLICY IF EXISTS "Allow read access of insurance_logs to all" ON public.insurance_logs;
DROP POLICY IF EXISTS "Allow write access of insurance_logs to all" ON public.insurance_logs;

-- User Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Manager policies: Full access to fleet data
CREATE POLICY "Managers can view all cars" ON public.cars
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Managers can manage cars" ON public.cars
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Managers can view all drivers" ON public.drivers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Managers can manage drivers" ON public.drivers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

-- Driver policies: Limited access to own data only
CREATE POLICY "Drivers can view assigned car only" ON public.cars
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.drivers d
            JOIN public.user_profiles up ON up.email = d.email
            WHERE up.auth_user_id = auth.uid() 
            AND up.role = 'driver'
            AND d.assigned_car_id = cars.id
            AND d.status = 'Active'
        )
    );

CREATE POLICY "Drivers can view own profile only" ON public.drivers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'driver'
            AND email = drivers.email
        )
    );

-- Service logs: Managers full access, drivers can only view own car logs
CREATE POLICY "Managers can manage service logs" ON public.service_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Drivers can view own car service logs only" ON public.service_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.drivers d
            JOIN public.user_profiles up ON up.email = d.email
            WHERE up.auth_user_id = auth.uid() 
            AND up.role = 'driver'
            AND d.assigned_car_id = service_logs.car_id
            AND d.status = 'Active'
        )
    );

-- Revenue logs: Managers full access, drivers can only manage own logs
CREATE POLICY "Managers can manage revenue logs" ON public.revenue_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Drivers can manage own revenue logs only" ON public.revenue_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.drivers d
            JOIN public.user_profiles up ON up.email = d.email
            WHERE up.auth_user_id = auth.uid() 
            AND up.role = 'driver'
            AND d.id = revenue_logs.driver_id
            AND d.status = 'Active'
        )
    );



-- Insurance logs: Only managers can manage
CREATE POLICY "Managers can manage insurance logs" ON public.insurance_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

-- Driver auth: Only managers can manage, system can verify PINs
CREATE POLICY "Managers can manage driver auth" ON public.driver_auth
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

-- Audit logs: Only managers can view
CREATE POLICY "Managers can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = auth.uid() AND role = 'manager'
        )
    );

-- ==========================================
-- FUNCTIONS FOR SECURE OPERATIONS
-- ==========================================

-- Function to hash PINs securely
CREATE OR REPLACE FUNCTION hash_pin(pin TEXT, salt TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(pin || salt, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify PIN with improved error handling
CREATE OR REPLACE FUNCTION verify_pin(driver_id TEXT, pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    auth_record public.driver_auth%ROWTYPE;
    is_valid BOOLEAN := FALSE;
BEGIN
    -- Validate input parameters
    IF driver_id IS NULL OR pin IS NULL OR LENGTH(pin) = 0 THEN
        RETURN FALSE;
    END IF;

    -- Get auth record - if none exists, return false (no auto-creation)
    SELECT * INTO auth_record 
    FROM public.driver_auth 
    WHERE driver_auth.driver_id = verify_pin.driver_id;
    
    -- If no auth record exists, fail authentication
    IF NOT FOUND THEN
        RAISE NOTICE 'No authentication record found for driver %', driver_id;
        RETURN FALSE;
    END IF;
    
    -- Check if locked
    IF auth_record.locked_until IS NOT NULL AND auth_record.locked_until > NOW() THEN
        RAISE NOTICE 'Driver % is locked until %', driver_id, auth_record.locked_until;
        RETURN FALSE;
    END IF;
    
    -- Verify PIN using crypt function
    IF auth_record.pin_hash = crypt(pin || auth_record.salt, auth_record.pin_hash) THEN
        -- Reset attempts on success
        UPDATE public.driver_auth 
        SET attempts = 0, last_attempt = NOW(), locked_until = NULL
        WHERE driver_auth.driver_id = verify_pin.driver_id;
        is_valid := TRUE;
    ELSE
        -- Increment attempts and potentially lock account
        UPDATE public.driver_auth 
        SET attempts = attempts + 1, 
            last_attempt = NOW(),
            locked_until = CASE 
                WHEN attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
                WHEN attempts + 1 >= 3 THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
            END
        WHERE driver_auth.driver_id = verify_pin.driver_id;
        
        RAISE NOTICE 'Invalid PIN attempt for driver %. Attempt count: %', driver_id, auth_record.attempts + 1;
    END IF;
    
    RETURN is_valid;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return false on any exception
        RAISE NOTICE 'PIN verification error for driver %: %', driver_id, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create/update driver PIN with improved validation
CREATE OR REPLACE FUNCTION set_driver_pin(driver_id TEXT, pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    new_salt TEXT;
    pin_hash TEXT;
BEGIN
    -- Validate input parameters
    IF driver_id IS NULL OR pin IS NULL OR LENGTH(pin) = 0 THEN
        RAISE NOTICE 'Invalid input: driver_id or pin is null/empty';
        RETURN FALSE;
    END IF;

    -- Check if driver exists
    IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id) THEN
        RAISE NOTICE 'Driver with id % does not exist', driver_id;
        RETURN FALSE;
    END IF;
    
    -- Generate salt
    new_salt := gen_random_uuid()::TEXT;
    
    -- Hash PIN
    pin_hash := hash_pin(pin, new_salt);
    
    -- Insert or update
    INSERT INTO public.driver_auth (driver_id, pin_hash, salt)
    VALUES (driver_id, pin_hash, new_salt)
    ON CONFLICT (driver_id) 
    DO UPDATE SET 
        pin_hash = EXCLUDED.pin_hash,
        salt = EXCLUDED.salt,
        attempts = 0,
        locked_until = NULL,
        updated_at = NOW();
        
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error setting PIN for driver %: %', driver_id, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get user ID from current session
    SELECT id INTO user_id 
    FROM public.user_profiles 
    WHERE auth_user_id = auth.uid();
    
    -- Log the change
    INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, 
        old_values, new_values, ip_address
    ) VALUES (
        user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all main tables (drop existing first)
DROP TRIGGER IF EXISTS cars_audit ON public.cars;
CREATE TRIGGER cars_audit AFTER INSERT OR UPDATE OR DELETE ON public.cars
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS drivers_audit ON public.drivers;
CREATE TRIGGER drivers_audit AFTER INSERT OR UPDATE OR DELETE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS service_logs_audit ON public.service_logs;
CREATE TRIGGER service_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.service_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS revenue_logs_audit ON public.revenue_logs;
CREATE TRIGGER revenue_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.revenue_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS insurance_logs_audit ON public.insurance_logs;
CREATE TRIGGER insurance_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.insurance_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Remove the original conflicting "allow all" policies that were at the end
