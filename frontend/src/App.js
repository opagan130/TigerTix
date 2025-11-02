import React, { useState, useEffect } from 'react';
import EventList from './components/eventList';
import ChatAssistant from './components/ChatAssistant';

function App() {

  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize chat (AI greets user)
  useEffect(() => {
    async function initChat() {
      try {
        const res = await fetch('http://localhost:6001/api/chat/init');
        const data = await res.json();
        setMessages([{ sender: 'bot', text: data.reply }]);
      } catch (err) {
        console.error('initChat error:', err);
      }
    }
    initChat();
  }, []);

  // Send user message
  async function handleSend() {
    if (!input.trim()) return;
    const newUserMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:6001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: "Sorry, I couldn't process that message." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="container">
      <h1>TigerTix </h1>
      <p>Browse events and buy tickets.</p>

      
      <div
        className="chat-box"
        style={{
          border: '1px solid #ddd',
          borderRadius: '10px',
          padding: '15px',
          height: '400px',
          overflowY: 'auto',
          backgroundColor: '#fafafa',
          marginBottom: '20px',
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.sender === 'user' ? 'right' : 'left',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                backgroundColor: msg.sender === 'user' ? '#007bff' : '#eee',
                color: msg.sender === 'user' ? '#fff' : '#000',
                padding: '8px 12px',
                borderRadius: '12px',
                maxWidth: '75%',
                wordWrap: 'break-word',
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
        {isLoading && <p>TigerTix is typing...</p>}
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say 'Book 2 tickets for Jazz Night'..."
          style={{ flex: 1, height: '50px', padding: '10px' }}
        />
        <button onClick={handleSend} disabled={isLoading}>
          Send
        </button>
      </div>

      <hr style={{ margin: '30px 0' }} />

      <EventList />
      <ChatAssistant />
    </div>
  );
}

export default App;



