
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    setDoc, 
    writeBatch, 
    getDocs,
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from "firebase/firestore";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";

const CONFIG_KEY = 'firebase_config_json';

let app: any = null;
let db: any = null;
let auth: any = null;

// --- CONFIGURATION MANAGEMENT ---

const getStoredConfig = () => {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { return null; }
    }
    return null;
};

export const hasCustomConfig = () => !!getStoredConfig();

export const saveFirebaseConfig = (configStr: string) => {
    try {
        const config = JSON.parse(configStr);
        if (!config.apiKey || !config.projectId) throw new Error("Configuración inválida");
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        window.location.reload();
    } catch (e) {
        throw new Error("El texto ingresado no es un JSON válido de Firebase.");
    }
};

export const resetFirebaseConfig = () => {
    localStorage.removeItem(CONFIG_KEY);
    window.location.reload();
};

// --- INITIALIZATION ---

const initFirebase = () => {
    if (getApps().length > 0) {
        app = getApp();
        db = getFirestore(app);
        auth = getAuth(app);
        return;
    }

    const config = getStoredConfig();
    if (config) {
        try {
            app = initializeApp(config);
            // Initialize Firestore with Offline Persistence (Modern SDK)
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
            auth = getAuth(app);
            console.log("🔥 Firebase initialized with Offline Persistence");
        } catch (e) {
            console.error("Firebase init error:", e);
            localStorage.removeItem(CONFIG_KEY); // Clear bad config
        }
    }
};

initFirebase();

// --- AUTHENTICATION ---

export { auth };

export const loginWithGoogle = async () => {
    if (!auth) {
        // Throw specific error to trigger config modal in Login.tsx
        const e: any = new Error("Firebase not configured");
        e.code = 'auth/configuration-not-found';
        throw e;
    }
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};

export const logout = async () => {
    if (auth) await signOut(auth);
};

export const onAuthChange = (callback: (user: any) => void) => {
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

// --- DATABASE OPERATIONS ---

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
    if (!db) return () => {};
    
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, 
        (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(data);
        },
        (error) => {
            console.error(`Error subscribing to ${collectionName}:`, error);
            // Fallback for permissions errors or offline sync issues
        }
    );
    return unsubscribe;
};

export const addData = async (collectionName: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    // If data has an ID, use setDoc, otherwise addDoc
    if (data.id && typeof data.id === 'string') {
        await setDoc(doc(db, collectionName, data.id), data);
        return { id: data.id };
    } else {
        const docRef = await addDoc(collection(db, collectionName), data);
        return { id: docRef.id };
    }
};

export const updateData = async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
};

export const setData = async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge: true });
};

export const deleteData = async (collectionName: string, id: string) => {
    if (!db) throw new Error("Database not initialized");
    await deleteDoc(doc(db, collectionName, id));
};

export const importDataBatch = async (collectionName: string, newItems: any[]) => {
    if (!db) throw new Error("Database not initialized");
    const batch = writeBatch(db);
    
    newItems.forEach(item => {
        const id = item.id || doc(collection(db, collectionName)).id;
        const docRef = doc(db, collectionName, String(id));
        batch.set(docRef, { ...item, id }, { merge: true });
    });

    await batch.commit();
};

export const clearCollectionData = async (collectionName: string) => {
    if (!db) throw new Error("Database not initialized");
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};
