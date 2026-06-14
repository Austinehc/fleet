import React, { useState } from 'react';
import { User, Info } from 'lucide-react';
import { Driver, CarAsset } from '../../types';

interface AddDriverFormProps {
  cars: CarAsset[];
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  onClose: () => void;
}

export default function AddDriverForm({
  cars,
  drivers,
  setDrivers,
  setCars,
  onClose
}: AddDriverFormProps) {
  const [newDrvName, setNewDrvName] = useState('');
  const [newDrvLicense, setNewDrvLicense] = useState('');
  const [newDrvNrc, setNewDrvNrc] = useState('');
  const [newDrvEmail, setNewDrvEmail] = useState('');
  const [newDrvPhone, setNewDrvPhone] = useState('');
  const [newDrvStatus, setNewDrvStatus] = useState<Driver['status']>('Active');
  const [newDrvAssignedCarId, setNewDrvAssignedCarId] = useState('');
  const [newDrvPhoto, setNewDrvPhoto] = useState<string>('');
  const [isUploadingDriverPhoto, setIsUploadingDriverPhoto] = useState(false);

  // Profile picture upload
  const handleDriverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      setIsUploadingDriverPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const { uploadToCloudinary, isCloudinaryConfigured } = await import('../../lib/cloudinary');
          if (isCloudinaryConfigured()) {
            const url = await uploadToCloudinary(base64);
            setNewDrvPhoto(url);
          } else {
            setNewDrvPhoto(base64);
          }
        } catch (err: any) {
          console.error(err);
          alert('Failed to upload profile picture to Cloudinary. Keeping local data-URI.');
          setNewDrvPhoto(base64);
        } finally {
          setIsUploadingDriverPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAccessCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrvName || !newDrvLicense || !newDrvNrc) {
      alert('Please fill out the Driver Name, NRC Number, and Licence details.');
      return;
    }

    const newDriverId = `driver-${Date.now()}`;
    const code = generateAccessCode();

    const createdDriver: Driver = {
      id: newDriverId,
      fullName: newDrvName,
      licenseNumber: newDrvLicense.toUpperCase(),
      nrcNumber: newDrvNrc.toUpperCase(),
      email: newDrvEmail || 'notprovided@fleetcorp.com',
      phone: newDrvPhone || 'Unspecified',
      status: newDrvStatus,
      assignedCarId: newDrvAssignedCarId || null,
      accessCode: code,
      createdAt: new Date().toISOString()
    };
    
    // Add profilePicture only if provided
    if (newDrvPhoto) {
      createdDriver.profilePicture = newDrvPhoto;
    }

    // Update state
    setDrivers(prev => [createdDriver, ...prev]);

    alert(`🎉 Staff Profile Created For ${createdDriver.fullName}!\n\n🔑 Generated 6-digit access code: ${code}\n\nDeliver this secure access key to the driver. They will use this code on the Driver Station login.`);

    if (newDrvAssignedCarId) {
      setCars(prevCars =>
        prevCars.map(car => {
          if (car.id === newDrvAssignedCarId) {
            return { ...car, status: 'Assigned' };
          }
          return car;
        })
      );
      
      // Clear previously assigned drivers
      setDrivers(prevDrivers =>
        prevDrivers.map(drv => {
          if (drv.assignedCarId === newDrvAssignedCarId && drv.id !== newDriverId) {
            return { ...drv, assignedCarId: null };
          }
          return drv;
        })
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-55 bg-gray-950/70 backdrop-blur-sm flex items-start justify-center p-4 py-8 overflow-y-auto" id="add-driver-modal">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col max-h-screen my-auto overflow-y-auto" id="add-driver-modal-box">
        
        {/* Header banner */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50 shrink-0" id="add-driver-hdr">
          <div>
            <h3 className="text-base font-bold text-gray-950">Add Drivers Entry</h3>
            <p className="text-xs text-gray-400">Map a new driver profile and couple an unassigned vehicle asset.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg"
            id="btn-close-add-driver"
          >
            ✕
          </button>
        </div>

        {/* Form list parameters */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left overflow-y-auto flex-1 min-h-0" id="add-driver-form">
          
          {/* Profile Photo Upload */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-dashed border-gray-200 rounded-2xl" id="add-drv-photo-block">
            <div className="w-16 h-16 rounded-full bg-slate-200 border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
              {isUploadingDriverPhoto ? (
                <div className="w-full h-full bg-indigo-50 flex flex-col items-center justify-center animate-pulse">
                  <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider">Uploading</span>
                </div>
              ) : newDrvPhoto ? (
                <img src={newDrvPhoto} alt="Preview" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Driver Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingDriverPhoto}
                onChange={handleDriverPhotoUpload}
                className="text-xs text-gray-550 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                id="input-drv-photo"
              />
              <p className="text-[9px] text-gray-400 mt-0.5">JPEG, PNG, or GIF. Max 5MB.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Full Name*</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Jenkins"
              value={newDrvName}
              onChange={(e) => setNewDrvName(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="input-drv-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4" id="driver-identifiers-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">NRC Number*</label>
              <input
                type="text"
                required
                placeholder="e.g. 523456/11/1"
                value={newDrvNrc}
                onChange={(e) => setNewDrvNrc(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                id="input-drv-nrc"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver's Licence Number*</label>
              <input
                type="text"
                required
                placeholder="e.g. DL-TX4810931"
                value={newDrvLicense}
                onChange={(e) => setNewDrvLicense(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                id="input-drv-license"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" id="driver-contacts-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Email Address</label>
              <input
                type="email"
                placeholder="s.jenkins@corp.com"
                value={newDrvEmail}
                onChange={(e) => setNewDrvEmail(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="input-drv-email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Mobile Phone No.</label>
              <input
                type="text"
                placeholder="(512) 555-0199"
                value={newDrvPhone}
                onChange={(e) => setNewDrvPhone(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="input-drv-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" id="driver-status-car-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Status</label>
              <select
                value={newDrvStatus}
                onChange={(e) => setNewDrvStatus(e.target.value as Driver['status'])}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium"
                id="select-drv-status"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Assign Car Asset</label>
              <select
                value={newDrvAssignedCarId}
                onChange={(e) => setNewDrvAssignedCarId(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium font-mono uppercase"
                id="select-drv-assigned-car"
              >
                <option value="">-- No Car Assigned --</option>
                {cars
                  .filter(c => c.status === 'Available' || !drivers.some(d => d.assignedCarId === c.id))
                  .map(car => (
                    <option key={car.id} value={car.id} className="font-mono">
                      {car.plateNumber} ({car.make} {car.model})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Warnings check info */}
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-2" id="add-driver-tips-bullet">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-indigo-700 leading-normal font-medium font-sans">
              Assigning an available car immediately schedules the car to <strong>Assigned</strong> state and binds logs specifically to this staff profile. Unassigned drivers can be coupled subsequently.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="add-drv-actions">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors"
              id="btn-add-driver-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
              id="btn-add-driver-submit"
            >
              Create Driver Profile
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
