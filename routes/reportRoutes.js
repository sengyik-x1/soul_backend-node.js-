const express = require('express');
const { trainerInsertReport, trainerGetAllReports, getClientMonthlyTrainingVolume, getAllReportsByClient} = require('../controller/reportController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/insert', authenticateFirebaseToken, trainerInsertReport);
router.get('/trainer/:trainerUid', authenticateFirebaseToken, trainerGetAllReports); // reports/trainer/:trainerUid
router.get('/client/:clientUid/monthly-training-volume', authenticateFirebaseToken, getClientMonthlyTrainingVolume);
router.get('/client/:clientUid', authenticateFirebaseToken, getAllReportsByClient); // reports/client/:clientUid/all-reports

module.exports = router;