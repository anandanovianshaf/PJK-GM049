const express = require('express');
const router = express.Router();
const { getJabarulinRecommendation } = require('../controllers/recommendationController');

// Endpoint untuk frontend (misal aplikasi mobile atau web)
router.post('/recommend', getJabarulinRecommendation);

module.exports = router;
