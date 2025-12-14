/**
 * Lightweight Firebase Admin initialization for server-only code.
 * 
 * Uses service account credentials supplied via environment variables:
 * - FIREBASE_ADMIN_PROJECT_ID
 * - FIREBASE_ADMIN_CLIENT_EMAIL
 * - FIREBASE_ADMIN_PRIVATE_KEY (with \n escaped)
 */

import { initializeApp, getApps, applicationDefault, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;

  const serviceAccount = getServiceAccount();
  if (getApps().length === 0) {
    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });
    } else {
      // Fallback to application default credentials if available
      app = initializeApp({
        credential: applicationDefault(),
      });
    }
  } else {
    app = getApps()[0];
  }

  return app!;
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
