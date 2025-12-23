
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

/**
 * Opens the Google Picker dialog to allow the user to select a spreadsheet.
 * This function handles lazy loading of the Google Picker API via the gapi script.
 */
export const openPicker = async (): Promise<PickerResult | null> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication required. Please sign in first.");
  }

  return new Promise((resolve, reject) => {
    const showPicker = () => {
      try {
        const google = window.google;
        if (!google || !google.picker) {
           throw new Error("Google Picker API not loaded.");
        }

        // Build the Google Picker dialog
        const picker = new google.picker.PickerBuilder()
          .addView(google.picker.ViewId.SPREADSHEETS)
          .setOAuthToken(token)
          .setCallback((data: any) => {
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
          })
          .build();
        
        picker.setVisible(true);
      } catch (err) {
        console.error("Error creating Google Picker:", err);
        reject(new Error("Failed to initialize Google Picker dialog."));
      }
    };

    // Check if the picker library is already loaded; otherwise, load it
    const initPicker = () => {
      if (window.google && window.google.picker) {
        showPicker();
      } else {
        if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                window.gapi.load('picker', { callback: showPicker });
            };
            script.onerror = () => reject(new Error("Failed to load Google API script."));
            document.body.appendChild(script);
        } else {
            window.gapi.load('picker', { callback: showPicker });
        }
      }
    };

    initPicker();
  });
};
