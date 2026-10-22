import React from 'react';

export default function BottomNav({ currentPage, setCurrentPage }) {
  const navItems = [
    {
      id: 'calendar',
      icon: '📅',
      label: 'Calendar'
    },
    {
      id: 'dashboard',
      icon: '📊',
      label: 'Dashboard'
    },
    {
      id: 'prediction',
      icon: '🎯',
      label: 'Prediction'
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Settings'
    }
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65px',
        backgroundColor: '#181818',
        borderTop: '1px solid #303030',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      {navItems.map((item) => {
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            style={{
              border: 'none',
              background: 'transparent',
              color: isActive ? '#00bcd4' : '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              minWidth: '65px',
              padding: '6px 0',
              transition: 'color 0.2s ease'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>
              {item.icon}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: isActive ? 'bold' : 'normal' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}