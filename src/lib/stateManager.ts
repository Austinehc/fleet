/**
 * Secure State Management with Race Condition Prevention
 * Fixes architectural issue: Race Conditions in State Management
 */

import { errorHandler, FleetError } from './errorHandling';

interface StateUpdate {
  id: string;
  timestamp: number;
  type: 'car' | 'driver';
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
}

interface TransactionState {
  id: string;
  updates: StateUpdate[];
  status: 'pending' | 'committed' | 'aborted';
  timestamp: number;
}

class SecureStateManager {
  private transactions: Map<string, TransactionState> = new Map();
  private locks: Set<string> = new Set();
  private lastSyncTimestamps: Map<string, number> = new Map();
  private writeOperationsInFlight = 0;
  private maxConcurrentWrites = 3;
  
  // Prevent race conditions with optimistic locking
  async acquireLock(resourceId: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (this.locks.has(resourceId)) {
      if (Date.now() - startTime > timeout) {
        throw new FleetError(
          'Resource lock timeout',
          'LOCK_TIMEOUT',
          'high',
          { resourceId, timeout }
        );
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.locks.add(resourceId);
    return true;
  }
  
  releaseLock(resourceId: string): void {
    this.locks.delete(resourceId);
  }
  
  // Create atomic transaction
  createTransaction(): string {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.transactions.set(transactionId, {
      id: transactionId,
      updates: [],
      status: 'pending',
      timestamp: Date.now()
    });
    return transactionId;
  }
  
  // Add update to transaction with conflict detection
  addToTransaction(transactionId: string, update: StateUpdate): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'pending') {
      return false;
    }
    
    // Check for locks
    if (this.locks.has(update.id)) {
      throw new FleetError(
        `Resource ${update.id} is locked by another operation`,
        'RESOURCE_LOCKED',
        'medium',
        { resourceId: update.id, transactionId }
      );
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
    
    // Check concurrent write limits
    if (this.writeOperationsInFlight >= this.maxConcurrentWrites) {
      throw new FleetError(
        'Too many concurrent write operations',
        'WRITE_LIMIT_EXCEEDED',
        'medium',
        { current: this.writeOperationsInFlight, max: this.maxConcurrentWrites }
      );
    }
    
    // Lock all resources
    const lockedResources = new Set<string>();
    try {
      for (const update of transaction.updates) {
        if (this.locks.has(update.id)) {
          throw new FleetError(
            `Resource ${update.id} is locked`,
            'RESOURCE_LOCKED',
            'medium',
            { resourceId: update.id }
          );
        }
        this.locks.add(update.id);
        lockedResources.add(update.id);
      }
      
      // Increment write operations counter
      this.writeOperationsInFlight++;
      
      // Execute all updates
      await executeUpdates(transaction.updates);
      
      // Mark transaction as committed
      transaction.status = 'committed';
      
      // Update sync timestamps
      for (const update of transaction.updates) {
        this.lastSyncTimestamps.set(update.id, Date.now());
      }
      
      return true;
    } catch (error) {
      // Mark transaction as aborted
      transaction.status = 'aborted';
      
      errorHandler.logError(
        error as Error,
        `Transaction commit failed: ${transactionId}`
      );
      throw error;
    } finally {
      // Always release locks and decrement counter
      for (const resourceId of lockedResources) {
        this.locks.delete(resourceId);
      }
      this.writeOperationsInFlight--;
    }
  }
  
  // Abort transaction and release locks
  abortTransaction(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;
    
    transaction.status = 'aborted';
    
    // Release any locks held by this transaction
    for (const update of transaction.updates) {
      this.locks.delete(update.id);
    }
  }
  
  // Check if data has been synced recently to prevent redundant operations
  isRecentlySynced(resourceId: string, threshold: number = 5000): boolean {
    const lastSync = this.lastSyncTimestamps.get(resourceId);
    if (!lastSync) return false;
    return (Date.now() - lastSync) < threshold;
  }
  
  // Prevent concurrent writes to same resource
  async executeWithLock<T>(
    resourceId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.acquireLock(resourceId);
    
    try {
      return await operation();
    } finally {
      this.releaseLock(resourceId);
    }
  }
  
  // Get transaction status
  getTransactionStatus(transactionId: string): TransactionState | null {
    return this.transactions.get(transactionId) || null;
  }
  
  // Cleanup old transactions
  cleanupOldTransactions(maxAge: number = 300000): void { // 5 minutes
    const cutoff = Date.now() - maxAge;
    
    for (const [id, transaction] of this.transactions) {
      if (transaction.timestamp < cutoff) {
        // Ensure locks are released
        for (const update of transaction.updates) {
          this.locks.delete(update.id);
        }
        this.transactions.delete(id);
      }
    }
  }
  
  // Check for deadlocks
  detectDeadlocks(): string[] {
    const deadlocks: string[] = [];
    const lockAge = Date.now() - 30000; // 30 seconds
    
    for (const resourceId of this.locks) {
      const lastSync = this.lastSyncTimestamps.get(resourceId);
      if (lastSync && lastSync < lockAge) {
        deadlocks.push(resourceId);
        // Auto-release potentially deadlocked resources
        this.locks.delete(resourceId);
      }
    }
    
    return deadlocks;
  }
  
  // Get current state statistics
  getStats() {
    return {
      activeTransactions: Array.from(this.transactions.values()).filter(t => t.status === 'pending').length,
      activeLocks: this.locks.size,
      writeOperationsInFlight: this.writeOperationsInFlight,
      maxConcurrentWrites: this.maxConcurrentWrites,
      totalTransactions: this.transactions.size
    };
  }
}

// Singleton instance
export const stateManager = new SecureStateManager();

// Cleanup old transactions periodically
setInterval(() => {
  stateManager.cleanupOldTransactions();
  
  // Check for deadlocks
  const deadlocks = stateManager.detectDeadlocks();
  if (deadlocks.length > 0) {
    errorHandler.logError(
      new FleetError(
        'Deadlocks detected and resolved',
        'DEADLOCK_RESOLVED',
        'medium',
        { deadlockedResources: deadlocks }
      ),
      'State Manager'
    );
  }
}, 60000); // Every minute