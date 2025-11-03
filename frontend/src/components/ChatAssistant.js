import React, { useEffect, useRef, useState } from 'react';

/**
 * ChatAssistant
 * Voice-enabled LLM chat that proposes bookings but requires explicit confirmation.
 *
 * Assumptions:
 *  - POST /api/llm/parse  accepts { text } and returns:
 *      { success: true, intent: 'book', event: 'Jazz Night', tickets: 2, message: 'I can book 2 tickets for Jazz Night. Confirm?' }
 *    If LLM can't parse: { success: false, error: 'Could not parse' }
 *
 *  - POST /api/llm/confirm accepts { event, tickets } and performs booking transaction:
 *      { success: true, bookingId: 123, message: 'Booked 2 tickets for Jazz Night.' }
 *
 *  - If you used different endpoints/shape, adapt fetch URLs / response handling below.
 */

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:6001';


function createBeep(duration = 0.15, frequency = 1000, type = 'sine') {
  // Return a function that will play a short beep using WebAudio
  return () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = frequency;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      setTimeout(() => {
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.01);
        o.stop(ctx.currentTime + 0.02);
        ctx.close();
      }, duration * 1000);
    } catch (err) { /* ignore beep failures */ }
  };
}

export default function ChatAssistant() {
  const [listening, setListening] = useState(false);
  const [recognized, setRecognized] = useState(''); // recognized (transcribed) text
  const [chatLog, setChatLog] = useState([]); // messages from user and LLM
  const [llmProposal, setLlmProposal] = useState(null); // { event, tickets, message }
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const beep = useRef(createBeep()).current;
  const liveRegionRef = useRef(null);

  useEffect(() => {
    // Initialize SpeechRecognition with fallbacks
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (evt) => {
      const transcript = (evt.results && evt.results[0][0].transcript) ? evt.results[0][0].transcript.trim() : '';
      setRecognized(transcript);
      addChatItem('user', transcript);
    };
    recog.onerror = (evt) => {
      console.error('SpeechRecognition error', evt);
      setError('Speech recognition error');
      setListening(false);
    };
    recog.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recog;
    return () => {
      try { recog.stop(); } catch(e) {}
    };
  }, []);

  function addChatItem(who, text) {
    setChatLog(prev => [...prev, { who, text, ts: Date.now() }]);
    // Announce to screen reader
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `${who === 'user' ? 'You' : 'Assistant'}: ${text}`;
    }
  }

  function startListening() {
    setError(null);
    if (!recognitionRef.current) {
      setError('SpeechRecognition not supported in this browser.');
      return;
    }
    // beep then start recording
    try {
      beep();
      // slight delay to ensure beep is heard before recording
      setTimeout(() => {
        try {
          recognitionRef.current.start();
          setListening(true);
          setRecognized('');
        } catch (err) {
          console.error('start error', err);
          setError('Unable to start microphone.');
        }
      }, 180); // 180ms
    } catch (err) {
      console.error(err);
      setError('Microphone start failed.');
    }
  }

  function stopListening() {
    try {
      recognitionRef.current && recognitionRef.current.stop();
    } catch (err) {}
    setListening(false);
  }

  async function sendToLLM(text) {
    // Basic keyword fallback before calling LLM
    const fallback = tryKeywordFallback(text);
    if (fallback) {
      handleLLMResponse(fallback);
      return;
    }

    setLoading(true);
    setError(null);
    addChatItem('user', text);
    try {
      const res = await fetch(`${API_BASE}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const json = await res.json();
      if (!res.ok || !json) {
        throw new Error(json?.error || 'LLM parse failed');
      }
      if (json.success === false) {
        // LLM couldn't parse
        setError(json.error || 'Could not parse request.');
        // Offer fallback
        const fallbackParsed = tryKeywordFallback(text);
        if (fallbackParsed) {
          handleLLMResponse(fallbackParsed);
        } else {
          addChatItem('assistant', json.message || 'I could not parse that. Try “Book two tickets for Jazz Night.”');
          speak(json.message || 'I could not parse that. Please try rephrasing.');
        }
      } else {
        handleLLMResponse(json);
      }
    } catch (err) {
      console.error('Error calling LLM parse', err);
      setError(err.message || 'LLM call failed');
      addChatItem('assistant', 'Sorry, I could not reach the booking assistant.');
      speak('Sorry, I could not reach the booking assistant.');
    } finally {
      setLoading(false);
    }
  }

  function handleLLMResponse(json) {
    // Expect structured JSON with intent/event/tickets and a message
    const { intent, event, tickets, message } = json;
    if (intent === 'book' && event && (tickets || tickets === 0)) {
      const proposal = { event, tickets: Number(tickets), message: message || `I will book ${tickets} tickets for ${event}. Do you confirm?` };
      setLlmProposal(proposal);
      addChatItem('assistant', proposal.message);
      speak(proposal.message);
    } else {
      // Non-booking reply (e.g., help or greeting)
      addChatItem('assistant', message || json.text || 'Here is the response');
      speak(message || json.text || 'Here is the response');
      setLlmProposal(null);
    }
  }

  async function confirmBooking() {
    if (!llmProposal) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: llmProposal.event, tickets: llmProposal.tickets })
      });
      const json = await res.json();
      if (!res.ok || !json) throw new Error(json?.error || 'Booking failed');
      // Success
      addChatItem('assistant', json.message || `Booked ${llmProposal.tickets} tickets for ${llmProposal.event}`);
      speak(json.message || `Booked ${llmProposal.tickets} tickets for ${llmProposal.event}`);
      setLlmProposal(null);
    } catch (err) {
      console.error('confirmBooking error', err);
      setError(err.message || 'Booking failed');
      addChatItem('assistant', `Booking failed: ${err.message || 'unknown'}`);
      speak(`Booking failed: ${err.message || 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }

  function cancelProposal() {
    setLlmProposal(null);
    addChatItem('assistant', 'Booking cancelled.');
    speak('Booking cancelled.');
  }

  function speak(text) {
    if (!ttsEnabled) return;
    try {
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'en-US';
      ut.rate = 0.95; // slightly slower for clarity
      ut.pitch = 1.0;
      // optional: adjust volume/rate based on text length
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(ut);
    } catch (err) {
      console.warn('TTS failed', err);
    }
  }

  // Simple keyword fallback parser for common commands
  function tryKeywordFallback(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase();
    // Example: "book two tickets for jazz night", "book 2 for jazz night"
    const match = t.match(/book\s+(\d+)\s+(?:tickets\s+)?(?:for\s+)?(.+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      const name = match[2].trim();
      return { success: true, intent: 'book', event: capitalizeWords(name), tickets: n, message: `I will book ${n} tickets for ${capitalizeWords(name)}. Confirm?` };
    }
    // Quick show events command
    if (/show\s+events|what.*events|list.*events/.test(t)) {
      return { success: true, intent: 'list', message: 'Here are the events with available tickets. (Use the UI to browse.)' };
    }
    return null;
  }

  function capitalizeWords(s) {
    return s.replace(/\b\w/g, c => c.toUpperCase());
  }

  return (
    <section aria-label="Booking Assistant" style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <h2>Booking Assistant</h2>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button
          onClick={() => listening ? stopListening() : startListening()}
          aria-pressed={listening}
          aria-label={listening ? 'Stop recording' : 'Start recording'}
          style={{
            padding: '8px 12px',
            background: listening ? '#d9534f' : '#007bff',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          {listening ? 'Stop' : 'Speak'}
        </button>

        <button
          onClick={() => { if (recognized) sendToLLM(recognized); }}
          disabled={!recognized || loading}
          aria-disabled={!recognized || loading}
          style={{ padding: '8px 12px' }}
        >
          Send
        </button>

        <label style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
          Text-to-Speech
        </label>
      </div>

      <div aria-live="polite" ref={liveRegionRef} style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }} />

      <div style={{ marginBottom: 8 }}>
        <strong>Recognized:</strong>
        <div tabIndex={0} style={{ padding: 8, border: '1px solid #eee', borderRadius: 4, minHeight: 36 }}>
          {recognized || <span style={{ color: '#666' }}>No speech recognized yet</span>}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong>Assistant:</strong>
        <div style={{ maxHeight: 220, overflowY: 'auto', padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
          {chatLog.length === 0 ? <div style={{ color: '#666' }}>No messages yet. Click Speak to begin.</div> :
            chatLog.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#888' }}>{m.who === 'user' ? 'You' : 'Assistant'}</div>
                <div style={{ padding: '6px 8px', background: m.who === 'user' ? '#f1f9ff' : '#fafafa', borderRadius: 6 }}>{m.text}</div>
              </div>
            ))
          }
        </div>
      </div>

      {llmProposal && (
        <div aria-live="polite" style={{ border: '1px dashed #bbb', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ marginBottom: 6 }}><strong>Proposed booking:</strong></div>
          <div>Event: <strong>{llmProposal.event}</strong></div>
          <div>Tickets: <strong>{llmProposal.tickets}</strong></div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={confirmBooking} disabled={loading} style={{ padding: '8px 12px' }}>Confirm Booking</button>
            <button onClick={cancelProposal} style={{ padding: '8px 12px' }}>Cancel</button>
          </div>
        </div>
      )}

      {error && <div role="alert" style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      <div style={{ fontSize: 12, color: '#666' }}>
        Tip: Try phrases like “Book two tickets for Jazz Night” or press Speak and say the command.
      </div>
    </section>
  );
}
