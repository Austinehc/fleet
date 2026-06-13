/**
 * Application constants to replace magic numbers
 */

// Authentication
export const AUTH_CONSTANTS = {
  PIN_LENGTH: 6,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 15,
  VIN_LENGTH: 17,
  LICENSE_MIN_LENGTH: 5,
  LICENSE_MAX_LENGTH: 20,
  PLATE_MIN_LENGTH: 3,
  PLATE_MAX_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  NAME_MAX_LENGTH: 100,
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_FILES_PER_CAR: 10,
} as const;

// UI Constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300, // ms
  THROTTLE_DELAY: 1000, // ms
  TOAST_DURATION: 4500, // ms
  POLLING_INTERVAL: 4000, // ms
  ANIMATION_DURATION: 200, // ms
} as const;

// Database constants
export const DB_CONSTANTS = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
  BATCH_SIZE: 50,
  SYNC_INTERVAL: 30000, // 30 seconds
} as const;

// Vehicle status options
export const VEHICLE_STATUS = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Out of Service',
} as const;

// Driver status options
export const DRIVER_STATUS = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
} as const;

// Service categories
export const SERVICE_CATEGORIES = {
  MAINTENANCE: 'Maintenance',
  REPAIR: 'Repair',
  INSPECTION: 'Inspection',
  TIRE_SERVICE: 'Tire Service',
  OIL_CHANGE: 'Oil Change',
  OTHER: 'Other',
} as const;

// Revenue categories
export const REVENUE_CATEGORIES = {
  FARE: 'Fare',
  RENTAL: 'Rental',
  DELIVERY: 'Delivery',
  CONTRACT: 'Contract',
  OTHER: 'Other',
} as const;

// Revenue status
export const REVENUE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
  ACCESS_DENIED: 'Access denied. Please contact administrator.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds 5MB limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please use JPEG, PNG, or WebP.',
  DUPLICATE_ENTRY: 'This entry already exists.',
  NOT_FOUND: 'Requested item not found.',
  OPERATION_FAILED: 'Operation failed. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  CREATED: 'Item created successfully.',
  UPDATED: 'Item updated successfully.',
  DELETED: 'Item deleted successfully.',
  UPLOADED: 'File uploaded successfully.',
  ASSIGNED: 'Assignment completed successfully.',
} as const;