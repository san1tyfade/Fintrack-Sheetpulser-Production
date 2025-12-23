
import { getAccessToken } from './authService';

// --- Google Picker API Implementation ---

declare global {
  interface Window {
    gapi: any;
  }
}

export interface PickerResult {
  id: string;
  name: string;
  url: string;
}

let isGapiLoading = false;

/**
 * Opens the Google Picker dialog to allow the user to select a spreadsheet.
 * 
 * FIXES FOR DESKTOP:
 * 1. Omit Developer Key: Prevents "Invalid Key" errors if the Gemini key isn't Picker-authorized.
 * 2. setAppId: Uses the numerical part of the Client ID for identification.
 * 3. setOrigin: Explicitly defined for the postMessage handshake between Picker and App.
 */
export const openPicker = async (clientId?: string): Promise<PickerResult | null> => {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error("Authentication required. Please sign in first.");
  }

  return new Promise((resolve, reject) => {
    const showPicker = () => {
      try {
        const google = window.google;
        if (!google || !google.picker) {
           throw new Error("Google Picker API module not found.");
        }

        const view = new google.picker.View(google.picker.ViewId.SPREADSHEETS);
        
        const builder = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          // desktop communication helper
          .setOrigin(window.location.origin.replace(/\/$/, ""));
          
        // Use App ID if client ID is provided (numerical part before the first hyphen)
        if (clientId) {
            const appId = clientId.split('-')[0];
            builder.setAppId(appId);
        }

        builder.setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            resolve({
              id: doc.id,
              name: doc.name,
              url: doc.url
            });
          } else if (data.action === google.picker.Action.CANCEL) {
            resolve(null);
          }
        });
          
        const picker = builder.build();
        picker.setVisible(true);
      } catch (err) {
        console.error("Error creating Google Picker:", err);
        reject(new Error("Google Picker failed to initialize. Ensure pop-ups are allowed and Third-Party Cookies are enabled."));
      }
    };

    const loadPickerModule = () => {
      if (!window.gapi) {
        reject(new Error("GAPI base script not found."));
        return;
      }
      window.gapi.load('picker', { 
        callback: showPicker,
        onerror: () => reject(new Error("Failed to load Google Picker module."))
      });
    };

    // 1. Fully loaded
    if (window.gapi && window.google?.picker) {
      showPicker();
      return;
    }

    // 2. GAPI exists, load picker module
    if (window.gapi) {
      loadPickerModule();
      return;
    }

    // 3. Inject GAPI script
    if (isGapiLoading) return;
    isGapiLoading = true;

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isGapiLoading = false;
      loadPickerModule();
    };
    script.onerror = () => {
      isGapiLoading = false;
      reject(new Error("Failed to load Google API base script."));
    };
    document.body.appendChild(script);
  });
};
