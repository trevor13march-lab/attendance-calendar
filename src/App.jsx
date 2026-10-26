import { useState } from 'react';
import CalendarPage from './pages/CalendarPage';
import RoutineSetupModal from './components/RoutineSetupModal';
import { getStoredData } from './utils/storage';
import './App.css';

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(() => {
    const { routine } = getStoredData();
    return !routine;
  });

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

      {/* Main Calendar View with integrated Working/Off/Days Left bottom bar */}
      <CalendarPage />
    </div>
  );
}