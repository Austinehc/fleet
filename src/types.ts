/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServiceLog {
  readonly id: string;
  readonly date: string;
  readonly category: 'Maintenance' | 'Repair' | 'Inspection' | 'Tire Service' | 'Oil Change' | 'Other';
  readonly description: string;
  readonly cost: number;
  readonly mileage: number;
  readonly performedBy: string;
  readonly receiptUrl?: string;
}

export interface InsuranceLog {
  readonly id: string;
  readonly date: string;
  readonly type: 'Road Tax' | 'Insurance' | 'Fitness' | 'Identity';
  readonly amount: number;
  readonly expiryDate: string;
  readonly description: string;
  readonly performedBy: string;
}

export interface RevenueLog {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly category: 'Fare' | 'Rental' | 'Delivery' | 'Contract' | 'Other';
  readonly description: string;
  readonly driverId?: string;
  readonly driverName?: string;
  readonly status?: 'Pending' | 'Approved';
}

export interface CarAsset {
  readonly id: string;
  readonly make: string;
  readonly model: string;
  readonly year: number;
  readonly plateNumber: string;
  readonly color: string;
  readonly vin: string;
  readonly mileage: number;
  readonly status: 'Available' | 'Assigned' | 'Maintenance' | 'Out of Service' | 'Disposed';
  readonly photos: readonly string[]; // base64 or object URLs
  readonly serviceLogs: readonly ServiceLog[];
  readonly revenueLogs?: readonly RevenueLog[];
  readonly insuranceLogs?: readonly InsuranceLog[];
  readonly purchasePrice?: number;
  readonly salePrice?: number;
  readonly disposedAt?: string;
  readonly isDisposed?: boolean;
  readonly createdAt: string;
}

export interface Driver {
  readonly id: string;
  readonly fullName: string;
  readonly licenseNumber: string;
  readonly nrcNumber: string;
  readonly email: string;
  readonly phone: string;
  readonly address?: string;
  readonly maritalStatus?: string;
  readonly nextOfKinName?: string;
  readonly nextOfKinRelationship?: string;
  readonly nextOfKinPhone?: string;
  readonly dateOfBirth?: string;
  readonly status: 'Active' | 'On Leave' | 'Suspended' | 'Inactive';
  readonly assignedCarId: string | null; // ID of the CarAsset
  readonly profilePicture?: string; // Base64 or URL
  readonly accessCode?: string; // 6-digit random alphanumeric code
  readonly nrcFront?: string; // NRC front image
  readonly nrcBack?: string; // NRC back image
  readonly licenseFront?: string; // License front image
  readonly licenseBack?: string; // License back image
  readonly createdAt: string;
}

// Utility types for creating/updating entities (mutable versions)
export type CarAssetInput = {
  id?: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  vin: string;
  mileage: number;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Out of Service' | 'Disposed';
  photos: string[];
  serviceLogs: ServiceLog[];
  revenueLogs?: RevenueLog[];
  insuranceLogs?: InsuranceLog[];
  purchasePrice?: number;
  salePrice?: number;
  disposedAt?: string;
  isDisposed?: boolean;
  createdAt?: string;
};

export type DriverInput = {
  id?: string;
  fullName: string;
  licenseNumber: string;
  nrcNumber: string;
  email: string;
  phone: string;
  address?: string;
  maritalStatus?: string;
  nextOfKinName?: string;
  nextOfKinRelationship?: string;
  nextOfKinPhone?: string;
  dateOfBirth?: string;
  status: 'Active' | 'On Leave' | 'Suspended' | 'Inactive';
  assignedCarId: string | null;
  profilePicture?: string;
  accessCode?: string;
  nrcFront?: string;
  nrcBack?: string;
  licenseFront?: string;
  licenseBack?: string;
  createdAt?: string;
};

export type ServiceLogInput = {
  id?: string;
  date: string;
  category: 'Maintenance' | 'Repair' | 'Inspection' | 'Tire Service' | 'Oil Change' | 'Other';
  description: string;
  cost: number;
  mileage: number;
  performedBy: string;
  receiptUrl?: string;
};

export type RevenueLogInput = {
  id?: string;
  date: string;
  amount: number;
  category: 'Fare' | 'Rental' | 'Delivery' | 'Contract' | 'Other';
  description: string;
  driverId?: string;
  driverName?: string;
  status?: 'Pending' | 'Approved';
};

export type InsuranceLogInput = {
  id?: string;
  date: string;
  type: 'Road Tax' | 'Insurance' | 'Fitness' | 'Identity';
  amount: number;
  expiryDate: string;
  description: string;
  performedBy: string;
};
