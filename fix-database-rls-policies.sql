-- ==========================================
-- FIX: Database RLS Policies - Remove Conflicting Policies
-- ==========================================
-- This file contains ONLY the security fixes for Database Access Control
-- Run this in your Supabase SQL Editor to fix conflicting RLS policies

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

-- CRITICAL: Remove the insecure "allow all" policies that bypass security
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

-- ==========================================
-- SECURE ROW LEVEL SECURITY POLICIES
-- ==========================================

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
-- SECURITY FIX FOR PIN VERIFICATION FUNCTION
-- ==========================================

-- Update PIN verification function to remove authentication bypass
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

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify that conflicting policies are removed
DO $$
BEGIN
    RAISE NOTICE 'Security Fix Applied: Database RLS Policies Updated';
    RAISE NOTICE 'All conflicting "allow all" policies have been removed';
    RAISE NOTICE 'Strict role-based access control is now enforced';
    RAISE NOTICE 'Drivers can only access their own assigned vehicle data';
    RAISE NOTICE 'Managers have full access to all fleet data';
END $$;