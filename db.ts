import { HarvestEntry, HarvestSettings } from './types';

const DB_NAME = 'ShrimpHarvestDB';
const DB_VERSION = 12;
const STORE_NAME = 'harvest_entries';
const SETTINGS_KEY = 'harvest_settings';

export class DBService {
  private static instance: IDBDatabase | null = null;
  private static dbPromise: Promise<IDBDatabase> | null = null;

  static generateId(): string {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }

  static async requestPersistence() {
    if (navigator.storage && (navigator.storage as any).persist) {
      try {
        const isPersisted = await (navigator.storage as any).persist();
        console.log(`Storage persistence ${isPersisted ? 'granted' : 'denied'}`);
        return isPersisted;
      } catch (err) {
        console.warn('Storage persistence request failed:', err);
        return false;
      }
    }
    return false;
  }

  private static async getDB(): Promise<IDBDatabase> {
    if (this.instance) return this.instance;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // if needed, add indexes here, e.g. store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.instance = (event.target as IDBOpenDBRequest).result;
        this.dbPromise = null;

        // handle version changes from other contexts
        this.instance.onversionchange = () => {
          try {
            this.instance?.close();
          } catch (e) {
            // ignore
          }
          this.instance = null;
          window.location.reload();
        };

        resolve(this.instance);
      };

      request.onblocked = () => {
        console.warn('Database opening blocked. Please close other tabs.');
      };

      request.onerror = (event) => {
        this.dbPromise = null;
        console.error('IndexedDB Error:', (event.target as IDBOpenDBRequest).error);
        reject(new Error('Database connection failed'));
      };
    });

    return this.dbPromise;
  }

  // Save or update a single entry
  static async saveEntry(entry: HarvestEntry): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Get all entries (descending by timestamp if possible)
  static async getAllEntries(): Promise<HarvestEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const request = store.getAll();
        request.onsuccess = () => {
          const result = request.result as HarvestEntry[] || [];
          // Optionally sort by timestamp descending:
          result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Count of entries
  static async getCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Delete single entry
  static async deleteEntry(id: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Delete multiple entries in a single transaction
  static async deleteEntries(ids: string[]): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Get unsynced entries
  static async getUnsyncedEntries(): Promise<HarvestEntry[]> {
    const all = await this.getAllEntries();
    return all.filter(e => !e.synced);
  }

  // Mark entries as synced
  static async markEntriesSynced(ids: string[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        ids.forEach(id => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const entry = getReq.result as HarvestEntry | undefined;
            if (entry) {
              entry.synced = true;
              store.put(entry);
            }
          };
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Save settings (persist to localStorage)
  static saveSettings(settings: HarvestSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save settings to localStorage:', err);
    }
  }

  // Get settings synchronously (returns sensible defaults if not present)
  static getSettings(): HarvestSettings {
    const defaults: HarvestSettings = {
      activeTank: 'Tank 1',
      shrimpCount: 100,
      tankCounts: {},
      tankPrices: {},
      crateWeight: 10,
      teamName: 'Team'
    };

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        // persist defaults so app gets consistent shape
        this.saveSettings(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw) as Partial<HarvestSettings> | null;
      if (!parsed) return defaults;
      return {
        activeTank: parsed.activeTank || defaults.activeTank,
        shrimpCount: parsed.shrimpCount ?? defaults.shrimpCount,
        tankCounts: parsed.tankCounts || {},
        tankPrices: parsed.tankPrices || {},
        crateWeight: parsed.crateWeight ?? defaults.crateWeight,
        teamName: parsed.teamName || defaults.teamName
      };
    } catch (err) {
      console.warn('Failed to parse settings, using defaults:', err);
      return defaults;
    }
  }

  // Delete entire DB + settings (nuclear reset)
  static async nuclearReset(): Promise<void> {
    // Clear localStorage settings
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch (e) {
      console.warn('Failed to remove settings from localStorage:', e);
    }

    // Close and delete the DB
    if (this.instance) {
      try {
        this.instance.close();
      } catch (e) {
        /* ignore */
      }
      this.instance = null;
    }

    return new Promise<void>((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(DB_NAME);
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => reject(deleteReq.error);
      deleteReq.onblocked = () => {
        console.warn('Database deletion blocked. Please close other tabs.');
      };
    });
  }
}