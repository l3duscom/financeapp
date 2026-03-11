import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './firebase';
import { addDoc, collection, getDocs, query, where, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// ===== Types =====

export interface Invoice {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  fileSize: number;
  fileType: string;
  cardName: string;
  month: number;
  year: number;
  uploadedAt: Date;
}

// ===== Upload =====

export function uploadInvoiceFile(
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; storagePath: string }> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `invoices/${userId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, storagePath });
      }
    );
  });
}

// ===== Invoice CRUD =====

export async function saveInvoice(
  userId: string,
  data: Omit<Invoice, 'id' | 'userId' | 'uploadedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'invoices'), {
    ...data,
    userId,
    uploadedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const q = query(
    collection(db, 'invoices'),
    where('userId', '==', userId),
    orderBy('uploadedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    uploadedAt: d.data().uploadedAt?.toDate(),
  })) as Invoice[];
}

export async function deleteInvoice(invoiceId: string, storagePath: string): Promise<void> {
  // Delete from Storage
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  // Delete from Firestore
  await deleteDoc(doc(db, 'invoices', invoiceId));
}

// ===== Helpers =====

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isValidInvoiceFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Formato não suportado. Use PDF ou CSV.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande. Máximo 10MB.' };
  }

  return { valid: true };
}
