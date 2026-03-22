import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { HomeScreen } from './components/HomeScreen';
import { CameraMode } from './components/CameraMode';
import { ViewerMode } from './components/ViewerMode';
import { RecordingsList } from './components/RecordingsList';
import { initializeFirebase } from './services/notifications';
import { FirebaseConfig } from './types';

type Screen = 'home' | 'camera' | 'viewer' | 'recordings';

function AppContent() {
  const { setMode, reset } = useApp();
  const [screen, setScreen] = useState<Screen>('home');
  const [viewerRoomCode, setViewerRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const firebaseConfig: FirebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      initializeFirebase(firebaseConfig).catch(console.error);
    }
  }, []);

  const handleStartCamera = () => {
    setMode('camera');
    setScreen('camera');
  };

  const handleJoinViewer = (roomCode: string) => {
    setMode('viewer');
    setViewerRoomCode(roomCode);
    setScreen('viewer');
  };

  const handleViewRecordings = () => {
    setScreen('recordings');
  };

  const handleBack = () => {
    reset();
    setViewerRoomCode(null);
    setScreen('home');
  };

  switch (screen) {
    case 'camera':
      return <CameraMode />;
    case 'viewer':
      return viewerRoomCode ? <ViewerMode roomCode={viewerRoomCode} /> : null;
    case 'recordings':
      return <RecordingsList onBack={handleBack} />;
    default:
      return (
        <HomeScreen
          onStartCamera={handleStartCamera}
          onJoinViewer={handleJoinViewer}
          onViewRecordings={handleViewRecordings}
        />
      );
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
