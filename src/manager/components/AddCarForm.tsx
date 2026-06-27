import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { CarAsset, ServiceLog } from '../../types';
import { 
  validateVIN, 
  validatePlateNumber, 
  validateNumber, 
  sanitizeString,
  validateDescription 
} from '../../lib/validation';

interface AddCarFormProps {
  onAddCar: (newCar: CarAsset) => void;
  onClose: () => void;
  setShowCamera: (val: boolean) => void;
  newCarPhoto: string;
  setNewCarPhoto: (photo: string) => void;
}

export default function AddCarForm({
  onAddCar,
  onClose,
  setShowCamera,
  newCarPhoto,
  setNewCarPhoto
}: AddCarFormProps) {
  const [newCarMake, setNewCarMake] = useState('');
  const [newCarModel, setNewCarModel] = useState('');
  const [newCarYear, setNewCarYear] = useState(new Date().getFullYear());
  const [newCarPlate, setNewCarPlate] = useState('');
  const [newCarColor, setNewCarColor] = useState('');
  const [newCarVin, setNewCarVin] = useState('');
  const [newCarMileage, setNewCarMileage] = useState<number>(0);
  const [newCarPurchasePrice, setNewCarPurchasePrice] = useState<number>(0);
  const [newCarStatus, setNewCarStatus] = useState<CarAsset['status']>('Available');

  // Initial service state
  const [includeInitialService, setIncludeInitialService] = useState(false);
  const [initialServiceBy, setInitialServiceBy] = useState('');
  const [initialServiceCost, setInitialServiceCost] = useState<number>(0);
  const [initialServiceDesc, setInitialServiceDesc] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!newCarMake.trim() || !newCarModel.trim() || !newCarPlate.trim() || !newCarColor.trim()) {
      alert('Please fill in all required fields (Make, Model, Plate, Color)');
      return;
    }

    // Additional validations
    const plateValidation = validatePlateNumber(newCarPlate);
    if (!plateValidation.valid) {
      alert(plateValidation.error!);
      return;
    }

    if (newCarVin.trim()) {
      const vinValidation = validateVIN(newCarVin);
      if (!vinValidation.valid) {
        alert(vinValidation.error!);
        return;
      }
    }

    const yearValidation = validateNumber(newCarYear, 1900, new Date().getFullYear() + 1, 'Year');
    if (!yearValidation.valid) {
      alert(yearValidation.error!);
      return;
    }

    const mileageValidation = validateNumber(newCarMileage, 0, 1000000, 'Mileage');
    if (!mileageValidation.valid) {
      alert(mileageValidation.error!);
      return;
    }

    const purchasePriceValidation = validateNumber(newCarPurchasePrice, 0, 1000000000, 'Purchase price');
    if (!purchasePriceValidation.valid) {
      alert(purchasePriceValidation.error!);
      return;
    }

    try {
      const newCarId = `car-${Date.now()}`;
      const initialServices: ServiceLog[] = [];

      if (includeInitialService && initialServiceDesc.trim()) {
        const descValidation = validateDescription(initialServiceDesc);
        if (descValidation.valid) {
          initialServices.push({
            id: `svc-${Date.now()}`,
            date: new Date().toISOString().split('T')[0] || '',
            category: 'Inspection',
            description: descValidation.value!,
            cost: Math.max(0, initialServiceCost),
            mileage: newCarMileage,
            performedBy: sanitizeString(initialServiceBy) || 'System Admin'
          });
        }
      }

      const createdCar: CarAsset = {
      id: newCarId,
      make: newCarMake.trim(),
      model: newCarModel.trim(),
      year: Number(newCarYear),
      plateNumber: newCarPlate.trim().toUpperCase(),
      color: newCarColor.trim(),
      vin: newCarVin.trim().toUpperCase() || `VIN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      mileage: Number(newCarMileage) || 0,
      status: newCarStatus,
      photos: newCarPhoto ? [newCarPhoto] : [],
      serviceLogs: initialServices,
      revenueLogs: [],
      purchasePrice: Number(newCarPurchasePrice) || 0,
      salePrice: 0,
      disposedAt: '',
      isDisposed: false,
      createdAt: new Date().toISOString()
    };

      onAddCar(createdCar);
      setNewCarPhoto(''); // clear after success
      onClose();
    } catch (error) {
      console.error('Error creating car:', error);
      alert('Failed to create car. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="add-car-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" id="add-car-modal-box">
        
        {/* Header banner */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between animate-fade-in" id="add-car-hdr">
          <div>
            <h3 className="text-base font-bold text-gray-950">Register New Fleet Car</h3>
            <p className="text-xs text-gray-400">Instantiate a new vehicle record with specs, status, and photos.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg"
            id="btn-close-add-car"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5 text-left" id="add-car-form">
          
          {/* Captured Photo Container Display */}
          <div className="space-y-2" id="photo-picker-section">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">
              Car Asset Photo
            </label>
            <div className="flex items-center gap-4" id="photo-picker-row">
              <div className="w-36 h-24 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden shadow-inner shrink-0" id="photo-thumbnail">
                {newCarPhoto ? (
                  <img src={newCarPhoto} alt="New car preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-[10px] p-2 text-center bg-gray-50 uppercase tracking-wide font-medium font-mono">
                    <Camera className="w-5 h-5 text-gray-300 mb-1" /> No Photo
                  </div>
                )}
              </div>
              <div className="space-y-1.5" id="photo-picker-desc">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  id="btn-open-camera-capture"
                >
                  <Camera className="w-4 h-4" />
                  {newCarPhoto ? 'Re-take / Change Photo' : 'Capture or Pick Photo'}
                </button>
                <p className="text-[10px] text-gray-400 max-w-sm">Capture real vehicle photos using device camera, upload local files, or choose from high quality presets.</p>
              </div>
            </div>
          </div>

          {/* Grid Specifications Fields */}
          <div className="grid grid-cols-2 gap-4" id="specs-fields-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Vehicle Make*</label>
              <input
                type="text"
                required
                placeholder="e.g. Toyota"
                value={newCarMake}
                onChange={(e) => setNewCarMake(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                id="input-car-make"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Model Family*</label>
              <input
                type="text"
                required
                placeholder="e.g. Mark X"
                value={newCarModel}
                onChange={(e) => setNewCarModel(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                id="input-car-model"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Manufacturing Year*</label>
              <input
                type="number"
                required
                min="1990"
                max={new Date().getFullYear() + 1}
                value={newCarYear}
                onChange={(e) => setNewCarYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                id="input-car-year"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">License Plate Number*</label>
              <input
                type="text"
                required
                placeholder="e.g. ABC 123X"
                value={newCarPlate}
                onChange={(e) => setNewCarPlate(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-850 font-medium uppercase text-center"
                id="input-car-plate"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Body Exterior Color*</label>
              <input
                type="text"
                required
                placeholder="e.g. Pearl Silver"
                value={newCarColor}
                onChange={(e) => setNewCarColor(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                id="input-car-color"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">VIN (17 chars) or Identifier</label>
              <input
                type="text"
                placeholder="e.g. 1G1FY6S0..."
                value={newCarVin}
                onChange={(e) => setNewCarVin(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-850 font-medium uppercase"
                id="input-car-vin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Starting Odometer (km)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 12000"
                value={newCarMileage || ''}
                onChange={(e) => setNewCarMileage(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                id="input-car-miles"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Purchase Price (zmk)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={newCarPurchasePrice || ''}
                onChange={(e) => setNewCarPurchasePrice(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-850 font-medium"
                id="input-car-purchase-price"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Initial Status</label>
              <select
                value={newCarStatus}
                onChange={(e) => setNewCarStatus(e.target.value as CarAsset['status'])}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium"
                id="select-car-status"
              >
                <option value="Available">Available for Dispatch</option>
                <option value="Maintenance">Under Scheduled Maintenance</option>
                <option value="Out of Service">Currently Out of Service</option>
              </select>
            </div>
          </div>

          {/* Service Logs checkpoint segment */}
          <div className="border-t border-gray-100 pt-4" id="service-logs-init-sec">
            <div className="flex items-center gap-2 mb-2" id="chk-init-service-wrap">
              <input
                type="checkbox"
                id="chk-init-service"
                checked={includeInitialService}
                onChange={(e) => setIncludeInitialService(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="chk-init-service" className="text-xs font-semibold text-gray-700 cursor-pointer select-none font-sans">
                Log an initial fleet readiness / maintenance history entry
              </label>
            </div>

            {includeInitialService && (
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3 slide-in" id="init-service-inputs-wrap">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Ready Check Maintenance details</p>
                <div className="grid grid-cols-3 gap-3" id="init-service-inputs-row1">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Service Workshop Performed By</label>
                    <input
                      type="text"
                      placeholder="e.g. Fleet Prep Express"
                      value={initialServiceBy}
                      onChange={(e) => setInitialServiceBy(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                      id="input-init-serv-by"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Inspection Cost (zmk)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={initialServiceCost || ''}
                      onChange={(e) => includeInitialService && setInitialServiceCost(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                      id="input-init-serv-cost"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Observation / Description of Work done</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Conducted detail clean, full level fluid checks, tire pressure gauge correction. Vehicle pristine."
                    value={initialServiceDesc}
                    onChange={(e) => setInitialServiceDesc(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs"
                    id="input-init-serv-desc"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action and controls */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="add-car-actions">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors"
              id="btn-add-car-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
              id="btn-add-car-submit"
            >
              Create Asset Card
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
