import React from 'react';
import API_BASE from '../APIconfig.js';

function LogoutButton({ onLogout }) {
  async function handleLogout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    onLogout();
  }

  return (
    <button onClick={handleLogout} style={{ marginTop: '20px' }}>
      Logout
    </button>
  );
}

export default LogoutButton;
