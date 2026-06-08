-- ==========================================
-- FLEET ASSETS DATABASE SCHEMA FOR SUPABASE
-- Run this in your Supabase SQL Editor.
-- ==========================================

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

-- 5. Create FUEL LOGS Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id TEXT PRIMARY KEY,
    car_id TEXT REFERENCES public.cars(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    liters NUMERIC NOT NULL DEFAULT 0,
    cost NUMERIC NOT NULL DEFAULT 0,
    mileage INTEGER NOT NULL,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Security
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous/authenticated read & write access for fleet monitoring simulation
CREATE POLICY "Allow read access of cars to all" ON public.cars FOR SELECT USING (true);
CREATE POLICY "Allow write access of cars to all" ON public.cars FOR ALL USING (true);

CREATE POLICY "Allow read access of drivers to all" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Allow write access of drivers to all" ON public.drivers FOR ALL USING (true);

CREATE POLICY "Allow read access of service_logs to all" ON public.service_logs FOR SELECT USING (true);
CREATE POLICY "Allow write access of service_logs to all" ON public.service_logs FOR ALL USING (true);

CREATE POLICY "Allow read access of revenue_logs to all" ON public.revenue_logs FOR SELECT USING (true);
CREATE POLICY "Allow write access of revenue_logs to all" ON public.revenue_logs FOR ALL USING (true);

CREATE POLICY "Allow read access of fuel_logs to all" ON public.fuel_logs FOR SELECT USING (true);
CREATE POLICY "Allow write access of fuel_logs to all" ON public.fuel_logs FOR ALL USING (true);
