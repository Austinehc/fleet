import React, { useState } from 'react';
import {
  Car,
  User,
  Calendar,
  DollarSign,
  Gauge,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Wrench
} from 'lucide-react';
import { CarAsset, Driver, ServiceLog, RevenueLog, FuelLog } from './types';

interface DriverAppProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  userRole?: 'manager' | 'driver';
  setUserRole?: (role: 'manager' | 'driver') => void;
}

export default function DriverApp({
  cars,
  setCars,
  drivers,
  setDrivers,
  userRole,
  setUserRole
}: DriverAppProps) {
  // --- Driver Portal State ---
  const [activeDriverId, setActiveDriverId] = useState<string>('');
  const [driverPortalTab, setDriverPortalTab] = useState<'log_work' | 'history'>('log_work');
  const [driverLogSubTab, setDriverLogSubTab] = useState<'maintenance' | 'refueling' | 'cashing'>('maintenance');
  const [driverSuccessMsg, setDriverSuccessMsg] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form Fields State
  const [drvSvcDate, setDrvSvcDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvSvcCat, setDrvSvcCat] = useState<ServiceLog['category']>('Maintenance');
  const [drvSvcDesc, setDrvSvcDesc] = useState('');
  const [drvSvcCost, setDrvSvcCost] = useState<number>(0);
  const [drvSvcMiles, setDrvSvcMiles] = useState<number>(0);

  const [drvRevDate, setDrvRevDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvRevCat, setDrvRevCat] = useState<RevenueLog['category']>('Fare');
  const [drvRevDesc, setDrvRevDesc] = useState('');
  const [drvRevAmount, setDrvRevAmount] = useState<number>(0);

  const triggerDriverSuccess = (msg: string) => {
    setDriverSuccessMsg(msg);
    setTimeout(() => {
      setDriverSuccessMsg(null);
    }, 4500);
  };

  const handleDriverAddServiceLog = (carId: string, driverName: string) => {
    if (!drvSvcDesc.trim()) {
      alert('Please enter a description for the service performed.');
      return;
    }
    if (drvSvcCost < 0) {
      alert('Cost cannot be negative.');
      return;
    }

    const newSvc: ServiceLog = {
      id: `svc-${Date.now()}`,
      date: drvSvcDate,
      category: drvSvcCat,
      description: drvSvcDesc.trim(),
      cost: Number(drvSvcCost),
      mileage: Number(drvSvcMiles),
      performedBy: driverName
    };

    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        const currentSvc = car.serviceLogs || [];
        const nextMileage = drvSvcMiles > car.mileage ? Number(drvSvcMiles) : car.mileage;
        return {
          ...car,
          mileage: nextMileage,
          serviceLogs: [newSvc, ...currentSvc]
        };
      }
      return car;
    }));

    // Reset Form Fields
    setDrvSvcDesc('');
    setDrvSvcCost(0);
    setDrvSvcMiles(0);
    setDrvSvcDate(new Date().toISOString().split('T')[0]);
    setDrvSvcCat('Maintenance');

    triggerDriverSuccess('✅ Maintenance / Service Event logged successfully, and auto-synced with Manager Hub!');
  };

  const handleDriverAddRevenueLog = (carId: string, driverId: string, driverName: string) => {
    if (drvRevAmount <= 0) {
      alert('Please enter a valid receipt amount greater than 0.');
      return;
    }
    if (!drvRevDesc.trim()) {
      alert('Please describe this receipt/cashing event.');
      return;
    }

    const newRev: RevenueLog = {
      id: `rev-${Date.now()}`,
      date: drvRevDate,
      amount: Number(drvRevAmount),
      category: drvRevCat,
      description: drvRevDesc.trim(),
      driverId,
      driverName,
      status: 'Pending'
    };

    setCars(prev => prev.map(car => {
      if (car.id === carId) {
        const currentRevs = car.revenueLogs || [];
        return {
          ...car,
          revenueLogs: [newRev, ...currentRevs]
        };
      }
      return car;
    }));

    // Reset Form
    setDrvRevAmount(0);
    setDrvRevDesc('');
    setDrvRevDate(new Date().toISOString().split('T')[0]);
    setDrvRevCat('Fare');

    triggerDriverSuccess('✅ Cashing / Revenue receipt submitted successfully! Waiting for manager approval.');
  };

  const activeDriver = drivers.find(d => d.id === activeDriverId);
  const assignedCar = activeDriver ? cars.find(c => c.id === activeDriver.assignedCarId) : null;

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-900 font-sans flex flex-col antialiased" id="driver-app-root">
      {/* Top Banner Header banner */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95" id="nav-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4" id="brand-logo-area">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-605 text-white bg-indigo-650 p-2.5 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center">
                <Car className="w-6 h-6" id="logo-icon-car" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">FLEET ASSETS</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 font-mono block text-left">
                  Driver Station
                </span>
              </div>
            </div>

            {/* Portal Toggle Selector Pill */}
            {setUserRole && userRole && (
              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto" id="portal-role-switcher-con">
                <button
                  type="button"
                  onClick={() => setUserRole('manager')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    userRole === 'manager'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  id="role-switch-btn-mgr"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Manager Hub
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('driver')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    userRole === 'driver'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  id="role-switch-btn-drv"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Driver Portal
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Controls or Logged In Driver Switcher */}
          <div className="flex items-center gap-3 self-stretch md:self-center justify-end" id="btn-top-controls">
            <div className="flex items-center gap-2" id="driver-logged-in-panel">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Simulating Driver Identity:</span>
              <select
                value={activeDriverId}
                onChange={(e) => {
                  setActiveDriverId(e.target.value);
                  setDriverPortalTab('log_work');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-850 rounded-xl text-xs font-semibold focus:outline-none"
                id="driver-portal-user-selector"
              >
                <option value="" disabled>-- Choose Driver --</option>
                {drivers.map(drv => (
                  <option key={drv.id} value={drv.id}>
                    👤 {drv.fullName} ({drv.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full" id="dashboard-body">
        <div className="flex-1 bg-slate-50/60 py-8 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full space-y-6" id="driver-portal-wrapper">
          
          {/* Dynamic Success Toast banner */}
          {driverSuccessMsg && (
            <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-3 animate-fade-in fixed bottom-8 right-8 z-50 max-w-md" id="drv-success-toast">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-xs font-semibold">{driverSuccessMsg}</span>
            </div>
          )}

          {/* Driver Identity Card info */}
          {!activeDriver ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs" id="drv-no-identity">
              <User className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
              <h3 className="font-bold text-slate-800 mt-3 text-base">Select Your Driver Identity</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Please choose a driver identity from the dropdown in the top header bar to begin viewing vehicle tasks, fuel consumption logs, and cashing entry forms.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in" id="driver-active-portal">
              
              {/* Active Profile Info Panel */}
              <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4" id="drv-profile-strip">
                <div className="flex items-center gap-4 text-left">
                  {activeDriver.profilePicture ? (
                    <img src={activeDriver.profilePicture} alt={activeDriver.fullName} className="w-12 h-12 rounded-2xl shadow-md border border-indigo-200 object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="bg-indigo-650 text-white w-12 h-12 rounded-2xl shadow-md shadow-indigo-600/10 flex items-center justify-center font-bold text-lg shrink-0">
                      {activeDriver.fullName.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-850">{activeDriver.fullName}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        activeDriver.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        activeDriver.status === 'On Leave' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        Status: {activeDriver.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        ID: {activeDriver.id}
                      </span>
                      <span>• Lic: <strong className="font-mono text-slate-800">{activeDriver.licenseNumber}</strong></span>
                      <span>• Phone: <strong className="text-slate-850">{activeDriver.phone}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 self-start md:self-auto text-left" id="driver-portal-nav-bar">
                  <button
                    type="button"
                    onClick={() => setDriverPortalTab('log_work')}
                    className={`py-1.5 px-3.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      driverPortalTab === 'log_work'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-150'
                        : 'text-slate-550 hover:text-slate-800'
                    }`}
                    id="tab-btn-drv-log"
                  >
                    Log Activities
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverPortalTab('history')}
                    className={`py-1.5 px-3.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      driverPortalTab === 'history'
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-150'
                        : 'text-slate-550 hover:text-slate-800'
                    }`}
                    id="tab-btn-drv-hist"
                  >
                    My Logs History
                  </button>
                </div>
              </div>

              {/* If No Car is Assigned */}
              {!assignedCar ? (
                <div className="bg-white rounded-3xl border border-gray-150 p-10 text-center shadow-xs space-y-4" id="drv-unassigned-panel">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="font-bold text-slate-855 text-base">No Assigned Vehicle Record</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Hi {activeDriver.fullName.split(' ')[0]}, you do not have any vehicle assigned to you currently in the fleet registry.
                    </p>
                    <div className="pt-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-200/40" id="demo-assign-control">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">💡 Demo Mode: Instantly link a fleet asset to this user profile:</p>
                      <select
                        onChange={(e) => {
                          const targetCarId = e.target.value;
                          if (!targetCarId) return;
                          setDrivers(prev => prev.map(d => d.id === activeDriver.id ? { ...d, assignedCarId: targetCarId } : d));
                          setCars(prev => prev.map(car => car.id === targetCarId ? { ...car, status: 'Assigned' } : car));
                          triggerDriverSuccess(`🚘 Co-assigned to vehicle asset successfully!`);
                        }}
                        defaultValue=""
                        className="bg-white border border-slate-205 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer focus:outline-none w-full shadow-xs"
                        id="drv-assign-self-selector"
                      >
                        <option value="" disabled>-- Select Car to Assign Instantly --</option>
                        {cars.filter(c => c.status === 'Available' || !drivers.some(d => d.assignedCarId === c.id)).map(car => (
                          <option key={car.id} value={car.id}>
                            {car.make} {car.model} ({car.plateNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="driver-main-portal-cols">
                  
                  {/* Left Column: Assigned Car Specs Card */}
                  <div className="space-y-4 lg:col-span-1" id="driver-assigned-car-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-left block">Assigned Physical Asset</span>
                    
                    <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm" id="drv-assigned-car-card">
                      {/* Photo area with modern fallback */}
                      <div className="h-44 bg-slate-900 relative flex items-center justify-center overflow-hidden" id="drv-car-img-area">
                        {assignedCar.photos && assignedCar.photos.length > 0 ? (
                          <img src={assignedCar.photos[0]} alt="Assigned Car photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <Car className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-wide font-mono font-bold text-slate-500">Fleet Photographic Log</span>
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-indigo-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                          {assignedCar.status}
                        </span>
                        <span className="absolute bottom-3 right-3 bg-slate-950/80 text-white font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                          {assignedCar.plateNumber}
                        </span>
                      </div>

                      {/* Body Specs detail panel */}
                      <div className="p-4 space-y-3.5 text-left" id="drv-car-specs-pane">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{assignedCar.make} {assignedCar.model}</h4>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-400">
                            <span>Yr: {assignedCar.year}</span>
                            <span>•</span>
                            <span>Color: {assignedCar.color}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-100 py-3 text-center" id="drv-car-gains">
                          <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                            <Gauge className="w-4 h-4 text-emerald-500 mb-1" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider scale-90">Odometer</span>
                            <span className="text-xs font-bold font-mono text-slate-800 mt-0.5">{assignedCar.mileage.toLocaleString()} km</span>
                          </div>
                          <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
                            <Wrench className="w-4 h-4 text-indigo-500 mb-1" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider scale-90">Service logs</span>
                            <span className="text-xs font-bold font-mono text-slate-800 mt-0.5">{assignedCar.serviceLogs.length} events</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600" id="drv-car-meta-desc">
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-bold text-left">VIN Serial</span>
                            <span className="font-mono font-bold text-slate-800 text-[11px] text-right">{assignedCar.vin}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-bold text-left">Age deployed</span>
                            <span className="font-semibold text-slate-855 text-right">{new Date().getFullYear() - assignedCar.year} years</span>
                          </div>
                        </div>

                        {/* Quick demo unassign trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm('Simulate returning/unassigning this vehicle back to the available manager pool?')) return;
                            setDrivers(prev => prev.map(d => d.id === activeDriver.id ? { ...d, assignedCarId: null } : d));
                            setCars(prev => prev.map(car => car.id === assignedCar.id ? { ...car, status: 'Available' } : car));
                            triggerDriverSuccess('🚘 Returned car asset back to pool successfully!');
                          }}
                          className="w-full mt-2 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100/50 text-red-650 rounded-xl text-[10px] font-semibold transition-all cursor-pointer"
                          id="drv-unassign-self-btn"
                        >
                          Simulate Returning Vehicle
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Active Interactive Actions Forms OR Active History logs */}
                  <div className="lg:col-span-2 space-y-4 text-left" id="driver-actions-panel-col">
                    
                    {driverPortalTab === 'log_work' ? (
                      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5" id="driver-log-actions-card">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" id="drv-log-options-hdr">
                          <div>
                            <h3 className="font-bold text-slate-855 text-sm">Record Mobile Operations Logs</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">All inputs immediately update vehicle timelines & manager metrics live.</p>
                          </div>

                          {/* Pill toggle of logs sub-tabs */}
                          <div className="flex bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto" id="drv-sub-tabs-pill">
                            <button
                              type="button"
                              onClick={() => setDriverLogSubTab('maintenance')}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                                driverLogSubTab === 'maintenance' ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                              id="drv-sub-btn-svc"
                            >
                              Maintenance
                            </button>
                            <button
                              type="button"
                              onClick={() => setDriverLogSubTab('cashing')}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                                driverLogSubTab === 'cashing' ? 'bg-white text-emerald-650 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                              }`}
                              id="drv-sub-btn-cashing"
                            >
                              Cashing
                            </button>
                          </div>
                        </div>

                        {/* Active Form Display */}
                        {driverLogSubTab === 'maintenance' && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleDriverAddServiceLog(assignedCar.id, activeDriver.fullName);
                            }}
                            className="space-y-4 animate-fade-in text-left"
                            id="form-drv-svc"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date Performed*</label>
                                <input
                                  type="date"
                                  required
                                  value={drvSvcDate}
                                  onChange={(e) => setDrvSvcDate(e.target.value)}
                                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-805 focus:outline-none"
                                  id="drv-svc-input-date"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service category*</label>
                                <select
                                  value={drvSvcCat}
                                  onChange={(e) => setDrvSvcCat(e.target.value as any)}
                                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 leading-tight focus:outline-none"
                                  id="drv-svc-input-cat"
                                >
                                  <option value="Maintenance">Maintenance</option>
                                  <option value="Repair">Repair</option>
                                  <option value="Inspection">Inspection</option>
                                  <option value="Tire Service">Tire Service</option>
                                  <option value="Oil Change">Oil Change</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Update Mileage (km)*</label>
                                <input
                                  type="number"
                                  required
                                  min={assignedCar.mileage}
                                  placeholder={String(assignedCar.mileage)}
                                  value={drvSvcMiles || ''}
                                  onChange={(e) => setDrvSvcMiles(Number(e.target.value))}
                                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                                  id="drv-svc-input-miles"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expense Cost (zmk)*</label>
                              <input
                                type="number"
                                required
                                min="0"
                                placeholder="e.g. 150.00"
                                value={drvSvcCost || ''}
                                onChange={(e) => setDrvSvcCost(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                                id="drv-svc-input-cost"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description of Work*</label>
                              <textarea
                                required
                                rows={3}
                                placeholder="e.g. Completed filter repairs or route wheel tyre balance..."
                                value={drvSvcDesc}
                                onChange={(e) => setDrvSvcDesc(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-normal"
                                id="drv-svc-input-desc"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center font-sans"
                              id="drv-svc-submit"
                            >
                              Commit Maintenance / Service Event log
                            </button>
                          </form>
                        )}

                        {driverLogSubTab === 'cashing' && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleDriverAddRevenueLog(assignedCar.id, activeDriver.id, activeDriver.fullName);
                            }}
                            className="space-y-4 animate-fade-in text-left"
                            id="form-drv-rev"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashing Shift Date*</label>
                                <input
                                  type="date"
                                  required
                                  value={drvRevDate}
                                  onChange={(e) => setDrvRevDate(e.target.value)}
                                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-805 focus:outline-none"
                                  id="drv-rev-input-date"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashing Contract Category*</label>
                                <select
                                  value={drvRevCat}
                                  onChange={(e) => setDrvRevCat(e.target.value as any)}
                                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                                  id="drv-rev-input-cat"
                                >
                                  <option value="Fare">Fare / Passenger Shift</option>
                                  <option value="Rental">Rental Yield</option>
                                  <option value="Delivery">Delivery Contract</option>
                                  <option value="Contract">Trip Contract</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gross Yield Amount (zmk)*</label>
                                <input
                                  type="number"
                                  required
                                  min="0.01"
                                  step="0.01"
                                  placeholder="e.g. 180"
                                  value={drvRevAmount || ''}
                                  onChange={(e) => setDrvRevAmount(Number(e.target.value))}
                                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                                  id="drv-rev-input-amount"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Memo description of logs / trips performed*</label>
                              <textarea
                                required
                                rows={3}
                                placeholder="trip logs details: e.g. completed city shuttle transfers, afternoon shifts log..."
                                value={drvRevDesc}
                                onChange={(e) => setDrvRevDesc(e.target.value)}
                                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-normal"
                                id="drv-rev-input-desc"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center font-sans"
                              id="drv-rev-submit"
                            >
                              Commit Payment Yield / Cashing
                            </button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5" id="driver-logs-history-card">
                        <div className="text-left border-b border-slate-100 pb-3" id="drv-hist-hdr">
                          <h3 className="font-bold text-slate-800 text-sm">Historical Operator Records</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Below is a log history of events committed by you or logged for this specific vehicle.</p>
                        </div>

                        <div className="space-y-6" id="drv-historical-subcollections">
                          {/* Repairs logged list */}
                          <div className="space-y-2 text-left" id="drv-hist-svc-section">
                            <span className="text-[10px] uppercase font-bold text-indigo-655 tracking-wider font-sans">🛠️ Service/Repair Log</span>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="drv-hist-svc-list">
                              {assignedCar.serviceLogs.length > 0 ? (
                                assignedCar.serviceLogs.map((log) => {
                                  const isExpanded = expandedLogId === log.id;
                                  return (
                                    <div
                                      key={log.id}
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                      className={`p-2.5 bg-slate-50/50 rounded-xl border flex flex-col gap-2 text-xs font-semibold cursor-pointer transition-all ${
                                        isExpanded ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-50/20 ring-inset' : 'border-slate-100 hover:bg-slate-100/50'
                                      }`}
                                      id={`drv-hist-svc-${log.id}`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <strong className="text-slate-800">{log.category}</strong>
                                            <span className="text-[9px] text-slate-400 font-mono bg-white py-0.5 px-1.5 rounded border border-slate-100">{log.date}</span>
                                          </div>
                                          <p className={`text-[10px] text-slate-500 mt-0.5 font-normal leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>{log.description}</p>
                                        </div>
                                        <span className="text-indigo-650 font-sans font-bold text-xs shrink-0 ml-2">zmk {log.cost}</span>
                                      </div>

                                      {/* Expanded information drawer */}
                                      {isExpanded && (
                                        <div className="p-3 bg-white border border-indigo-100/80 rounded-lg space-y-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex items-center justify-between border-b border-indigo-50 pb-1.5 font-bold text-indigo-900">
                                            <span>📁 Maintenance Activity Report</span>
                                            <span className="font-mono text-[8px] text-indigo-400">ID: SVC-{log.id.toUpperCase()}</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-slate-500 font-normal">
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Mileage Logged</span>
                                              <span className="font-semibold text-slate-700">{log.mileage.toLocaleString()} km</span>
                                            </div>
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Registered Odometer</span>
                                              <span className="font-semibold text-slate-755">{assignedCar.plateNumber}</span>
                                            </div>
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Authorized Garage</span>
                                              <span className="font-semibold text-slate-700">{log.performedBy || 'Fleet Auto Prep Team'}</span>
                                            </div>
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Labor Cost Charged</span>
                                              <span className="font-mono font-semibold text-indigo-600">zmk {log.cost}</span>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-50 pt-1.5">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Work Description Details</span>
                                              <p className="text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{log.description}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[10px] text-slate-400 italic font-normal">No maintenance work logged on this unit.</p>
                              )}
                            </div>
                          </div>

                          {/* Cashings tracked list */}
                          <div className="space-y-2 text-left" id="drv-hist-rev-section">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider font-sans">💰 Cashing Receipts Ledger</span>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="drv-hist-rev-list">
                              {(assignedCar.revenueLogs || []).filter(r => r.driverId === activeDriver.id).length > 0 ? (
                                (assignedCar.revenueLogs || []).filter(r => r.driverId === activeDriver.id).map((rev) => {
                                  const isExpanded = expandedLogId === rev.id;
                                  return (
                                    <div
                                      key={rev.id}
                                      onClick={() => setExpandedLogId(isExpanded ? null : rev.id)}
                                      className={`p-2.5 bg-slate-50/50 rounded-xl border flex flex-col gap-2 text-xs font-semibold cursor-pointer transition-all ${
                                        isExpanded ? 'bg-emerald-50/35 border-emerald-300 ring-1 ring-emerald-50/20 ring-inset' : 'border-slate-100 hover:bg-slate-100/50'
                                      }`}
                                      id={`drv-hist-rev-${rev.id}`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <strong className="text-slate-800">{rev.category} Yield</strong>
                                            <span className="text-[9px] text-slate-400 font-mono bg-white py-0.5 px-1.5 rounded border border-slate-100">{rev.date}</span>
                                            {rev.status === 'Pending' ? (
                                              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200 animate-pulse text-nowrap">Pending Approval</span>
                                            ) : (
                                              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-205 text-nowrap">Approved</span>
                                            )}
                                          </div>
                                          <p className={`text-[10px] text-slate-500 mt-0.5 font-normal leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>{rev.description}</p>
                                        </div>
                                        <span className="text-emerald-600 font-bold font-sans text-xs shrink-0 ml-2 font-black">+zmk {rev.amount}</span>
                                      </div>

                                      {/* Expanded information drawer */}
                                      {isExpanded && (
                                        <div className="p-3 bg-white border border-emerald-100 rounded-lg space-y-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex items-center justify-between border-b border-emerald-50 pb-1.5 font-bold text-emerald-950">
                                            <span className="flex items-center gap-1">📁 Cashing Submission Details</span>
                                            <span className="font-mono text-[8px] text-emerald-550 uppercase">TRX-{rev.id.toUpperCase()}</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-slate-550 font-normal">
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Yield Stream Category</span>
                                              <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">{rev.category}</span>
                                            </div>
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Submission Timestamp</span>
                                              <span className="font-semibold text-slate-755 font-mono">{rev.date}</span>
                                            </div>
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Declared Yield</span>
                                              <span className="font-mono font-bold text-emerald-650 font-black">+zmk {rev.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Audit Status</span>
                                              <div className="mt-0.5">
                                                {rev.status === 'Pending' ? (
                                                  <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded-sm border border-amber-200">Awaiting Manager Sign-off</span>
                                                ) : (
                                                  <span className="text-[9px] font-semibold text-emerald-750 bg-emerald-50 px-1 rounded-sm border border-emerald-150">Audited & Approved</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="col-span-2 border-t border-slate-50 pt-1.5">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Original Narrative Notes</span>
                                              <p className="text-slate-650 bg-slate-50 p-2 rounded border border-slate-100 leading-normal">{rev.description || 'No complementary narrative provided.'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[10px] text-slate-400 italic font-normal text-left">No income cashings logged by you on this unit.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
