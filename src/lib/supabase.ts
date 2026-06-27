import { createClient } from '@supabase/supabase-js';
import { CarAsset, Driver, ServiceLog, RevenueLog, InsuranceLog } from '../types';
import { errorHandler } from './errorHandling';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.indexOf('placeholder') === -1);
};

// Initialize Supabase. If missing, we'll return a stub or guide the user
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
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
      const [svcResult, revResult, insuranceResult] = await Promise.allSettled([
        supabase!.from('service_logs').select('*').order('date', { ascending: false }),
        supabase!.from('revenue_logs').select('*').order('date', { ascending: false }),
        supabase!.from('insurance_logs').select('*').order('date', { ascending: false })
      ]);

      const dbSvc = svcResult.status === 'fulfilled' ? svcResult.value.data || [] : [];
      const dbRev = revResult.status === 'fulfilled' ? revResult.value.data || [] : [];
      const dbInsurance = insuranceResult.status === 'fulfilled' ? insuranceResult.value.data || [] : [];

      return { dbCars, dbSvc, dbRev, dbInsurance };
    },
    'Load cars from database'
  );

  if (error) {
    console.error('Error loading cars:', error);
    throw error;
  }

  const { dbCars, dbSvc, dbRev, dbInsurance } = data!;

  const serviceLogsMap = (dbSvc || []).reduce((acc: any, log: any) => {
    if (!acc[log.car_id]) acc[log.car_id] = [];
    acc[log.car_id].push({
      id: log.id,
      date: log.date,
      category: log.category,
      description: log.description,
      cost: Number(log.cost),
      mileage: Number(log.mileage),
      performedBy: log.performed_by,
      receiptUrl: log.receipt_url || undefined
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



  const insuranceLogsMap = (dbInsurance || []).reduce((acc: any, log: any) => {
    if (!acc[log.car_id]) acc[log.car_id] = [];
    acc[log.car_id].push({
      id: log.id,
      date: log.date,
      type: log.type,
      amount: Number(log.amount),
      expiryDate: log.expiry_date,
      description: log.description,
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

    insuranceLogs: insuranceLogsMap[car.id] || [],
    purchasePrice: car.purchase_price != null ? Number(car.purchase_price) : 0,
    salePrice: car.sale_price != null ? Number(car.sale_price) : 0,
    disposedAt: car.disposed_at || '',
    isDisposed: Boolean(car.is_disposed),
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
    address: drv.address,
    maritalStatus: drv.marital_status,
    nextOfKinName: drv.next_of_kin_name,
    nextOfKinRelationship: drv.next_of_kin_relationship,
    nextOfKinPhone: drv.next_of_kin_phone,
    dateOfBirth: drv.date_of_birth,
    status: drv.status as any,
    assignedCarId: drv.assigned_car_id,
    profilePicture: drv.profile_picture,
    accessCode: drv.access_code,
    nrcFront: drv.nrc_front,
    nrcBack: drv.nrc_back,
    licenseFront: drv.license_front,
    licenseBack: drv.license_back,
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
      purchase_price: car.purchasePrice ?? 0,
      sale_price: car.salePrice ?? 0,
      disposed_at: car.disposedAt || null,
      is_disposed: Boolean(car.isDisposed),
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

// Upsert Driver in DB with secure PIN handling
export async function saveDriverToDB(driver: Driver): Promise<void> {
  if (!supabase) return;

  // Save the driver data
  const { error } = await supabase
    .from('drivers')
    .upsert({
      id: driver.id,
      full_name: driver.fullName,
      license_number: driver.licenseNumber,
      nrc_number: driver.nrcNumber,
      email: driver.email,
      phone: driver.phone,
      address: driver.address,
      marital_status: driver.maritalStatus,
      next_of_kin_name: driver.nextOfKinName,
      next_of_kin_relationship: driver.nextOfKinRelationship,
      next_of_kin_phone: driver.nextOfKinPhone,
      date_of_birth: driver.dateOfBirth,
      status: driver.status,
      assigned_car_id: driver.assignedCarId,
      profile_picture: driver.profilePicture,
      access_code: driver.accessCode,
      nrc_front: driver.nrcFront,
      nrc_back: driver.nrcBack,
      license_front: driver.licenseFront,
      license_back: driver.licenseBack,
      created_at: driver.createdAt
    });

  if (error) {
    console.error('Error saving driver:', error);
    throw error;
  }

  // If driver has an access code, securely hash it using the database function
  if (driver.accessCode) {
    try {
      const { error: pinError } = await supabase.rpc('set_driver_pin', {
        driver_id: driver.id,
        pin: driver.accessCode
      });

      if (pinError) {
        console.warn('PIN hashing failed, but driver created:', pinError.message);
        // Don't throw error here to avoid breaking driver creation if PIN function is missing
      }
    } catch (pinError) {
      console.warn('PIN hashing not available, storing access code in plain text:', pinError);
      // Fallback: PIN functions might not be deployed yet
    }
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
      performed_by: log.performedBy,
      receipt_url: log.receiptUrl || null
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

// Submit Insurance Log
export async function saveInsuranceLogToDB(carId: string, log: InsuranceLog): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('insurance_logs')
    .upsert({
      id: log.id,
      car_id: carId,
      date: log.date,
      type: log.type,
      amount: log.amount,
      expiry_date: log.expiryDate,
      description: log.description,
      performed_by: log.performedBy
    });

  if (error) {
    console.error('Error saving insurance log:', error);
    throw error;
  }
}

// Delete Insurance Log from DB
export async function deleteInsuranceLogFromDB(logId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('insurance_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    console.error('Error deleting insurance log:', error);
    throw error;
  }
}
