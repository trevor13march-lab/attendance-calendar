import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function AuthModal({ user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage({ type: 'error', text: error.message });
      else setMessage({ type: 'success', text: 'Account created! Check your email to confirm, or log in.' });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: 'error', text: error.message });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #333' }}>
        <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
          Logged in as: <strong style={{ color: '#fff' }}>{user.email}</strong>
        </span>
        <button 
          onClick={handleLogout} 
          style={{ background: 'none', border: '1px solid #f44336', color: '#f44336', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '16px', border: '1px solid #333' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>{isRegister ? 'Create Account' : 'Sign In to Sync Across Devices'}</h4>
      
      {message.text && (
        <p style={{ color: message.type === 'error' ? '#f44336' : '#4CAF50', fontSize: '0.8rem', margin: '0 0 10px 0' }}>
          {message.text}
        </p>
      )}

      <form onSubmit={handleAuth} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input 
          type="email" 
          placeholder="Email address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '6px 10px', backgroundColor: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '0.85rem' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '6px 10px', backgroundColor: '#121212', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '0.85rem' }}
        />
        <button type="submit" style={{ backgroundColor: '#4CAF50', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
          {isRegister ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      <button 
        type="button" 
        onClick={() => { setIsRegister(!isRegister); setMessage({ type: '', text: '' }); }} 
        style={{ background: 'none', border: 'none', color: '#00bcd4', cursor: 'pointer', fontSize: '0.8rem', marginTop: '10px', padding: 0 }}
      >
        {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
      </button>
    </div>
  );
}