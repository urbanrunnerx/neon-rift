(() => {
  'use strict';
  let deferredPrompt = null;
  let installedHere = false;
  const button = document.getElementById('installButton');
  const status = document.getElementById('installStatus');
  const cache = document.getElementById('cacheStatus');
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const setStatus = text => { if (status) status.textContent = text; };
  const manual = 'Open this page in Chrome or Samsung Internet. Use the browser menu → Add to Home screen / Install app if no prompt appears.';
  setStatus(standalone() ? 'Already running as an installed web app.' : manual);
  if (button && standalone()) { button.textContent = 'Open Neon Rift'; }
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); deferredPrompt = event;
    if (button) button.textContent = 'Install Neon Rift';
    setStatus('Your browser is ready to offer installation. Tap Install Neon Rift.');
  });
  if (button) button.addEventListener('click', async () => {
    if (installedHere || standalone()) { location.href = 'index.html'; return; }
    if (!deferredPrompt) { setStatus(manual); return; }
    const prompt = deferredPrompt; deferredPrompt = null;
    try { await prompt.prompt(); const result = await prompt.userChoice;
      setStatus(result.outcome === 'accepted' ? 'Installation accepted. Your browser will complete it.' : 'Installation dismissed. You can still use Open and explore.');
    } catch (error) { setStatus(manual); }
  });
  addEventListener('appinstalled', () => { installedHere = true; deferredPrompt = null; setStatus('Installed. Look for Neon Rift on your phone.'); if (button) button.textContent = 'Open Neon Rift'; });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(async () => {
      await navigator.serviceWorker.ready;
      if (cache) cache.textContent = 'Offline ready';
    }).catch(() => { if (cache) cache.textContent = 'Online only · cache unavailable'; });
  } else if (cache) cache.textContent = 'Offline access needs HTTPS';
})();
