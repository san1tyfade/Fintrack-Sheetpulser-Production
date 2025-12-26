# Sheetsense Parser: Technical Reference & Troubleshooting

This document details the architecture and heuristic logic of `services/geminiService.ts`, which acts as the translation layer between raw Google Sheets CSV data and the application's internal data structures.

## 1. The Ingestion Pipeline

Data flows through the following stages:
1.  **Raw Fetch**: `sheetService.ts` fetches a rectangular grid (`A1:ZZ`) from the Google Sheets API.
2.  **CSV Conversion**: The JSON array is converted into a standard CSV string to facilitate line-by-line parsing.
3.  **Discovery Phase**: The parser scans the first 15 lines of a sheet to identify the "Header Row" using keyword scoring.
4.  **Index Resolution**: Once a header row is found, fuzzy matching maps column indices to object properties.
5.  **Row Mapping**: Every subsequent row is passed through a type-specific factory function.
6.  **Sanitization**: Numbers and dates are normalized into standard formats.

---

## 2. Header Discovery Logic

### Heuristic Scoring
The parser does not assume headers are on Row 1. It uses `HEADER_KEYWORDS` to "score" candidate rows. A row is promoted to a header if it contains at least two matches from the keyword list.

### Fuzzy Matching (`resolveColumnIndex`)
To handle user variations (e.g., "Quantity" vs "Qty" vs "Units"), the parser:
1.  **Normalizes** strings: Lowercases and removes all non-alphanumeric characters.
2.  **Exact Match**: Looks for a perfect normalized match.
3.  **Partial Match**: If no exact match is found, it looks for a "contained" match (e.g., "Account" matches "Account/Fund").

---

## 3. Data Sanitization Utilities

### Number Parsing (`parseNumber`)
Highly robust to financial formatting:
-   Handles parentheses for negative values: `(1,234.50)` becomes `-1234.5`.
-   Strips currency symbols ($) and thousands separators (,).
-   Returns `0` instead of `NaN` for invalid strings to prevent UI crashes.

### Date Parsing (`parseFlexibleDate`)
Supports multiple common spreadsheet formats:
-   **ISO**: `2024-01-01`
-   **Short Month**: `Jan-24` (Crucial for ledger headers)
-   **Slash/Dot**: `01.01.2024` or `01/01/2024`

---

## 4. Special Grid Parsers (Ledgers)

Unlike standard list-based sheets (Trades, Assets), the `Income` and `Expense` sheets use a **Cross-Tab Grid** layout (Categories on Y-axis, Months on X-axis).

### `parseIncomeAndExpenses`
-   **Anchor Detection**: Searches for the string "Total Income" or "Annual Snapshot" to find the primary value row.
-   **Dynamic Columns**: Detects how many months of data exist by counting valid date headers in the date row.
-   **Category Extraction**: Collects all non-total, non-excluded rows below the date header.

### `parseDetailedIncome/Expenses`
-   Used for the Sankey flow and Bar Chart drill-downs.
-   Identifies sub-categories by checking indentation or empty "parent" rows.
-   Stores `rowIndex` for every cell, allowing the `IncomeLedger` component to write updates back to the exact cell in Google Sheets.

---

## 5. Security & Integrity

### Key Safety (`isSafeKey`)
Prevents **Prototype Pollution**. Since category names are used as dynamic keys in Javascript objects during the "flattening" process for charts, we explicitly block keys like `__proto__`, `constructor`, and `toString`.

---

## 6. Common Troubleshooting Scenarios

| Issue | Likely Root Cause | Solution |
| :--- | :--- | :--- |
| **Rows being overwritten** | Column A ("Account Type") failed to map, resulting in `null` leading columns. | Add the specific header string to `HEADER_KEYWORDS` or mapping array in `sheetWriteService.ts`. |
| **Missing month data** | Date header format unrecognized (e.g., "January 2024"). | Update `parseFlexibleDate` regex to handle the specific format. |
| **"Unknown Ticker"** | Symbol contains extra text like "AAPL (NASDAQ)". | `normalizeTicker` already handles parentheses, but check for exchange prefixes (e.g. "NASDAQ:AAPL"). |
| **Values appearing as 0** | Column mapping is correct but data contains non-numeric chars (e.g. "TBD"). | `parseNumber` returns 0 for non-numeric strings; check source data integrity. |

## 7. Developer Notes for Adding New Data Types
1.  Define the interface in `types.ts`.
2.  Add keywords to `HEADER_KEYWORDS` in `geminiService.ts`.
3.  Create a `create[Type]Parser` factory function.
4.  Update the `switch` statement in `parseRawData`.
5.  Update `sheetWriteService.ts` with a corresponding `map[Type]ToRow` function to support manual additions.
