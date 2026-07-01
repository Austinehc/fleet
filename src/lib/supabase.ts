import { createClient } from '@supabase/supabase-js';
import { CarAsset, Driver, ServiceLog, RevenueLog, InsuranceLog } from '../types';
import { 
  getOptionalEnvVar,
  DatabaseCarRow,
  DatabaseDriverRow,
  DatabaseServiceLogRow,
  DatabaseRevenueLogRow,
  DatabaseInsuranceLogRow,
  convertDatabaseCarRow,
  convertDatabaseDriverRow,
  convertDatabaseServiceLogRow,
  mapWithValidation
} from './typeGuards';
import { 
  safeAsync, 
  createSafeError,
  SafeResult,
  SafeError,
  safeString,
  safeNumber
} from './typeSafety';

const supabaseUrl = getOptionalEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getOptionalEnvVar('VITE_SUPABASE_ANON_KEY');

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

// Helper to convert DB snake_case columns back to CarAsset type with full validation
export async function getCarsFromDB(): Promise<SafeResult<CarAsset[], SafeError>> {
  if (!supabase) {
    return createSafeError({
      type: 'DATABASE_ERROR',
      message: 'Supabase not configured'
    });
  }

  return safeAsync(async () => {
    const { data: dbCars, error: carsError } = await supabase!
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });

    if (carsError) {
      throw new Error(`Failed to load cars: ${carsError.message}`);
    }

    // Load all sub-records with error handling
    const [svcResult, revResult, insuranceResult] = await Promise.allSettled([
      supabase!.from('service_logs').select('*').order('date', { ascending: false }),
      supabase!.from('revenue_logs').select('*').order('date', { ascending: false }),
      supabase!.from('insurance_logs').select('*').order('date', { ascending: false })
    ]);

    const dbSvc = svcResult.status === 'fulfilled' ? svcResult.value.data || [] : [];
    const dbRev = revResult.status === 'fulfilled' ? revResult.value.data || [] : [];
    const dbInsurance = insuranceResult.status === 'fulfilled' ? insuranceResult.value.data || [] : [];

    // Type-safe mapping with validation
    const serviceLogsMap: Record<string, ServiceLog[]> = {};
    const { valid: validServiceLogs, invalid: invalidServiceLogs } = mapWithValidation(
      dbSvc as DatabaseServiceLogRow[], 
      convertDatabaseServiceLogRow
    );

    if (invalidServiceLogs.length > 0) {
      console.warn('Invalid service logs found:', invalidServiceLogs);
    }

    for (const log of validServiceLogs) {
      const carId = dbSvc.find(dbLog => dbLog.id === log.id)?.car_id;
      if (carId) {
        if (!serviceLogsMap[carId]) serviceLogsMap[carId] = [];
        serviceLogsMap[carId].push(log);
      }
    }

    // Type-safe revenue logs mapping with proper null checking
    const revenueLogsMap: Record<string, RevenueLog[]> = {};
    for (const dbLog of (dbRev as DatabaseRevenueLogRow[])) {
      if (!revenueLogsMap[dbLog.car_id]) revenueLogsMap[dbLog.car_id] = [];
      
      // Create a mutable version to construct the revenue log
      const revenueLogData: {
        id: string;
        date: string;
        amount: number;
        category: RevenueLog['category'];
        description: string;
        status?: RevenueLog['status'];
        driverId?: string;
        driverName?: string;
      } = {
        id: safeString(dbLog.id),
        date: safeString(dbLog.date),
        amount: safeNumber(dbLog.amount),
        category: dbLog.category as RevenueLog['category'],
        description: safeString(dbLog.description)
      };
      
      // Add optional fields if they have values (safe null checking)
      if (dbLog.status && dbLog.status.trim()) {
        revenueLogData.status = dbLog.status as RevenueLog['status'];
      }
      if (dbLog.driver_id && dbLog.driver_id.trim()) {
        revenueLogData.driverId = dbLog.driver_id;
      }
      if (dbLog.driver_name && dbLog.driver_name.trim()) {
        revenueLogData.driverName = dbLog.driver_name;
      }
      
      const revenueLog = revenueLogData as RevenueLog;
      revenueLogsMap[dbLog.car_id]!.push(revenueLog);
    }

    // Type-safe insurance logs mapping with null checking
    const insuranceLogsMap: Record<string, InsuranceLog[]> = {};
    for (const dbLog of (dbInsurance as DatabaseInsuranceLogRow[])) {
      if (!insuranceLogsMap[dbLog.car_id]) insuranceLogsMap[dbLog.car_id] = [];
      
      const insuranceLog: InsuranceLog = {
        id: safeString(dbLog.id),
        date: safeString(dbLog.date),
        type: dbLog.type as InsuranceLog['type'],
        amount: safeNumber(dbLog.amount),
        expiryDate: safeString(dbLog.expiry_date),
        description: safeString(dbLog.description),
        performedBy: safeString(dbLog.performed_by)
      };
      insuranceLogsMap[dbLog.car_id]!.push(insuranceLog);
    }

    // Convert cars with full validation and null checking
    const { valid: validCars, invalid: invalidCars } = mapWithValidation(
      (dbCars || []) as DatabaseCarRow[], 
      convertDatabaseCarRow
    );

    if (invalidCars.length > 0) {
      console.error('Invalid car records found:', invalidCars);
    }

    // Attach logs to cars with safe access
    const carsWithLogs = validCars.map(car => ({
      ...car,
      serviceLogs: serviceLogsMap[car.id] || [],
      revenueLogs: revenueLogsMap[car.id] || [],
      insuranceLogs: insuranceLogsMap[car.id] || []
    }));

    return carsWithLogs;
  }, 'Load cars from database');
}

// Convert DB snake_case columns back to Driver type with full validation
export async function getDriversFromDB(): Promise<SafeResult<Driver[], SafeError>> {
  if (!supabase) {
    return createSafeError({
      type: 'DATABASE_ERROR',
      message: 'Supabase not configured'
    });
  }

  return safeAsync(async () => {
    const { data: dbDrivers, error } = await supabase!
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load drivers: ${error.message}`);
    }

    const typedDbDrivers = (dbDrivers || []) as DatabaseDriverRow[];
    
    // Convert with full validation and safe null checking
    const { valid: validDrivers, invalid: invalidDrivers } = mapWithValidation(
      typedDbDrivers, 
      convertDatabaseDriverRow
    );

    if (invalidDrivers.length > 0) {
      console.error('Invalid driver records found:', invalidDrivers);
    }

    return validDrivers;
  }, 'Load drivers from database');
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

  // Save the driver data (without access_code in the main table)
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
      access_code: null, // Never store PIN in plain text
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
      const { data: pinResult, error: pinError } = await supabase.rpc('set_driver_pin', {
        driver_id: driver.id,
        pin: driver.accessCode
      });

      if (pinError || !pinResult) {
        console.error('PIN hashing failed:', pinError?.message || 'Unknown error');
        throw new Error(`Failed to set secure PIN for driver: ${pinError?.message || 'Database function unavailable'}`);
      }
      
      console.log('Driver PIN securely hashed and stored');
    } catch (pinError) {
      console.error('Critical: PIN security failed:', pinError);
      // Revert driver creation if PIN cannot be secured
      await supabase.from('drivers').delete().eq('id', driver.id);
      throw new Error('Driver creation failed: Unable to secure PIN. Please try again.');
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
