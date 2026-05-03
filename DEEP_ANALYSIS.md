# Deep Analysis: Capture Platform (Server + Web + Extension)

## What happened in the previous turn
The previous response appears empty, so the analysis request was not completed/output was interrupted.

## End-to-end architecture and flow tracing

### Primary flow: manual capture from extension popup
1. User clicks **Capture now** in `src/popup/index.ts`.
2. Popup sends `CAPTURE_NOW` message to background script (`src/background/index.ts`).
3. Background resolves active tab and attempts `CAPTURE_REQUEST` to content script (`src/content/index.ts`), with script-injection fallback if content script is unavailable.
4. Background applies size constraints and optional media capture:
   - HTML/source slices to `maxHtmlSizeBytes`.
   - screenshot captured and optimized.
   - PDF optionally generated.
5. Background posts payload to server `/api/capture` with bearer token.
6. On success/failure, background updates diagnostics and local logs; failed uploads enter retry queue.
7. Web dashboard fetches `/api/captures` and renders capture list.

### Auto-capture flow
1. Auto-mode settings are stored from popup.
2. Background timer triggers periodic capture.
3. Same payload construction and upload path as manual flow.
4. Retry queue applies backoff and lifecycle logs are posted to `/api/capture-logs`.

### Authentication flow
1. Web auth page calls `/api/auth/signup|login|google`.
2. Server validates and returns token + user profile.
3. Web persists auth (`web/src/auth.ts`) and can sync auth to extension via runtime messaging + allowed origins.
4. Protected backend routes use `requireAuth` middleware.

### Capture logs flow
1. Background emits lifecycle events to `/api/capture-logs`.
2. Server stores log rows keyed to user.
3. Web logs page fetches `/api/capture-logs` and displays recent outcomes.

## Bugs / risks identified

1. **PDF size check uses Base64 string length as if it were byte length** (can reject valid payloads or pass oversized data unexpectedly).
   - In `server/src/routes/captureRoutes.ts`, `MAX_PDF_SIZE` is bytes but compared directly to `pdfBase64.length`.
   - Correct approach: decode-aware estimate (`Math.floor(len * 3/4) - padding`) before enforcing byte limit.

2. **Potentially weak HTML truncation semantics** in extension background.
   - `maxHtmlSizeBytes` suggests byte-based cap, but implementation uses JS string `.slice()` (UTF-16 code units).
   - Multibyte content may exceed intended network/storage size.

3. **Upload timeout mismatch across clients**.
   - Web uses abort timeout (`web/src/services/api.ts`), extension fetch path appears to rely on browser default and queue logic.
   - In flaky networks this can cause prolonged hanging operations and inconsistent user feedback.

4. **Queue growth control is implicit**.
   - Retry queue persists in local storage but no explicit upper bound observed in reviewed sections.
   - Offline/401 loops can accumulate payload-heavy entries and impact extension performance.

5. **Fallback script execution scope risk**.
   - If `sendMessage` fails, background executes inline script on tab. Some CSP/page contexts may still constrain behavior; currently failure path throws generic error.
   - More actionable error categories would improve diagnosis.

## Enhancements (high impact)

1. **Normalize payload sizing server-side**
   - Add explicit byte-size estimators for `html`, `sourceCode`, `screenshotBase64`, and `pdfBase64`.
   - Enforce per-field + total payload ceilings and return structured validation errors.

2. **Add idempotency key for capture POST**
   - Use client-generated `captureId` to prevent duplicate records during retry races.

3. **Harden queue policy**
   - Add max queue length + per-item TTL + eviction policy (oldest/failed-most).

4. **Improve auth-expiry recovery**
   - On repeated 401/403, pause retries and prompt explicit re-auth handshake from popup/web.

5. **Observability**
   - Add correlation IDs across background log events and server logs.
   - Add dashboard counters for success rate, mean upload latency, and failure category trends.

6. **Data model optimization**
   - Add indexes on `{ userId, createdAt }` for captures/logs collections.
   - Consider archival or blob offloading for screenshots/PDFs when data volume grows.

## Scenario matrix (coverage)

- Success: authenticated user, HTTP tab, capture + upload success.
- Partial success: screenshot blocked/throttled, upload still succeeds without image.
- Failure: tab not capturable (`chrome://`, internal pages).
- Failure: server unavailable/network timeout -> queued retry.
- Failure: token expired -> auth-classified errors, retries currently may continue.
- Degraded mode: metadata-only captures.
- Extension/web sync: web login present but extension missing/invalid `VITE_EXTENSION_ID` or `externally_connectable` mismatch.

## Recommended next implementation steps

1. Fix Base64 byte-size validation bug on server.
2. Add shared payload-size utility used by extension + server.
3. Add queue upper bound (e.g., 100 items) and TTL (e.g., 7 days).
4. Add explicit timeout + abort controller for extension upload fetch.
5. Add integration tests for auth expiry, queue retry, and oversized payload behavior.
