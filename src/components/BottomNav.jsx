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
      icon: '◉',
      label: 'Prediction'
    },
    {
      id: 'settings',
      icon: '⚙',
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
        height: '70px',
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
              color: isActive ? '#4CAF50' : '#888',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              minWidth: '70px'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>
              {item.icon}
            </span>

            <span style={{ fontSize: '0.7rem' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}