/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ManagerAppModular from './manager/ManagerApp';
import { CarAsset, Driver } from './types';

interface ManagerAppProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  userRole?: 'manager' | 'driver';
  setUserRole?: (role: 'manager' | 'driver') => void;
  onSignOut?: () => void;
  dataLoading?: boolean;
}

export default function ManagerApp(props: ManagerAppProps) {
  return <ManagerAppModular {...props} />;
}
