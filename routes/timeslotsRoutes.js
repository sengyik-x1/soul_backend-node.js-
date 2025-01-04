const express = require('express');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const {
  getAllTrainers,
  getAvailableTimeslots,
  updateTimeslotAvailability,
} = require('../controller/trainerController');

const router = express.Router();

router.get('/', authenticateFirebaseToken ,getAllTrainers); // Get all trainers
router.get('/:trainerId', authenticateFirebaseToken ,getAvailableTimeslots); // Get available timeslots for a trainer
router.patch('/update', authenticateFirebaseToken ,updateTimeslotAvailability); // Update timeslot availability

module.exports = router;
