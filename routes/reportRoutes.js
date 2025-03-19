const express = require('express');
const { trainerInsertReport, trainerGetAllReports, getClientMonthlyTrainingVolume} = require('../controller/reportController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/insert', authenticateFirebaseToken, trainerInsertReport);
router.get('/trainer/:trainerUid', authenticateFirebaseToken, trainerGetAllReports); // reports/trainer/:trainerUid
router.get('/client/:clientUid/monthly-training-volume', authenticateFirebaseToken, getClientMonthlyTrainingVolume);

module.exports = router;