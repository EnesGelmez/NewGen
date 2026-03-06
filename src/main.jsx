import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router/index.jsx'
import { useAuthStore } from './store/authStore.js'

function AuthInitializer({ children }) {
  const initAuth = useAuthStore((s) => s.initAuth);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    initAuth();
  }, []);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthInitializer>
      <RouterProvider router={router} />
    </AuthInitializer>
  </StrictMode>,
)
