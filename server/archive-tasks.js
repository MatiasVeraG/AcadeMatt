/**
 * archive-tasks.js
 *
 * Scheduled archiver for completed task files.
 *
 * What it does:
 *  1. Finds tareas docs where status == 'completed' and completedAt < (now - 7 days)
 *     (uses the parent conversation's completedAt field)
 *  2. Changes the Storage class of each file to ARCHIVE (~$0.0012/GB/month)
 *  3. Updates each tareas doc: { isArchived: true, filesAvailableForUser: false, archivedAt }
 *  4. Updates the conversation doc: { filesArchived: true }
 *
 * Storage Rules block alumni/tutors from downloading archived files;
 * admins can still access them.
 *
 * Usage:
 *   node server/archive-tasks.js          (run once manually)
 *   Set as a cron job / Railway scheduled task to run daily.
 */

const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// ── Init ────────────────────────────────────────────────────────────────────
// Supports two modes:
//   Production (Railway): set FIREBASE_SERVICE_ACCOUNT_JSON env var with the
//                         full JSON content of the service account key.
//   Local dev:            falls back to reading the JSON file directly.
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    // Railway sometimes double-escapes \n in private keys
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    process.exit(1);
  }
} else {
  serviceAccount = require('./academatt-firebase-adminsdk-fbsvc-85e197442c.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.STORAGE_BUCKET || 'academatt.firebasestorage.app',
});

const db = admin.firestore();
const gcsStorage = new Storage({ credentials: serviceAccount });
const bucket = gcsStorage.bucket(process.env.STORAGE_BUCKET || 'academatt.firebasestorage.app');

const ARCHIVE_AFTER_DAYS = parseInt(process.env.ARCHIVE_AFTER_DAYS || '7', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

// ── Helpers ──────────────────────────────────────────────────────────────────
const log = (...args) => console.log(new Date().toISOString(), ...args);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function changeStorageClass(storagePath) {
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    log(`  SKIP (not found in Storage): ${storagePath}`);
    return false;
  }
  if (DRY_RUN) {
    log(`  DRY_RUN — would archive: ${storagePath}`);
    return true;
  }
  await file.setStorageClass('archive');
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  log(`=== archive-tasks starting (dryRun=${DRY_RUN}, archiveAfterDays=${ARCHIVE_AFTER_DAYS}) ===`);

  const cutoff = daysAgo(ARCHIVE_AFTER_DAYS);

  // 1. Find completed conversations older than cutoff that haven't been archived yet
  const convsSnap = await db
    .collection('conversations')
    .where('status', '==', 'completed')
    .where('filesArchived', '!=', true)
    .get();

  if (convsSnap.empty) {
    log('No eligible conversations found. Exiting.');
    return;
  }

  let archivedConversations = 0;
  let archivedFiles = 0;
  let skipped = 0;

  for (const convDoc of convsSnap.docs) {
    const conv = convDoc.data();
    const completedAt = conv.completedAt ? new Date(conv.completedAt) : null;

    if (!completedAt || completedAt >= cutoff) {
      skipped++;
      continue;
    }

    const convId = convDoc.id;
    log(`Processing conversation ${convId} (completedAt: ${completedAt.toISOString()})`);

    // 2. Find all tareas for this conversation
    const tareasSnap = await db
      .collection('tareas')
      .where('conversationId', '==', convId)
      .where('isArchived', '!=', true)
      .get();

    if (tareasSnap.empty) {
      log(`  No tareas to archive for conversation ${convId}`);
    }

    const batch = db.batch();

    for (const tareaDoc of tareasSnap.docs) {
      const tarea = tareaDoc.data();
      const storagePath = tarea.storagePath;

      if (!storagePath) {
        log(`  SKIP tarea ${tareaDoc.id}: missing storagePath`);
        continue;
      }

      log(`  Archiving file: ${storagePath}`);
      const success = await changeStorageClass(storagePath);

      if (success) {
        batch.update(tareaDoc.ref, {
          isArchived: true,
          filesAvailableForUser: false,
          archivedAt: new Date().toISOString(),
        });
        archivedFiles++;
      }
    }

    // 3. Mark the conversation as archived
    if (!DRY_RUN) {
      batch.update(convDoc.ref, { filesArchived: true });
    }

    await batch.commit();
    archivedConversations++;
    log(`  ✅ Done conversation ${convId}`);
  }

  log(
    `=== Finished: ${archivedConversations} conversations, ` +
    `${archivedFiles} files archived, ${skipped} skipped (not old enough) ===`
  );
}

run().catch((err) => {
  console.error('archive-tasks FATAL:', err);
  process.exit(1);
});
