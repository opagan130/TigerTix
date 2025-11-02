
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/events', clientController.getEvents);
router.post('/events/:id/purchase', clientController.purchase);

router.post('/parse', clientController.parseText);
router.post('/confirm', clientController.confirmBooking);
router.get('/chat/init', clientController.initChat);
router.post('/chat', clientController.chatWithAI);

module.exports = router;

