/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CarAsset, Driver } from './types';
import { initialCars, initialDrivers } from './data';
import ManagerApp from './ManagerApp';
import DriverApp from './DriverApp';

export default function App() {
  // --- Core State Storage ---
  const [cars, setCars] = useState<CarAsset[]>(() => {
    const saved = localStorage.getItem('fleet_cars');
    return saved ? JSON.parse(saved) : initialCars;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('fleet_drivers');
    return saved ? JSON.parse(saved) : initialDrivers;
  });

  // Decide role based on:
  // 1. Environment variables set at build-time (e.g. VITE_APP_ROLE=manager or VITE_APP_ROLE=driver)
  // 2. URL parameters (e.g. ?role=manager or ?role=driver) for easy routing
  // 3. Defaults to 'manager' with interactive live switching if not locked
  const [userRole, setUserRole] = useState<'manager' | 'driver'>(() => {
    const envRole = (import.meta as any).env?.VITE_APP_ROLE;
    if (envRole === 'driver' || envRole === 'manager') {
      return envRole as 'manager' | 'driver';
    }
    
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    if (urlRole === 'driver' || urlRole === 'manager') {
      return urlRole as 'manager' | 'driver';
    }

    return 'manager';
  });

  // Lock user switcher if VITE_APP_ROLE is declared in environment
  const isLocked = !!(import.meta as any).env?.VITE_APP_ROLE;

  // --- Sync database with localStorage ---
  useEffect(() => {
    localStorage.setItem('fleet_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('fleet_drivers', JSON.stringify(drivers));
  }, [drivers]);

  // Render the appropriate hub/application
  if (userRole === 'driver') {
    return (
      <DriverApp
        cars={cars}
        setCars={setCars}
        drivers={drivers}
        setDrivers={setDrivers}
        userRole={userRole}
        setUserRole={isLocked ? undefined : setUserRole}
      />
    );
  }

  return (
    <ManagerApp
      cars={cars}
      setCars={setCars}
      drivers={drivers}
      setDrivers={setDrivers}
      userRole={userRole}
      setUserRole={isLocked ? undefined : setUserRole}
    />
  );
}
