/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarAsset, Driver } from './types';

export const initialCars: CarAsset[] = [
  {
    id: 'car-prius-01',
    make: 'Toyota',
    model: 'Prius Hybrid',
    year: 2021,
    plateNumber: 'ZM-1011',
    color: 'Metallic Silver',
    vin: 'JTDKN3DU4LB204910',
    mileage: 124500,
    status: 'Assigned',
    photos: [],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    serviceLogs: [
      {
        id: 'svc-01-oil',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        category: 'Oil Change',
        description: 'Engine oil and hybrid system coolant service.',
        cost: 120,
        mileage: 122000,
        performedBy: 'Sarah Jenkins'
      },
      {
        id: 'svc-02-tire',
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        category: 'Tire Service',
        description: 'Rotated and balanced all-weather tires.',
        cost: 65,
        mileage: 119500,
        performedBy: 'Sarah Jenkins'
      }
    ],
    fuelLogs: [
      {
        id: 'fuel-01',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        liters: 32,
        cost: 58,
        mileage: 124100,
        performedBy: 'Sarah Jenkins'
      },
      {
        id: 'fuel-02',
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        liters: 35,
        cost: 61,
        mileage: 123500,
        performedBy: 'Sarah Jenkins'
      }
    ],
    revenueLogs: [
      {
        id: 'rev-01-fare',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        amount: 320,
        category: 'Fare',
        description: 'Airport executive shuttle service shift completed.',
        driverId: 'drv-sarah-01',
        driverName: 'Sarah Jenkins',
        status: 'Approved'
      },
      {
        id: 'rev-02-rental',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        amount: 240,
        category: 'Rental',
        description: 'Multi-hour private rental booking.',
        driverId: 'drv-sarah-01',
        driverName: 'Sarah Jenkins',
        status: 'Approved'
      },
      {
        id: 'rev-pending-01',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        amount: 450,
        category: 'Contract',
        description: 'Weekend corporate shuttle delegation contract. Awaiting manager validation.',
        driverId: 'drv-sarah-01',
        driverName: 'Sarah Jenkins',
        status: 'Pending'
      }
    ]
  },
  {
    id: 'car-accor-02',
    make: 'Honda',
    model: 'Accord Touring',
    year: 2022,
    plateNumber: 'ZM-2022',
    color: 'Midnight Obsidian',
    vin: '1HGCR2F85NA100940',
    mileage: 89600,
    status: 'Available',
    photos: [],
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    serviceLogs: [
      {
        id: 'svc-03-insp',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        category: 'Inspection',
        description: 'Corporate registration & safety inspection completed successfully.',
        cost: 85,
        mileage: 88500,
        performedBy: 'Marcus Vance'
      }
    ],
    fuelLogs: [
      {
        id: 'fuel-03',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        liters: 45,
        cost: 80,
        mileage: 89100,
        performedBy: 'Marcus Vance'
      }
    ],
    revenueLogs: [
      {
        id: 'rev-03-delivery',
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        amount: 195,
        category: 'Delivery',
        description: 'Corporate document express delivery contract.',
        driverId: 'drv-marcus-03',
        driverName: 'Marcus Vance',
        status: 'Approved'
      },
      {
        id: 'rev-pending-02',
        date: new Date().toISOString().split('T')[0] || '',
        amount: 280,
        category: 'Fare',
        description: 'Standard city rideshare collection sheet logged by pilot.',
        driverId: 'drv-marcus-03',
        driverName: 'Marcus Vance',
        status: 'Pending'
      }
    ]
  },
  {
    id: 'car-leaf-03',
    make: 'Nissan',
    model: 'Leaf Electric',
    year: 2020,
    plateNumber: 'ZM-3033',
    color: 'Glacier White',
    vin: '1N4AZ1CP6KC182049',
    mileage: 45000,
    status: 'Maintenance',
    photos: [],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    serviceLogs: [
      {
        id: 'svc-04-repair',
        date: new Date().toISOString().split('T')[0] || '',
        category: 'Repair',
        description: 'HV Battery cell diagnostic inspection and minor charging port harness repair.',
        cost: 350,
        mileage: 45000,
        performedBy: 'David Chen'
      }
    ],
    fuelLogs: [], // EV has no petroleum logs
    revenueLogs: [
      {
        id: 'rev-04-fare',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
        amount: 150,
        category: 'Fare',
        description: 'Eco-Express green fares collection sheet.',
        driverId: 'drv-david-02',
        driverName: 'David Chen',
        status: 'Approved'
      }
    ]
  }
];

export const initialDrivers: Driver[] = [
  {
    id: 'drv-sarah-01',
    fullName: 'Sarah Jenkins',
    licenseNumber: 'DL-ZM991823',
    nrcNumber: 'NRC-882199-B',
    email: 'sarah.j@fleetmanagement.com',
    phone: '260-977-102231',
    status: 'Active',
    assignedCarId: 'car-prius-01',
    accessCode: 'SA1011',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'drv-david-02',
    fullName: 'David Chen',
    licenseNumber: 'DL-ZM441112',
    nrcNumber: 'NRC-122394-C',
    email: 'david.c@fleetmanagement.com',
    phone: '260-966-440213',
    status: 'Active',
    assignedCarId: 'car-leaf-03',
    accessCode: 'DA3033',
    createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'drv-marcus-03',
    fullName: 'Marcus Vance',
    licenseNumber: 'DL-ZM555321',
    nrcNumber: 'NRC-404018-A',
    email: 'marcus.v@fleetmanagement.com',
    phone: '260-955-121882',
    status: 'Active',
    assignedCarId: null, // Available for instant self-assignment
    accessCode: 'MA2022',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];
