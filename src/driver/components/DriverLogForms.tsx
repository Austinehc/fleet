import React, { useState, useEffect } from 'react';
import { CarAsset, Driver, ServiceLog, RevenueLog } from '../../types';

interface DriverLogFormsProps {
  assignedCar: CarAsset;
  activeDriver: Driver;
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  triggerSuccess: (msg: string) => void;
}

export default function DriverLogForms({
  assignedCar,
  activeDriver,
  setCars,
  triggerSuccess
}: DriverLogFormsProps) {
  const [driverLogSubTab, setDriverLogSubTab] = useState<'maintenance' | 'cashing'>('maintenance');

  // Maintenance form state
  const [drvSvcDate, setDrvSvcDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvSvcCat, setDrvSvcCat] = useState<ServiceLog['category']>('Maintenance');
  const [drvSvcDesc, setDrvSvcDesc] = useState('');
  const [drvSvcCost, setDrvSvcCost] = useState<number>(0);
  const [drvSvcMiles, setDrvSvcMiles] = useState<number>(assignedCar.mileage);

  // Sync mileage state when car changes
  useEffect(() => {
    if (assignedCar) {
      setDrvSvcMiles(assignedCar.mileage);
    }
  }, [assignedCar]);

  // Cashing form state
  const [drvRevDate, setDrvRevDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drvRevCat, setDrvRevCat] = useState<RevenueLog['category']>('Fare');
  const [drvRevDesc, setDrvRevDesc] = useState('');
  const [drvRevAmount, setDrvRevAmount] = useState<number>(0);

  const handleDriverAddServiceLog = (e: React.FormEvent) => {
    e.preventDefault();
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
      performedBy: activeDriver.fullName
    };

    setCars(prev => prev.map(car => {
      if (car.id === assignedCar.id) {
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

    triggerSuccess('✅ Maintenance / Service Event logged successfully, and auto-synced with Manager Hub!');
  };

  const handleDriverAddRevenueLog = (e: React.FormEvent) => {
    e.preventDefault();
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
      driverId: activeDriver.id,
      driverName: activeDriver.fullName,
      status: 'Pending'
    };

    setCars(prev => prev.map(car => {
      if (car.id === assignedCar.id) {
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

    triggerSuccess('✅ Cashing / Revenue receipt submitted successfully! Waiting for manager approval.');
  };

  return (
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
        <form onSubmit={handleDriverAddServiceLog} className="space-y-4 animate-fade-in text-left" id="form-drv-svc">
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">Update Mileage (km)*</label>
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
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">Expense Cost (zmk)*</label>
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
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">Description of Work*</label>
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
        <form onSubmit={handleDriverAddRevenueLog} className="space-y-4 animate-fade-in text-left" id="form-drv-rev">
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
                id="drv-rev-input-cat relative"
              >
                <option value="Fare">Fare / Passenger Shift</option>
                <option value="Rental">Rental Yield</option>
                <option value="Delivery">Delivery Contract</option>
                <option value="Contract">Trip Contract</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">Gross Yield Amount (zmk)*</label>
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
  );
}
