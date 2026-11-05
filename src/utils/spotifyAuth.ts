/**
 * Spotify Authentication & Token Lifecycle Manager
 * Handles 1-click OAuth, PKCE / Code Exchange, 180-day Refresh Token, and Silent Auto-Refresh.
 */

export const SPOTIFY_CONFIG = {
  clientId: '820f794c097f42cfa1dc22b0bbdf922b',
  clientSecret: '2369006275b54b6d82a7f0b7532902c6',
  redirectUri: () => window.location.origin + window.location.pathname,
  scopes: [
    'user-library-read',
    'playlist-read-private',
    'user-follow-read',
    'user-read-recently-played',
    'user-top-read',
  ].join(' '),
};

export class SpotifyAuthManager {
  private static STORAGE_KEYS = {
    accessToken: 'resonate_spotify_access_token',
    refreshToken: 'resonate_spotify_refresh_token',
    tokenExpiry: 'resonate_spotify_token_expiry',
    codeVerifier: 'resonate_spotify_code_verifier',
  };

  /**
   * Generates a random PKCE code verifier
   */
  private static generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * SHA-256 Digest for PKCE code challenge
   */
  private static async sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
  }

  /**
   * Base64url encoding
   */
  private static base64urlencode(a: ArrayBuffer): string {
    let str = '';
    const bytes = new Uint8Array(a);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Initiate Spotify 1-Click Login
   */
  static async login(): Promise<void> {
    const verifier = this.generateRandomString(64);
    localStorage.setItem(this.STORAGE_KEYS.codeVerifier, verifier);

    const hashed = await this.sha256(verifier);
    const challenge = this.base64urlencode(hashed);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CONFIG.clientId,
      scope: SPOTIFY_CONFIG.scopes,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      redirect_uri: SPOTIFY_CONFIG.redirectUri(),
      show_dialog: 'true',
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Handle redirect callback from Spotify
   */
  static async handleCallback(): Promise<boolean> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const hashAccessToken = hashParams.get('access_token');

    // 1. Handle implicit grant callback fallback
    if (hashAccessToken) {
      const expiresIn = parseInt(hashParams.get('expires_in') || '3600', 10);
      localStorage.setItem(this.STORAGE_KEYS.accessToken, hashAccessToken);
      localStorage.setItem(this.STORAGE_KEYS.tokenExpiry, (Date.now() + expiresIn * 1000).toString());
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }

    // 2. Handle Authorization Code callback with PKCE / Secret exchange
    if (code) {
      const verifier = localStorage.getItem(this.STORAGE_KEYS.codeVerifier) || '';
      try {
        const bodyParams = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_CONFIG.redirectUri(),
          client_id: SPOTIFY_CONFIG.clientId,
        });

        if (verifier) {
          bodyParams.append('code_verifier', verifier);
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
        };

        // Use Basic Auth with client secret if present
        if (SPOTIFY_CONFIG.clientSecret) {
          headers['Authorization'] = 'Basic ' + btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`);
        }

        const res = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers,
          body: bodyParams,
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(this.STORAGE_KEYS.accessToken, data.access_token);
          if (data.refresh_token) {
            localStorage.setItem(this.STORAGE_KEYS.refreshToken, data.refresh_token);
          }
          const expiryTime = Date.now() + (data.expires_in || 3600) * 1000;
          localStorage.setItem(this.STORAGE_KEYS.tokenExpiry, expiryTime.toString());
          localStorage.removeItem(this.STORAGE_KEYS.codeVerifier);

          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        } else {
          console.warn('Spotify token exchange error:', await res.text());
        }
      } catch (err) {
        console.error('Failed to exchange Spotify authorization code:', err);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return false;
  }

  /**
   * Silently refresh access token using 180-day refresh token
   */
  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(this.STORAGE_KEYS.refreshToken);
    if (!refreshToken) return null;

    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: SPOTIFY_CONFIG.clientId,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (SPOTIFY_CONFIG.clientSecret) {
        headers['Authorization'] = 'Basic ' + btoa(`${SPOTIFY_CONFIG.clientId}:${SPOTIFY_CONFIG.clientSecret}`);
      }

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers,
        body: bodyParams,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(this.STORAGE_KEYS.accessToken, data.access_token);
        if (data.refresh_token) {
          localStorage.setItem(this.STORAGE_KEYS.refreshToken, data.refresh_token);
        }
        const expiryTime = Date.now() + (data.expires_in || 3600) * 1000;
        localStorage.setItem(this.STORAGE_KEYS.tokenExpiry, expiryTime.toString());
        return data.access_token;
      }
    } catch (err) {
      console.warn('Spotify silent token refresh failed:', err);
    }
    return null;
  }

  /**
   * Returns a valid access token, auto-refreshing if expired or near expiry
   */
  static async getValidAccessToken(): Promise<string | null> {
    const token = localStorage.getItem(this.STORAGE_KEYS.accessToken);
    const expiry = Number(localStorage.getItem(this.STORAGE_KEYS.tokenExpiry) || 0);

    // If token is valid for more than 60 seconds
    if (token && Date.now() < expiry - 60000) {
      return token;
    }

    // Try silent refresh
    const refreshed = await this.refreshAccessToken();
    if (refreshed) return refreshed;

    return token;
  }

  /**
   * Is Spotify connected?
   */
  static async isConnected(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    return Boolean(token);
  }

  /**
   * Disconnect Spotify
   */
  static disconnect(): void {
    localStorage.removeItem(this.STORAGE_KEYS.accessToken);
    localStorage.removeItem(this.STORAGE_KEYS.refreshToken);
    localStorage.removeItem(this.STORAGE_KEYS.tokenExpiry);
    localStorage.removeItem(this.STORAGE_KEYS.codeVerifier);
  }
}

