/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServiceLog {
  id: string;
  date: string;
  category: 'Maintenance' | 'Repair' | 'Inspection' | 'Tire Service' | 'Oil Change' | 'Other';
  description: string;
  cost: number;
  mileage: number;
  performedBy: string;
}

export interface FuelLog {
  id: string;
  date: string;
  liters: number;
  cost: number;
  mileage: number;
  performedBy?: string; // Driver name
}

export interface RevenueLog {
  id: string;
  date: string;
  amount: number;
  category: 'Fare' | 'Rental' | 'Delivery' | 'Contract' | 'Other';
  description: string;
  driverId?: string;
  driverName?: string;
  status?: 'Pending' | 'Approved';
}

export interface CarAsset {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  vin: string;
  mileage: number;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Out of Service';
  photos: string[]; // base64 or object URLs
  serviceLogs: ServiceLog[];
  revenueLogs?: RevenueLog[];
  fuelLogs?: FuelLog[];
  createdAt: string;
}

export interface Driver {
  id: string;
  fullName: string;
  licenseNumber: string;
  nrcNumber: string;
  email: string;
  phone: string;
  status: 'Active' | 'On Leave' | 'Suspended' | 'Inactive';
  assignedCarId: string | null; // ID of the CarAsset
  profilePicture?: string; // Base64 or URL
  createdAt: string;
}
