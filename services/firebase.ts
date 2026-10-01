import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, doc, getDocFromServer, getDocs, collection, 
  setDoc, deleteDoc, onSnapshot, writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK with long-polling enabled to bypass iframe sandbox/proxy connection constraints
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operational Enums & Types for audit error logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Standard secure error handler as per system rules.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Secure Audit Error: ', JSON.stringify(errInfo));
  
  // Safe connection-tolerance fallback: Do not throw on temporary connection failure or network unreachable errors
  const errorMsg = errInfo.error.toLowerCase();
  if (
    errorMsg.includes('could not reach') || 
    errorMsg.includes('unavailable') || 
    errorMsg.includes('offline') || 
    errorMsg.includes('connection failed') ||
    errorMsg.includes('network')
  ) {
    console.warn("Firestore is operating in offline-caching mode. Changes will automatically sync when backend becomes reachable.");
    return;
  }

  throw new Error(JSON.stringify(errInfo));
}

/**
 * Secure testing function as per system rules.
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

testConnection();

/**
 * Recursively removes any keys with `undefined` values from an object or array,
 * making it 100% safe to write to Firestore (which throws on undefined values).
 */
export function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

// Highly robust and safe Firestore CRUD Helpers

/**
 * Save a document in Firestore with automatic error wrapping and undefined-value stripping.
 */
export async function dbSave(collectionName: string, docId: string, data: any): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const cleanedData = cleanUndefined(data);
    await setDoc(docRef, cleanedData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a document from Firestore with automatic error wrapping.
 */
export async function dbDelete(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seed a collection if it is completely empty.
 */
export async function dbSeedIfEmpty(collectionName: string, initialItems: any[]): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    if (querySnapshot.empty) {
      console.log(`Seeding Firestore collection: ${collectionName} with ${initialItems.length} default records...`);
      const batch = writeBatch(db);
      initialItems.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        const cleanedItem = cleanUndefined(item);
        batch.set(docRef, cleanedItem);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

/**
 * Real-time active listener on a collection.
 */
export function dbListen(collectionName: string, onUpdate: (items: any[]) => void): () => void {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}
