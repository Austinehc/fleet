import React, { useState, useEffect } from 'react';
import { Car, CheckCircle2, Loader2, XCircle } from 'lucide-react';
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
  onSignOut?: () => void;
}

export default function DriverApp({
  cars,
  setCars,
  drivers,
  setDrivers,
  onSignOut
}: DriverAppProps) {
  // --- Driver Portal State ---
  const [activeDriverId, setActiveDriverId] = useState<string>('');
  const [driverPortalTab, setDriverPortalTab] = useState<'log_work' | 'history'>('log_work');
  const [driverToast, setDriverToast] = useState<{
    msg: string;
    type: 'success' | 'loading' | 'error';
  } | null>(null);
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

  const triggerDriverToast = (msg: string, type: 'success' | 'loading' | 'error' = 'success', duration: number = 4500) => {
    setDriverToast({ msg, type });
    if (type !== 'loading') {
      setTimeout(() => {
        setDriverToast(prev => prev?.msg === msg ? null : prev);
      }, duration);
    }
  };

  const triggerDriverSuccess = (msg: string) => {
    triggerDriverToast(msg, 'success');
  };

  const triggerErrorToast = (msg: string) => {
    triggerDriverToast(msg, 'error', 5000);
  };

  const handleAuthSuccess = (driverId: string, fullName: string) => {
    // Show a loading toast for verifying the duty key
    setDriverToast({
      msg: `Verifying Duty Key: Validating shift credentials for ${fullName}...`,
      type: 'loading'
    });

    setTimeout(() => {
      setActiveDriverId(driverId);
      localStorage.setItem('fleet_active_driver_id', driverId);
      setDriverLoginError(null);
      setDriverToast({
        msg: `Duty Key Verified Successfully! Welcome back, ${fullName}!`,
        type: 'success'
      });
      setTimeout(() => {
        setDriverToast(prev => prev?.type === 'success' ? null : prev);
      }, 4000);
    }, 1200); // 1.2s authentic verification simulation
  };

  const activeDriver = drivers.find(d => d.id === activeDriverId);

  const assignedCar = activeDriver
    ? (cars.find(c => c.id === activeDriver.assignedCarId) || null)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-900 font-sans flex flex-col antialiased" id="driver-app-root">
      {/* Top Banner Header - Only show when authenticated */}
      {activeDriver && (
        <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95" id="nav-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4" id="brand-logo-area">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/north-links.png" alt="North Links" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">North Links</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 font-mono block text-left">
                  Driver Portal
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
              </button>
            )}

            {activeDriver && (
              <div className="flex items-center gap-2.5" id="driver-logged-in-panel">
                <span className="text-xs text-indigo-600 font-bold hidden sm:inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  Online: {activeDriver.fullName}
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
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full" id="dashboard-body">
        <div className="flex-1 bg-slate-50/60 py-8 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full space-y-6" id="driver-portal-wrapper">
          
          {/* Dynamic Duty Key & Action Status Toasts (Loading, Success, Error) */}
          {driverToast && (
            <div 
              className={`fixed bottom-8 right-8 z-50 max-w-sm rounded-2xl p-4 shadow-2xl border flex items-center gap-3.5 animate-fade-in font-sans transition-all duration-300 ${
                driverToast.type === 'loading' 
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : driverToast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-950 shadow-rose-100'
                  : 'bg-emerald-600 border-emerald-550 text-white shadow-emerald-990/10'
              }`} 
              id="drv-status-toast"
            >
              {driverToast.type === 'loading' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                </div>
              )}
              {driverToast.type === 'success' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                </div>
              )}
              {driverToast.type === 'error' && (
                <div className="w-8 h-8 rounded-lg bg-rose-200/50 flex items-center justify-center shrink-0 border border-rose-300">
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
              )}
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-75 block">
                  {driverToast.type === 'loading' 
                    ? 'Security Clearance' 
                    : driverToast.type === 'error'
                    ? 'Authentication Error'
                    : 'Success Triggered'}
                </span>
                <span className="text-xs font-semibold leading-normal block mt-0.5">{driverToast.msg}</span>
              </div>
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
              triggerErrorToast={triggerErrorToast}
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
            <p className="text-white font-bold">North Links Driver Portal</p>
            <p className="text-indigo-400 text-[11px] mt-0.5">Driver operations console.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
