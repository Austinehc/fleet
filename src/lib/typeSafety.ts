/**
 * Enhanced Type Safety Utilities
 * Provides comprehensive type guards, null checking, and safe property access
 */

import { CarAsset, Driver, ServiceLog, RevenueLog, InsuranceLog } from '../types';

// ==========================================
// SAFE PROPERTY ACCESS UTILITIES
// ==========================================

/**
 * Safely access optional properties with proper null checking
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined, 
  key: K, 
  defaultValue?: T[K]
): T[K] | undefined {
  if (obj == null) return defaultValue;
  const value = obj[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Safely access nested optional properties
 */
export function safeGetNested<T, K1 extends keyof T, K2 extends keyof NonNullable<T[K1]>>(
  obj: T | null | undefined,
  key1: K1,
  key2: K2,
  defaultValue?: NonNullable<T[K1]>[K2]
): NonNullable<T[K1]>[K2] | undefined {
  if (obj == null) return defaultValue;
  const nested = obj[key1];
  if (nested == null) return defaultValue;
  const value = nested[key2];
  return value !== undefined ? value : defaultValue;
}

/**
 * Safely format optional string properties
 */
export function safeString(value: string | null | undefined, defaultValue: string = ''): string {
  return value != null ? String(value).trim() : defaultValue;
}

/**
 * Safely format optional number properties
 */
export function safeNumber(value: number | null | undefined, defaultValue: number = 0): number {
  if (value == null) return defaultValue;
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
}

/**
 * Safely format optional date properties
 */
export function safeDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Safely format date for display
 */
export function safeDateString(value: string | Date | null | undefined, format: 'short' | 'long' = 'short'): string {
  const date = safeDate(value);
  if (!date) return 'N/A';
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  return date.toLocaleDateString('en-US');
}

// ==========================================
// CAR ASSET TYPE SAFETY
// ==========================================

/**
 * Safely access car asset properties with null checking
 */
export class SafeCarAsset {
  constructor(private car: CarAsset | null | undefined) {}

  get id(): string {
    return safeString(this.car?.id, '');
  }

  get make(): string {
    return safeString(this.car?.make, 'Unknown');
  }

  get model(): string {
    return safeString(this.car?.model, 'Unknown');
  }

  get year(): number {
    return safeNumber(this.car?.year, new Date().getFullYear());
  }

  get plateNumber(): string {
    return safeString(this.car?.plateNumber, 'N/A');
  }

  get vin(): string {
    return safeString(this.car?.vin, 'N/A');
  }

  get mileage(): number {
    return safeNumber(this.car?.mileage, 0);
  }

  get status(): CarAsset['status'] {
    return this.car?.status || 'Available';
  }

  get photos(): readonly string[] {
    return this.car?.photos || [];
  }

  get purchasePrice(): number {
    return safeNumber(this.car?.purchasePrice, 0);
  }

  get salePrice(): number {
    return safeNumber(this.car?.salePrice, 0);
  }

  get disposedAt(): string {
    return safeString(this.car?.disposedAt, '');
  }

  get isDisposed(): boolean {
    return Boolean(this.car?.isDisposed);
  }

  get serviceLogs(): readonly ServiceLog[] {
    return this.car?.serviceLogs || [];
  }

  get revenueLogs(): readonly RevenueLog[] {
    return this.car?.revenueLogs || [];
  }

  get insuranceLogs(): readonly InsuranceLog[] {
    return this.car?.insuranceLogs || [];
  }

  get createdAt(): Date | null {
    return safeDate(this.car?.createdAt);
  }

  /**
   * Get formatted display name
   */
  get displayName(): string {
    return `${this.make} ${this.model} (${this.plateNumber})`;
  }

  /**
   * Check if car has valid photos
   */
  get hasPhotos(): boolean {
    return this.photos.length > 0;
  }

  /**
   * Get primary photo safely
   */
  get primaryPhoto(): string | null {
    return this.photos[0] || null;
  }

