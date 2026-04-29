# Capture Platform Monorepo

## Projects
- `src/`: Chrome Extension (Manifest V3, TypeScript)
- `server/`: Node.js + Express + MongoDB backend
- `web/`: React + Vite frontend dashboard

## Backend
1. Copy `server/.env.example` to `server/.env`
2. Set MongoDB URI
3. Run:
   - `cd server && npm install && npm run dev`

## Frontend
- `cd web && npm install && npm run dev`

## Chrome Extension
- `npm install` (repo root)
- `npm run build`
- Load `dist/` as unpacked extension
- Set extension backend URL to `http://localhost:3000`
