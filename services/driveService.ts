
import { getAccessToken } from "./authService";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
}

export const listSpreadsheets = async (): Promise<DriveFile[]> => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Query: MimeType is spreadsheet, not in trash
  const q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const fields = "files(id, name, modifiedTime, webViewLink)";
  
  const params = new URLSearchParams({
    q,
    fields,
    orderBy: "modifiedTime desc",
    pageSize: "20"
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    let errorMessage = `Status ${response.status}`;
    try {
        const errorBody = await response.json();
        // Google APIs usually return { error: { code, message, errors: [] } }
        if (errorBody.error && errorBody.error.message) {
            errorMessage = errorBody.error.message;
        } else {
            errorMessage = JSON.stringify(errorBody);
        }
    } catch (e) {
        // If JSON parsing fails, fall back to statusText
        errorMessage = response.statusText || errorMessage;
    }
    
    throw new Error(`Drive API Error: ${errorMessage}`);
  }

  const data = await response.json();
  return data.files || [];
};
