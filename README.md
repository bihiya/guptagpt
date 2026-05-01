# Capture Platform Monorepo

## Projects
- `src/`: Chrome Extension (Manifest V3, TypeScript)
- `server/`: Node.js + Express + MongoDB backend
- `web/`: React + Vite frontend dashboard

## Backend
1. Copy `server/.env.example` to `server/.env`
2. Set MongoDB URI and `JWT_SECRET`
3. (Optional) set `GOOGLE_CLIENT_ID` to enable Google login
4. Run:
   - `cd server && npm install && npm run dev`

For local development without a MongoDB service, run:
- `cd server && npm install && npm run dev:memory`

## Frontend
- Copy `web/.env.example` to `web/.env`
- Set `VITE_EXTENSION_ID`
- (Optional) set `VITE_GOOGLE_CLIENT_ID` to show Google login
- `cd web && npm install && npm run dev`

## Chrome Extension
- `npm install` (repo root)
- `npm run build`
- Load `dist/` as unpacked extension
- Set extension backend URL to `http://localhost:3000`

## Auth sync notes
- For web-to-extension auth sync, the extension `manifest.json` must allow the web origin under `externally_connectable.matches`.
- If using the hosted frontend, ensure `https://guptagpt-frontend.vercel.app/*` is included.
- The frontend must be built with the correct `VITE_EXTENSION_ID` for your installed unpacked extension.
