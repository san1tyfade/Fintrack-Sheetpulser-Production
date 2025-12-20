Here is the technical documentation for the services layer of the **FinTrack Sheetpulser Portal**.

This application follows a **Serverless, Client-Side Architecture**. It uses Google Sheets as a database/backend, processes all data locally in the browser, and utilizes external APIs for market data.

1\. Data Ingestion & Storage
----------------------------

### **Sheet Service** (services/sheetService.ts)

Responsible for fetching raw data from Google Sheets and validating connections.

*   **Mechanism:** Uses the **Google Visualization API (Gviz)** (/gviz/tq). This is used instead of the standard Sheets API v4 for _reading_ data because it returns structured CSV data efficiently and handles range extraction (e.g., A:ZZ) gracefully.
    
*   **Key Functions:**
    
    *   extractSheetId(url): Extracts and validates the Sheet ID from a full URL using Regex.
        
    *   fetchSheetData(id, tab): Fetches the CSV representation of a specific tab.
        
    *   validateSheetTab(id, tab): Pings a tab to ensure it exists and is accessible before syncing.
        

### **Sheet Write Service** (services/sheetWriteService.ts)

Responsible for **writing** data back to Google Sheets. Unlike reading, writing requires the full **Google Sheets API v4**.

*   **Authentication:** Requires a valid OAuth Access Token (via authService).
    
*   **Key Functions:**
    
    *   add\[Entity\]ToSheet: Appends a new row to the bottom of a specific tab.
        
    *   update\[Entity\]InSheet: Updates a specific row index with new data.
        
    *   deleteRowFromSheet: Uses batchUpdate to remove a specific row dimension.
        
    *   updateLedgerValue: Performs a scan to find a specific category/month cell intersection and updates it (used for the Income/Expense Ledger grid).
        

### **Gemini Service** (services/geminiService.ts)

_Note: Despite the name, this service does_ _**not**_ _call the Google Gemini AI API._This is a **Parser Service** responsible for transforming raw CSV strings into typed TypeScript objects.

*   **Core Logic:**
    
    *   **Header Detection:** Scans the first 15 lines of a CSV to identify the header row using keyword heuristics (e.g., finding a row containing "Ticker" and "Price").
        
    *   **Column Mapping:** dynamically maps CSV columns to object properties regardless of column order.
        
    *   **Typing:** Converts raw strings into Asset, Investment, Trade, Subscription, etc.
        
    *   **Parsers:** Contains specific factory functions like createAssetParser, createTradeParser, etc.
        

2\. External Data & Market Logic
--------------------------------

### **Price Service** (services/priceService.ts)

Fetches real-time market prices for assets.

*   **Crypto Source:** **CoinGecko API** (Free tier).
    
    *   Maps symbols (e.g., 'BTC') to CoinGecko IDs (e.g., 'bitcoin').
        
*   **Stock Source:** **Yahoo Finance API** (via AllOrigins CORS Proxy).
    
    *   Fetches standard stock tickers (e.g., 'AAPL', 'VFV.TO').
        
*   **Strategy:** It separates the list of tickers into Crypto and Stocks, fetches them in parallel, and merges the results into a price map.
    

### **Currency Service** (services/currencyService.ts)

Handles Foreign Exchange (FX) rate conversion.

*   **Source:** **Frankfurter API** (Open source, ECB data).
    
*   **Base Currency:** Hardcoded to CAD.
    
*   **Logic:** Fetches rates relative to CAD. If the API fails, it falls back to a hardcoded DEFAULT\_RATES constant to prevent app crashes.
    

3\. Application Logic
---------------------

### **Portfolio Service** (services/portfolioService.ts)

Acts as the **Reconciliation Engine**.

*   **Problem:** The "Investments" tab in the sheet is a static snapshot. The "Trades" tab is a dynamic history.
    
*   **Solution:** reconcileInvestments combines these two.
    
    1.  It calculates net holdings dynamically from the Trade history.
        
    2.  It merges this with the static Investment rows.
        
    3.  If a ticker exists in Trades but not in Investments (e.g., a new purchase not yet logged in the static sheet), it creates a **Synthetic Investment** object so it appears in the dashboard immediately.
        

### **Classification Service** (services/classificationService.ts)

A utility service to categorize assets based on naming conventions and types.

*   **Functions:** isInvestmentAsset, isFixedAsset, isCashAsset.
    
*   **Logic:** Uses string matching (e.g., if type contains "TFSA" or "Crypto", it's an investment; if type contains "Vehicle", it's a fixed asset). This drives the filtering on the Assets Dashboard.
    

### **Auth Service** (services/authService.ts)

Manages **Google Identity Services (GIS)** OAuth 2.0 flow.

*   **Scope:** https://www.googleapis.com/auth/spreadsheets (Read/Write).
    
*   **Token Management:**
    
    *   initGoogleAuth: Loads the Google script and initializes the Token Client.
        
    *   signIn: Triggers the popup for user consent.
        
    *   getAccessToken: Returns the current token or null if expired.
        

4\. Local Persistence
---------------------

### **IndexedDB Hook** (hooks/useIndexedDB.ts)

Provides an abstraction layer over the browser's **IndexedDB**.

*   **Database Name:** FinTrackDB.
    
*   **Purpose:** Caches all parsed data (assets, trades, config) locally.
    
*   **Benefit:** Allows the app to load instantly on refresh without re-fetching from Google Sheets every time. Data is only updated when the user explicitly clicks "Sync".
