/**
 * Centralized state management with transaction support
 */

import { CarAsset, Driver } from '../types';
import { errorHandler } from './errorHandling';

export type StateUpdateType = 'car' | 'driver' | 'batch';

export interface StateUpdate {
  id: string;
  type: StateUpdateType;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: number;
}

export interface Transaction {
  id: string;
  updates: StateUpdate[];
  status: 'pending' | 'committed' | 'rolled_back';
  timestamp: number;
}

class StateManager {
  private updateQueue: StateUpdate[] = [];
  private isProcessing = false;
  private readonly processingDelay = 100; // ms
  private transactions: Map<string, Transaction> = new Map();
  private locks: Set<string> = new Set();

  // Begin transaction for atomic updates
  beginTransaction(): string {
    const transactionId = crypto.randomUUID();
    this.transactions.set(transactionId, {
      id: transactionId,
      updates: [],
      status: 'pending',
      timestamp: Date.now()
    });
    return transactionId;
  }

  // Add update to transaction
  addToTransaction(transactionId: string, update: StateUpdate): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'pending') {
      return false;
    }

    // Check for locks
    if (this.locks.has(update.id)) {
      throw new Error(`Resource ${update.id} is locked by another operation`);
    }

    transaction.updates.push(update);
    return true;
  }

  // Commit transaction atomically
  async commitTransaction(
    transactionId: string,
    executeUpdates: (updates: StateUpdate[]) => Promise<void>
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'pending') {
      return false;
    }

    // Lock all resources
    const lockedResources = new Set<string>();
    try {
      for (const update of transaction.updates) {
        if (this.locks.has(update.id)) {
          throw new Error(`Resource ${update.id} is locked`);
        }
        this.locks.add(update.id);
        lockedResources.add(update.id);
      }

      // Execute all updates atomically
      await executeUpdates(transaction.updates);
      
      transaction.status = 'committed';
      return true;
    } catch (error) {
      // Rollback on error
      transaction.status = 'rolled_back';
      errorHandler.logError(error as Error, `Transaction rollback: ${transactionId}`);
      throw error;
    } finally {
      // Release locks
      lockedResources.forEach(id => this.locks.delete(id));
      
      // Cleanup old transactions
      setTimeout(() => {
        this.transactions.delete(transactionId);
      }, 60000); // Keep for 1 minute for debugging
    }
  }

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

  // Get transaction status
  getTransactionStatus(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  // Cleanup expired transactions
  cleanupExpiredTransactions(): void {
    const now = Date.now();
    const expiry = 5 * 60 * 1000; // 5 minutes

    for (const [id, transaction] of this.transactions) {
      if (now - transaction.timestamp > expiry) {
        this.transactions.delete(id);
      }
    }
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

// Atomic car-driver assignment update with transaction support
export async function updateCarDriverAssignment(
  cars: CarAsset[],
  drivers: Driver[],
  carId: string,
  newDriverId: string | null,
  previousDriverId?: string | null,
  persistFn?: (cars: CarAsset[], drivers: Driver[]) => Promise<void>
): Promise<{ cars: CarAsset[]; drivers: Driver[]; success: boolean }> {
  
  // Start transaction
  const transactionId = stateManager.beginTransaction();
  
  try {
    // Add updates to transaction
    if (previousDriverId) {
      stateManager.addToTransaction(transactionId, {
        id: previousDriverId,
        type: 'driver',
        operation: 'update',
        data: { assignedCarId: null, status: 'On Leave' },
        timestamp: Date.now()
      });
    }

    if (newDriverId) {
      stateManager.addToTransaction(transactionId, {
        id: newDriverId,
        type: 'driver',
        operation: 'update',
        data: { assignedCarId: carId, status: 'Active' },
        timestamp: Date.now()
      });
    }

    stateManager.addToTransaction(transactionId, {
      id: carId,
      type: 'car',
      operation: 'update',
      data: { status: newDriverId ? 'Assigned' : 'Available' },
      timestamp: Date.now()
    });

    // Apply updates
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

    // Commit transaction
    const success = await stateManager.commitTransaction(transactionId, async (updates) => {
      if (persistFn) {
        await persistFn(updatedCars, updatedDrivers);
      }
    });

    return { cars: updatedCars, drivers: updatedDrivers, success };

  } catch (error) {
    errorHandler.logError(error as Error, 'Car driver assignment transaction failed');
    return { cars, drivers, success: false };
  }
}

// Batch update multiple entities atomically
export async function batchUpdate<T>(
  items: T[],
  updates: Array<{ id: string; changes: Partial<T> }>,
  persistFn?: (items: T[]) => Promise<void>
): Promise<{ items: T[]; success: boolean }> {
  
  const transactionId = stateManager.beginTransaction();
  
  try {
    // Add all updates to transaction
    updates.forEach(update => {
      stateManager.addToTransaction(transactionId, {
        id: update.id,
        type: 'batch',
        operation: 'update',
        data: update.changes,
        timestamp: Date.now()
      });
    });

    // Apply updates
    const updatedItems = items.map(item => {
      const update = updates.find(u => (item as any).id === u.id);
      return update ? { ...item, ...update.changes } : item;
    });

    // Commit transaction
    const success = await stateManager.commitTransaction(transactionId, async () => {
      if (persistFn) {
        await persistFn(updatedItems);
      }
    });

    return { items: updatedItems, success };

  } catch (error) {
    errorHandler.logError(error as Error, 'Batch update transaction failed');
    return { items, success: false };
  }
}