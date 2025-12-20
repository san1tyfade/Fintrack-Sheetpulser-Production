
export const extractSheetId = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    const cleanInput = input.trim();
    
    // 1. Try to extract from full URL
    // Regex matches /spreadsheets/d/[ID] and stops at the next forward slash or end of string.
    // Capture group ensures we only get the ID part.
    const urlMatch = cleanInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }

    // 2. If not a URL, check if the input itself is a valid ID format
    // Google Sheet IDs are 44 chars, alphanumeric with - and _.
    // We enforce a strict regex with length constraints (min 30 to avoid short garbage, max 100 to avoid buffer issues).
    const validIdRegex = /^[a-zA-Z0-9-_]{30,100}$/;
    
    if (validIdRegex.test(cleanInput)) {
        return cleanInput;
    }

    // Return empty if invalid to prevent injection
    return '';
};

const constructGvizUrl = (id: string, tab: string, range?: string) => {
    // 1. Strict ID Sanitization
    const cleanId = extractSheetId(id);
    if (!cleanId) {
        throw new Error("Invalid Sheet ID: Potentially malicious input detected.");
    }
    
    // 2. Tab Name Validation
    // Prevent Control Characters (0x00-0x1F) which could interfere with URL parsers or logs
    if (/[\x00-\x1F\x7F]/.test(tab)) {
         throw new Error("Invalid Tab Name: Control characters detected.");
    }
    
    // 3. Construct URL with encoding
    // encodeURIComponent is crucial for preventing parameter injection via the 'sheet' param
    let url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    
    if (range) {
        // 4. Range Sanitization
        // Allow only alphanumeric, colons, and exclamation marks (e.g., "A1:B10" or "Sheet1!A1")
        const cleanRange = range.replace(/[^a-zA-Z0-9:!]/g, '');
        url += `&range=${cleanRange}`;
    }
    
    return url;
};

export const validateSheetTab = async (sheetId: string, tabName: string): Promise<boolean> => {
    try {
        const cleanId = extractSheetId(sheetId);
        if (!cleanId || !tabName) return false;

        // Use gviz to check if we can get data. Fetch just header row (A1).
        const url = constructGvizUrl(cleanId, tabName, 'A1');
        
        const res = await fetch(url);
        if (!res.ok) return false;
        
        const text = await res.text();
        // If it's HTML (login page), it's invalid/private
        if (text.includes("<!DOCTYPE html>") || text.includes("<html")) return false;
        
        return true;
    } catch (e) {
        console.warn("Validation check failed:", e);
        return false;
    }
};

export const fetchSheetData = async (sheetId: string, tabName: string): Promise<string> => {
    const cleanId = extractSheetId(sheetId);
    if (!cleanId) throw new Error("Invalid Sheet ID");

    // CRITICAL FIX: We explicitly request range 'A:ZZ' to force gviz to return the spreadsheet 
    // starting from Row 1, even if the first few rows are empty. 
    // Without this, gviz auto-trims leading empty rows, causing a mismatch between 
    // CSV line numbers (0-based) and actual Sheet Row numbers (1-based).
    const url = constructGvizUrl(cleanId, tabName, 'A:ZZ');
    
    const res = await fetch(url);
    
    if (!res.ok) {
         if (res.status === 400) {
             throw new Error(`Tab '${tabName}' not found or invalid. Check the name exactly.`);
         }
         if (res.status === 404) {
             throw new Error(`Sheet ID not found.`);
         }
         throw new Error(`Failed to fetch sheet data (Status: ${res.status}).`);
    }

    const text = await res.text();

    // Check for HTML response which indicates Auth redirect (Private Sheet)
    if (text.trim().startsWith("<!DOCTYPE html>") || text.includes("<html")) {
        throw new Error("Access Denied: The Google Sheet must be 'Public' (Anyone with the link can view).");
    }

    return text;
};