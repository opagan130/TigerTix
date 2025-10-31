import React, { useState } from 'react';
import EventList from './components/eventList';

function App() {

  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [token, setToken] = useState(null);

  async function handleParse() {
    const res = await fetch("http://localhost:6001/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setResult(data);
    if (data.pending_token) setToken(data.pending_token);
  }

  async function handleConfirm() {
    const res = await fetch("http://localhost:6001/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setResult(data);
    if (data.success) setToken(null);
  }

  return (
    <div className="container">
      <h1>TigerTix </h1>
      <p>Browse events and buy tickets.</p>

      <div className="ai-booking" style={{ marginBottom: "30px" }}>
        <h2>Book with Natural Language</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Example: "Book 2 tickets for Jazz Night"'
          style={{ width: "100%", height: "70px", marginBottom: "10px" }}
        />
        <button onClick={handleParse}>Interpret</button>
        {token && (
          <button onClick={handleConfirm} style={{ marginLeft: "10px" }}>
            Confirm Booking
          </button>
        )}

        {result && (
          <pre style={{ background: "#f8f8f8", padding: "10px", marginTop: "10px" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <EventList />
    </div>
  );
}

export default App;



