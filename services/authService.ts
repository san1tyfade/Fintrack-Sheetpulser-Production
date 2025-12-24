
import { UserProfile } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          revoke: (accessToken: string, done: () => void) => void;
        };
      };
      picker?: any;
    };
  }
}

let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiration: number = 0;
let currentClientId: string | null = null;

let resolveQueue: Array<{ resolve: (token: string) => void }> = [];

/**
 * Narrowed scopes to follow the principle of least privilege.
 * 'drive.readonly' was removed to avoid broad "See and download all files" warnings.
 * The app now only interacts with files it creates or that the user explicitly picks.
 */
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

export const restoreSession = (token: string, expiration: number) => {
  if (token && expiration && Date.now() < (expiration - 300000)) {
    accessToken = token;
    tokenExpiration = expiration;
    return true;
  }
  return false;
};

export const initGoogleAuth = (clientId: string) => {
  if (!window.google || (tokenClient && currentClientId === clientId)) return !!tokenClient;
  
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: any) => {
        if (!response.error) {
          accessToken = response.access_token;
          tokenExpiration = Date.now() + (response.expires_in * 1000);
          resolveQueue.forEach(q => q.resolve(accessToken!));
        }
        resolveQueue = [];
      }
    });
    currentClientId = clientId;
    return true;
  } catch (e) {
    return false;
  }
};

export const signIn = async (forceConsent = false): Promise<{token: string, expires: number}> => {
  if (accessToken && Date.now() < (tokenExpiration - 300000)) return { token: accessToken, expires: tokenExpiration };

  return new Promise((resolve) => {
    resolveQueue.push({ resolve: (t) => resolve({ token: t, expires: tokenExpiration }) });
    tokenClient?.requestAccessToken(forceConsent ? { prompt: 'consent' } : {});
  });
};

export const getAccessToken = () => (accessToken && Date.now() < (tokenExpiration - 60000)) ? accessToken : null;

export const signOut = () => {
  if (accessToken) window.google?.accounts?.oauth2.revoke(accessToken, () => {});
  accessToken = null;
  tokenExpiration = 0;
};

export const fetchUserProfile = async (token: string): Promise<UserProfile | null> => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
};

/**
 * Attempt to copy the master template. 
 * With drive.file scope, this will likely fail with 403/404 because the app 
 * does not have read access to the master file yet.
 */
export const copyMasterTemplate = async (templateId: string, fileName: string) => {
  const token = getAccessToken();
  if (!token) throw new Error("Auth required");

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName })
  });

  if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
          throw new Error("PRIVACY_RESTRICTION");
      }
      throw new Error("Copy failed.");
  }
  const data = await res.json();
  return { id: data.id, url: `https://docs.google.com/spreadsheets/d/${data.id}/edit` };
};
