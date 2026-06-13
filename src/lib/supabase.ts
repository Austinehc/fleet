import { createClient } from '@supabase/supabase-js';
import { CarAsset, Driver, ServiceLog, RevenueLog, FuelLog } from '../types';
import { errorHandler, FleetError } from './errorHandling';
import { DB_CONSTANTS } from './constants';
import { validateEmail, validateVIN, validatePlateNumber, sanitizeString } from './validation';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.indexOf('placeholder') === -1);
};

// Initialize Supabase. If missing, we'll return a stub or guide the user
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to convert DB snake_case columns back to CarAsset type
export async function getCarsFromDB(): Promise<CarAsset[]> {
  if (!supabase) return [];

  const { data, error } = await errorHandler.handleAsync(
    async () => {
      const { data: dbCars, error: carsError } = await supabase!
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false });

      if (carsError) throw carsError;

      // Load all sub-records with error handling
      const [svcResult, revResult, fuelResult] = await Promise.allSettled([
        supabase!.from('service_logs').select('*').order('date', { ascending: false }),
        supabase!.from('revenue_logs').select('*').order('date', { ascending: false }),
        supabase!.from('fuel_logs').select('*').order('date', { ascending: false })
      ]);

      const dbSvc = svcResult.status === 'fulfilled' ? svcResult.value.data || [] : [];
      const dbRev = revResult.status === 'fulfilled' ? revResult.value.data || [] : [];
      const dbFuel = fuelResult.status === 'fulfilled' ? fuelResult.value.data || [] : [];

      return { dbCars, dbSvc, dbRev, dbFuel };
    },
    'Load cars from database'
  );

  if (error) {
    console.error('Error loading cars:', error);
    throw error;
  }

  const { dbCars, dbSvc, dbRev, dbFuel } = data!;

  const serviceLogsMap = (dbSvc || []).reduce((acc: any, log: any) => {
    if (!acc[log.car_id]) acc[log.car_id] = [];
    acc[log.car_id].push({
      id: log.id,
      date: log.date,
      category: log.category,
      description: log.description,
      cost: Number(log.cost),
      mileage: Number(log.mileage),
      performedBy: log.performed_by
    });
    return acc;
  }, {});

  const revenueLogsMap = (dbRev || []).reduce((acc: any, log: any) => {
    if (!acc[log.car_id]) acc[log.car_id] = [];
    acc[log.car_id].push({
      id: log.id,
      date: log.date,
      amount: Number(log.amount),
      category: log.category,
      description: log.description,
      driverId: log.driver_id,
      driverName: log.driver_name,
      status: log.status
    });
    return acc;
  }, {});

  const fuelLogsMap = (dbFuel || []).reduce((acc: any, log: any) => {
    if (!acc[log.car_id]) acc[log.car_id] = [];
    acc[log.car_id].push({
      id: log.id,
      date: log.date,
      liters: Number(log.liters),
      cost: Number(log.cost),
      mileage: Number(log.mileage),
      performedBy: log.performed_by
    });
    return acc;
  }, {});

  return (dbCars || []).map((car: any) => ({
    id: car.id,
    make: car.make,
    model: car.model,
    year: Number(car.year),
    plateNumber: car.plate_number,
    color: car.color,
    vin: car.vin,
    mileage: Number(car.mileage),
    status: car.status as any,
    photos: car.photos || [],
    serviceLogs: serviceLogsMap[car.id] || [],
    revenueLogs: revenueLogsMap[car.id] || [],
    fuelLogs: fuelLogsMap[car.id] || [],
    createdAt: car.created_at
  }));
}

// Convert DB snake_case columns back to Driver type
export async function getDriversFromDB(): Promise<Driver[]> {
  if (!supabase) return [];

  const { data: dbDrivers, error } = await supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading drivers:', error);
    throw error;
  }

  return (dbDrivers || []).map((drv: any) => ({
    id: drv.id,
    fullName: drv.full_name,
    licenseNumber: drv.license_number,
    nrcNumber: drv.nrc_number,
    email: drv.email,
    phone: drv.phone,
    status: drv.status as any,
    assignedCarId: drv.assigned_car_id,
    profilePicture: drv.profile_picture,
    accessCode: drv.access_code,
    createdAt: drv.created_at
  }));
}

