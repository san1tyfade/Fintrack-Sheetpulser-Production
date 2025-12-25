
import { getAccessToken } from './authService';

const VAULT_FILENAME = 'sheetsense_vault.json';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * Searches for the Sheetsense vault file in the user's Drive.
 */
export const findVaultFile = async (): Promise<DriveFile | null> => {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required.");

  const q = encodeURIComponent(`name = '${VAULT_FILENAME}' and trashed = false`);
  const res = await fetch(`${DRIVE_API_URL}?q=${q}&fields=files(id, name, modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error("Failed to search Google Drive.");

  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

/**
 * Uploads the vault payload to Google Drive. 
 * Creates a new file if fileId is not provided, otherwise updates existing.
 */
export const uploadVaultFile = async (payload: any, fileId?: string): Promise<string> => {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required.");

  const metadata = {
    name: VAULT_FILENAME,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(payload, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    close_delim;

  let url = UPLOAD_API_URL;
  let method = 'POST';

  if (fileId) {
    url = `${UPLOAD_API_URL}/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    url = `${UPLOAD_API_URL}?uploadType=multipart`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || "Cloud upload failed.");
  }

  const data = await res.json();
  return data.id;
};

/**
 * Downloads the content of the vault file from Google Drive.
 */
export const downloadVaultFile = async (fileId: string): Promise<string> => {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required.");

  const res = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error("Failed to download vault from cloud.");

  return await res.text();
};
