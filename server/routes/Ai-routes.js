const express = require('express');
const router = express.Router();
const ai = require('../controllers/ai-controller');

router.post('/analyze', ai.analyze);
router.get('/routines', ai.getRoutines);
router.post('/chatbot', ai.chatbot);
router.get('/risk/trend', ai.getRiskTrend);

module.exports = router;
