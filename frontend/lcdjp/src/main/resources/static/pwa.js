






if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('[pwa] service worker registration failed:', err);
    });
  });
}

window.JusticeLinkPWA = (function () {
  let deferredPrompt = null;

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function setInstallOptVisible(visible) {
    var opt = document.getElementById('accountMenuInstallOpt');
    if (opt) opt.style.display = visible ? 'block' : 'none';
  }

  if (isIos() && !isStandalone()) {
    document.addEventListener('DOMContentLoaded', function () {
      setInstallOptVisible(true);
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    deferredPrompt = event;
    setInstallOptVisible(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setInstallOptVisible(false);
  });

  return {
    isIos,
    isStandalone,
    canPromptInstall() {
      return deferredPrompt !== null;
    },
    async promptInstall() {
      if (!deferredPrompt) return { outcome: 'unavailable' };
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setInstallOptVisible(false);
      return choice;
    }
  };
})();

function installPwaApp() {
  if (window.JusticeLinkPWA && window.JusticeLinkPWA.isIos() && !window.JusticeLinkPWA.isStandalone()) {
    alert('To install JusticeLink on your iPhone/iPad:\n\n1. Tap the Share icon (square with an arrow) in Safari\'s toolbar.\n2. Scroll down and tap "Add to Home Screen".\n3. Tap "Add" in the top right.');
    return;
  }
  if (!window.JusticeLinkPWA || !window.JusticeLinkPWA.canPromptInstall()) {
    alert('This app is already installed, or your browser doesn\'t support installing it right now.');
    return;
  }
  window.JusticeLinkPWA.promptInstall();
}
