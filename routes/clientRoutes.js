const express = require('express');
const { createClient, getClientDetails, updateClientDetails, getClientAppointments, updateClientProfileUrl } = require('../controller/clientController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/registerClient', authenticateFirebaseToken, createClient);
router.get('/:client_uid', authenticateFirebaseToken, getClientDetails);
router.put('/update/:client_uid', authenticateFirebaseToken, updateClientDetails);
router.get('/:client_uid/appointments', authenticateFirebaseToken, getClientAppointments);
router.patch('/update-picture-url', authenticateFirebaseToken, updateClientProfileUrl);

module.exports = router;