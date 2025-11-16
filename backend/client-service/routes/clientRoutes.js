
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { verifyToken } = require('../middleware/authMiddleware');



router.get('/events', clientController.getEvents);
router.post('/events/:id/purchase', verifyToken, clientController.purchase);

router.post('/voice', clientController.handleVoiceInput);
router.post('/parse', clientController.parseText);
router.post('/confirm', verifyToken, clientController.confirmBooking);
router.get('/chat/init', clientController.initChat);
router.post('/chat', clientController.chatWithAI);

module.exports = router;

