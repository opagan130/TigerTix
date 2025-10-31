
const db = require('./db');

/**
 * createEvent
 * ------------------------------
 * Inserts a new event record into the SQLite database.
 *
 * @param {Object} event - Event data to insert.
 * @param {string} event.name - The name of the event.
 * @param {string} event.date - The ISO date string of the event.
 * @param {number} event.total_tickets - Total number of tickets available.
 * @param {Function} cb - Callback function (err, result).
 * 
 * @returns {void}
 * 
 * Side Effects:
 *   - Writes a new row into the `events` table.
 *   - Initializes available_tickets = total_tickets.
 */
function createEvent(event, cb) {
  const sql = `INSERT INTO events (name, date, total_tickets, available_tickets)
               VALUES (?, ?, ?, ?)`;
  db.run(sql, [event.name, event.date, event.total_tickets, event.total_tickets], function(err) {
    if (err) return cb(err);
    cb(null, { id: this.lastID });
  });
}

function deleteEvent(eventId, cb) {
  const sql = 'DELETE FROM events WHERE id = ?';
  db.run(sql, [eventId], function (err) {
    if (err) return cb(err);
    if (this.changes === 0) return cb(new Error('Event not found'));
    cb(null);
  });
}

module.exports = { 
  createEvent,
  deleteEvent
};
