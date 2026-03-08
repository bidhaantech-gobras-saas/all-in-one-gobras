# Gobras Logistics Suite

A full-featured logistics management system built with React + Vite + Supabase.

## Pages
- **Dashboard** — Stats overview + recent shipments
- **Leads** — Lead management with status tracking
- **Customers** — Customer directory
- **Shipments** — Full shipment management (4-section form)
- **Tracking** — Real-time shipment status updates
- **Invoices** — Invoice management with PDF download

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Supabase
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database schema
Run the SQL files in order in your Supabase SQL Editor:
1. `schema.sql` — Core tables (profiles, customers, shipments)
2. `leads_schema.sql` — Leads table
3. `shipments_invoices_schema.sql` — Shipments columns + Invoices table

### 4. Start development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

## Tech Stack
- **React 18** + **Vite**
- **Supabase** (Auth + Database + RLS)
- **React Router v6** (HashRouter)
- **Lucide React** (Icons)
- **DM Sans + DM Mono** (Google Fonts)
