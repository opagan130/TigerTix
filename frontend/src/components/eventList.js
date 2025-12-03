import React, { useEffect, useState } from 'react';
import API_BASE from '../APIconfig';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');

  //const API_BASE = `${API_BASE}/api`;

  // Pulls events from backend
  const fetchEvents = () => {
    fetch(`${API_BASE}/api/events`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setMessage('');
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setMessage('Failed to load events');
      });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  /**
 * buyTicket
 * ------------------------------
 * Sends POST request to Client Service to purchase one ticket for a given event.
 *
 * @param {number} id - ID of the event to purchase.
 * @param {string} name - Name of the event (for user feedback).
 *
 * @returns {Promise<void>}
 *
 * Side Effects:
 *   - Updates event list state to reflect new ticket count.
 *   - Displays a live announcement message for accessibility.
 */
  const buyTicket = async (id, name) => {
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}/purchase`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage(json.error || 'Purchase failed');
        return;
      }

      // UI update
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === id
            ? { ...ev, available_tickets: ev.available_tickets - 1 }
            : ev
        )
      );

      setMessage(`Ticket purchased for "${name}"`);

      // Focus message for screen reader
      const el = document.getElementById('feedback');
      if (el) el.focus();
    } catch (err) {
      console.error('Purchase failed:', err);
      setMessage('Network error');
    }
  };

  return (
    <section>
      <div
        id="feedback"
        aria-live="polite"
        tabIndex="-1"
        style={{ outline: 'none', minHeight: '1.5em' }}
      >
        {message && <strong>{message}</strong>}
      </div>

      <button onClick={fetchEvents} style={{ marginBottom: '1em' }}>
        Refresh Events
      </button>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {events.length === 0 ? (
          <li>No events found.</li>
        ) : (
          events.map((ev) => (
            <li
              key={ev.id}
              style={{
                border: '1px solid #ccc',
                padding: '1em',
                marginBottom: '1em',
                borderRadius: '6px',
              }}
            >
              <h2 style={{ marginBottom: 0 }}>{ev.name}</h2>
              <p>Date: {new Date(ev.date).toLocaleDateString()}</p>
              <p>
                Tickets Available:{' '}
                <strong>{ev.available_tickets}</strong> /{' '}
                {ev.total_tickets}
              </p>

              <button
                aria-label={`Buy ticket for ${ev.name}`}
                onClick={() => buyTicket(ev.id, ev.name)}
                disabled={ev.available_tickets <= 0}
                style={{
                  padding: '8px 12px',
                  cursor: ev.available_tickets > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                {ev.available_tickets > 0 ? 'Buy Ticket ' : 'Sold Out X'}
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