  /**
   * Calculate total service costs
   */
  get totalServiceCosts(): number {
    return this.serviceLogs.reduce((total, log) => total + safeNumber(log.cost, 0), 0);
  }

  /**
   * Calculate total revenue
   */
  get totalRevenue(): number {
    return this.revenueLogs.reduce((total, log) => total + safeNumber(log.amount, 0), 0);
  }

  /**
   * Get profit/loss calculation
   */
  get profitLoss(): number {
    const revenue = this.totalRevenue;
    const costs = this.totalServiceCosts + this.purchasePrice;
    return revenue - costs;
  }

  /**
   * Check if any insurance is expiring soon
   */
  getExpiringInsurance(daysAhead: number = 30): InsuranceLog[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.insuranceLogs.filter(log => {
      const expiryDate = safeDate(log.expiryDate);
      return expiryDate && expiryDate > now && expiryDate <= futureDate;
    });
  }

  /**
   * Check if any insurance has expired
   */
  getExpiredInsurance(): InsuranceLog[] {
    const now = new Date();

    return this.insuranceLogs.filter(log => {
      const expiryDate = safeDate(log.expiryDate);
      return expiryDate && expiryDate <= now;
    });
  }
}

// ==========================================
// DRIVER TYPE SAFETY
// ==========================================

/**
 * Safely access driver properties with null checking
 */
export class SafeDriver {
  constructor(private driver: Driver | null | undefined) {}

  get id(): string {
    return safeString(this.driver?.id, '');
  }

  get fullName(): string {
    return safeString(this.driver?.fullName, 'Unknown');
  }

  get email(): string {
    return safeString(this.driver?.email, '');
  }

  get phone(): string {
    return safeString(this.driver?.phone, '');
  }

  get licenseNumber(): string {
    return safeString(this.driver?.licenseNumber, 'N/A');
  }

  get nrcNumber(): string {
    return safeString(this.driver?.nrcNumber, 'N/A');
  }

  get status(): Driver['status'] {
    return this.driver?.status || 'Inactive';
  }

  get assignedCarId(): string | null {
    return this.driver?.assignedCarId || null;
  }

  get address(): string {
    return safeString(this.driver?.address, '');
  }

  get maritalStatus(): string {
    return safeString(this.driver?.maritalStatus, '');
  }

  get dateOfBirth(): Date | null {
    return safeDate(this.driver?.dateOfBirth);
  }

  get profilePicture(): string {
    return safeString(this.driver?.profilePicture, '');
  }

  get nextOfKinName(): string {
    return safeString(this.driver?.nextOfKinName, '');
  }

  get nextOfKinRelationship(): string {
    return safeString(this.driver?.nextOfKinRelationship, '');
  }

  get nextOfKinPhone(): string {
    return safeString(this.driver?.nextOfKinPhone, '');
  }

  get createdAt(): Date | null {
    return safeDate(this.driver?.createdAt);
  }

  /**
   * Check if driver is active
   */
  get isActive(): boolean {
    return this.status === 'Active';
  }

  /**
   * Check if driver has a car assigned
   */
  get hasAssignedCar(): boolean {
    return this.assignedCarId !== null;
  }

  /**
   * Check if driver has profile picture
   */
  get hasProfilePicture(): boolean {
    return this.profilePicture.length > 0;
  }

