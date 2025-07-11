import React, { useEffect, useState } from 'react';
import MainRoutes from './routes/MainRoutes';
import './App.css';

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // Hide button if app is installed
    window.addEventListener('appinstalled', () => setShowInstall(false));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowInstall(false);
      });
    }
  };

  return (
    <div>
      {/* Install App Button */}
      {showInstall && (
        <button
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 2000,
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            cursor: 'pointer',
          }}
          onClick={handleInstallClick}
        >
          Install App
        </button>
      )}
      <MainRoutes />;
    </div>
  );
}

export default App;
