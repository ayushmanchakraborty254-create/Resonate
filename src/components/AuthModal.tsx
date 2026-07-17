import React, { useState, useEffect } from 'react';
import { X, LogIn, Mail, Lock, User, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string; avatar?: string; isGoogle?: boolean }) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  // Polling check to initialize and render the official Google button when GIS SDK is loaded
  useEffect(() => {
    let interval: any;

    const initGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        clearInterval(interval);
        window.google.accounts.id.initialize({
          client_id: "680789422005-7s5m745qj99723l8410292f7c00e1234.apps.googleusercontent.com", // standard dev client ID
          callback: (response: any) => {
            try {
              const token = response.credential;
              // Decode standard JWT
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

        const btnContainer = document.getElementById("google-signin-button");
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { theme: "filled_blue", size: "large", width: 356, text: "signin_with" }
          );
        }
      }
    };

    if (isOpen) {
      initGoogleSignIn();
      interval = setInterval(initGoogleSignIn, 500);
    }

    return () => clearInterval(interval);
  }, [isOpen]);

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

  return (
    <div className="modal-overlay auth-modal-overlay">
      <div className="modal-content auth-modal-content">
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

        {/* Official Google Sign-In Button Target */}
        <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}></div>

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
