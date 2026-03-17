# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm start         # Start Express server on http://localhost:3000
```

No test suite exists (`npm test` exits with code 1). Manual testing: visit `http://localhost:3000` for storefront, `/admin/login.html` for admin panel.

## Architecture

**Veni-Guapa** is a Node.js/Express e-commerce gallery for a fashion boutique. Three layers:

### Backend (`server.js`)
Single Express file serving both static frontends and REST API:
- CORS whitelist in `ALLOWED_ORIGINS` — add production domains when deploying
- Admin authentication via `x-admin-key` header (value from `.env` as `ADMIN_KEY`)
- Firebase Admin SDK from `serviceAccountKey.json` locally or `FIREBASE_SERVICE_ACCOUNT` env var in production
- Image pipeline: Multer (memory storage) → Sharp (optimization) → Firebase Cloud Storage → signed URL stored in Firestore

**API routes:**
- `POST /api/productos` — create product with image upload (multipart)
- `DELETE /api/productos/:id` — delete product and associated Storage image
- `GET /api/categorias` — fetch categories (auto-creates base set if empty)
- `GET /healthz` / `GET /healthz/deep` — health checks

### Storefront (`tienda/`)
Vanilla JS single-page gallery:
- `content.js` — exports `siteContent` with store name, slogan, WhatsApp number, Instagram. **First file to edit when adapting for a new client.**
- `scripts.js` — Firebase client init, real-time Firestore `onSnapshot()` listeners per category, carousel navigation, image modal with swipe/keyboard support, WhatsApp link generation
- `index.html` — static shell; categories and products are dynamically injected from Firestore at runtime

### Admin Panel (`admin/`)
Vanilla JS ES modules:
- Login stores admin key in `localStorage` as `vg_admin_key`
- `admin.js` — Detects server URL from `window.location` (localhost vs production), batch image upload (multiple files with individual name/price/category fields), Firestore `onSnapshot()` for real-time product list sync

## Firestore Data Model

- **`productos`**: `{ id, nombre, precio (string), categoria (lowercase string), imagen (signed URL) }`
- **`categorias`**: `{ id, nombre (lowercase string) }`

## Environment Variables

```env
ADMIN_KEY=...                         # Password for admin panel
NODE_ENV=development|production
FIREBASE_STORAGE_BUCKET=gs://...      # Cloud Storage bucket
FIREBASE_SERVICE_ACCOUNT=...          # JSON string (production only)
```

Firebase client config (`firebaseConfig` object) must also be updated in both `tienda/scripts.js` and `admin/admin.js`.
