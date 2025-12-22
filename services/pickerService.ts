

declare global {
  interface Window {
    gapi: any;
    // google declaration removed to avoid conflict with authService.ts
  }
}

let pickerApiLoaded = false;

export const loadPickerApi = () => {
  if (pickerApiLoaded) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    // Increase timeout to 10 seconds (20 attempts * 500ms)
    const waitForGapi = (attempts: number) => {
        if (window.gapi) {
            window.gapi.load('picker', {
                callback: () => {
                    // Critical Fix: Check window.google.picker, not just gapi.picker
                    if ((window.google as any)?.picker || window.gapi?.picker) {
                        pickerApiLoaded = true;
                        resolve();
                    } else {
                        console.warn("gapi.load('picker') callback fired but google.picker is undefined");
                        // Don't reject immediately, sometimes it takes a split second more
                        if (attempts > 0) setTimeout(() => waitForGapi(attempts - 1), 500);
                        else reject(new Error("Google Picker API loaded but 'google.picker' object is missing."));
                    }
                },
                onerror: () => reject(new Error("Failed to load Google Picker API script"))
            });
        } else {
            if (attempts > 0) {
                setTimeout(() => waitForGapi(attempts - 1), 500);
            } else {
                reject(new Error("Google API script (gapi) not loaded in browser. Check ad blockers."));
            }
        }
    };
    
    waitForGapi(20);
  });
};

export const openSheetPicker = (oauthToken: string, appId: string, apiKey: string, callback: (doc: { id: string, name: string, url: string } | null) => void) => {
    // Defensive load check
    const pickerApi = (window.google as any)?.picker || window.gapi?.picker;

    if (!pickerApi) {
        alert("Google Picker library is missing or not fully loaded. Please refresh the page.");
        return;
    }

    try {
        // Robustly get ViewId
        const viewId = pickerApi.ViewId ? pickerApi.ViewId.SPREADSHEETS : 'spreadsheets';
        const view = new pickerApi.View(viewId);
        view.setMimeTypes("application/vnd.google-apps.spreadsheet");

        // Calculate the origin safely
        let origin = "http://localhost";
        try {
            if (window.location.protocol !== 'file:') {
                origin = window.location.protocol + '//' + window.location.host;
            }
        } catch (e) {
            console.warn("Could not determine origin, defaulting to localhost");
        }

        const builder = new pickerApi.PickerBuilder()
            .enableFeature(pickerApi.Feature?.NAV_HIDDEN || 'navHidden')
            .enableFeature(pickerApi.Feature?.MULTISELECT_ENABLED || 'multiselectEnabled', false)
            .setOAuthToken(oauthToken)
            .setDeveloperKey(apiKey)
            .setOrigin(origin)
            .addView(view)
            .setCallback((data: any) => {
                const action = data.action;
                const picked = pickerApi.Action?.PICKED || 'picked';
                const cancel = pickerApi.Action?.CANCEL || 'cancel';

                if (action === picked) {
                    const doc = data.docs[0];
                    callback({
                        id: doc.id,
                        name: doc.name,
                        url: doc.url
                    });
                } else if (action === cancel) {
                    callback(null);
                }
            });
        
        if (appId) {
            builder.setAppId(appId);
        }

        const picker = builder.build();
        picker.setVisible(true);
    } catch (e: any) {
        console.error("Error building picker:", e);
        const msg = e.message || JSON.stringify(e);
        alert(`Failed to open Google Picker: ${msg}\n\nCheck console for details.`);
    }
};
