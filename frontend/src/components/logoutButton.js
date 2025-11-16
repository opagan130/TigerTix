import React from 'react';

function LogoutButton({ onLogout }) {
  async function handleLogout() {
    await fetch('http://localhost:6001/auth/logout', {
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
