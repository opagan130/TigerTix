
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/events', clientController.getEvents);
router.post('/events/:id/purchase', clientController.purchase);

module.exports = router;

