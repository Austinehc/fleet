import React, { useState } from 'react';
import { CarAsset, Driver } from '../types';
import ManagerHeader from './components/ManagerHeader';
import FleetDashboard from './components/FleetDashboard';
import StaffManager from './components/StaffManager';
import FinanceDashboard from './components/FinanceDashboard';
import AddCarForm from './components/AddCarForm';
import AddDriverForm from './components/AddDriverForm';
import EditCarForm from './components/EditCarForm';
import EditDriverForm from './components/EditDriverForm';
import CameraCapture from '../components/CameraCapture';
import { Car } from 'lucide-react';

interface ManagerAppProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  onSignOut?: () => void;
  dataLoading?: boolean;
}

export default function ManagerApp({
  cars,
  setCars,
  drivers,
  setDrivers,
  onSignOut,
  dataLoading = false
}: ManagerAppProps) {
  // Navigation View switcher
  const [activeTab, setActiveTab] = useState<'fleet' | 'staff' | 'finance'>('fleet');

  // Trigger Sheet Modals state
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [editingCar, setEditingCar] = useState<CarAsset | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Camera settings
  const [showCamera, setShowCamera] = useState(false);
  const [newCarPhoto, setNewCarPhoto] = useState<string>('');

  // Fleet dashboard highlight car selection
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const handleUpdateDriver = (updatedDrv: Driver) => {
    setDrivers(prev => prev.map(d => d.id === updatedDrv.id ? updatedDrv : d));
    setEditingDriver(null);
  };

  const handleAddNewCar = (newCar: CarAsset) => {
    setCars(prev => [...prev, newCar]);
    setIsAddingCar(false);
  };

  const handleUpdateCar = (updatedCar: CarAsset, newAssignedDriverId: string | null) => {
    // 1. Update the car asset list
    setCars(prev => prev.map(c => c.id === updatedCar.id ? updatedCar : c));

    // 2. Safely synchronize driver assignments
    setDrivers(prev => prev.map(d => {
      // If driver was assigned to this car but is now unassigned, reset their assignedCarId (use null, not undefined)
      if (d.assignedCarId === updatedCar.id && d.id !== newAssignedDriverId) {
        return { ...d, assignedCarId: null, status: 'On Leave' as const };
      }
      // If driver is the new assignee, set their assignedCarId
      if (newAssignedDriverId && d.id === newAssignedDriverId) {
        return { ...d, assignedCarId: updatedCar.id, status: 'Active' as const };
      }
      return d;
    }));

    setEditingCar(null);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans text-gray-800 animate-none relative" id="manager-system-portal-root">
      
      {/* Dynamic Toast instead of a blocking page-overlay */}
      {dataLoading && (
        <div className="fixed bottom-6 right-6 z-100 bg-slate-900 border border-slate-800 text-white rounded-2xl py-3 px-4 shadow-2xl flex items-center gap-3.5 animate-pulse font-sans max-w-sm" id="manager-sync-toast">
          <div className="w-6 h-6 shrink-0 bg-slate-850 rounded-lg flex items-center justify-center animate-spin">
            <Car className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-left animate-none">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-150">Synchronizing Fleet Ledger</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Reading latest asset states and log histories...</p>
          </div>
        </div>
      )}

      {/* Dynamic Header with role toggle URL helpers */}
      <ManagerHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddCarTrigger={() => setIsAddingCar(true)}
        onAddDriverTrigger={() => setIsAddingDriver(true)}
        cars={cars}
        onSignOut={onSignOut}
      />

      {/* Main View Container Router */}
      <div className="flex-1 flex flex-col" id="manager-router-views">
        {activeTab === 'fleet' && (
          <FleetDashboard
            cars={cars}
            setCars={setCars}
            drivers={drivers}
            selectedCarId={selectedCarId}
            setSelectedCarId={setSelectedCarId}
            onEditCar={setEditingCar}
            onEditDriver={setEditingDriver}
            onManageDrivers={() => {
              setActiveTab('staff');
            }}
            setShowCamera={setShowCamera}
            setNewCarPhoto={setNewCarPhoto}
          />
        )}

        {activeTab === 'staff' && (
          <StaffManager
            drivers={drivers}
            cars={cars}
            onEditDriver={setEditingDriver}
            onDeleteDriver={(driverId) => setDrivers(prev => prev.filter(drv => drv.id !== driverId))}
            onUpdateDriver={handleUpdateDriver}
            onRegisterDriverClick={() => setIsAddingDriver(true)}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceDashboard
            cars={cars}
            setCars={setCars}
          />
        )}
      </div>

      {/* MODALS RENDER CORNER */}

      {/* 1. Add Vehicle form sheet */}
      {isAddingCar && (
        <AddCarForm
          onAddCar={handleAddNewCar}
          onClose={() => setIsAddingCar(false)}
          setShowCamera={setShowCamera}
          newCarPhoto={newCarPhoto}
          setNewCarPhoto={setNewCarPhoto}
        />
      )}

      {/* 2. Edit Vehicle details sheet */}
      {editingCar && (
        <EditCarForm
          car={editingCar}
          drivers={drivers}
          onClose={() => setEditingCar(null)}
          onSave={handleUpdateCar}
        />
      )}

      {/* 3. Enroll Driver sheet */}
      {isAddingDriver && (
        <AddDriverForm
          cars={cars}
          drivers={drivers}
          setDrivers={setDrivers}
          setCars={setCars}
          onClose={() => setIsAddingDriver(false)}
        />
      )}

      {/* 4. Edit Driver profile sheet */}
      {editingDriver && (
        <EditDriverForm
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSave={handleUpdateDriver}
        />
      )}

      {/* 5. Shared Camera Snapper Overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-55 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" id="camera-overlay-bg">
          <CameraCapture
            onPhotoCaptured={(capturedDataUrl) => {
              if (isAddingCar) {
                setNewCarPhoto(capturedDataUrl);
              } else if (selectedCarId) {
                setCars(prevCars =>
                  prevCars.map(c => {
                    if (c.id === selectedCarId) {
                      return { ...c, photos: [capturedDataUrl] };
                    }
                    return c;
                  })
                );
              }
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        </div>
      )}

    </div>
  );
}
