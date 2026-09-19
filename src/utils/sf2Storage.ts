// IndexedDB SoundFont Persistence Utility
// Allows large SoundFont 2 banks (50MB - 300MB) to persist in the browser
// so the user does not need to reload their SF2 file on every session.

const DB_NAME = 'AIS_SoundFont_DB';
const DB_VERSION = 1;
const STORE_NAME = 'soundfonts';
const ACTIVE_KEY = 'active_bank';

interface StoredSoundFontRecord {
  id: string;
  fileName: string;
  bankName: string;
  fileSize: number;
  buffer: ArrayBuffer;
  savedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an active SoundFont ArrayBuffer and info into IndexedDB
 */
export async function saveSoundFontToIndexedDB(
  fileName: string,
  bankName: string,
  buffer: ArrayBuffer
): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredSoundFontRecord = {
        id: ACTIVE_KEY,
        fileName,
        bankName,
        fileSize: buffer.byteLength,
        buffer,
        savedAt: Date.now(),
      };

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (err) {
    console.warn('[sf2Storage] Could not save SoundFont to IndexedDB:', err);
    return false;
  }
}

/**
 * Load cached SoundFont from IndexedDB
 */
export async function loadSoundFontFromIndexedDB(): Promise<{
  fileName: string;
  bankName: string;
  buffer: ArrayBuffer;
} | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(ACTIVE_KEY);

      getReq.onsuccess = () => {
        const result = getReq.result as StoredSoundFontRecord | undefined;
        if (result && result.buffer) {
          resolve({
            fileName: result.fileName,
            bankName: result.bankName,
            buffer: result.buffer,
          });
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('[sf2Storage] Could not load SoundFont from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear cached SoundFont from IndexedDB
 */
export async function clearSoundFontFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(ACTIVE_KEY);
      delReq.onsuccess = () => resolve(true);
      delReq.onerror = () => reject(delReq.error);
    });
  } catch (err) {
    console.warn('[sf2Storage] Could not clear SoundFont from IndexedDB:', err);
    return false;
  }
}
