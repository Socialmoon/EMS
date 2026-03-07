import admin from "firebase-admin";

// Singleton — prevents re-initialization on Next.js hot reload
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // During development, log a clear message instead of crashing.
    // Admin SDK features (session cookies, user management) will be unavailable
    // until you add your service account credentials to .env.local.
    console.warn(
      "[firebase-admin] Missing service account credentials.\n" +
      "Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.local.\n" +
      "Firebase Console → Project Settings → Service Accounts → Generate new private key"
    );
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;
export default admin;
