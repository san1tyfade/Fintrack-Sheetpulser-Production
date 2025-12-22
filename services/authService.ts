import { UserProfile } from '../types';

// Types for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }) => TokenClient;
          revoke: (accessToken: string, done: () => void) => void;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiration: number = 0;
let currentClientId: string | null = null;

// Queue for pending sign-in requests
let resolveQueue: Array<{ resolve: (token: string) => void, expires: number }> = [];
let rejectQueue: Array<(error: any) => void> = [];

export const isAuthInitialized = () => !!tokenClient;

/**
 * Restores a session from local storage if valid.
 */
export const restoreSession = (token: string, expiration: number) => {
    if (Date.now() < expiration) {
        accessToken = token;
        tokenExpiration = expiration;
        return true;
    }
    return false;
};

export const initGoogleAuth = (clientId: string) => {
  if (!window.google) return false;
  
  // Normalize Client ID
  const cleanClientId = clientId.trim();
  
  if (tokenClient && currentClientId === cleanClientId) return true;

  const SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly';
  
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: cleanClientId,
      scope: SCOPE,
      callback: (response: TokenResponse) => {
        if (response.error) {
          const errCode = (response.error || '').toLowerCase();
          const errDesc = (response.error_description || '').toLowerCase();
          
          if (errCode === 'popup_closed_by_user' || errDesc.includes('closed') || errCode.includes('closed')) {
              console.warn('User closed the Google Auth popup.');
              rejectQueue.forEach(reject => reject(new Error('POPUP_CLOSED')));
          } else {
              console.error('Google Auth Error:', response);
              rejectQueue.forEach(reject => reject(new Error(response.error || 'Unknown Auth Error')));
          }
        } else {
          accessToken = response.access_token;
          tokenExpiration = Date.now() + (response.expires_in * 1000) - 60000;
          resolveQueue.forEach(q => q.resolve(accessToken!));
        }
        resolveQueue = [];
        rejectQueue = [];
      },
      error_callback: (err: any) => {
          const rawMsg = err.message || err.type || JSON.stringify(err) || "";
          const msg = rawMsg.toLowerCase();
          
          if (msg.includes('popup_closed') || msg.includes('window closed')) {
             console.warn('Google Auth Popup Closed');
             rejectQueue.forEach(reject => reject(new Error('POPUP_CLOSED')));
          } else {
             console.error('Google Auth Script Error:', err);
             rejectQueue.forEach(reject => reject(new Error(rawMsg)));
          }
          rejectQueue = [];
          resolveQueue = [];
      }
    });
    currentClientId = cleanClientId;
    return true;
  } catch (e) {
    console.error("Failed to init token client", e);
    return false;
  }
};

export const signIn = async (forceConsent: boolean = false): Promise<{token: string, expires: number}> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google Auth not initialized. Please enter Client ID in Settings."));
      return;
    }

    if (accessToken && Date.now() < tokenExpiration) {
      resolve({ token: accessToken, expires: tokenExpiration });
      return;
    }

    const timeoutTimer = setTimeout(() => {
        const idx = resolveQueue.findIndex(r => r.resolve === safeResolve);
        if (idx > -1) {
            resolveQueue.splice(idx, 1);
            rejectQueue.splice(idx, 1);
            reject(new Error("Sign-in timed out. Please try again."));
        }
    }, 60000);

    const safeResolve = (token: string) => {
        clearTimeout(timeoutTimer);
        resolve({ token, expires: tokenExpiration });
    };
    
    const safeReject = (err: any) => {
        clearTimeout(timeoutTimer);
        reject(err);
    };

    resolveQueue.push({ resolve: safeResolve, expires: 0 });
    rejectQueue.push(safeReject);

    try {
        if (resolveQueue.length === 1) {
             const config = forceConsent ? { prompt: 'consent' } : {}; 
             tokenClient.requestAccessToken(config);
        }
    } catch (e) {
        const idx = resolveQueue.findIndex(r => r.resolve === safeResolve);
        if (idx > -1) resolveQueue.splice(idx, 1);
        
        const rIdx = rejectQueue.indexOf(safeReject);
        if (rIdx > -1) rejectQueue.splice(rIdx, 1);
        
        clearTimeout(timeoutTimer);
        reject(e);
    }
  });
};

export const getAccessToken = () => {
    if (accessToken && Date.now() < tokenExpiration) return accessToken;
    return null;
};

export const signOut = () => {
    if (accessToken && window.google && window.google.accounts) {
        window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
    tokenExpiration = 0;
};

export const fetchUserProfile = async (token: string): Promise<UserProfile | null> => {
    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            name: data.name,
            email: data.email,
            picture: data.picture
        };
    } catch (e) {
        console.error("Failed to fetch user profile", e);
        return null;
    }
};