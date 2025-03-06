const express = require('express');
const {
  createAppointment,
  confirmAppointment,
  rejectAppointment,
  getAllAppointments,
  getAppointmentsByTrainer,
  updateAppointmentStatus,
  validateQRCode,
} = require('../controller/appmtController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Secure routes with Firebase token authentication
router.post('/create', authenticateFirebaseToken, createAppointment);
router.post('/validate-qr', authenticateFirebaseToken, validateQRCode);
router.put('/:appointmentId/confirm', authenticateFirebaseToken, confirmAppointment);
router.put('/:appointmentId/reject', authenticateFirebaseToken, rejectAppointment);
router.get('/', authenticateFirebaseToken, getAllAppointments);
router.get('/trainer/:trainerId', authenticateFirebaseToken, getAppointmentsByTrainer);
router.put('/:appointmentId/status', authenticateFirebaseToken, updateAppointmentStatus);

module.exports = router;