// Upsert Car in DB
export async function saveCarAssetToDB(car: CarAsset): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('cars')
    .upsert({
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      plate_number: car.plateNumber,
      color: car.color,
      vin: car.vin,
      mileage: car.mileage,
      status: car.status,
      photos: car.photos,
      created_at: car.createdAt
    });

  if (error) {
    console.error('Error saving car asset:', error);
    throw error;
  }
}

// Delete Car from DB
export async function deleteCarFromDB(carId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('cars')
    .delete()
    .eq('id', carId);

  if (error) {
    console.error('Error deleting car asset:', error);
    throw error;
  }
}

// Upsert Driver in DB
export async function saveDriverToDB(driver: Driver): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('drivers')
    .upsert({
      id: driver.id,
      full_name: driver.fullName,
      license_number: driver.licenseNumber,
      nrc_number: driver.nrcNumber,
      email: driver.email,
      phone: driver.phone,
      status: driver.status,
      assigned_car_id: driver.assignedCarId,
      profile_picture: driver.profilePicture,
      access_code: driver.accessCode,
      created_at: driver.createdAt
    });

  if (error) {
    console.error('Error saving driver:', error);
    throw error;
  }
}

// Delete Driver
export async function deleteDriverFromDB(driverId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', driverId);

  if (error) {
    console.error('Error deleting driver:', error);
    throw error;
  }
}

// Submit Service Log
export async function saveServiceLogToDB(carId: string, log: ServiceLog): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('service_logs')
    .upsert({
      id: log.id,
      car_id: carId,
      date: log.date,
      category: log.category,
      description: log.description,
      cost: log.cost,
      mileage: log.mileage,
      performed_by: log.performedBy
    });

  if (error) {
    console.error('Error saving service log:', error);
    throw error;
  }

  // Also update car's live odometer in DB to reflect changes
  const { error: carError } = await supabase
    .from('cars')
    .update({ mileage: log.mileage })
    .eq('id', carId);

  if (carError) {
    console.warn('Odometer update on car asset failed:', carError);
  }
}

// Submit Revenue Log
export async function saveRevenueLogToDB(carId: string, log: RevenueLog): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('revenue_logs')
    .upsert({
      id: log.id,
      car_id: carId,
      date: log.date,
      amount: log.amount,
      category: log.category,
      description: log.description,
      driver_id: log.driverId,
      driver_name: log.driverName,
      status: log.status
    });

  if (error) {
    console.error('Error saving revenue log:', error);
    throw error;
  }
}

// Approve Revenue Log (called by Manager)
export async function updateRevenueLogStatusInDB(logId: string, status: 'No Details' | 'Approved' | 'Pending'): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('revenue_logs')
    .update({ status })
    .eq('id', logId);

  if (error) {
    console.error('Error updating revenue log status:', error);
    throw error;
  }
}

// Submit Fuel / Refueling Log
export async function saveFuelLogToDB(carId: string, log: FuelLog): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('fuel_logs')
    .upsert({
      id: log.id,
      car_id: carId,
      date: log.date,
      liters: log.liters,
      cost: log.cost,
      mileage: log.mileage,
      performed_by: log.performedBy
    });

  if (error) {
    console.error('Error saving fuel log:', error);
    throw error;
  }

  // Also update car's odometer to match refueling odometer limit
  const { error: carError } = await supabase
    .from('cars')
    .update({ mileage: log.mileage })
    .eq('id', carId);

  if (carError) {
    console.warn('Odometer update from fuel log failed:', carError);
  }
}

// Delete Service Log from DB
export async function deleteServiceLogFromDB(logId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('service_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting service log:', error);
    throw error;
  }
}

// Delete Revenue Log from DB
export async function deleteRevenueLogFromDB(logId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('revenue_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting revenue log:', error);
    throw error;
  }
}

// Delete Fuel Log from DB
export async function deleteFuelLogFromDB(logId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('fuel_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting fuel log:', error);
    throw error;
  }
}
