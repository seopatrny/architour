/* Shows a "TEST VERSION" banner on Vercel preview deployments, so a test link is never
 * mistaken for the real game. Production shows nothing. */
(function () {
  fetch('api/health', { cache: 'no-store' })
    .then((r) => r.json())
    .then((h) => {
      if (h.deployment !== 'preview') return;
      const b = document.createElement('div');
      b.textContent = '🧪 TEST VERSION – not the real game. Scores here use the test database.';
      b.style.cssText = 'position:fixed;z-index:9999;left:50%;bottom:0;transform:translateX(-50%);padding:5px 14px;' +
        'border-radius:10px 10px 0 0;background:#a17bff;color:#fff;font:600 13px system-ui,sans-serif;pointer-events:none;' +
        'box-shadow:0 -2px 10px rgba(0,0,0,.3);white-space:nowrap;max-width:96vw;overflow:hidden;text-overflow:ellipsis';
      document.body.appendChild(b);
    })
    .catch(() => {});
})();
