/**
 * Centralized state management to prevent race conditions
 */

import { CarAsset, Driver } from '../types';

export type StateUpdateType = 'car' | 'driver' | 'batch';

export interface StateUpdate {
  id: string;
  type: StateUpdateType;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: number;
}

class StateManager {
  private updateQueue: StateUpdate[] = [];
  private isProcessing = false;
  private readonly processingDelay = 100; // ms

  // Add update to queue with conflict resolution
  queueUpdate(update: StateUpdate): void {
    // Remove any pending updates for the same item
    this.updateQueue = this.updateQueue.filter(
      existing => !(existing.id === update.id && existing.type === update.type)
    );
    
    // Add new update
    this.updateQueue.push(update);
    
    // Process queue
    this.processQueue();
  }

  // Process updates sequentially to prevent race conditions
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift()!;
        await this.processUpdate(update);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processUpdate(update: StateUpdate): Promise<void> {
    // This would be implemented with actual state updates
    console.log('Processing state update:', update);
    
    // Here we would call the appropriate state setter or database operation
    // The actual implementation would be injected via callbacks
  }

  // Optimistic update with rollback capability
  async optimisticUpdate<T>(
    currentData: T[],
    updateFn: (data: T[]) => T[],
    persistFn: () => Promise<void>,
    rollbackFn?: (error: Error) => void
  ): Promise<T[]> {
    // Apply optimistic update
    const optimisticData = updateFn([...currentData]);
    
    try {
      // Attempt to persist
      await persistFn();
      return optimisticData;
    } catch (error) {
      // Rollback on failure
      if (rollbackFn) {
        rollbackFn(error as Error);
      }
      console.error('Optimistic update failed, rolling back:', error);
      return currentData; // Return original data
    }
  }

  // Debounced function to prevent rapid successive calls
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Throttle function to limit call frequency
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
}

export const stateManager = new StateManager();

// Helper for consistent car updates
export function updateCarInList(
  cars: CarAsset[],
  carId: string,
  updates: Partial<CarAsset>
): CarAsset[] {
  return cars.map(car =>
    car.id === carId
      ? { ...car, ...updates }
      : car
  );
}

// Helper for consistent driver updates
export function updateDriverInList(
  drivers: Driver[],
  driverId: string,
  updates: Partial<Driver>
): Driver[] {
  return drivers.map(driver =>
    driver.id === driverId
      ? { ...driver, ...updates }
      : driver
  );
}

// Atomic car-driver assignment update
export function updateCarDriverAssignment(
  cars: CarAsset[],
  drivers: Driver[],
  carId: string,
  newDriverId: string | null,
  previousDriverId?: string | null
): { cars: CarAsset[]; drivers: Driver[] } {
  const updatedDrivers = drivers.map(driver => {
    // Clear previous driver assignment
    if (previousDriverId && driver.id === previousDriverId) {
      return { ...driver, assignedCarId: null, status: 'On Leave' as const };
    }
    
    // Set new driver assignment
    if (newDriverId && driver.id === newDriverId) {
      return { ...driver, assignedCarId: carId, status: 'Active' as const };
    }
    
    return driver;
  });

  const updatedCars = cars.map(car =>
    car.id === carId
      ? { ...car, status: newDriverId ? 'Assigned' as const : 'Available' as const }
      : car
  );

  return { cars: updatedCars, drivers: updatedDrivers };
}