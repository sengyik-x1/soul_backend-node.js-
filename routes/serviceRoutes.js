const express = require('express');
const { getServiceID, getAllServices } = require('../controller/serviceController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Secure routes with Firebase token authentication
router.post('/all',authenticateFirebaseToken,  getAllServices);
router.get('/:name',authenticateFirebaseToken, getServiceID);
// router.get('/role', authenticateFirebaseToken, getUserRole);
module.exports = router;
