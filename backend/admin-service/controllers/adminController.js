
const adminModel = require('../models/adminModel');

/**
 * createEvent (Controller)
 * ------------------------------
 * Handles POST /api/admin/events requests.
 * Validates input and delegates event creation to the model layer.
 *
 * @route POST /api/admin/events
 * @param {Object} req - Express request object containing JSON body.
 * @param {Object} res - Express response object for sending HTTP responses.
 * 
 * Responses:
 *   - 201 Created: Returns { id: newEventId } on success.
 *   - 400 Bad Request: Missing or invalid fields.
 *   - 500 Internal Server Error: Database or server issue.
 */
function createEvent(req, res) {
  try {
    const { name, date, total_tickets } = req.body;
    if (!name || !date || total_tickets == null) {
      return res.status(400).json({ error: 'Missing required fields: name, date, total_tickets' });
    }
    const total = parseInt(total_tickets, 10);
    if (Number.isNaN(total) || total < 0) {
      return res.status(400).json({ error: 'total_tickets must be a non-negative integer' });
    }

    adminModel.createEvent({ name, date, total_tickets: total }, (err, result) => {
      if (err) {
        console.error('createEvent DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: result.id });
    });
  } catch (err) {
    console.error('createEvent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * deleteEvent (Controller)
 * ------------------------------
 * Handles DELETE /api/admin/events/:id requests.
 * Validates the event ID and delegates deletion to the model layer.
 *
 * @route DELETE /api/admin/events/:id
 * @param {Object} req - Express request object containing route parameters.
 * @param {Object} res - Express response object for sending HTTP responses.
 * 
 * Responses:
 *   - 200 OK: Returns { success: true, message } on successful deletion.
 *   - 400 Bad Request: Invalid or missing event ID.
 *   - 404 Not Found: Event with the given ID does not exist.
 *   - 500 Internal Server Error: Database or server issue.
 */
function deleteEvent(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid event ID' });

  adminModel.deleteEvent(id, (err) => {
    if (err) {
      if (err.message === 'Event not found') return res.status(404).json({ error: 'Event not found' });
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, message: `Event ${id} deleted.` });
  });
}

module.exports = { 
  createEvent,
  deleteEvent
 };
