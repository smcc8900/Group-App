import React, { useEffect, useState } from 'react';
import MainRoutes from './routes/MainRoutes';
import './App.css';

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    // Hide button if app is installed
    window.addEventListener('appinstalled', () => {
      setShowInstall(false);
      setIsStandalone(true);
    });
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

  // Don't show install buttons if app is already installed
  if (isStandalone) {
    return (
      <div>
        <MainRoutes />
      </div>
    );
  }

  return (
    <div>
      {/* Install App Button for Chrome/Android - Positioned on left side */}
      {showInstall && (
        <button
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
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
      {/* iOS Install Instructions - Positioned on left side */}
      {isIOS && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 2000,
            background: '#fff',
            border: '2px solid #1976d2',
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '280px',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          <div style={{ color: '#1976d2', marginBottom: '6px', fontSize: '14px' }}>📱 Install App</div>
          <div style={{ color: '#333' }}>
            1. Tap <strong>Share</strong> button<br/>
            2. Tap <strong>Add to Home Screen</strong><br/>
            3. Tap <strong>Add</strong>
          </div>
        </div>
      )}
      <MainRoutes />
    </div>
  );
}

export default App;
