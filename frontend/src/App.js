import React, { useState, useEffect } from 'react';
import API_BASE from 'APIconfig';

import EventList from './components/eventList';
import RegisterForm from './components/registerForm';
import LoginForm from './components/LoginForm';
import LogoutButton from './components/logoutButton';

function App() {

  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

//Login Info (and Logout)
  function handleLogin(email) {
  setCurrentUser(email);
}

function handleRegistered(email) {
    // auto login after registering
    setCurrentUser(email);
  }

function handleLogout() {
  setCurrentUser(null);
  setMessages([]); 
}


  // Initialize chat (AI greets user)
  useEffect(() => {
    async function initChat() {
      try {
        const res = await fetch(`${API_BASE}/api/chat/init`);
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
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
      if (ttsEnabled && data?.reply) speak(data.reply);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: "Sorry, I couldn't process that message." },
      ]);
      if (ttsEnabled) speak("Sorry, I couldn't process that message.");
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

  function speak(text) {
  if (!window.speechSynthesis) {
    console.warn('Speech Synthesis not supported in this browser.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1;     // 0.5–2 range; 1 = normal speed
  utterance.pitch = 1;    // 0–2 range; 1 = normal pitch
  utterance.volume = 1;   // 0–1
  window.speechSynthesis.speak(utterance);
}

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
    playBeep();
    console.log('🎙️ Voice recognition started');
    setIsListening(true);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setRecognizedText(transcript);
    };
  }

  function toggleListening() {
    if (!recognition) return alert('Speech recognition not supported.');
    if (isListening) recognition.stop();
    else {
      setRecognizedText('');
      recognition.start();
    }
  }

  function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine'; // could be 'square', 'sawtooth', etc.
    oscillator.frequency.setValueAtTime(800, ctx.currentTime); // 800 Hz beep
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // volume

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2); // beep for 0.2 seconds
  } catch (err) {
    console.warn('Beep failed:', err);
  }
}

  useEffect(() => {
    if (recognizedText && !isListening) {
      setInput(recognizedText);
      handleSend();
      setRecognizedText('');
    }
  }, [recognizedText, isListening]);


  //Login Page
if (!currentUser) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>TigerTix Login</h2>

        <LoginForm onLogin={handleLogin} />
        <RegisterForm onRegistered={handleRegistered} />
      </div>
    );
  }

  return (
    
    <div className="container">
      <h1>TigerTix </h1>
      <p>Browse events and buy tickets.</p>
      <LogoutButton onLogout={handleLogout} />

      
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
        <button onClick={toggleListening} disabled={isLoading}>
          {isListening ? '🛑 Stop' : '🎙️ Speak'}
        </button>

        <button onClick={() => setTtsEnabled(!ttsEnabled)}>
        {ttsEnabled ? '🔈 TTS On' : '🔇 TTS Off'}
        </button>
      </div>

      <hr style={{ margin: '30px 0' }} />

      <EventList />
    </div>
  );
}

export default App;



