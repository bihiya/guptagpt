You are a senior full-stack engineer.

Build a production-grade Chrome Extension (Manifest V3) with clean architecture, modular code, and scalability in mind.

## 🎯 Goal
Create a Chrome extension that:
1. Sends current tab HTML + screenshot to backend
2. Supports keyboard shortcut trigger
3. Supports auto-mode (continuous capture)
4. Is optimized, secure, and production-ready

---

## 🏗️ Tech Requirements

- Manifest V3
- TypeScript (strict mode)
- Background Service Worker
- Content Script
- Chrome APIs (tabs, scripting, storage, commands)
- Use modern ES modules
- Use clean folder structure
- No unnecessary dependencies

---

## 📂 Folder Structure

/src
  /background
  /content
  /popup
  /utils
  /types
  manifest.json
  tsconfig.json
  package.json

---

## ⚙️ Features

### 1. Keyboard Shortcut
- Add command:
  - `Ctrl + Shift + Y` (Windows)
  - `Command + Shift + Y` (Mac)
- When triggered:
  - Get current active tab
  - Inject content script (if not already)
  - Extract:
    - Full HTML (`document.documentElement.outerHTML`)
  - Capture screenshot using `chrome.tabs.captureVisibleTab`
  - Send both to background

---

### 2. Backend API Call

- Endpoint:
  POST `/api/capture`

- Payload:
