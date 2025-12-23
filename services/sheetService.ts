import { getAccessToken } from './authService';

export const extractSheetId = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    const cleanInput = input.trim();
    
    // 1. Try to extract from full URL
    const urlMatch = cleanInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }

    // 2. If not a URL, check if the input itself is a valid ID format
    const validIdRegex = /^[a-zA-Z0-9-_]{30,100}$/;
    
    if (validIdRegex.test(cleanInput)) {
        return cleanInput;
    }

    return '';
};

export const validateSheetTab = async (sheetId: string, tabName: string): Promise<boolean> => {
    try {
        const token = getAccessToken();
        const cleanId = extractSheetId(sheetId);
        if (!cleanId || !tabName || !token) return false;

        const range = encodeURIComponent(`${tabName}!A1`);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}`;
        
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        return res.ok;
    } catch (e) {
        console.warn("Validation check failed:", e);
        return false;
    }
};

export const fetchSheetData = async (sheetId: string, tabName: string): Promise<string[][]> => {
    const token = getAccessToken();
    if (!token) throw new Error("Authentication required. Please sign in to sync data.");

    const cleanId = extractSheetId(sheetId);
    if (!cleanId) throw new Error("Invalid Sheet ID");

    const range = encodeURIComponent(`${tabName}!A:ZZ`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}`;
    
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
         if (res.status === 401) throw new Error("Session expired. Please sign in again.");
         if (res.status === 403) throw new Error("Access denied. Ensure you have permission to view this sheet.");
         if (res.status === 404) throw new Error("Sheet or Tab not found.");
         throw new Error(`Failed to fetch sheet data (Status: ${res.status}).`);
    }

    const data = await res.json();
    return data.values || [];
};