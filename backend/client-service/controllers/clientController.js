
const clientModel = require('../models/clientModel.js');
const { v4: uuid } = require("uuid");
const OpenAI = require("openai");

//Initializes OpenAI
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

//TODO: create proper header
//In case the LLM fails
function fallbackParse(text) {
  const events = ["Jazz Night", "Rock Fest", "Football Game", "Basketball Night", "Summer Concert"];
  let event = events.find(e => text.toLowerCase().includes(e.toLowerCase()));

  // ticket extraction
  const num = text.match(/(\d+)\s*ticket/i);
  let tickets = num ? parseInt(num[1]) : null;

  // intent extraction
  let intent = null;
  if (/book|reserve|buy/i.test(text)) intent = "book";

  return { event, tickets, intent };
}

//TODO: create proper header
//AI attempts to understand user and make JSON request
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

//TODO: create header
async function parseText(req, res) {
  const text = req.body.text;

  // Attempt LLM parse
  let parsed = await parseWithLLM(text);

  // Fallback if LLM failed
  if (!parsed || !parsed.event || !parsed.tickets) {
    parsed = fallbackParse(text);
  }

  if (!parsed.event || !parsed.tickets) {
    return res.status(400).json({
      message: "Unable to interpret booking request.",
      input: text
    });
  }

  // If intent is booking, create a pending_booking
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
        message: "Pending booking created. Please confirm."
      });
    });
  }

  return res.json(parsed);
}

//TODO: create header
function confirmBooking(req, res) {
  const token = req.body.token;
  const customer = req.body.customer || "Anonymous";

  clientModel.getPendingBooking(token, (err, pending) => {

    if (!pending)
      return res.status(400).json({ message: "Invalid or expired token" });
    
    // pulls the event provided it exists
    clientModel.getEventByName(pending.event_name, (err2, event) => {
      if (!event)
        return res.status(400).json({ message: "Event not found" });

      
      clientModel.purchaseTicket(event.id, pending.tickets, (err3, result) => {
        if (err3) {
          return res.status(400).json({ error: err3.message });
        }

        // Remove pending booking
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

module.exports = { 
  getEvents,
  purchase,
  parseText,
  confirmBooking 
};
