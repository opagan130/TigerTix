
const db = require('./db');

/**
 * getAllEvents
 * ------------------------------
 * Retrieves all events from the database, ordered by date.
 *
 * @param {Function} cb - Callback function (err, rows).
 * 
 * @returns {void}
 * 
 * Output:
 *   - rows: Array of event objects with
 *       { id, name, date, total_tickets, available_tickets }
 */
function getAllEvents(cb) {
  const sql = `SELECT id, name, date, total_tickets, available_tickets FROM events ORDER BY date`;
  db.all(sql, [], (err, rows) => cb(err, rows));
}

// TODO: update header to include new params
/**
 * purchaseTicket
 * ------------------------------
 * Handles atomic purchase of a ticket for a specific event using SQL transactions.
 *
 * @param {number} eventId - ID of the event to purchase from.
 * @param {Function} cb - Callback function (err, result).
 *
 * Process:
 *   1. Begins an IMMEDIATE TRANSACTION.
 *   2. Checks available_tickets for the given event.
 *   3. If > 0, decrements by one and commits.
 *   4. Otherwise, rolls back.
 *
 * Responses via callback:
 *   - Success: { success: true }
 *   - Error: 'Sold out', 'Event not found', or database error.
 */
function purchaseTicket(eventId, qtyOrCb, possCb) {
  
  let qty = 1, cb = possCb;
  if (typeof qtyOrCb === 'function') {
    cb = qtyOrCb;
  } else {
    qty = parseInt(qtyOrCb, 10) || 1; 
  }
  if (!cb) cb = () => {};


  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
      if (err) return cb(err);

      db.get('SELECT available_tickets FROM events WHERE id = ?', [eventId], (err2, row) => {
        if (err2) {
          db.run('ROLLBACK', () => cb(err2));
          return;
        }
        if (!row) {
          db.run('ROLLBACK', () => cb(new Error('Event not found')));
          return;
        }
        if (row.available_tickets <= 0) {
          db.run('ROLLBACK', () => cb(new Error('Sold out')));
          return;
        }

        db.run('UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?', [qty, eventId], function(err3) {
          if (err3) {
            db.run('ROLLBACK', () => cb(err3));
            return;
          }
          db.run('COMMIT', (err4) => {
            if (err4) return cb(err4);
            cb(null, { success: true });
          });
        });
      });
    });
  });
}

//TODO: create proper header
function savePendingBooking(token, event, tickets, raw, cb) {
const sql = `
INSERT INTO pending_bookings(token, event_name, tickets, raw_text)
VALUES (?,?,?,?)
`;
db.run(sql, [token, event, tickets, raw], function (err) {
    if (err) console.error("[savePendingBooking] insert failed:", err);
    cb(err);
  });
}


function getLastPendingBooking(cb) {
  db.get(`
    SELECT p.*, e.id AS event_id
    FROM pending_bookings p
    JOIN events e ON LOWER(e.name) = LOWER(p.event_name)
    ORDER BY p.created_at DESC
    LIMIT 1;
  `, [], (err, row) => {
    if (err) return cb(err);
    if (!row) return cb(new Error('Event not found'));
    cb(null, row);
  });
}
function getPendingBooking(token, cb) {
db.get("SELECT * FROM pending_bookings WHERE token = ?", [token], cb);
}

function deletePendingBooking(token, cb) {
db.run("DELETE FROM pending_bookings WHERE token = ?", [token], cb);
}

function getEventByName(name, cb) {
db.get("SELECT * FROM events WHERE name = ?", [name], cb);
}

module.exports = { getAllEvents,
purchaseTicket,
savePendingBooking,
getLastPendingBooking,
getPendingBooking,
deletePendingBooking,
getEventByName
};
