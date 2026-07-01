/**
 * Type Guards and Runtime Type Validation
 * Fixes data integrity issue: TypeScript Safety Bypassed
 */

import { CarAsset, Driver, ServiceLog, RevenueLog, InsuranceLog } from '../types';

// Environment variable type guards
export function getEnvVar(key: string): string {
  const env = (import.meta as any).env as Record<string, string>;
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
  const env = (import.meta as any).env as Record<string, string>;
  return env[key] || defaultValue;
}

// Database row type definitions
export interface DatabaseCarRow {
  id: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  color: string;
  vin: string;
  mileage: number;
  status: string;
  photos: string[] | null;
  purchase_price: number | null;
  sale_price: number | null;
  disposed_at: string | null;
  is_disposed: boolean | null;
  created_at: string;
}

export interface DatabaseDriverRow {
  id: string;
  full_name: string;
  license_number: string;
  nrc_number: string;
  email: string;
  phone: string;
  address?: string | null;
  marital_status?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_relationship?: string | null;
  next_of_kin_phone?: string | null;
  date_of_birth?: string | null;
  status: string;
  assigned_car_id: string | null;
  profile_picture?: string | null;
  access_code?: string | null;
  nrc_front?: string | null;
  nrc_back?: string | null;
  license_front?: string | null;
  license_back?: string | null;
  created_at: string;
}

export interface DatabaseServiceLogRow {
  id: string;
  car_id: string;
  date: string;
  category: string;
  description: string;
  cost: number;
  mileage: number;
  performed_by: string;
  receipt_url?: string | null;
}

export interface DatabaseRevenueLogRow {
  id: string;
  car_id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  driver_id?: string | null;
  driver_name?: string | null;
  status: string;
}

export interface DatabaseInsuranceLogRow {
  id: string;
  car_id: string;
  date: string;
  type: string;
  amount: number;
  expiry_date: string;
  description: string;
  performed_by: string;
}

// Type guard functions
export function isValidCarStatus(status: string): status is CarAsset['status'] {
  return ['Available', 'Assigned', 'Maintenance', 'Out of Service', 'Disposed'].includes(status);
}

export function isValidDriverStatus(status: string): status is Driver['status'] {
  return ['Active', 'On Leave', 'Suspended', 'Inactive'].includes(status);
}

export function isValidServiceCategory(category: string): category is ServiceLog['category'] {
  return ['Maintenance', 'Repair', 'Inspection', 'Tire Service', 'Oil Change', 'Other'].includes(category);
}

export function isValidRevenueCategory(category: string): category is RevenueLog['category'] {
  return ['Fare', 'Rental', 'Delivery', 'Contract', 'Other'].includes(category);
}

export function isValidRevenueStatus(status: string): status is NonNullable<RevenueLog['status']> {
  return ['Pending', 'Approved'].includes(status);
}

export function isValidInsuranceType(type: string): type is InsuranceLog['type'] {
  return ['Road Tax', 'Insurance', 'Fitness', 'Identity'].includes(type);
}

// Validation functions with error details
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

export function validateAndParseNumber(
  value: unknown, 
  fieldName: string, 
  options: { min?: number; max?: number; allowNull?: boolean } = {}
): ValidationResult<number | null> {
  const errors: string[] = [];

  if (value === null || value === undefined) {
    if (options.allowNull) {
      return { isValid: true, data: null, errors: [] };
    }
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    errors.push(`${fieldName} must be a valid number`);
    return { isValid: false, errors };
  }

  if (options.min !== undefined && num < options.min) {
    errors.push(`${fieldName} must be at least ${options.min}`);
  }

  if (options.max !== undefined && num > options.max) {
    errors.push(`${fieldName} must be at most ${options.max}`);
  }

  return {
    isValid: errors.length === 0,
    data: num,
    errors
  };
}

