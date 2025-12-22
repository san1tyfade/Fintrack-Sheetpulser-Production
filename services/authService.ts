
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
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiration: number = 0;
let currentClientId: string | null = null;

// Queue for pending sign-in requests
let resolveQueue: Array<(token: string) => void> = [];
let rejectQueue: Array<(error: any) => void> = [];

export const isAuthInitialized = () => !!tokenClient;

export const initGoogleAuth = (clientId: string) => {
  if (!window.google) return false;
  
  // Normalize Client ID
  const cleanClientId = clientId.trim();
  
  if (tokenClient && currentClientId === cleanClientId) return true;

  // Added drive.readonly to allow listing user's spreadsheets without using the Picker UI
  const SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly';
  
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: cleanClientId,
      scope: SCOPE,
      callback: (response: TokenResponse) => {
        if (response.error) {
          // Handle Popup Closed specifically
          if (response.error === 'popup_closed_by_user') {
              console.warn('User closed the Google Auth popup.');
              // We reject with a specific string we can check for later
              rejectQueue.forEach(reject => reject(new Error('POPUP_CLOSED')));
          } else {
              console.error('Google Auth Error:', response);
              rejectQueue.forEach(reject => reject(new Error(response.error)));
          }
        } else {
          accessToken = response.access_token;
          // Set expiration slightly before actual expiry to be safe
          tokenExpiration = Date.now() + (response.expires_in * 1000) - 60000;
          resolveQueue.forEach(resolve => resolve(accessToken!));
        }
        resolveQueue = [];
        rejectQueue = [];
      },
      error_callback: (err: any) => {
          const msg = err.message || err.type || JSON.stringify(err);
          if (msg.includes('popup_closed')) {
             console.warn('Google Auth Popup Closed');
             rejectQueue.forEach(reject => reject(new Error('POPUP_CLOSED')));
          } else {
             console.error('Google Auth Script Error:', err);
             rejectQueue.forEach(reject => reject(new Error(msg)));
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

export const signIn = async (forceConsent: boolean = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google Auth not initialized. Please enter Client ID in Settings."));
      return;
    }

    // Return cached token if valid
    if (accessToken && Date.now() < tokenExpiration) {
      resolve(accessToken);
      return;
    }

    // Timeout safety to prevent hanging (1 minute)
    const timeoutTimer = setTimeout(() => {
        const idx = resolveQueue.findIndex(r => r === safeResolve);
        if (idx > -1) {
            resolveQueue.splice(idx, 1);
            rejectQueue.splice(idx, 1);
            reject(new Error("Sign-in timed out. Please try again."));
        }
    }, 60000);

    const safeResolve = (token: string) => {
        clearTimeout(timeoutTimer);
        resolve(token);
    };
    
    const safeReject = (err: any) => {
        clearTimeout(timeoutTimer);
        reject(err);
    };

    resolveQueue.push(safeResolve);
    rejectQueue.push(safeReject);

    try {
        // Only trigger request if this is the first one in the queue to avoid multiple popups
        if (resolveQueue.length === 1) {
             const config = forceConsent ? { prompt: 'consent' } : {}; 
             tokenClient.requestAccessToken(config);
        }
    } catch (e) {
        // Clean up queue on synchronous failure
        const idx = resolveQueue.indexOf(safeResolve);
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
    accessToken = null;
    tokenExpiration = 0;
    if (window.google && window.google.accounts) {
        window.google.accounts.oauth2.revoke(accessToken || '', () => {});
    }
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
