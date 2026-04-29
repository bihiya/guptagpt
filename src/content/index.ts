chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'CAPTURE_REQUEST') {
    return;
  }

  const payload = {
    type: 'CAPTURE_DATA',
    tabId: -1,
    url: window.location.href,
    title: document.title,
    html: document.documentElement.outerHTML,
    timestamp: new Date().toISOString(),
    reason: message.reason
  } as const;

  sendResponse(payload);
});