export function validateAndParseString(
  value: unknown, 
  fieldName: string,
  options: { minLength?: number; maxLength?: number; allowEmpty?: boolean; pattern?: RegExp } = {}
): ValidationResult<string> {
  const errors: string[] = [];

  if (value === null || value === undefined) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  const str = String(value).trim();
  
  if (!options.allowEmpty && str === '') {
    errors.push(`${fieldName} cannot be empty`);
    return { isValid: false, errors };
  }

  if (options.minLength !== undefined && str.length < options.minLength) {
    errors.push(`${fieldName} must be at least ${options.minLength} characters`);
  }

  if (options.maxLength !== undefined && str.length > options.maxLength) {
    errors.push(`${fieldName} must be at most ${options.maxLength} characters`);
  }

  if (options.pattern && !options.pattern.test(str)) {
    errors.push(`${fieldName} format is invalid`);
  }

  return {
    isValid: errors.length === 0,
    data: str,
    errors
  };
}

// Database row to type converters with full validation
export function convertDatabaseCarRow(row: DatabaseCarRow): ValidationResult<CarAsset> {
  const errors: string[] = [];
  
  // Validate required fields
  const idResult = validateAndParseString(row.id, 'id');
  const makeResult = validateAndParseString(row.make, 'make', { minLength: 1, maxLength: 50 });
  const modelResult = validateAndParseString(row.model, 'model', { minLength: 1, maxLength: 50 });
  const plateResult = validateAndParseString(row.plate_number, 'plateNumber', { minLength: 3, maxLength: 10 });
  const colorResult = validateAndParseString(row.color, 'color', { minLength: 1, maxLength: 30 });
  const vinResult = validateAndParseString(row.vin, 'vin', { 
    minLength: 17, 
    maxLength: 17, 
    pattern: /^[A-HJ-NPR-Z0-9]{17}$/
  });
  
  const yearResult = validateAndParseNumber(row.year, 'year', { 
    min: 1900, 
    max: new Date().getFullYear() + 1 
  });
  const mileageResult = validateAndParseNumber(row.mileage, 'mileage', { min: 0 });
  
  // Collect all validation errors
  errors.push(...idResult.errors, ...makeResult.errors, ...modelResult.errors);
  errors.push(...plateResult.errors, ...colorResult.errors, ...vinResult.errors);
  errors.push(...yearResult.errors, ...mileageResult.errors);

  // Validate status
  if (!isValidCarStatus(row.status)) {
    errors.push(`Invalid car status: ${row.status}`);
  }

  // Validate optional numeric fields
  const purchasePriceResult = validateAndParseNumber(row.purchase_price, 'purchasePrice', { 
    min: 0, 
    allowNull: true 
  });
  const salePriceResult = validateAndParseNumber(row.sale_price, 'salePrice', { 
    min: 0, 
    allowNull: true 
  });

  errors.push(...purchasePriceResult.errors, ...salePriceResult.errors);

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Safe to assert types now since validation passed
  const carAsset: CarAsset = {
    id: idResult.data!,
    make: makeResult.data!,
    model: modelResult.data!,
    year: yearResult.data!,
    plateNumber: plateResult.data!,
    color: colorResult.data!,
    vin: vinResult.data!,
    mileage: mileageResult.data!,
    status: row.status as CarAsset['status'],
    photos: row.photos || [],
    serviceLogs: [],
    revenueLogs: [],
    insuranceLogs: [],
    purchasePrice: purchasePriceResult.data ?? 0,
    salePrice: salePriceResult.data ?? 0,
    disposedAt: row.disposed_at || '',
    isDisposed: row.is_disposed || false,
    createdAt: row.created_at
  };

  return { isValid: true, data: carAsset, errors: [] };
}

