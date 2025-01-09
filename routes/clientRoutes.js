const express = require('express');
const { getClientDetails, updateClientDetails } = require('../controller/clientController');
const authenticateFirebaseToken = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/:client_uid', authenticateFirebaseToken, getClientDetails);
router.put('/update/:client_uid', authenticateFirebaseToken, updateClientDetails);

module.exports = router;