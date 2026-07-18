import React, { useState } from 'react';
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

  // Client ID state loaded from localstorage or env
  const [customClientId, setCustomClientId] = useState(() => {
    return localStorage.getItem('resonate_google_client_id') || 
           import.meta.env.VITE_GOOGLE_CLIENT_ID || 
           '605009533283-r6tg33nkq8i24n6qh8gkds8cdgknk2a6.apps.googleusercontent.com';
  });

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    setError('');
    const gWindow = window as any;
    if (gWindow.google && gWindow.google.accounts && gWindow.google.accounts.oauth2) {
      try {
        const client = gWindow.google.accounts.oauth2.initTokenClient({
          client_id: customClientId,
          scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google OAuth Error:', tokenResponse.error);
              setError(`Google Auth failed: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }

            const accessToken = tokenResponse.access_token;
            localStorage.setItem('resonate_google_access_token', accessToken);
            // Save token expiry timestamp
            const expiryTime = Date.now() + tokenResponse.expires_in * 1000;
            localStorage.setItem('resonate_google_token_expiry', expiryTime.toString());

            // Fetch user profile info using the access token
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (res.ok) {
                const payload = await res.json();
                onLoginSuccess({
                  name: payload.name || payload.email.split('@')[0],
                  email: payload.email,
                  avatar: payload.picture,
                  isGoogle: true,
                });
                onClose();
              } else {
                setError('Failed to fetch user profile details from Google API');
              }
            } catch (err) {
              console.error('Error fetching user info:', err);
              setError('Failed to contact Google API to retrieve profile details');
            }
          }
        });
        client.requestAccessToken();
      } catch (err) {
        console.error('Failed to initialize Google token client:', err);
        setError('Failed to start Google Sign-In script. Please try again.');
      }
    } else {
      setError('Google Authentication library is still loading. Please wait a few seconds and try again.');
    }
  };

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

        {/* Custom Premium Google Sign In Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
          <button className="btn-google-signin" onClick={handleGoogleSignIn} style={{ outline: 'none' }}>
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
          
          <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--yt-text-secondary)', display: 'block', marginBottom: '6px', textAlign: 'left' }}>
              Google API Client ID (Required for custom OAuth authorization):
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="Paste Client ID here (ex: 605009...)"
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
