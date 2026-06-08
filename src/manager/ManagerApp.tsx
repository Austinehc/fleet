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

interface ManagerAppProps {
  cars: CarAsset[];
  setCars: React.Dispatch<React.SetStateAction<CarAsset[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  userRole?: 'manager' | 'driver';
  setUserRole?: (role: 'manager' | 'driver') => void;
  onSignOut?: () => void;
}

export default function ManagerApp({
  cars,
  setCars,
  drivers,
  setDrivers,
  userRole = 'manager',
  setUserRole,
  onSignOut
}: ManagerAppProps) {
  // Navigation View switcher
  const [activeTab, setActiveTab] = useState<'fleet' | 'staff' | 'finance'>('fleet');

  // Trigger Sheet Modals state
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [isManagingDrivers, setIsManagingDrivers] = useState(false);
  const [editingCar, setEditingCar] = useState<CarAsset | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Camera settings
  const [showCamera, setShowCamera] = useState(false);
  const [newCarPhoto, setNewCarPhoto] = useState<string>('');

  // Fleet dashboard highlight car selection
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  // Handlers for driver additions & saves
  const handleAddNewDriver = (newDrv: Driver) => {
    setDrivers(prev => [...prev, newDrv]);
    setIsAddingDriver(false);
  };

  const handleUpdateDriver = (updatedDrv: Driver) => {
    setDrivers(prev => prev.map(d => d.id === updatedDrv.id ? updatedDrv : d));
    setEditingDriver(null);
  };

  const handleAddNewCar = (newCar: CarAsset) => {
    setCars(prev => [...prev, newCar]);
    setIsAddingCar(false);
  };

  const handleUpdateCar = (updatedCar: CarAsset) => {
    setCars(prev => prev.map(c => c.id === updatedCar.id ? updatedCar : c));
    setEditingCar(null);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans text-gray-800" id="manager-system-portal-root">
      
      {/* Dynamic Header with role toggle URL helpers */}
      <ManagerHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
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
              setIsManagingDrivers(true);
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
