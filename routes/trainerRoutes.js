const express = require('express');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const {
  getAllTrainers,
  getAvailableTimeslots,
  updateTimeslotAvailability,
} = require('../controller/trainerController');

const router = express.Router();

router.post('/', getAllTrainers); // Get all trainers
router.post('/timeslots/:trainerId', authenticateFirebaseToken ,getAvailableTimeslots); // Get available timeslots for a trainer
router.patch('/timeslots/update', authenticateFirebaseToken ,updateTimeslotAvailability); // Update timeslot availability

module.exports = router;
