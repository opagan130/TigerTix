
const clientModel = require('../models/clientModel.js');

/**
 * getEvents (Controller)
 * ------------------------------
 * Handles GET /api/events requests.
 * Retrieves and returns all events as JSON from the model layer.
 *
 * @route GET /api/events
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * 
 * Responses:
 *   - 200 OK: Array of event objects.
 *   - 500 Internal Server Error: If database query fails.
 */
function getEvents(req, res) {
  clientModel.getAllEvents((err, rows) => {
    if (err) {
      console.error('getEvents error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
}

/**
 * purchase (Controller)
 * ------------------------------
 * Handles POST /api/events/:id/purchase requests.
 * Invokes model layer to safely decrement available_tickets.
 *
 * @route POST /api/events/:id/purchase
 * @param {Object} req - Express request object (includes :id param).
 * @param {Object} res - Express response object.
 * 
 * Responses:
 *   - 200 OK: { success: true } when purchase successful.
 *   - 400 Bad Request: Invalid ID or sold-out event.
 *   - 404 Not Found: Event does not exist.
 *   - 500 Internal Server Error: Unhandled database errors.
 */
function purchase(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });

  clientModel.purchaseTicket(id, (err, result) => {
    if (err) {
      if (err.message === 'Sold out') return res.status(400).json({ error: 'Sold out' });
      if (err.message === 'Event not found') return res.status(404).json({ error: 'Event not found' });
      console.error('purchase error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json({ success: true });
  });
}

module.exports = { getEvents, purchase };
