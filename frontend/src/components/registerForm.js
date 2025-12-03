import React, { useState } from 'react';
import API_BASE from '../APIconfig.js';

function RegisterForm({ onRegistered }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');

      onRegistered(email);

    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleRegister} style={{ marginBottom: '20px' }}>
      <h3>Create an Account</h3>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: '10px' }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: '10px' }}
      />

      <button type="submit">Register</button>
    </form>
  );
}

export default RegisterForm;
