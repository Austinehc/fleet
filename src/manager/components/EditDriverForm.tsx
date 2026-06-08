import React, { useState } from 'react';
import { Driver } from '../../types';

interface EditDriverFormProps {
  driver: Driver;
  onSave: (updatedDriver: Driver) => void;
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
  const [editDrvStatus, setEditDrvStatus] = useState<Driver['status']>(driver.status);
  const [editDrvAccessCode, setEditDrvAccessCode] = useState(driver.accessCode || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDrvName.trim() || !editDrvLicense.trim() || !editDrvNrc.trim()) {
      alert('Please fill out all mandatory fields tagged with an asterisk.');
      return;
    }

    const updatedDriver: Driver = {
      ...driver,
      fullName: editDrvName.trim(),
      nrcNumber: editDrvNrc.trim().toUpperCase(),
      licenseNumber: editDrvLicense.trim().toUpperCase(),
      email: editDrvEmail.trim(),
      phone: editDrvPhone.trim(),
      status: editDrvStatus,
      accessCode: editDrvAccessCode.trim().toUpperCase()
    };

    onSave(updatedDriver);
  };

  return (
    <div className="fixed inset-0 z-55 bg-gray-950/70 backdrop-blur-sm flex items-start justify-center p-4 py-8 overflow-y-auto animate-fade-in" id="edit-driver-modal">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-100 overflow-hidden shadow-2xl flex flex-col max-h-screen my-auto overflow-y-auto" id="edit-driver-modal-box">
        
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50" id="edit-driver-hdr">
          <div>
            <h3 className="text-base font-bold text-gray-950">Edit Staff Profile</h3>
            <p className="text-xs text-gray-400">Update identification, contacts, status, or credentials for {driver.fullName}.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg text-sm"
            id="btn-close-edit-driver-modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left" id="edit-driver-form">
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Full Name*</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Jenkins"
              value={editDrvName}
              onChange={(e) => setEditDrvName(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-900"
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
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase font-medium text-gray-900"
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
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase font-medium text-gray-900"
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
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-900"
                id="edit-input-drv-email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Mobile Phone No.</label>
              <input
                type="text"
                placeholder="(512) 555-0199"
                value={editDrvPhone}
                onChange={(e) => setEditDrvPhone(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-900"
                id="edit-input-drv-phone"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Status</label>
            <select
              value={editDrvStatus}
              onChange={(e) => setEditDrvStatus(e.target.value as Driver['status'])}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-semibold mb-4 cursor-pointer"
              id="edit-select-drv-status"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Driver Access Code (6 digits)</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                required
                placeholder="e.g. AD3F89"
                value={editDrvAccessCode}
                onChange={(e) => setEditDrvAccessCode(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold uppercase text-gray-900 tracking-widest text-center"
                id="edit-input-drv-access-code"
              />
              <button
                type="button"
                onClick={() => {
                  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                  let code = '';
                  for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  setEditDrvAccessCode(code);
                }}
                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 transition-all cursor-pointer"
              >
                Regenerate
              </button>
            </div>
            <p className="text-[10px] text-gray-450 mt-1 leading-normal font-sans">
              The driver needs this 6-digit alphanumeric code to log in directly via the Driver Station URL.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" id="edit-drv-actions">
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer"
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
