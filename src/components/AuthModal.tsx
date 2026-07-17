import React, { useState } from 'react';
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

  const handleGoogleSignIn = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      '',
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (popup) {
      popup.document.write(`
        <html>
          <head>
            <title>Sign in with Google</title>
            <style>
              body {
                font-family: 'Roboto', sans-serif;
                background-color: #121212;
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                background: #1e1e1e;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                max-width: 380px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                background: linear-gradient(45deg, #4285F4, #EA4335, #FBBC05, #34A853);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              .btn {
                background: #4285F4;
                color: white;
                border: none;
                padding: 12px 24px;
                font-size: 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                margin-top: 20px;
                width: 100%;
                transition: background 0.2s;
              }
              .btn:hover {
                background: #357ae8;
              }
              .user-choice {
                background: #2a2a2a;
                border: 1px solid #3a3a3a;
                padding: 12px;
                margin: 10px 0;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
              }
              .user-choice:hover {
                background: #3a3a3a;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">Google Account</div>
              <p>Choose an account to continue to <strong>Resonate</strong></p>
              
              <div class="user-choice" onclick="selectUser('Ayushman Chakraborty', 'ayushman@gmail.com')">
                <strong>Ayushman Chakraborty</strong><br/>
                <span style="font-size: 12px; color: #aaa;">ayushman@gmail.com</span>
              </div>
              <div class="user-choice" onclick="selectUser('Developer Account', 'dev@resonate.io')">
                <strong>Developer Account</strong><br/>
                <span style="font-size: 12px; color: #aaa;">dev@resonate.io</span>
              </div>
            </div>
            <script>
              function selectUser(name, email) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', name, email }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `);

      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          onLoginSuccess({
            name: event.data.name,
            email: event.data.email,
            avatar: event.data.name.charAt(0),
            isGoogle: true,
          });
          onClose();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    }
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

        <button className="btn-google-signin" onClick={handleGoogleSignIn}>
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
          Continue with Google
        </button>

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
