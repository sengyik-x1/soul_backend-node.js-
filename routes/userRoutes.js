const express = require('express');
const { registerUser, getAllUsers } = require('../controller/userController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Secure routes with Firebase token authentication
router.post('/register', authenticateFirebaseToken,  registerUser);
router.get('/',  authenticateFirebaseToken, getAllUsers);

module.exports = router;
