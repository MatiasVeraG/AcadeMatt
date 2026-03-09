/**
 * Run this AFTER creating the Firebase Storage bucket in the Firebase Console.
 * Usage: node server/set-cors.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('./academatt-firebase-adminsdk-fbsvc-85e197442c.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'academatt.firebasestorage.app',
});

const bucket = admin.storage().bucket();

bucket
  .setCorsConfiguration([
    {
      origin: [
        'https://acade-matt.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
      ],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      maxAgeSeconds: 3600,
      responseHeader: [
        'Content-Type',
        'Content-Range',
        'Content-Disposition',
        'Access-Control-Allow-Origin',
        'X-Goog-Upload-Protocol',
        'X-Goog-Upload-Status',
        'X-Goog-Upload-Url',
        'X-Goog-Upload-Chunk-Granularity',
        'X-Goog-Upload-Control-URL',
      ],
    },
  ])
  .then(() => {
    console.log('✅ CORS configured successfully on academatt.firebasestorage.app');
    return bucket.getCorsConfiguration();
  })
  .then((cors) => console.log('Current CORS config:', JSON.stringify(cors, null, 2)))
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
