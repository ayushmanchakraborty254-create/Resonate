import React, { useState, useEffect } from 'react';
import { X, LogIn, Mail, Lock, User, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; avatar?: string; isGoogle?: boolean }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  // Client ID state loaded from localstorage
  const [customClientId, setCustomClientId] = useState(() => {
    return localStorage.getItem('resonate_google_client_id') || '605009533283-r6tg33nkq8i24n6qh8gkds8cdgknk2a6.apps.googleusercontent.com';
  });

  // Automatically initialize and render the official Google button when GSI SDK is ready
  useEffect(() => {
    if (!isOpen) return;

    let interval: any;
    const initGoogleGsi = () => {
      const gWindow = window as any;
      if (gWindow.google && gWindow.google.accounts) {
        clearInterval(interval);
        try {
          gWindow.google.accounts.id.initialize({
            client_id: customClientId || "YOUR_GOOGLE_CLIENT_ID", // fallback placeholder
            callback: (response: any) => {
              try {
                const token = response.credential;
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  window.atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);
                
                onLoginSuccess({
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email,
                  avatar: payload.picture,
                  isGoogle: true,
                });
                onClose();
              } catch (err) {
                console.error('Error decoding credential response:', err);
              }
            }
          });

          const btnContainer = document.getElementById("google-official-btn");
          if (btnContainer) {
            btnContainer.innerHTML = ""; // Clear old rendering
            gWindow.google.accounts.id.renderButton(
              btnContainer,
              { 
                theme: "filled_black", 
                size: "large", 
                width: 356, 
                shape: "pill",
                text: "signin_with" 
              }
            );
          }
        } catch (err) {
          console.warn('Failed to initialize Google GSI client:', err);
        }
      }
    };

    initGoogleGsi();
    interval = setInterval(initGoogleGsi, 1000);
    return () => clearInterval(interval);
  }, [isOpen, customClientId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp && !username.trim()) {
      setError('Username is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const name = isSignUp ? username : email.split('@')[0];
    onLoginSuccess({
      name,
      email,
      avatar: name.charAt(0).toUpperCase(),
      isGoogle: false,
    });
    onClose();
  };

  const handleClientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomClientId(val);
    if (val.trim()) {
      localStorage.setItem('resonate_google_client_id', val.trim());
    } else {
      localStorage.removeItem('resonate_google_client_id');
    }
  };

  return (
    <div className="modal-overlay auth-modal-overlay">
      <div className="modal-content auth-modal-content" style={{ maxWidth: '440px' }}>
        <button className="auth-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <LogIn className="auth-logo-icon" size={32} />
          <h2>{isSignUp ? 'Create your Account' : 'Welcome back'}</h2>
          <p>{isSignUp ? 'Join Resonate today' : 'Sign in to access your library & playlists'}</p>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="auth-input-group">
              <User size={18} className="auth-input-icon" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <Mail size={18} className="auth-input-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <Lock size={18} className="auth-input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-auth-submit">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Official Sign In with Google container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
          <div id="google-official-btn" style={{ minHeight: '40px' }}></div>
          
          <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', display: 'block', marginBottom: '6px', textAlign: 'left' }}>
              Google API Client ID (Required to authorize official button):
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="Paste Client ID here (ex: 680789...)"
              value={customClientId}
              onChange={handleClientIdChange}
              style={{ height: '36px', fontSize: '12px', marginBottom: '0' }}
            />
          </div>
        </div>

        <div className="auth-footer">
          <span>{isSignUp ? 'Already have an account? ' : "Don't have an account? "}</span>
          <button className="auth-toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};
