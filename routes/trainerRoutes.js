const express = require('express');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const {
  getAllTrainers,
  getTrainer,
  updateTrainerProfile,
  getTrainerSchedule,
  getAvailableTimeslots,
  updateTimeslotAvailability,
  getTrainerAppointments,

} = require('../controller/trainerController');

const router = express.Router();

router.post('/all', authenticateFirebaseToken, getAllTrainers); // Get all trainers
router.get('/:trainerUid', getTrainer); // Get a trainer
router.put('/update', authenticateFirebaseToken, updateTrainerProfile); // Update a trainer's profile
router.get('/schedule/:trainerUid', authenticateFirebaseToken, getTrainerSchedule); // Get a trainer's schedule
router.get('/appointments/:trainerUid', authenticateFirebaseToken, getTrainerAppointments); // Get all appointments for a trainer
router.post('/timeslots/:trainerUid', authenticateFirebaseToken ,getAvailableTimeslots); // Get available timeslots for a trainer
router.patch('/schedules/update', authenticateFirebaseToken ,updateTimeslotAvailability); // Update timeslot availability

module.exports = router;
