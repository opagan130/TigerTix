// Format event date as local string
function formatEventDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

// Decrement available tickets for an event
function decrementTickets(events, id) {
  return events.map(ev =>
    ev.id === id
      ? { ...ev, available_tickets: ev.available_tickets - 1 }
      : ev
  );
}

// Create purchase message
function purchaseMessage(name) {
  return `Ticket purchased for "${name}"`;
}

// Set user after login/register
function setUser(email) {
  return email;
}

module.exports = {
  formatEventDate,
  decrementTickets,
  purchaseMessage,
  setUser
};
