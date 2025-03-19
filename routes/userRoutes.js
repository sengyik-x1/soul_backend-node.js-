const express = require('express');
const { registerUser, registerFCMToken, getAllUsers, getUserRole } = require('../controller/userController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Secure routes with Firebase token authentication
router.post('/register', authenticateFirebaseToken,  registerUser);
router.post('/registerFCMToken', authenticateFirebaseToken, registerFCMToken);
router.get('/',  authenticateFirebaseToken, getAllUsers);
router.get('/role', authenticateFirebaseToken, getUserRole);
module.exports = router;
