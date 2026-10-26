import { useState } from 'react';
import { supabase } from '../supabase';

export default function AuthModal({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copiedId, setCopiedId] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Account created! Check your email or log in.' });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
  };

  const handleCopyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      prompt('Your User ID:', user.id);
    }
  };

  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Small Circular Profile / Auth Logo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: user ? '#007acc' : '#222',
          border: user ? '2px solid #00bcd4' : '1px solid #444',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: user ? '0.95rem' : '1.1rem',
          position: 'relative',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'transform 0.15s ease, border-color 0.2s ease',
          outline: 'none'
        }}
        title={user ? `Logged in as: ${user.email}` : 'Sign In / Register'}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {user ? userInitial : '👤'}
        {user && (
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '9px',
              height: '9px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%',
              border: '1.5px solid #121212'
            }}
          />
        )}
      </button>

      {/* Floating Popup Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop click dismiss */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1001,
              backgroundColor: 'transparent'
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '46px',
              right: 0,
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '16px',
              width: '290px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 1002,
              boxSizing: 'border-box',
              color: '#fff'
            }}
          >
            {user ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#007acc',
                      border: '2px solid #00bcd4',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      flexShrink: 0
                    }}
                  >
                    {userInitial}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>Logged in as</div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={user.email}
                    >
                      {user.email}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#121212',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #333',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                    User ID:{' '}
                    <code style={{ color: '#00bcd4', fontFamily: 'Consolas, monospace' }}>
                      {user.id.slice(0, 8)}...{user.id.slice(-4)}
                    </code>
                  </div>
                  <button
                    onClick={handleCopyUserId}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedId ? '#4CAF50' : '#00bcd4',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '2px 4px'
                    }}
                  >
                    {copiedId ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#2a1a1a',
                    border: '1px solid #f44336',
                    color: '#f44336',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '0.95rem' }}>
                  {isRegister ? 'Create Account' : 'Sign In to Sync'}
                </h4>

                {message.text && (
                  <p
                    style={{
                      color: message.type === 'error' ? '#f44336' : '#4CAF50',
                      fontSize: '0.78rem',
                      margin: '0 0 10px 0'
                    }}
                  >
                    {message.text}
                  </p>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#121212',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#121212',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      marginTop: '4px'
                    }}
                  >
                    {isRegister ? 'Sign Up' : 'Log In'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setMessage({ type: '', text: '' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00bcd4',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    marginTop: '10px',
                    padding: 0,
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}