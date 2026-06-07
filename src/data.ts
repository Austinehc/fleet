/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarAsset, Driver } from './types';

export const initialCars: CarAsset[] = [
  {
    id: 'car-1',
    make: 'Tesla',
    model: 'Model Y',
    year: 2023,
    plateNumber: 'WXI-8842',
    color: 'Deep Blue',
    vin: '5YJYGDEE7PFXXXXXX',
    mileage: 24500,
    status: 'Assigned',
    photos: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'
    ],
    serviceLogs: [
      {
        id: 'log-1-1',
        date: '2026-03-15',
        category: 'Inspection',
        description: 'Completed 32k-km battery safety diagnostic and cabin air filter replacement.',
        cost: 150,
        mileage: 21000,
        performedBy: 'Tesla Service Center East'
      },
      {
        id: 'log-1-2',
        date: '2025-09-10',
        category: 'Tire Service',
        description: 'Tire rotation and alignment adjustment following light steering pull.',
        cost: 85,
        mileage: 12500,
        performedBy: 'Fleet Tire Express'
      }
    ],
    revenueLogs: [
      { id: 'rev-1-1', date: '2026-05-25', amount: 350.00, category: 'Rental', description: 'Weekly driver rental fee', driverId: 'driver-1', driverName: 'James Rodriguez' },
      { id: 'rev-1-2', date: '2026-05-18', amount: 350.00, category: 'Rental', description: 'Weekly driver rental fee', driverId: 'driver-1', driverName: 'James Rodriguez' },
      { id: 'rev-1-3', date: '2026-05-11', amount: 350.00, category: 'Rental', description: 'Weekly driver rental fee', driverId: 'driver-1', driverName: 'James Rodriguez' },
      { id: 'rev-1-4', date: '2026-04-29', amount: 1520.00, category: 'Contract', description: 'Monthly corporate shuttle contract payment', driverId: 'driver-1', driverName: 'James Rodriguez' }
    ],
    createdAt: '2025-01-10T08:00:00Z'
  },
  {
    id: 'car-2',
    make: 'Ford',
    model: 'F-150 Lightning',
    year: 2022,
    plateNumber: 'TX-9902',
    color: 'Oxford White',
    vin: '1FTVW1EV1NWXXXXXX',
    mileage: 38200,
    status: 'Assigned',
    photos: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80'
    ],
    serviceLogs: [
      {
        id: 'log-2-1',
        date: '2026-05-02',
        category: 'Repair',
        description: 'Replaced rear suspension stabilizer links and performed multi-point fleet check.',
        cost: 420,
        mileage: 37500,
        performedBy: 'Ford Fleet Care Center'
      },
      {
        id: 'log-2-2',
        date: '2025-11-18',
        category: 'Oil Change',
        description: 'Note: EV vehicle, scheduled fluid top-up & coolant system inspection.',
        cost: 75,
        mileage: 28000,
        performedBy: 'Ford Fleet Care Center'
      }
    ],
    revenueLogs: [
      { id: 'rev-2-1', date: '2026-05-28', amount: 480.00, category: 'Delivery', description: 'Amazon logistics route revenue', driverId: 'driver-2', driverName: 'Sarah Jenkins' },
      { id: 'rev-2-2', date: '2026-05-21', amount: 520.00, category: 'Delivery', description: 'Amazon logistics route revenue', driverId: 'driver-2', driverName: 'Sarah Jenkins' },
      { id: 'rev-2-3', date: '2026-05-14', amount: 490.00, category: 'Delivery', description: 'Amazon logistics route revenue', driverId: 'driver-2', driverName: 'Sarah Jenkins' },
      { id: 'rev-2-4', date: '2026-04-30', amount: 2200.00, category: 'Contract', description: 'Monthly construction agency support lease', driverId: 'driver-2', driverName: 'Sarah Jenkins' }
    ],
    createdAt: '2024-05-20T09:15:00Z'
  },
  {
    id: 'car-3',
    make: 'Toyota',
    model: 'Camry Hybrid',
    year: 2021,
    plateNumber: 'CA-55B1',
    color: 'Celestial Silver',
    vin: '4T1F11AK6MUXXXXXX',
    mileage: 51200,
    status: 'Available',
    photos: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&auto=format&fit=crop&q=80'
    ],
    serviceLogs: [
      {
        id: 'log-3-1',
        date: '2026-04-10',
        category: 'Oil Change',
        description: 'Full synthetic oil filter change, engine air filter swap, brake fluid flush.',
        cost: 210,
        mileage: 50100,
        performedBy: 'Master Tech Auto'
      },
      {
        id: 'log-3-2',
        date: '2025-10-05',
        category: 'Tire Service',
        description: 'Fitted 4 new Michelin Defender all-season tires with lifetime balancing.',
        cost: 780,
        mileage: 44000,
        performedBy: 'Discount Tire World'
      }
    ],
    revenueLogs: [
      { id: 'rev-3-1', date: '2026-05-29', amount: 145.50, category: 'Fare', description: 'Uber/Lyft driver daily shift earnings', driverId: 'driver-3', driverName: 'Marcus Vance' },
      { id: 'rev-3-2', date: '2026-05-28', amount: 182.00, category: 'Fare', description: 'Uber/Lyft driver daily shift earnings', driverId: 'driver-3', driverName: 'Marcus Vance' },
      { id: 'rev-3-3', date: '2026-05-27', amount: 210.00, category: 'Fare', description: 'Uber/Lyft driver daily shift earnings', driverId: 'driver-3', driverName: 'Marcus Vance' },
      { id: 'rev-3-4', date: '2026-05-20', amount: 1200.00, category: 'Rental', description: 'Monthly driver lease payment - Active driver shift', driverId: 'driver-3', driverName: 'Marcus Vance' }
    ],
    createdAt: '2024-02-14T10:30:00Z'
  },
  {
    id: 'car-4',
    make: 'Chevrolet',
    model: 'Bolt EV',
    year: 2020,
    plateNumber: 'NY-44X8',
    color: 'Mosaic Black',
    vin: '1G1FY6S08LUXXXXXX',
    mileage: 62400,
    status: 'Maintenance',
    photos: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=60'
    ],
    serviceLogs: [
      {
        id: 'log-4-1',
        date: '2026-05-28',
        category: 'Repair',
        description: 'Diagnosing traction battery thermal management sensor issue. Parts on order.',
        cost: 320,
        mileage: 62390,
        performedBy: 'Hometown Chevy Fleet'
      }
    ],
    revenueLogs: [
      { id: 'rev-4-1', date: '2026-05-10', amount: 310.00, category: 'Rental', description: 'Weekly driver lease payment', driverId: 'driver-1', driverName: 'James Rodriguez' },
      { id: 'rev-4-2', date: '2026-05-03', amount: 310.00, category: 'Rental', description: 'Weekly driver lease payment', driverId: 'driver-1', driverName: 'James Rodriguez' }
    ],
    createdAt: '2023-11-01T15:00:00Z'
  }
];

export const initialDrivers: Driver[] = [
  {
    id: 'driver-1',
    fullName: 'James Rodriguez',
    licenseNumber: 'DL-TX8849202',
    nrcNumber: '111111/11/1',
    email: 'j.rodriguez@fleetcorp.com',
    phone: '(512) 555-1092',
    status: 'Active',
    assignedCarId: 'car-1',
    createdAt: '2025-01-15T09:00:00Z'
  },
  {
    id: 'driver-2',
    fullName: 'Sarah Jenkins',
    licenseNumber: 'DL-CA9028114',
    nrcNumber: '222222/22/2',
    email: 's.jenkins@fleetcorp.com',
    phone: '(415) 555-8821',
    status: 'Active',
    assignedCarId: 'car-2',
    createdAt: '2024-06-01T11:00:00Z'
  },
  {
    id: 'driver-3',
    fullName: 'Marcus Vance',
    licenseNumber: 'DL-NY7736481',
    nrcNumber: '333333/33/3',
    email: 'm.vance@fleetcorp.com',
    phone: '(212) 555-4039',
    status: 'On Leave',
    assignedCarId: null,
    createdAt: '2024-03-10T14:30:00Z'
  }
];