export function convertDatabaseDriverRow(row: DatabaseDriverRow): ValidationResult<Driver> {
  const errors: string[] = [];
  
  // Validate required fields
  const idResult = validateAndParseString(row.id, 'id');
  const nameResult = validateAndParseString(row.full_name, 'fullName', { minLength: 1, maxLength: 100 });
  const licenseResult = validateAndParseString(row.license_number, 'licenseNumber', { minLength: 5, maxLength: 20 });
  const nrcResult = validateAndParseString(row.nrc_number, 'nrcNumber', { 
    pattern: /^\d{6}\/\d{2}\/\d$/
  });
  const emailResult = validateAndParseString(row.email, 'email', { 
    pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  });
  const phoneResult = validateAndParseString(row.phone, 'phone', { 
    pattern: /^[0-9]{7,15}$/
  });

  // Collect validation errors
  errors.push(...idResult.errors, ...nameResult.errors, ...licenseResult.errors);
  errors.push(...nrcResult.errors, ...emailResult.errors, ...phoneResult.errors);

  // Validate status
  if (!isValidDriverStatus(row.status)) {
    errors.push(`Invalid driver status: ${row.status}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const driver: Driver = {
    id: idResult.data!,
    fullName: nameResult.data!,
    licenseNumber: licenseResult.data!,
    nrcNumber: nrcResult.data!,
    email: emailResult.data!,
    phone: phoneResult.data!,
    address: row.address || '',
    maritalStatus: row.marital_status || '',
    nextOfKinName: row.next_of_kin_name || '',
    nextOfKinRelationship: row.next_of_kin_relationship || '',
    nextOfKinPhone: row.next_of_kin_phone || '',
    dateOfBirth: row.date_of_birth || '',
    status: row.status as Driver['status'],
    assignedCarId: row.assigned_car_id,
    profilePicture: row.profile_picture || '',
    accessCode: row.access_code || '',
    nrcFront: row.nrc_front || '',
    nrcBack: row.nrc_back || '',
    licenseFront: row.license_front || '',
    licenseBack: row.license_back || '',
    createdAt: row.created_at
  };

  return { isValid: true, data: driver, errors: [] };
}

export function convertDatabaseServiceLogRow(row: DatabaseServiceLogRow): ValidationResult<ServiceLog> {
  const errors: string[] = [];
  
  const idResult = validateAndParseString(row.id, 'id');
  const descriptionResult = validateAndParseString(row.description, 'description', { minLength: 1, maxLength: 500 });
  const performedByResult = validateAndParseString(row.performed_by, 'performedBy', { minLength: 1, maxLength: 100 });
  const costResult = validateAndParseNumber(row.cost, 'cost', { min: 0 });
  const mileageResult = validateAndParseNumber(row.mileage, 'mileage', { min: 0 });

  errors.push(...idResult.errors, ...descriptionResult.errors, ...performedByResult.errors);
  errors.push(...costResult.errors, ...mileageResult.errors);

  if (!isValidServiceCategory(row.category)) {
    errors.push(`Invalid service category: ${row.category}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const serviceLog: ServiceLog = {
    id: idResult.data!,
    date: row.date,
    category: row.category as ServiceLog['category'],
    description: descriptionResult.data!,
    cost: costResult.data!,
    mileage: mileageResult.data!,
    performedBy: performedByResult.data!,
    receiptUrl: row.receipt_url || ''
  };

  return { isValid: true, data: serviceLog, errors: [] };
}

// Utility to safely access nested properties
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}

export function safeGetNested<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  obj: T | null | undefined, 
  key1: K1, 
  key2: K2
): T[K1][K2] | undefined {
  return obj?.[key1]?.[key2];
}

// Type-safe array operations
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item != null);
}

export function mapWithValidation<T, R>(
  array: T[],
  mapper: (item: T) => ValidationResult<R>
): { valid: R[]; invalid: { item: T; errors: string[] }[] } {
  const valid: R[] = [];
  const invalid: { item: T; errors: string[] }[] = [];

  for (const item of array) {
    const result = mapper(item);
    if (result.isValid && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({ item, errors: result.errors });
    }
  }

  return { valid, invalid };
}