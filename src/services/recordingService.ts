import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, getBytes, deleteObject } from 'firebase/storage';
import { app } from '../firebase/config';

const db = getFirestore(app);
const storage = getStorage(app);

export interface Recording {
  id: string;
  name: string;
  timestamp: string;
  storagePath: string;
  userId: string;
  feedback?: string;
}

export const recordingService = {
  async loadRecordings(userId: string): Promise<Recording[]> {
    const recordingsRef = collection(db, 'recordings');
    const q = query(
      recordingsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Recording));
  },

  async saveRecording(userId: string, blob: Blob, name: string): Promise<void> {
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `recordings/${userId}/${Date.now()}_${sanitizedName}.wav`;
    
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);

    const recordingsRef = collection(db, 'recordings');
    await addDoc(recordingsRef, {
      userId,
      storagePath,
      timestamp: new Date().toISOString(),
      name
    });
  },

  async deleteRecording(recordingId: string, storagePath: string): Promise<void> {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    const recordingRef = doc(db, 'recordings', recordingId);
    await deleteDoc(recordingRef);
  },

  async getAudioUrl(storagePath: string | null): Promise<string> {
    if (!storagePath) {
      throw new Error('Invalid storage path');
    }
    const audioRef = ref(storage, storagePath);
    return await getDownloadURL(audioRef);
  },

  async getAudioBytes(storagePath: string): Promise<Uint8Array> {
    const audioRef = ref(storage, storagePath);
    const arrayBuffer = await getBytes(audioRef);
    return new Uint8Array(arrayBuffer);
  },

  async updateFeedback(recordingId: string, feedback: string): Promise<void> {
    const recordingRef = doc(db, 'recordings', recordingId);
    await updateDoc(recordingRef, { feedback });
  }
}; 