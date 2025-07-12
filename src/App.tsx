import React, { useEffect, useState } from 'react';
import MainRoutes from './routes/MainRoutes';
import './App.css';

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

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
      {/* iOS Install Instructions */}
      {isIOS && !showInstall && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 2000,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: '250px',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📱 Install App</div>
          <div>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></div>
        </div>
      )}
      <MainRoutes />
    </div>
  );
}

export default App;
