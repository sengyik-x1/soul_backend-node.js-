const express = require('express');
const {  getAllMemberships, createMembership, updateMembership, deleteMembership } = require ('../controller/membershipController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/', getAllMemberships);
router.post('/create', authenticateFirebaseToken,  createMembership);
router.put('/update/:id', authenticateFirebaseToken, updateMembership);
router.delete('/delete/:id', authenticateFirebaseToken, deleteMembership);

module.exports = router;