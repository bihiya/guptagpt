import type { CaptureDataMessage } from '../types/messages';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'CAPTURE_REQUEST') {
    return;
  }

  const payload: CaptureDataMessage = {
    type: 'CAPTURE_DATA',
    tabId: -1,
    url: window.location.href,
    title: document.title,
    html: document.documentElement.outerHTML,
    timestamp: new Date().toISOString(),
    reason: message.reason
  };

  sendResponse(payload);
});
