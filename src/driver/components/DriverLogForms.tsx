import React, { useState, useEffect } from 'react';
import CameraCapture from '../../components/CameraCapture';
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
  const [driverLogSubTab, setDriverLogSubTab] = useState<'maintenance' | 'cashing'>('cashing');

  // Loading states
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);
  const [isSubmittingCashing, setIsSubmittingCashing] = useState(false);

  // Maintenance form state
  const [drvSvcDate, setDrvSvcDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [drvSvcCat, setDrvSvcCat] = useState<ServiceLog['category']>('Maintenance');
  const [drvSvcDesc, setDrvSvcDesc] = useState('');
  const [drvSvcCost, setDrvSvcCost] = useState<number>(0);
  const [drvSvcMiles, setDrvSvcMiles] = useState<number | ''>(assignedCar.mileage);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>('');
  const [showReceiptCapture, setShowReceiptCapture] = useState<boolean>(false);
  const [lastCarId, setLastCarId] = useState<string>('');

  // Sync mileage state ONLY when the car ID changes so background polling doesn't overwrite input
  useEffect(() => {
    if (assignedCar && assignedCar.id !== lastCarId) {
      setDrvSvcMiles(assignedCar.mileage);
      setLastCarId(assignedCar.id);
    }
  }, [assignedCar, lastCarId]);

  // Cashing form state
  const [drvRevDate, setDrvRevDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [drvRevCat, setDrvRevCat] = useState<RevenueLog['category']>('Fare');
  const [drvRevDesc, setDrvRevDesc] = useState('');
  const [drvRevAmount, setDrvRevAmount] = useState<number>(0);
  const [drvRevMileage, setDrvRevMileage] = useState<number | ''>(assignedCar.mileage);

  // Sync mileage for revenue form as well
  useEffect(() => {
    if (assignedCar && assignedCar.id !== lastCarId) {
      setDrvRevMileage(assignedCar.mileage);
    }
  }, [assignedCar, lastCarId]);

  const handleDriverAddServiceLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingMaintenance) return;
    
    if (!drvSvcDesc.trim()) {
      alert('Please enter a description for the service performed.');
      return;
    }
    if (drvSvcCost < 0) {
      alert('Cost cannot be negative.');
      return;
    }

    const mileageNum = drvSvcMiles === '' ? 0 : Number(drvSvcMiles);
    if (mileageNum < assignedCar.mileage) {
      alert(`The entered mileage (${mileageNum} km) is less than the current mileage of the car (${assignedCar.mileage} km). Please enter a higher value.`);
      return;
    }
    
    setIsSubmittingMaintenance(true);
    
    try {
      const nextMileage = mileageNum;

      const newSvc: ServiceLog = {
        id: `svc-${Date.now()}`,
        date: drvSvcDate,
        category: drvSvcCat,
        description: drvSvcDesc.trim(),
        cost: Number(drvSvcCost),
        mileage: nextMileage,
        performedBy: activeDriver.fullName,
        ...(receiptImageUrl ? { receiptUrl: receiptImageUrl } : {})
      };

      setCars(prev => prev.map(car => {
        if (car.id === assignedCar.id) {
          const currentSvc = car.serviceLogs || [];
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
      setReceiptImageUrl('');
      setDrvSvcMiles(nextMileage);
      setDrvSvcDate(new Date().toISOString().split('T')[0] || '');
      setDrvSvcCat('Maintenance');

      triggerSuccess('Maintenance / Service Event logged successfully, and auto-synced with Manager Hub!');
    } finally {
      setIsSubmittingMaintenance(false);
    }
  };

  const hasPendingCashing = React.useMemo(() => {
    return (assignedCar.revenueLogs || []).some(
      (rev) => rev.status === 'Pending' && rev.driverId === activeDriver.id
    );
  }, [assignedCar.revenueLogs, activeDriver.id]);

  const handleDriverAddRevenueLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCashing || hasPendingCashing) return;
    
    if (drvRevAmount <= 0) {
      alert('Please enter a valid receipt amount greater than 0.');
      return;
    }
    if (!drvRevDesc.trim()) {
      alert('Please describe this receipt/cashing event.');
      return;
    }
    
    const mileageNum = Number(drvRevMileage) || assignedCar.mileage;
    if (mileageNum < 0) {
      alert('Mileage cannot be negative.');
      return;
    }
    if (mileageNum < assignedCar.mileage) {
      alert(`Odometer cannot be less than current value (${assignedCar.mileage.toLocaleString()} km).`);
      return;
    }

    setIsSubmittingCashing(true);
    
    try {
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
            mileage: mileageNum, // Update car mileage
            revenueLogs: [newRev, ...currentRevs]
          };
        }
        return car;
      }));

      // Reset Form
      setDrvRevAmount(0);
      setDrvRevDesc('');
      setDrvRevDate(new Date().toISOString().split('T')[0] || '');
      setDrvRevCat('Fare');
      setDrvRevMileage(mileageNum);

      triggerSuccess('Cashing / Revenue receipt submitted successfully! Waiting for manager approval.');
    } finally {
      setIsSubmittingCashing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-5" id="driver-log-actions-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" id="drv-log-options-hdr">
        <div>
          <h3 className="font-bold text-slate-855 text-sm">Operations Logs</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">All inputs immediately update vehicle timelines & manager metrics live.</p>
        </div>

        {/* Pill toggle of logs sub-tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl self-start sm:self-auto" id="drv-sub-tabs-pill">
          <button
            type="button"
            onClick={() => setDriverLogSubTab('cashing')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
              driverLogSubTab === 'cashing' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="drv-sub-btn-cashing"
          >
            Cashing
          </button>
          <button
            type="button"
            onClick={() => setDriverLogSubTab('maintenance')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
              driverLogSubTab === 'maintenance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            id="drv-sub-btn-svc"
          >
            Maintenance
          </button>
        </div>
      </div>

      {/* Active Form Display */}
      {driverLogSubTab === 'maintenance' && (
        <form onSubmit={handleDriverAddServiceLog} className="space-y-4 animate-fade-in text-left" id="form-drv-svc">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Category*</label>
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">Update Mileage (km)*</label>
              <input
                type="number"
                required
                placeholder={String(assignedCar.mileage)}
                value={drvSvcMiles === '' ? '' : drvSvcMiles}
                onChange={(e) => {
                  const val = e.target.value;
                  setDrvSvcMiles(val === '' ? '' : Number(val));
                }}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                id="drv-svc-input-miles"
              />
            </div>
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

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-500">
                Optional receipt capture to attach a photo of the service invoice or receipt to this maintenance log.
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptCapture(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                id="drv-svc-receipt-capture"
              >
                {receiptImageUrl ? 'Change Receipt Photo' : 'Attach Receipt Photo'}
              </button>
            </div>
            {receiptImageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={receiptImageUrl} alt="Receipt preview" className="w-full h-44 object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setReceiptImageUrl('')}
                  className="absolute top-2 right-2 bg-white/90 text-slate-700 px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200"
                  id="drv-svc-receipt-remove"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmittingMaintenance}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center font-sans flex items-center justify-center gap-2"
            id="drv-svc-submit"
          >
            {isSubmittingMaintenance ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              'Maintenance log'
            )}
          </button>
        </form>
      )}

      {driverLogSubTab === 'cashing' && (
        <form onSubmit={handleDriverAddRevenueLog} className="space-y-4 animate-fade-in text-left" id="form-drv-rev">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashing Date*</label>
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cashing Category*</label>
              <select
                value={drvRevCat}
                onChange={(e) => setDrvRevCat(e.target.value as any)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                id="drv-rev-input-cat"
              >
                <option value="Fare">Fare</option>
                <option value="Rental">Rental Yield</option>
                <option value="Contract">Trip Contract</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">Amount (zmk)*</label>
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
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Mileage (km)*</label>
              <input
                type="number"
                required
                min="0"
                placeholder="e.g. 12500"
                value={drvRevMileage || ''}
                onChange={(e) => setDrvRevMileage(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none"
                id="drv-rev-input-mileage"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description*</label>
            <textarea
              required
              rows={3}
              placeholder="Trip logs details: e.g. completed city shuttle transfers, afternoon shifts log..."
              value={drvRevDesc}
              onChange={(e) => setDrvRevDesc(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-normal"
              id="drv-rev-input-desc"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingCashing || hasPendingCashing}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer text-center font-sans flex items-center justify-center gap-2 ${hasPendingCashing ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            id="drv-rev-submit"
            title={hasPendingCashing ? 'Waiting for manager approval before submitting another cashing entry' : 'Submit cashing for approval'}
          >
            {isSubmittingCashing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : hasPendingCashing ? (
              'Pending Approval'
            ) : (
              'Cashing'
            )}
          </button>
        </form>
      )}

      {showReceiptCapture && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2" id="receipt-capture-overlay">
          <CameraCapture
            onPhotoCaptured={(capturedDataUrl) => {
              setReceiptImageUrl(capturedDataUrl);
              setShowReceiptCapture(false);
            }}
            onClose={() => setShowReceiptCapture(false)}
          />
        </div>
      )}
    </div>
  );
}
