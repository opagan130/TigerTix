const clientModel = require('../models/clientModel.js');
const { v4: uuid } = require("uuid");
const OpenAI = require("openai");

// Initializes OpenAI
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * getEvents (Controller)
 * ------------------------------
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

/**
 * fallbackParse
 * ------------------------------
 * Simple keyword-based fallback if LLM parsing fails.
 */
function fallbackParse(text) {
  if (!text) return {};

  const lower = text.toLowerCase().trim();
  const match = lower.match(/book\s+(\w+)\s+(?:ticket|tickets)\s+(?:for|to)\s+(.+)/i);
  if (match) {
    let num = match[1];
    const event = match[2].replace(/[.!?]$/, '').trim();

    const wordsToNums = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };
    const tickets = wordsToNums[num] || parseInt(num, 10) || 1;

    return {
      success: true,
      intent: "book",
      event: event.replace(/\b\w/g, c => c.toUpperCase()),
      tickets,
      message: `I can book ${tickets} ticket${tickets > 1 ? "s" : ""} for ${event}. Confirm?`
    };
  }

  if (lower.includes("show events") || lower.includes("what events")) {
    return {
      success: true,
      intent: "list",
      message: "Here are the events with available tickets."
    };
  }

  return { success: false, message: "Unable to interpret booking request." };
}

/**
 * parseWithLLM
 * ------------------------------
 * Attempts to interpret booking intent using an LLM (GPT-4o-mini).
 */
async function parseWithLLM(text) {
  if (!openai) return null;

  try {
    const prompt = `
Extract the event booking intent from this text.
Return STRICT JSON only:
{ "event": string|null, "tickets": number|null, "intent": "book"|null }

User text: "${text}"
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Output only valid JSON." },
        { role: "user", content: prompt }
      ]
    });

    const raw = response.choices[0].message.content;
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]);
    return json;

  } catch (err) {
    console.error("LLM parsing failed:", err);
    return null;
  }
}

/**
 * parseText
 * ------------------------------
 * Handles POST /api/parse.
 * Uses LLM to interpret text, falls back to regex parser if needed.
 */
async function parseText(req, res) {
  const text = req.body.text;
  if (!text) {
    return res.status(400).json({ success: false, error: "Missing text" });
  }

  let parsed = await parseWithLLM(text);

  // fallback if LLM fails or returns incomplete info
  if (!parsed || !parsed.event || !parsed.tickets) {
    parsed = fallbackParse(text);
  }

  if (!parsed.event || !parsed.tickets) {
    return res.status(400).json({
      success: false,
      message: "Unable to interpret booking request.",
      input: text
    });
  }

  // Booking intent: create pending booking
  if (parsed.intent === "book") {
    const token = uuid();

    return clientModel.savePendingBooking(token, parsed.event, parsed.tickets, text, (err) => {
      if (err) {
        console.error("[/parse] savePendingBooking failed:", err);
        return res.status(500).json({ message: "Failed to create pending booking" });
      }

      return res.json({
        ...parsed,
        pending_token: token,
        message: `I can book ${parsed.tickets} ticket${parsed.tickets > 1 ? "s" : ""} for ${parsed.event}. Confirm?`
      });
    });
  }

  return res.json(parsed);
}

/**
 * confirmBooking
 * ------------------------------
 * Confirms and completes a pending booking.
 */
function confirmBooking(req, res) {
  const token = req.body.token;
  const customer = req.body.customer || "Anonymous";

  clientModel.getPendingBooking(token, (err, pending) => {
    if (!pending)
      return res.status(400).json({ message: "Invalid or expired token" });
    
    clientModel.getEventByName(pending.event_name, (err2, event) => {
      if (!event)
        return res.status(400).json({ message: "Event not found" });

      clientModel.purchaseTicket(event.id, pending.tickets, (err3, result) => {
        if (err3) {
          return res.status(400).json({ error: err3.message });
        }

        clientModel.deletePendingBooking(token, () => {});

        res.json({
          success: true, 
          event_id: event.id, 
          tickets: pending.tickets
        });
      });
    });
  });
}

async function initChat(req, res) {
  try {
    const events = await new Promise((resolve, reject) => {
      clientModel.getAllEvents((err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    if (!events.length) {
      return res.json({
        reply: "Hi there! Welcome to TigerTix — your personal event assistant.\nRight now there are no events available, but check back later!"
      });
    }

    const eventList = events.map(e =>
      `• ${e.name} (${e.date}) — ${e.available_tickets} tickets left`
    ).join('\n');

    return res.json({
      reply:
        `Hi there! I'm TigerTix, your event assistant.\n\n` +
        `Here are the events currently available:\n${eventList}\n\n` +
        `You can say something like: "Book 2 tickets for Jazz Night".`
    });
  } catch (error) {
    console.error('[initChat] Error:', error);
    return res.status(500).json({ reply: "Sorry, I couldn't load the events right now." });
  }
}

