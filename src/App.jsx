import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import BottomNav from './components/BottomNav';
import RoutineSetupModal from './components/RoutineSetupModal';
import { getStoredData } from './utils/storage';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('calendar');
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    const { routine } = getStoredData();
    // If no saved routine exists, prompt first-time onboarding
    if (!routine) {
      setIsFirstLaunch(true);
    }
  }, []);

  const handleRoutineSetupComplete = () => {
    setIsFirstLaunch(false);
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#121212' }}>
      {/* First-time onboarding trigger */}
      <RoutineSetupModal
        isOpen={isFirstLaunch}
        onComplete={handleRoutineSetupComplete}
      />

      {/* Pages View */}
      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'settings' && <SettingsPage />}

      {/* Navigation Bar */}
      <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
}