import React, { useState } from 'react';
import { CarAsset } from '../../types';

interface EditCarFormProps {
  car: CarAsset;
  onSave: (updatedCar: CarAsset) => void;
  onClose: () => void;
}

export default function EditCarForm({
  car,
  onSave,
  onClose
}: EditCarFormProps) {
  const [editCarMake, setEditCarMake] = useState(car.make);
  const [editCarModel, setEditCarModel] = useState(car.model);
  const [editCarYear, setEditCarYear] = useState(car.year);
  const [editCarPlate, setEditCarPlate] = useState(car.plateNumber);
  const [editCarColor, setEditCarColor] = useState(car.color);
  const [editCarMileage, setEditCarMileage] = useState(car.mileage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCarMake.trim() || !editCarModel.trim() || !editCarPlate.trim() || !editCarColor.trim()) {
      alert('Please fill out all mandatory fields tagged with an asterisk.');
      return;
    }

    const updatedCar: CarAsset = {
      ...car,
      make: editCarMake.trim(),
      model: editCarModel.trim(),
      year: Number(editCarYear),
      plateNumber: editCarPlate.toUpperCase().trim(),
      color: editCarColor.trim(),
      mileage: Number(editCarMileage) || 0
    };

    onSave(updatedCar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in animate-scale-up" id="edit-car-modal">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col" id="edit-car-modal-box">
        
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50" id="edit-car-hdr">
          <div>
            <h3 className="text-base font-bold text-gray-950">Edit Vehicle Asset</h3>
            <p className="text-xs text-gray-400">Modify registration, physical status, or metric logs for {car.make} {car.model}.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg text-sm"
            id="btn-close-edit-car-modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left" id="edit-car-form">
          <div className="grid grid-cols-2 gap-4" id="edit-car-specs-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Vehicle Make*</label>
              <input
                type="text"
                required
                placeholder="e.g. Ford"
                value={editCarMake}
                onChange={(e) => setEditCarMake(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                id="edit-input-car-make"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Vehicle Model*</label>
              <input
                type="text"
                required
                placeholder="e.g. F-150 Lightning"
                value={editCarModel}
                onChange={(e) => setEditCarModel(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                id="edit-input-car-model"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Manufacturing Year*</label>
              <input
                type="number"
                required
                min="1990"
                max={new Date().getFullYear() + 1}
                value={editCarYear}
                onChange={(e) => setEditCarYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                id="edit-input-car-year"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">License Plate Number*</label>
              <input
                type="text"
                required
                placeholder="e.g. NY-44X8"
                value={editCarPlate}
                onChange={(e) => setEditCarPlate(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-gray-900 font-medium uppercase text-center"
                id="edit-input-car-plate"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Body Exterior Color*</label>
              <input
                type="text"
                required
                placeholder="e.g. Pearl Silver"
                value={editCarColor}
                onChange={(e) => setEditCarColor(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                id="edit-input-car-color"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Odometer (km)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 12000"
                value={editCarMileage || ''}
                onChange={(e) => setEditCarMileage(Number(e.target.value))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium"
                id="edit-input-car-miles"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="edit-car-actions">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors cursor-pointer"
              id="btn-edit-car-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
              id="btn-edit-car-submit"
            >
              Save Vehicle Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
