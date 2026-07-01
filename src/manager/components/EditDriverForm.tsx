import React, { useState } from 'react';
import { Driver, DriverInput } from '../../types';
import { Camera, Upload } from 'lucide-react';
import { validateEmail, validateNRCNumber, validatePhone } from '../../lib/validation';

interface EditDriverFormProps {
  driver: Driver;
  onSave: (updatedDriver: DriverInput) => void;
  onClose: () => void;
}

export default function EditDriverForm({
  driver,
  onSave,
  onClose
}: EditDriverFormProps) {
  const [editDrvName, setEditDrvName] = useState(driver.fullName);
  const [editDrvNrc, setEditDrvNrc] = useState(driver.nrcNumber || '');
  const [editDrvLicense, setEditDrvLicense] = useState(driver.licenseNumber);
  const [editDrvEmail, setEditDrvEmail] = useState(driver.email || '');
  const [editDrvPhone, setEditDrvPhone] = useState(driver.phone || '');
  const [editDrvAddress, setEditDrvAddress] = useState(driver.address || '');
  const [editDrvMaritalStatus, setEditDrvMaritalStatus] = useState(driver.maritalStatus || '');
  const [editDrvNextOfKinName, setEditDrvNextOfKinName] = useState(driver.nextOfKinName || '');
  const [editDrvNextOfKinRelationship, setEditDrvNextOfKinRelationship] = useState(driver.nextOfKinRelationship || '');
  const [editDrvNextOfKinPhone, setEditDrvNextOfKinPhone] = useState(driver.nextOfKinPhone || '');
  const [editDrvDateOfBirth, setEditDrvDateOfBirth] = useState(driver.dateOfBirth || '');
  const [editDrvStatus, setEditDrvStatus] = useState<Driver['status']>(driver.status);
  const [editDrvAccessCode] = useState(driver.accessCode || '');

  // Photograph upload state
  const [editDrvPhoto, setEditDrvPhoto] = useState<string>(driver.profilePicture || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the 5MB safety limit.');
        return;
      }
      setIsUploadingPhoto(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const { uploadToCloudinary, isCloudinaryConfigured } = await import('../../lib/cloudinary');
          if (isCloudinaryConfigured()) {
            const url = await uploadToCloudinary(base64);
            setEditDrvPhoto(url);
          } else {
            setEditDrvPhoto(base64);
          }
        } catch (err) {
          console.error(err);
          setEditDrvPhoto(base64);
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDrvName.trim() || !editDrvLicense.trim() || !editDrvNrc.trim()) {
      alert('Please fill out all mandatory fields tagged with an asterisk.');
      return;
    }

    const nrcValidation = validateNRCNumber(editDrvNrc);
    if (!nrcValidation.valid) {
      alert(nrcValidation.error!);
      return;
    }

    if (editDrvEmail.trim()) {
      const emailValidation = validateEmail(editDrvEmail);
      if (!emailValidation.valid) {
        alert(emailValidation.error!);
        return;
      }
    }

    if (editDrvPhone.trim()) {
      const phoneValidation = validatePhone(editDrvPhone);
      if (!phoneValidation.valid) {
        alert(phoneValidation.error!);
        return;
      }
    }

    if (editDrvNextOfKinPhone.trim()) {
      const kinPhoneValidation = validatePhone(editDrvNextOfKinPhone);
      if (!kinPhoneValidation.valid) {
        alert(kinPhoneValidation.error!);
        return;
      }
    }

    const updatedDriver: DriverInput = {
      ...driver,
      fullName: editDrvName.trim(),
      nrcNumber: editDrvNrc.trim().toUpperCase(),
      licenseNumber: editDrvLicense.trim().toUpperCase(),
      email: editDrvEmail.trim(),
      phone: editDrvPhone.trim(),
      status: editDrvStatus,
      accessCode: editDrvAccessCode ? editDrvAccessCode.trim().toUpperCase() : '',
      address: editDrvAddress.trim(),
      maritalStatus: editDrvMaritalStatus.trim(),
      nextOfKinName: editDrvNextOfKinName.trim(),
      nextOfKinRelationship: editDrvNextOfKinRelationship.trim(),
      nextOfKinPhone: editDrvNextOfKinPhone.trim(),
      dateOfBirth: editDrvDateOfBirth,
      profilePicture: editDrvPhoto
    };

    onSave(updatedDriver);
  };

  return (
    <div className="fixed inset-0 z-55 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="edit-driver-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-150 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:max-h-[min(720px,85vh)]" id="edit-driver-modal-box">
        
        <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-slate-50/50" id="edit-driver-hdr">
          <div className="text-left">
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg inline-block">
              Staff Directory Editor
            </span>
            <h3 className="text-sm font-bold text-gray-950 mt-0.5">Edit Staff Profile</h3>
            <p className="text-[11px] text-gray-400 leading-tight">Update identification, status, or credentials for {driver.fullName}.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-150 rounded-xl text-xs font-bold"
            id="btn-close-edit-driver-modal"
          >
            ✕ Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-left overflow-y-auto flex-1" id="edit-driver-form">
          
          {/* Driver Portrait Snapshot Area */}
          <div className="space-y-1.5" id="edit-driver-pic-box">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">
              Driver Photograph
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-full overflow-hidden shadow-inner shrink-0 relative group" id="drv-pic-display">
                {editDrvPhoto ? (
                  <img src={editDrvPhoto} alt="Snapshot Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-[8px] p-1 text-center bg-gray-50 uppercase tracking-wide font-black">
                    <Camera className="w-3.5 h-3.5 text-gray-300 mb-0.5" /> No Photo
                  </div>
                )}
              </div>
              <div className="space-y-1 flex-1">
                <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer w-max select-none">
                  <Upload className="w-3 h-3" />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Picture'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                <p className="text-[9px] text-gray-400">Portrait formats (.jpeg, .png) up to 5MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Full Name*</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Jenkins"
              value={editDrvName}
              onChange={(e) => setEditDrvName(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
              id="edit-input-drv-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4" id="edit-driver-identifiers-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">NRC Number*</label>
              <input
                type="text"
                required
                placeholder="e.g. 523456/11/1"
                value={editDrvNrc}
                onChange={(e) => setEditDrvNrc(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-mono uppercase font-medium text-gray-900"
                id="edit-input-drv-nrc"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver's Licence Number*</label>
              <input
                type="text"
                required
                placeholder="e.g. DL-TX4810931"
                value={editDrvLicense}
                onChange={(e) => setEditDrvLicense(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-mono uppercase font-medium text-gray-900"
                id="edit-input-drv-license"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" id="edit-driver-contacts-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Email Address</label>
              <input
                type="email"
                placeholder="s.jenkins@corp.com"
                value={editDrvEmail}
                onChange={(e) => setEditDrvEmail(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Mobile Phone No.</label>
              <input
                type="text"
                placeholder="(+260)"
                value={editDrvPhone}
                onChange={(e) => setEditDrvPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" id="edit-driver-personal-details-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Address</label>
              <input
                type="text"
                placeholder="Plot 123, Lusaka"
                value={editDrvAddress}
                onChange={(e) => setEditDrvAddress(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-address"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Marital Status</label>
              <input
                type="text"
                placeholder="Married"
                value={editDrvMaritalStatus}
                onChange={(e) => setEditDrvMaritalStatus(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-marital-status"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" id="edit-driver-next-of-kin-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Next of Kin Name</label>
              <input
                type="text"
                placeholder="Mary Banda"
                value={editDrvNextOfKinName}
                onChange={(e) => setEditDrvNextOfKinName(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-next-of-kin-name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Relationship</label>
              <input
                type="text"
                placeholder="Spouse"
                value={editDrvNextOfKinRelationship}
                onChange={(e) => setEditDrvNextOfKinRelationship(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-next-of-kin-relationship"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" id="edit-driver-next-of-kin-contact-grid">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Next of Kin Phone</label>
              <input
                type="text"
                placeholder="(+260)"
                value={editDrvNextOfKinPhone}
                onChange={(e) => setEditDrvNextOfKinPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-next-of-kin-phone"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Date of Birth</label>
              <input
                type="date"
                value={editDrvDateOfBirth}
                onChange={(e) => setEditDrvDateOfBirth(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 font-medium text-gray-900"
                id="edit-input-drv-date-of-birth"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Status</label>
            <select
              value={editDrvStatus}
              onChange={(e) => setEditDrvStatus(e.target.value as Driver['status'])}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505 text-gray-700 font-semibold mb-4 cursor-pointer"
              id="edit-select-drv-status"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-150 flex items-center justify-end gap-3" id="edit-drv-actions">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-650 transition-colors cursor-pointer"
              id="btn-edit-driver-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-550/10 transition-all cursor-pointer"
              id="btn-edit-driver-submit"
            >
              Save Profile Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
