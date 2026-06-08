import React from 'react';
import { Car, AlertTriangle, Gauge, Wrench } from 'lucide-react';
import { CarAsset, Driver } from '../../types';

interface DriverCarSpecsProps {
  activeDriver: Driver;
  assignedCar: CarAsset | null;
  cars: CarAsset[];
  drivers: Driver[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  triggerSuccess: (msg: string) => void;
}

export default function DriverCarSpecs({
  activeDriver,
  assignedCar,
  cars,
  drivers,
  setCars,
  setDrivers,
  triggerSuccess
}: DriverCarSpecsProps) {
  if (!assignedCar) {
    return (
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
                triggerSuccess(`🚘 Co-assigned to vehicle asset successfully!`);
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
    );
  }

  return (
    <div className="space-y-4 lg:col-span-1" id="driver-assigned-car-col">
      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-left block">Assigned Physical Asset</span>
      
      <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm" id="drv-assigned-car-card">
        {/* Sleek status & registration header banner without cover photo */}
        <div className="bg-slate-50 border-b border-gray-150 p-4 flex items-center justify-between" id="drv-car-img-area">
          <div>
            <span className="text-[9px] font-mono font-extrabold block text-slate-400 uppercase tracking-widest leading-none">Vehicle Status</span>
            <span className="inline-block mt-1.5 bg-indigo-600 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-3xs">
              {assignedCar.status}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-mono font-extrabold block text-slate-400 uppercase tracking-widest leading-none">License Plate</span>
            <span className="inline-block mt-1.5 bg-slate-900 border border-slate-750 text-white font-mono text-[10px] px-2 py-0.5 rounded font-extrabold tracking-wider uppercase shadow-3xs">
              {assignedCar.plateNumber}
            </span>
          </div>
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
              <span className="text-xs font-bold font-mono text-slate-800 mt-0.5">{(assignedCar.serviceLogs || []).length} events</span>
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
              triggerSuccess('🚘 Returned car asset back to pool successfully!');
            }}
            className="w-full mt-2 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100/50 text-red-650 rounded-xl text-[10px] font-semibold transition-all cursor-pointer"
            id="drv-unassign-self-btn"
          >
            Simulate Returning Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}
