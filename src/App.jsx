import React, { useState, useEffect } from 'react';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import PredictionPage from './pages/PredictionPage';
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

    if (!routine) {
      setIsFirstLaunch(true);
    }
  }, []);

  const handleRoutineSetupComplete = () => {
    setIsFirstLaunch(false);
  };

  return (
    <div
      className="app-container"
      style={{
        minHeight: '100vh',
        backgroundColor: '#121212'
      }}
    >
      <RoutineSetupModal
        isOpen={isFirstLaunch}
        onComplete={handleRoutineSetupComplete}
      />

      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'prediction' && <PredictionPage />}
      {currentPage === 'settings' && <SettingsPage />}

      <BottomNav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}