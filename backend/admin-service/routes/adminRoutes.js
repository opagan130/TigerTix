
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/events', adminController.createEvent);
router.get('/events', adminController.getEvents); 
router.delete('/events/:id', adminController.deleteEvent);

module.exports = router;
