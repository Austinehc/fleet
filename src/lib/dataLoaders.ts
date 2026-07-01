/**
 * Data Loading Utilities
 * Provides type-safe data loading with proper error handling
 */

import { CarAsset, Driver } from '../types';
import { getCarsFromDB, getDriversFromDB } from './supabase';
import { isSuccess } from './typeSafety';

/**
 * Load cars with type safety and error handling
 */
export async function loadCarsData(): Promise<CarAsset[]> {
  try {
    const result = await getCarsFromDB();
    
    if (isSuccess(result)) {
      return result.data;
    } else {
      console.error('Failed to load cars:', result.error);
      return [];
    }
  } catch (error) {
    console.error('Error loading cars:', error);
    return [];
  }
}

/**
 * Load drivers with type safety and error handling
 */
export async function loadDriversData(): Promise<Driver[]> {
  try {
    const result = await getDriversFromDB();
    
    if (isSuccess(result)) {
      return result.data;
    } else {
      console.error('Failed to load drivers:', result.error);
      return [];
    }
  } catch (error) {
    console.error('Error loading drivers:', error);
    return [];
  }
}

/**
 * Load both cars and drivers safely
 */
export async function loadFleetData(): Promise<{ cars: CarAsset[]; drivers: Driver[] }> {
  const [cars, drivers] = await Promise.all([
    loadCarsData(),
    loadDriversData()
  ]);
  
  return { cars, drivers };
}