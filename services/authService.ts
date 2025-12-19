
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
  
  if (tokenClient && currentClientId === clientId) return true;

  const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
  
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response: TokenResponse) => {
        if (response.error) {
          // Suppress error if user closed popup
          if (response.error !== 'popup_closed_by_user') {
              console.error('Google Auth Error:', response);
          }
          rejectQueue.forEach(reject => reject(new Error(response.error)));
        } else {
          accessToken = response.access_token;
          tokenExpiration = Date.now() + (response.expires_in * 1000) - 60000;
          resolveQueue.forEach(resolve => resolve(accessToken!));
        }
        resolveQueue = [];
        rejectQueue = [];
      },
      error_callback: (err: any) => {
          // Suppress error if user closed popup
          const msg = err.message || err.type || JSON.stringify(err);
          if (!msg.includes('popup_closed')) {
            console.error('Google Auth Script Error:', err);
          }
          rejectQueue.forEach(reject => reject(new Error(msg)));
          rejectQueue = [];
          resolveQueue = [];
      }
    });
    currentClientId = clientId;
    return true;
  } catch (e) {
    console.error("Failed to init token client", e);
    return false;
  }
};

export const signIn = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google Auth not initialized. Please enter Client ID in Settings."));
      return;
    }

    if (accessToken && Date.now() < tokenExpiration) {
      resolve(accessToken);
      return;
    }

    resolveQueue.push(resolve);
    rejectQueue.push(reject);

    try {
        if (resolveQueue.length === 1) {
             tokenClient.requestAccessToken({ prompt: 'consent' });
        }
    } catch (e) {
        const idx = resolveQueue.indexOf(resolve);
        if (idx > -1) resolveQueue.splice(idx, 1);
        
        const rIdx = rejectQueue.indexOf(reject);
        if (rIdx > -1) rejectQueue.splice(rIdx, 1);
        
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
};
