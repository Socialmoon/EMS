/**
 * One-time script to create the first admin user.
 * Run with: npx tsx scripts/seed-admin.ts
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npx tsx scripts/seed-admin.ts
 */
import admin from "firebase-admin";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Missing env vars. Check .env.local has FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Firebase Admin init failed:", msg);
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npx tsx scripts/seed-admin.ts");
    process.exit(1);
  }

  // Create user if they don't exist yet
  let user: admin.auth.UserRecord;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`ℹ️  User already exists (uid: ${user.uid}), updating role...`);
  } catch (lookupErr: unknown) {
    const lookupMsg = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
    console.log(`ℹ️  User not found (${lookupMsg}), creating...`);
    try {
      user = await auth.createUser({ email, password, displayName: "Admin" });
      console.log(`✅ Created Firebase Auth user (uid: ${user.uid})`);
    } catch (createErr: unknown) {
      const createMsg = createErr instanceof Error ? createErr.message : String(createErr);
      console.error("❌ createUser failed:", createMsg);
      process.exit(1);
    }
  }

  await auth.setCustomUserClaims(user.uid, { role: "admin" });

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? "Admin",
      role: "admin",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log(`✅ Admin role set for ${email}`);
  console.log("   You may now log in at http://localhost:3000/login");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
