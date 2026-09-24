/** Device / browser detection for choosing the right AR path and permission instructions. */
export function getPlatform() {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const os = /iPad|iPhone|iPod/.test(ua) || iPadOS ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop';
  let browser = 'other';
  if (os === 'ios') {
    browser = /CriOS/.test(ua) ? 'chrome' : /FxiOS/.test(ua) ? 'firefox' : /EdgiOS/.test(ua) ? 'edge' : 'safari';
  } else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/Firefox\//.test(ua)) browser = 'firefox';
  else if (/Edg(A|e)?\//.test(ua)) browser = 'edge';
  else if (/Chrome\//.test(ua)) browser = 'chrome';
  else if (/Safari\//.test(ua)) browser = 'safari';
  const quickLook = os === 'ios' && Boolean(document.createElement('a').relList?.supports?.('ar'));
  const camera = Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;
  return { os, browser, quickLook, camera };
}

const BROWSER_NAME = { safari: 'Safari', chrome: 'Chrome', firefox: 'Firefox', edge: 'Edge', samsung: 'Samsung Internet', other: 'your browser' };
export const browserName = (b) => BROWSER_NAME[b] || BROWSER_NAME.other;

/** Step-by-step instructions to re-enable a blocked camera, per OS + browser. */
export function cameraHelp({ os, browser }) {
  if (os === 'ios') {
    if (browser === 'safari') return [
      'Tap the “aA” button in the address bar → Website Settings → Camera → Allow.',
      'If that is greyed out: iPhone Settings → Apps → Safari → Camera → Allow (or Ask).',
      'Then come back and tap “Try again”.',
    ];
    return [
      `Open iPhone Settings → Apps → ${browserName(browser)} → turn on Camera.`,
      'Also check Settings → Screen Time → Content & Privacy Restrictions → Camera is allowed.',
      'Then come back and tap “Try again”.',
    ];
  }
  if (os === 'android') {
    if (browser === 'firefox') return [
      'Tap the lock icon in the address bar → Camera → Allow (or ⋮ → Settings → Site permissions → Camera).',
      'Make sure Android Settings → Apps → Firefox → Permissions → Camera is allowed.',
      'Then tap “Try again”.',
    ];
    if (browser === 'samsung') return [
      'Tap the lock icon in the address bar → Permissions → Camera → Allow.',
      'Make sure Android Settings → Apps → Samsung Internet → Permissions → Camera is allowed.',
      'Then tap “Try again”.',
    ];
    return [
      'Tap the settings/lock icon left of the address → Permissions → Camera → Allow.',
      `Make sure Android Settings → Apps → ${browserName(browser)} → Permissions → Camera is allowed.`,
      'Then tap “Try again”.',
    ];
  }
  return [
    'Click the camera or lock icon in the address bar and allow the camera for this site.',
    'Check your system privacy settings allow the browser to use the camera.',
    'Then click “Try again”.',
  ];
}