  /**
   * Get age from date of birth
   */
  get age(): number | null {
    const dob = this.dateOfBirth;
    if (!dob) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Get formatted display name with status
   */
  get displayNameWithStatus(): string {
    return `${this.fullName} (${this.status})`;
  }
}

// ==========================================
// ARRAY TYPE SAFETY UTILITIES
// ==========================================

/**
 * Safely filter and map arrays with type checking
 */
export function safeFilter<T>(
  array: (T | null | undefined)[] | null | undefined,
  predicate: (item: T) => boolean
): T[] {
  if (!Array.isArray(array)) return [];
  
  return array
    .filter((item): item is T => item != null)
    .filter(predicate);
}

/**
 * Safely map arrays with type checking and null handling
 */
export function safeMap<T, R>(
  array: (T | null | undefined)[] | null | undefined,
  mapper: (item: T, index: number) => R
): R[] {
  if (!Array.isArray(array)) return [];
  
  return array
    .filter((item): item is T => item != null)
    .map(mapper);
}

/**
 * Safely find item in array with type checking
 */
export function safeFind<T>(
  array: (T | null | undefined)[] | null | undefined,
  predicate: (item: T) => boolean
): T | null {
  if (!Array.isArray(array)) return null;
  
  const validItems = array.filter((item): item is T => item != null);
  return validItems.find(predicate) || null;
}

/**
 * Safely reduce array with type checking
 */
export function safeReduce<T, R>(
  array: (T | null | undefined)[] | null | undefined,
  reducer: (acc: R, item: T, index: number) => R,
  initialValue: R
): R {
  if (!Array.isArray(array)) return initialValue;
  
  return array
    .filter((item): item is T => item != null)
    .reduce(reducer, initialValue);
}

// ==========================================
// ERROR HANDLING TYPE SAFETY
// ==========================================

/**
 * Discriminated union for different error types
 */
export type SafeError = 
  | { type: 'VALIDATION_ERROR'; field: string; message: string; value?: unknown }
  | { type: 'NETWORK_ERROR'; message: string; status?: number; url?: string }
  | { type: 'DATABASE_ERROR'; message: string; table?: string; operation?: string }
  | { type: 'AUTH_ERROR'; message: string; action?: string }
  | { type: 'PERMISSION_ERROR'; message: string; resource?: string; action?: string }
  | { type: 'BUSINESS_LOGIC_ERROR'; message: string; context?: Record<string, unknown> }
  | { type: 'UNKNOWN_ERROR'; message: string; originalError?: Error };

/**
 * Type-safe result wrapper
 */
export type SafeResult<T, E = SafeError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a safe result wrapper
 */
export function createSafeResult<T>(data: T): SafeResult<T> {
  return { success: true, data };
}

/**
 * Create a safe error result
 */
export function createSafeError<E = SafeError>(error: E): SafeResult<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T, E>(result: SafeResult<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if result is error
 */
export function isError<T, E>(result: SafeResult<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<SafeResult<T>> {
  try {
    const data = await operation();
    return createSafeResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const safeError: SafeError = {
      type: 'UNKNOWN_ERROR',
      message: errorContext ? `${errorContext}: ${message}` : message,
      ...(error instanceof Error && { originalError: error })
    };
    return createSafeError(safeError);
  }
}

/**
 * Safe sync operation wrapper  
 */
export function safeSync<T>(
  operation: () => T,
  errorContext?: string
): SafeResult<T> {
  try {
    const data = operation();
    return createSafeResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const safeError: SafeError = {
      type: 'UNKNOWN_ERROR',
      message: errorContext ? `${errorContext}: ${message}` : message,
      ...(error instanceof Error && { originalError: error })
    };
    return createSafeError(safeError);
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Create a safe car asset wrapper
 */
export function createSafeCar(car: CarAsset | null | undefined): SafeCarAsset {
  return new SafeCarAsset(car);
}

/**
 * Create a safe driver wrapper
 */
export function createSafeDriver(driver: Driver | null | undefined): SafeDriver {
  return new SafeDriver(driver);
}

/**
 * Create safe car array
 */
export function createSafeCars(cars: (CarAsset | null | undefined)[] | null | undefined): SafeCarAsset[] {
  return safeMap(cars, car => createSafeCar(car));
}

/**
 * Create safe driver array
 */
export function createSafeDrivers(drivers: (Driver | null | undefined)[] | null | undefined): SafeDriver[] {
  return safeMap(drivers, driver => createSafeDriver(driver));
}