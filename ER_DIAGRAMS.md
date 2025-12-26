# Sheetsense: Data Model & ER Diagrams

This document outlines the logical relationships between the data entities used within the Sheetsense ecosystem. These relationships are enforced by the application's service layer (e.g., `portfolioService.ts`, `geminiService.ts`).

## 1. Core Component Relationships

The application is divided into five functional modules. While most data is stored in flat tables within Google Sheets, they are reconciled in-memory.

```mermaid
erDiagram
    USER ||--o{ ASSET : owns
    USER ||--o{ TRADE : logs
    USER ||--o{ SUBSCRIPTION : pays
    USER ||--o{ BANK_ACCOUNT : maintains
    USER ||--o{ TAX_RECORD : tracks
    
    INVESTMENT }|..|| ASSET : "is categorized as"
    INVESTMENT ||..|{ TRADE : "reconciled via ticker"
    
    BANK_ACCOUNT ||--o{ SUBSCRIPTION : "provides payment method"
    BANK_ACCOUNT ||--o{ ASSET : "maps to balance"
```

---

## 2. Portfolio Module (Investments & Trades)

The Portfolio module uses a **Reconciliation Engine**. It takes a static snapshot of current assets and applies the historical trade log to determine true net quantities and cost bases.

```mermaid
erDiagram
    INVESTMENT {
        string ticker PK
        string name
        float quantity
        float avgPrice
        float currentPrice
        string accountName
        string assetClass
    }
    TRADE {
        string id PK
        string ticker FK
        date date
        string type "BUY/SELL"
        float quantity
        float price
        float total
        float fee
    }
    INVESTMENT ||--o{ TRADE : "historical activity"
```

- **Primary Key**: `ticker` (Normalized to uppercase, e.g., "AAPL").
- **Relationship**: 1 Ticker can have many Trades. The sum of Trade quantities (BUY as +, SELL as -) determines the `Investment.quantity`.

---

## 3. Dashboard & Net Worth Module

This module aggregates all assets and historical snapshots to generate trend lines.

```mermaid
erDiagram
    NET_WORTH_ENTRY {
        date date PK
        float value
    }
    ASSET {
        string id PK
        string name
        string type "Fixed/Financial"
        float value
        string currency
        date lastUpdated
    }
    NET_WORTH_ENTRY }|--|| ASSET : "sum of all at point in time"
```

- **Logic**: The `NetWorthEntry` is a time-series record of the total `Asset.value` sum at the moment of a "Log Net Worth" action.

---

## 4. Cash Flow Ledger (Income & Expenses)

The Ledger uses a hierarchical grid model to support the Sankey diagram and monthly budget tracking.

```mermaid
erDiagram
    LEDGER_CATEGORY {
        string name PK
        float total
    }
    LEDGER_ITEM {
        string name PK
        string parentCategory FK
        float[] monthlyValues "Array(12)"
        float total
    }
    LEDGER_CATEGORY ||--|{ LEDGER_ITEM : contains
```

- **Structure**: A `LedgerCategory` (e.g., "Housing") contains multiple `LedgerItems` (e.g., "Rent", "Utilities", "Insurance").
- **Persistence**: Every item maps to a specific `rowIndex` in the Google Sheet for bi-directional updates.

---

## 5. Information & Liabilities Module

This module manages fixed costs, bank account metadata, and tax-advantaged contribution room.

```mermaid
erDiagram
    BANK_ACCOUNT {
        string id PK
        string institution
        string accountNumber "Last 4"
        string transactionType "Debit/Credit"
    }
    SUBSCRIPTION {
        string id PK
        string name
        float cost
        string period "Monthly/Yearly"
        string paymentMethod FK
    }
    TAX_RECORD {
        string id PK
        string recordType "TFSA/FHSA/RRSP"
        string transactionType "Contribution/Withdrawal"
        float value
        date date
    }
    BANK_ACCOUNT ||--o{ SUBSCRIPTION : "pays for"
```

- **Constraint**: `Subscription.paymentMethod` is a string that ideally matches the `BankAccount.institution` or `BankAccount.name` to provide cross-module context.
- **Tax Room**: `TaxRecord` entries are filtered by `recordType` and summed to calculate the "Used" portion of the "Maximum Lifetime Limit" defined for that account type.
