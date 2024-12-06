const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Middleware to verify Firebase ID token
const authenticateFirebaseToken = async (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Bearer token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
    console.log('No token provided');
  }

  try {
    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Add decoded user info to the request object
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error.message);
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

module.exports = authenticateFirebaseToken;
