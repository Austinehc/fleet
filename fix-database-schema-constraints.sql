-- ==========================================
-- FIX: Database Schema Issues - Add Missing Constraints & Data Types
-- ==========================================
-- This file fixes data integrity issues in the database schema

-- Enable UUID extension for proper ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add proper constraints and fix data type mismatches
-- ==========================================

-- Fix CARS table constraints and data types
ALTER TABLE public.cars 
  -- Add proper constraints
  ADD CONSTRAINT cars_year_valid CHECK (year BETWEEN 1900 AND EXTRACT(YEAR FROM NOW()) + 1),
  ADD CONSTRAINT cars_mileage_valid CHECK (mileage >= 0),
  ADD CONSTRAINT cars_status_valid CHECK (status IN ('Available', 'Assigned', 'Maintenance', 'Out of Service', 'Disposed')),
  ADD CONSTRAINT cars_purchase_price_valid CHECK (purchase_price >= 0),
  ADD CONSTRAINT cars_sale_price_valid CHECK (sale_price >= 0),
  ADD CONSTRAINT cars_vin_format CHECK (LENGTH(vin) = 17 AND vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  ADD CONSTRAINT cars_plate_format CHECK (LENGTH(plate_number) BETWEEN 3 AND 10);

-- Fix date columns to use proper TIMESTAMPTZ instead of TEXT
ALTER TABLE public.cars 
  ALTER COLUMN disposed_at TYPE TIMESTAMPTZ USING 
    CASE 
      WHEN disposed_at IS NULL OR disposed_at = '' THEN NULL
      ELSE disposed_at::TIMESTAMPTZ 
    END;

-- Fix DRIVERS table constraints
ALTER TABLE public.drivers 
  -- Add proper constraints
  ADD CONSTRAINT drivers_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT drivers_phone_valid CHECK (phone ~ '^[0-9]{7,15}$'),
  ADD CONSTRAINT drivers_status_valid CHECK (status IN ('Active', 'On Leave', 'Suspended', 'Inactive')),
  ADD CONSTRAINT drivers_email_unique UNIQUE (email),
  ADD CONSTRAINT drivers_license_unique UNIQUE (license_number),
  ADD CONSTRAINT drivers_nrc_unique UNIQUE (nrc_number),
  ADD CONSTRAINT drivers_nrc_format CHECK (nrc_number ~ '^\d{6}/\d{2}/\d$');

-- Add missing columns with proper types
ALTER TABLE public.drivers 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed') OR marital_status IS NULL),
  ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT,
  ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT,
  ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Fix SERVICE LOGS table
ALTER TABLE public.service_logs 
  -- Fix date column to proper type
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ,
  -- Add constraints
  ADD CONSTRAINT service_logs_cost_valid CHECK (cost >= 0),
  ADD CONSTRAINT service_logs_mileage_valid CHECK (mileage >= 0),
  ADD CONSTRAINT service_logs_category_valid CHECK (category IN ('Maintenance', 'Repair', 'Inspection', 'Tire Service', 'Oil Change', 'Other')),
  ADD CONSTRAINT service_logs_date_not_future CHECK (date <= NOW());

-- Add receipt URL column with proper validation
ALTER TABLE public.service_logs 
  ADD COLUMN IF NOT EXISTS receipt_url TEXT CHECK (receipt_url IS NULL OR receipt_url ~* '^https://');

-- Fix REVENUE LOGS table
ALTER TABLE public.revenue_logs 
  -- Fix date column
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ,
  -- Add constraints  
  ADD CONSTRAINT revenue_logs_amount_valid CHECK (amount >= 0),
  ADD CONSTRAINT revenue_logs_category_valid CHECK (category IN ('Fare', 'Rental', 'Delivery', 'Contract', 'Other')),
  ADD CONSTRAINT revenue_logs_status_valid CHECK (status IN ('Pending', 'Approved', 'No Details')),
  ADD CONSTRAINT revenue_logs_date_not_future CHECK (date <= NOW());

-- Add proper foreign key for driver_id
ALTER TABLE public.revenue_logs 
  ADD CONSTRAINT revenue_logs_driver_fk 
  FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

-- Fix INSURANCE LOGS table
ALTER TABLE public.insurance_logs 
  -- Fix date columns
  ALTER COLUMN date TYPE TIMESTAMPTZ USING date::TIMESTAMPTZ,
  ALTER COLUMN expiry_date TYPE DATE USING expiry_date::DATE,
  -- Add constraints
  ADD CONSTRAINT insurance_logs_amount_valid CHECK (amount >= 0),
  ADD CONSTRAINT insurance_logs_type_valid CHECK (type IN ('Road Tax', 'Insurance', 'Fitness', 'Identity')),
  ADD CONSTRAINT insurance_logs_expiry_future CHECK (expiry_date > date::DATE),
  ADD CONSTRAINT insurance_logs_date_not_future CHECK (date <= NOW());

-- ==========================================
-- CREATE PROPER INDEXES FOR PERFORMANCE
-- ==========================================

-- Cars table indexes
CREATE INDEX IF NOT EXISTS idx_cars_status ON public.cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON public.cars(plate_number);
CREATE INDEX IF NOT EXISTS idx_cars_vin ON public.cars(vin);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON public.cars(created_at);

-- Drivers table indexes
CREATE INDEX IF NOT EXISTS idx_drivers_email ON public.drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_assigned_car ON public.drivers(assigned_car_id);
CREATE INDEX IF NOT EXISTS idx_drivers_license ON public.drivers(license_number);

-- Logs table indexes
CREATE INDEX IF NOT EXISTS idx_service_logs_car_date ON public.service_logs(car_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_logs_car_date ON public.revenue_logs(car_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_logs_driver_date ON public.revenue_logs(driver_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_insurance_logs_car_date ON public.insurance_logs(car_id, date DESC);

-- ==========================================
-- ENHANCED AUDIT SYSTEM
-- ==========================================

-- Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    -- Additional security tracking
    source_application TEXT DEFAULT 'fleet-management',
    risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    requires_approval BOOLEAN DEFAULT FALSE
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_table_record ON public.audit_logs_enhanced(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_timestamp ON public.audit_logs_enhanced(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_user ON public.audit_logs_enhanced(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_enhanced_operation ON public.audit_logs_enhanced(operation, timestamp DESC);

-- Enhanced audit trigger function
CREATE OR REPLACE FUNCTION enhanced_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
    changed_fields TEXT[] := '{}';
    risk_score INTEGER := 0;
    requires_approval BOOLEAN := FALSE;
BEGIN
    -- Get user ID from current session
    SELECT id INTO user_id 
    FROM public.user_profiles 
    WHERE auth_user_id = auth.uid();
    
    -- Calculate changed fields for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key;
        
        -- Calculate risk score based on sensitive fields
        IF 'status' = ANY(changed_fields) THEN risk_score := risk_score + 20; END IF;
        IF 'assigned_car_id' = ANY(changed_fields) THEN risk_score := risk_score + 15; END IF;
        IF 'access_code' = ANY(changed_fields) THEN risk_score := risk_score + 30; END IF;
        IF 'purchase_price' = ANY(changed_fields) OR 'sale_price' = ANY(changed_fields) THEN 
            risk_score := risk_score + 25; 
        END IF;
        
        -- Flag for approval if high risk
        requires_approval := risk_score >= 50;
    END IF;
    
    -- Insert audit record
    INSERT INTO public.audit_logs_enhanced (
        user_id, table_name, record_id, operation,
        old_values, new_values, changed_fields,
        ip_address, risk_score, requires_approval
    ) VALUES (
        user_id,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        changed_fields,
        inet_client_addr(),
        risk_score,
        requires_approval
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply enhanced audit triggers to all main tables
DROP TRIGGER IF EXISTS cars_enhanced_audit ON public.cars;
CREATE TRIGGER cars_enhanced_audit 
    AFTER INSERT OR UPDATE OR DELETE ON public.cars
    FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();

DROP TRIGGER IF EXISTS drivers_enhanced_audit ON public.drivers;
CREATE TRIGGER drivers_enhanced_audit 
    AFTER INSERT OR UPDATE OR DELETE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();

DROP TRIGGER IF EXISTS service_logs_enhanced_audit ON public.service_logs;
CREATE TRIGGER service_logs_enhanced_audit 
    AFTER INSERT OR UPDATE OR DELETE ON public.service_logs
    FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();

DROP TRIGGER IF EXISTS revenue_logs_enhanced_audit ON public.revenue_logs;
CREATE TRIGGER revenue_logs_enhanced_audit 
    AFTER INSERT OR UPDATE OR DELETE ON public.revenue_logs
    FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();

-- ==========================================
-- DATA VALIDATION FUNCTIONS
-- ==========================================

-- Function to validate VIN numbers
CREATE OR REPLACE FUNCTION validate_vin(vin_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check length and character set
    IF LENGTH(vin_input) != 17 THEN RETURN FALSE; END IF;
    IF vin_input !~ '^[A-HJ-NPR-Z0-9]{17}$' THEN RETURN FALSE; END IF;
    
    -- Additional VIN checksum validation could be added here
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate plate numbers
CREATE OR REPLACE FUNCTION validate_plate_number(plate TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove spaces and check format
    plate := UPPER(TRIM(plate));
    IF LENGTH(plate) < 3 OR LENGTH(plate) > 10 THEN RETURN FALSE; END IF;
    
    -- Basic alphanumeric check
    IF plate !~ '^[A-Z0-9]{3,10}$' THEN RETURN FALSE; END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- VERIFICATION AND CLEANUP
-- ==========================================

-- Create view for data quality monitoring
CREATE OR REPLACE VIEW data_quality_report AS
SELECT 
    'cars' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN year < 1900 OR year > EXTRACT(YEAR FROM NOW()) + 1 THEN 1 END) as invalid_years,
    COUNT(CASE WHEN mileage < 0 THEN 1 END) as negative_mileage,
    COUNT(CASE WHEN NOT validate_vin(vin) THEN 1 END) as invalid_vins,
    COUNT(CASE WHEN NOT validate_plate_number(plate_number) THEN 1 END) as invalid_plates
FROM public.cars

UNION ALL

SELECT 
    'drivers' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 1 END) as invalid_emails,
    COUNT(CASE WHEN phone !~ '^[0-9]{7,15}$' THEN 1 END) as invalid_phones,
    COUNT(CASE WHEN nrc_number !~ '^\d{6}/\d{2}/\d$' THEN 1 END) as invalid_nrcs,
    0 as additional_check
FROM public.drivers;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema constraints and data integrity fixes applied successfully!';
    RAISE NOTICE 'Enhanced audit system with risk scoring enabled';
    RAISE NOTICE 'Proper indexes created for performance optimization';
    RAISE NOTICE 'Data validation functions available';
    RAISE NOTICE 'Use "SELECT * FROM data_quality_report;" to check data quality';
END $$;