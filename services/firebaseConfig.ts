
// --- INDEXED DB IMPLEMENTATION ---
// Replaces Firebase Firestore with local Native IndexedDB
// Keeps the same API signature so UI components don't break.

const DB_NAME = 'MicrolabDB';
const DB_VERSION = 1;
const COLLECTIONS = ['tickets', 'inventory', 'contacts', 'settings'];

let dbPromise: Promise<IDBDatabase> | null = null;
const listeners: Record<string, Function[]> = {};

// Helper: Notify subscribers when data changes
const notify = async (collectionName: string) => {
    if (!listeners[collectionName]) return;
    const data = await getAll(collectionName);
    listeners[collectionName].forEach(cb => cb(data));
};

// Initialize DB
const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            COLLECTIONS.forEach(col => {
                if (!db.objectStoreNames.contains(col)) {
                    db.createObjectStore(col, { keyPath: 'id' });
                }
            });
        };
        
        request.onsuccess = (e: any) => {
            console.log("💾 IndexedDB Initialized");
            resolve(e.target.result);
        };
        
        request.onerror = (e) => reject(e);
    });
    return dbPromise;
};

// Generic Actions
const getAll = async (collectionName: string) => {
    const db = await initDB();
    return new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction(collectionName, 'readonly');
        const store = tx.objectStore(collectionName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

// --- API EXPORTS (Matching Firebase Interface) ---

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
    if (!listeners[collectionName]) listeners[collectionName] = [];
    listeners[collectionName].push(callback);
    
    // Initial fetch
    getAll(collectionName).then(callback);
    
    return () => {
        listeners[collectionName] = listeners[collectionName].filter(cb => cb !== callback);
    };
};

export const addData = async (collectionName: string, data: any) => {
    const db = await initDB();
    const id = data.id ? String(data.id) : String(Date.now() + Math.random().toString().slice(2, 6));
    const item = { ...data, id };
    
    return new Promise<{id: string}>((resolve, reject) => {
        const tx = db.transaction(collectionName, 'readwrite');
        const store = tx.objectStore(collectionName);
        store.put(item); // Put handles both insert and update if key exists
        tx.oncomplete = () => {
            notify(collectionName);
            resolve({ id });
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const updateData = async (collectionName: string, id: string, data: any) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(collectionName, 'readwrite');
        const store = tx.objectStore(collectionName);
        
        // Need to get first to merge
        const getReq = store.get(String(id));
        getReq.onsuccess = () => {
            const existing = getReq.result;
            if (existing) {
                store.put({ ...existing, ...data });
            } else {
                // If it doesn't exist, create it (fallback)
                store.put({ id: String(id), ...data });
            }
        };

        tx.oncomplete = () => {
            notify(collectionName);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const setData = async (collectionName: string, id: string, data: any) => {
    // In IDB setData and addData are similar due to 'put', but let's be explicit
    return addData(collectionName, { ...data, id });
};

export const deleteData = async (collectionName: string, id: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(collectionName, 'readwrite');
        const store = tx.objectStore(collectionName);
        store.delete(String(id));
        tx.oncomplete = () => {
            notify(collectionName);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const importDataBatch = async (collectionName: string, newItems: any[]) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(collectionName, 'readwrite');
        const store = tx.objectStore(collectionName);
        
        newItems.forEach(item => {
             const id = item.id ? String(item.id) : String(Date.now() + Math.random());
             store.put({ ...item, id });
        });

        tx.oncomplete = () => {
            notify(collectionName);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const clearCollectionData = async (collectionName: string) => {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(collectionName, 'readwrite');
        const store = tx.objectStore(collectionName);
        store.clear();
        tx.oncomplete = () => {
            notify(collectionName);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
};

// --- MOCKS FOR AUTH / CONFIG (Since we removed Firebase Auth) ---

export const auth = null;
export const loginWithGoogle = async () => {};
export const logout = async () => {};
// Auto-login as local user
export const onAuthChange = (callback: (user: any) => void) => {
    setTimeout(() => {
        callback({ uid: 'local-idb', displayName: 'Usuario Local', email: 'local@device' });
    }, 100);
    return () => {};
};
export const hasCustomConfig = () => false;
export const saveFirebaseConfig = () => {};
export const resetFirebaseConfig = () => {};