async function chatWithAI(req, res) {
  const userMessage = req.body.message?.toLowerCase() || '';

  if (/^(hi|hello|hey)/.test(userMessage)) {
    return initChat(req, res);
  }

  if (/events|what('| i)s happening|show.*event|available/i.test(userMessage)) {
    try {
      const events = await new Promise((resolve, reject) => {
        clientModel.getAllEvents((err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });

      if (!events.length) {
        return res.json({
          reply: "There are no events available right now. Check back soon!"
        });
      }

      const eventList = events.map(e =>
        `• ${e.name} (${e.date}) — ${e.available_tickets} tickets left`
      ).join('\n');

      return res.json({
        reply: `Here are the current events:\n${eventList}\n\n.`
      });
    } catch (error) {
      console.error('[chatWithAI] event listing error:', error);
      return res.status(500).json({
        reply: "Sorry, I couldn't load available events right now."
      });
    }
  }

  if (/book|reserve|ticket/.test(userMessage)) {
    try {
      let parsed = await parseWithLLM(userMessage);
      if (!parsed || !parsed.event || !parsed.tickets) parsed = fallbackParse(userMessage);

      if (!parsed.event || !parsed.tickets) {
        return res.json({
          reply: "Hmm... I couldn't quite understand that. Try saying: 'Book 1 ticket for Rock Fest'."
        });
      }

      const token = uuid();
      await new Promise((resolve, reject) =>
        clientModel.savePendingBooking(token, parsed.event, parsed.tickets, userMessage, (err) =>
          err ? reject(err) : resolve()
        )
      );

      return res.json({
        reply: `Got it! You want **${parsed.tickets} ticket(s)** for **${parsed.event}**.\nPlease confirm by saying "Yes" or "Confirm ${parsed.event}".`,
        pending_token: token,
      });
    } catch (err) {
      console.error('[chatWithAI] booking error:', err);
      return res.status(500).json({ reply: "Something went wrong while creating your booking." });
    }
  }

  if (/confirm|yes|go ahead|yep|sure/.test(userMessage)) {
    try {
      const pending = await new Promise((resolve, reject) =>
        clientModel.getLastPendingBooking((err, row) =>
          err ? reject(err) : resolve(row)
        )
      );

      if (!pending) {
        return res.json({ reply: "I don't have any booking to confirm right now." });
      }

      await new Promise((resolve, reject) =>
        clientModel.purchaseTicket(pending.event_id, pending.tickets, (err) =>
          err ? reject(err) : resolve()
        )
      );

      await new Promise((resolve) =>
        clientModel.deletePendingBooking(pending.token, () => resolve())
      );

      return res.json({
        reply: `Your booking for **${pending.event_name}** (${pending.tickets} tickets) is confirmed! Enjoy the show`
      });
    } catch (err) {
      console.error('[chatWithAI] confirm error:', err);
      return res.status(500).json({ reply: "Sorry, I couldn't complete the booking confirmation." });
    }
  }

  return res.json({
    reply: "I didn't catch that. You can ask me to show available events or book a ticket."
  });
}

module.exports = { 
  getEvents,
  purchase,
  parseText,
  confirmBooking,
  initChat,
  chatWithAI 
};
