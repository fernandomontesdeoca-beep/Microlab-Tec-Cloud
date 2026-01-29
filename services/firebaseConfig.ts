
// OFFLINE / INDEXEDDB ADAPTER
// High-performance offline database replacing Firebase

const DB_NAME = 'microlab_db';
const DB_VERSION = 1;
const COLLECTIONS = ['tickets', 'inventory', 'contacts', 'settings'];

const listeners: { [key: string]: Array<(data: any[]) => void> } = {};

// --- HELPER: OPEN DATABASE ---
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", request.error);
            reject(request.error);
        };

        request.onsuccess = (event) => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            // Create object stores for each collection if they don't exist
            COLLECTIONS.forEach(col => {
                if (!db.objectStoreNames.contains(col)) {
                    db.createObjectStore(col, { keyPath: 'id' });
                }
            });
        };
    });
};

// --- HELPER: NOTIFY LISTENERS ---
const notifyListeners = async (collectionName: string) => {
    if (!listeners[collectionName] || listeners[collectionName].length === 0) return;

    try {
        const db = await openDB();
        const transaction = db.transaction(collectionName, 'readonly');
        const store = transaction.objectStore(collectionName);
        const request = store.getAll();

        request.onsuccess = () => {
            const data = request.result;
            listeners[collectionName].forEach(callback => callback(data));
        };
    } catch (e) {
        console.error(`Error notifying listeners for ${collectionName}:`, e);
    }
};

// --- API COMPATIBLE (MOCK AUTH) ---

export const auth = null;
export const loginWithGoogle = async () => { console.log("Auth disabled"); return { user: { uid: 'local', displayName: 'Local User' } }; };
export const logout = async () => { console.log("Logout disabled"); };
export const onAuthChange = (callback: (user: any) => void) => {
    callback({
        uid: 'local-tech',
        displayName: 'Técnico de Campo',
        email: 'local@microlab.app',
        photoURL: null
    });
    return () => {};
};

// --- DATABASE FUNCTIONS (INDEXEDDB IMPLEMENTATION) ---

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
    // 1. Register listener
    if (!listeners[collectionName]) {
        listeners[collectionName] = [];
    }
    listeners[collectionName].push(callback);

    // 2. Fetch initial data asynchronously
    openDB().then(db => {
        if (!db.objectStoreNames.contains(collectionName)) return; // Guard clause
        
        const transaction = db.transaction(collectionName, 'readonly');
        const store = transaction.objectStore(collectionName);
        const request = store.getAll();

        request.onsuccess = () => {
            callback(request.result);
        };
    }).catch(console.error);

    // 3. Return unsubscribe function
    return () => {
        listeners[collectionName] = listeners[collectionName].filter(cb => cb !== callback);
    };
};

export const addData = async (collectionName: string, data: any) => {
    const db = await openDB();
    
    // Generate ID if missing
    const id = data.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
    const item = { ...data, id };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);
        const request = store.add(item);

        request.onsuccess = () => {
            notifyListeners(collectionName);
            resolve({ id });
        };

        request.onerror = () => reject(request.error);
    });
};

export const updateData = async (collectionName: string, id: string, data: any) => {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);
        
        // First get the existing item to merge
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (existing) {
                const updated = { ...existing, ...data };
                const putRequest = store.put(updated);
                
                putRequest.onsuccess = () => {
                    notifyListeners(collectionName);
                    resolve(true);
                };
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error("Document not found"));
            }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const setData = async (collectionName: string, id: string, data: any) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);
        const item = { ...data, id };
        
        // Put creates or overwrites
        const request = store.put(item);

        request.onsuccess = () => {
            notifyListeners(collectionName);
            resolve(true);
        };

        request.onerror = () => reject(request.error);
    });
};

export const deleteData = async (collectionName: string, id: string) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);
        const request = store.delete(id);

        request.onsuccess = () => {
            notifyListeners(collectionName);
            resolve(true);
        };

        request.onerror = () => reject(request.error);
    });
};

export const importDataBatch = async (collectionName: string, newItems: any[]) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);
        
        let processedCount = 0;
        let errorOccurred = false;

        newItems.forEach(item => {
            const id = item.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
            const request = store.put({ ...item, id });
            
            request.onsuccess = () => {
                processedCount++;
                if (processedCount === newItems.length) {
                    notifyListeners(collectionName);
                    resolve(true);
                }
            };
            
            request.onerror = () => {
                if (!errorOccurred) {
                    errorOccurred = true;
                    reject(request.error);
                }
            };
        });

        if (newItems.length === 0) resolve(true);
    });
};

export const clearCollectionData = async (collectionName: string) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);
        const request = store.clear();

        request.onsuccess = () => {
            notifyListeners(collectionName);
            resolve(true);
        };

        request.onerror = () => reject(request.error);
    });
};

// No-op for config helpers
export const saveFirebaseConfig = (config: string) => { console.log("Saving config (no-op):", config); };
export const hasCustomConfig = () => true;
export const resetFirebaseConfig = () => {};
