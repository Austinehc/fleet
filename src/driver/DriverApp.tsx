import React, { useState, useEffect } from 'react';
import { Car, CheckCircle2, LogOut } from 'lucide-react';
import { CarAsset, Driver } from '../types';

import DriverAuth from './components/DriverAuth';
import DriverProfile from './components/DriverProfile';
import DriverCarSpecs from './components/DriverCarSpecs';
import DriverLogForms from './components/DriverLogForms';
import DriverHistory from './components/DriverHistory';

interface DriverAppProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  userRole?: 'manager' | 'driver';
  setUserRole?: (role: 'manager' | 'driver') => void;
  onSignOut?: () => void;
}

export default function DriverApp({
  cars,
  setCars,
  drivers,
  setDrivers,
  userRole,
  setUserRole,
  onSignOut
}: DriverAppProps) {
  // --- Driver Portal State ---
  const [activeDriverId, setActiveDriverId] = useState<string>('');
  const [driverPortalTab, setDriverPortalTab] = useState<'log_work' | 'history'>('log_work');
  const [driverSuccessMsg, setDriverSuccessMsg] = useState<string | null>(null);
  const [driverLoginError, setDriverLoginError] = useState<string | null>(null);

  // Keep driver authenticated across refreshes
  useEffect(() => {
    const savedId = localStorage.getItem('fleet_active_driver_id');
    if (savedId && drivers.length > 0) {
      if (drivers.some(d => d.id === savedId)) {
        setActiveDriverId(savedId);
      } else {
        // Only clear if drivers loaded but the ID is truly stale (e.g. deleted by manager)
        localStorage.removeItem('fleet_active_driver_id');
      }
    }
  }, [drivers]);

  const hasSavedId = !!localStorage.getItem('fleet_active_driver_id');
  const isDriverLoading = hasSavedId && drivers.length === 0;

  const triggerDriverSuccess = (msg: string) => {
    setDriverSuccessMsg(msg);
    setTimeout(() => {
      setDriverSuccessMsg(null);
    }, 4500);
  };

  const handleAuthSuccess = (driverId: string, fullName: string) => {
    setActiveDriverId(driverId);
    localStorage.setItem('fleet_active_driver_id', driverId);
    setDriverLoginError(null);
    triggerDriverSuccess(`Welcome back, ${fullName}! Access authorized.`);
  };

  const activeDriver = drivers.find(d => d.id === activeDriverId);

  const assignedCar = activeDriver
    ? (cars.find(c => c.id === activeDriver.assignedCarId) || null)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-900 font-sans flex flex-col antialiased" id="driver-app-root">
      {/* Top Banner Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95" id="nav-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4" id="brand-logo-area">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-650 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center">
                <Car className="w-6 h-6" id="logo-icon-car" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">FLEET ASSETS</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 font-mono block text-left">
                  Driver Station
                </span>
              </div>
            </div>
          </div>

          {/* Top Banner Controls */}
          <div className="flex items-center gap-3 self-stretch md:self-center justify-end" id="btn-top-controls">
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-650 hover:text-rose-705 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                id="btn-nav-supabase-sign-out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-505" />
                <span>Sign Out</span>
              </button>
            )}

            {activeDriver && (
              <div className="flex items-center gap-2.5" id="driver-logged-in-panel">
                <span className="text-xs text-indigo-600 font-bold hidden sm:inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  Duty: {activeDriver.fullName}
                </span>
                <button
                  onClick={() => {
                    setActiveDriverId('');
                    localStorage.removeItem('fleet_active_driver_id');
                    triggerDriverSuccess('Cleared identity access key successfully.');
                  }}
                  className="text-xs font-semibold px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 border border-rose-100 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  id="drv-btn-signout"
                >
                  Exit Station
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full" id="dashboard-body">
        <div className="flex-1 bg-slate-50/60 py-8 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full space-y-6" id="driver-portal-wrapper">
          
          {/* Dynamic Success Toast */}
          {driverSuccessMsg && (
            <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-3 animate-fade-in fixed bottom-8 right-8 z-50 max-w-md" id="drv-success-toast">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold">{driverSuccessMsg}</span>
            </div>
          )}

          {/* Driver Auth Gate or Logged In Workspace */}
          {isDriverLoading ? (
            <div className="bg-white border border-gray-150 rounded-2xl p-8 shadow-sm text-center max-w-sm mx-auto space-y-4 my-12" id="driver-loading-gate">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-center animate-spin mx-auto">
                <Car className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider font-sans">Verifying Duty Passkey...</p>
            </div>
          ) : !activeDriver ? (
            <DriverAuth
              drivers={drivers}
              onAuthSuccess={handleAuthSuccess}
              driverLoginError={driverLoginError}
              setDriverLoginError={setDriverLoginError}
            />
          ) : (
            <div className="space-y-6 animate-fade-in" id="driver-active-portal">
              
              {/* Active Profile Info Panel */}
              <DriverProfile
                activeDriver={activeDriver}
                driverPortalTab={driverPortalTab}
                setDriverPortalTab={setDriverPortalTab}
              />

              {/* Vehicle specs and interactive forms layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="driver-main-portal-cols">
                
                {/* Left Column Component: Assigned Car Specs or assign options */}
                <DriverCarSpecs
                  activeDriver={activeDriver}
                  assignedCar={assignedCar}
                  cars={cars}
                  drivers={drivers}
                  setCars={setCars}
                  setDrivers={setDrivers}
                  triggerSuccess={triggerDriverSuccess}
                />

                {/* Right Column Component: Form / History */}
                {assignedCar && (
                  <div className="lg:col-span-2 space-y-4 text-left" id="driver-actions-panel-col">
                    {driverPortalTab === 'log_work' ? (
                      <DriverLogForms
                        assignedCar={assignedCar}
                        activeDriver={activeDriver}
                        setCars={setCars}
                        triggerSuccess={triggerDriverSuccess}
                      />
                    ) : (
                      <DriverHistory
                        assignedCar={assignedCar}
                        activeDriver={activeDriver}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-indigo-950 text-indigo-200 py-8 border-t border-indigo-900 text-xs mt-auto font-medium" id="page-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <p className="text-white font-bold">Car Asset Driver Portal</p>
            <p className="text-indigo-400 text-[11px] mt-0.5">Mobile Driver operations console.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-indigo-300 text-[11px]">
            <span>• Odometer Checked</span>
            <span>• Activity Logs Verified</span>
            <span>• Shift Yield Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
