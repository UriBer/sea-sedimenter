import type { MeasurementHistoryEntry } from '../types';

const STORAGE_KEY = 'sea-sedimenter-history';
const MAX_HISTORY_ENTRIES = 100;

/**
 * Storage utility for measurement history
 */
export class HistoryStorage {
  /**
   * Save a measurement to history
   */
  static save(entry: Omit<MeasurementHistoryEntry, 'id' | 'timestamp' | 'dateTime'>): MeasurementHistoryEntry {
    const history = this.getAll();
    
    const newEntry: MeasurementHistoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
      dateTime: new Date().toLocaleString(),
    };

    history.unshift(newEntry); // Add to beginning
    
    // Keep only the most recent entries
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.splice(MAX_HISTORY_ENTRIES);
    }

    this.saveAll(history);
    return newEntry;
  }

  /**
   * Get all history entries
   */
  static getAll(): MeasurementHistoryEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error reading history from storage:', error);
      return [];
    }
  }

  /**
   * Save all history entries
   */
  private static saveAll(history: MeasurementHistoryEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving history to storage:', error);
      // If storage is full, try to clear old entries
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const reduced = history.slice(0, Math.floor(history.length / 2));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
        } catch (e) {
          console.error('Failed to save reduced history:', e);
        }
      }
    }
  }

  /**
   * Delete a history entry by ID
   */
  static delete(id: string): void {
    const history = this.getAll();
    const filtered = history.filter(entry => entry.id !== id);
    this.saveAll(filtered);
  }

  /**
   * Clear all history
   */
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Generate a unique ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get next batch number (auto-increment based on today's date)
   */
  static getNextBatchNumber(): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const history = this.getAll();
    
    // Find entries from today
    const todayEntries = history.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
    });

    // Get the highest batch number for today
    let maxNum = 0;
    todayEntries.forEach(entry => {
      // Try to match format YYYYMMDD-### or just extract number suffix
      const match = entry.batchNumber.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      } else {
        // If format doesn't match, try to extract any trailing number
        const numMatch = entry.batchNumber.match(/(\d+)$/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    return `${dateStr}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  /**
   * Increment batch number (extract number and increment)
   */
  static incrementBatchNumber(currentBatch: string): string {
    if (!currentBatch || currentBatch.trim() === '') {
      return this.getNextBatchNumber();
    }

    // Try to match format YYYYMMDD-### and increment
    const match = currentBatch.match(/^(.+?)-(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      const padded = String(num + 1).padStart(match[2].length, '0');
      return `${prefix}-${padded}`;
    }

    // Try to extract trailing number and increment
    const numMatch = currentBatch.match(/^(.+?)(\d+)$/);
    if (numMatch) {
      const prefix = numMatch[1];
      const num = parseInt(numMatch[2], 10);
      const padded = String(num + 1).padStart(numMatch[2].length, '0');
      return `${prefix}${padded}`;
    }

    // If no number found, append -001
    return `${currentBatch}-001`;
  }
}

