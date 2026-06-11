/*
 * runtime-anomaly-probe.js  —  coletor de anomalias em RUNTIME (browser)
 *
 * Instala "sondas" na app rodando e acumula tudo que cheira a problema:
 *   - erros de console (console.error / console.warn)
 *   - exceções JS não tratadas (window 'error') e promessas rejeitadas
 *   - recursos que falham ao carregar (img/script/css quebrados)
 *   - requisições fetch/XHR que falham (status >= 400 ou erro de rede)
 *   - imagens quebradas no DOM (naturalWidth === 0)
 *   - estado do service worker / caches
 *
 * NÃO altera dados nem a app — só observa.
 *
 * Uso:
 *   1) Cole este arquivo inteiro no console do navegador (na app), OU
 *      injete via Claude in Chrome (javascript_tool).
 *   2) Navegue pela app normalmente.
 *   3) Rode  __kabooDebug.report()   pra ver o resumo a qualquer momento.
 *      Outras: __kabooDebug.brokenImages(), await __kabooDebug.sw(), __kabooDebug.reset(), __kabooDebug.dump()
 */
(() => {
  if (window.__kabooDebug && window.__kabooDebug.__installed) {
    console.log('[kabooDebug] já instalado. Use __kabooDebug.report()');
    return;
  }

  const MAX = 500;
  const store = { consoleErrors: [], consoleWarns: [], jsErrors: [], rejections: [], resourceErrors: [], netFailures: [] };
  const push = (arr, item) => { arr.push({ t: new Date().toISOString(), ...item }); if (arr.length > MAX) arr.shift(); };
  const safe = (v) => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch { return String(v); } };

  // --- console.error / warn ---
  const origErr = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...a) => { push(store.consoleErrors, { msg: a.map(safe).join(' ').slice(0, 500) }); origErr(...a); };
  console.warn = (...a) => { push(store.consoleWarns, { msg: a.map(safe).join(' ').slice(0, 500) }); origWarn(...a); };

  // --- erros JS + recursos quebrados (img/script/css) — fase de captura ---
  window.addEventListener('error', (e) => {
    const el = e.target;
    if (el && el !== window && (el.tagName === 'IMG' || el.tagName === 'SCRIPT' || el.tagName === 'LINK')) {
      push(store.resourceErrors, { tag: el.tagName, url: el.currentSrc || el.src || el.href || '' });
    } else {
      push(store.jsErrors, { msg: e.message, src: `${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}` });
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    push(store.rejections, { reason: safe(e.reason && (e.reason.message || e.reason)).slice(0, 500) });
  });

  // --- fetch ---
  const origFetch = window.fetch;
  if (origFetch && !origFetch.__kabooWrapped) {
    const wrapped = async (...args) => {
      const url = (args[0] && args[0].url) || String(args[0] || '');
      const method = (args[1] && args[1].method) || (args[0] && args[0].method) || 'GET';
      try {
        const res = await origFetch(...args);
        if (!res.ok) push(store.netFailures, { kind: 'fetch', method, url: url.slice(0, 200), status: res.status });
        return res;
      } catch (err) {
        push(store.netFailures, { kind: 'fetch', method, url: url.slice(0, 200), status: 'NETWORK', error: safe(err && err.message) });
        throw err;
      }
    };
    wrapped.__kabooWrapped = true;
    window.fetch = wrapped;
  }

  // --- XHR ---
  const XHR = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  if (XHR && !XHR.__kabooWrapped) {
    const open = XHR.open;
    XHR.open = function (method, url, ...rest) { this.__kaboo = { method, url: String(url) }; return open.call(this, method, url, ...rest); };
    XHR.addEventListener && (function () {})();
    const send = XHR.send;
    XHR.send = function (...a) {
      this.addEventListener('loadend', () => {
        const m = this.__kaboo || {};
        if (this.status === 0) push(store.netFailures, { kind: 'xhr', method: m.method, url: (m.url || '').slice(0, 200), status: 'NETWORK' });
        else if (this.status >= 400) push(store.netFailures, { kind: 'xhr', method: m.method, url: (m.url || '').slice(0, 200), status: this.status });
      });
      return send.apply(this, a);
    };
    XHR.__kabooWrapped = true;
  }

  const brokenImages = () => [...document.querySelectorAll('img')]
    .filter((i) => i.complete && i.naturalWidth === 0)
    .map((i) => ({ alt: i.alt || '', src: i.currentSrc || i.src || '' }));

  const sw = async () => {
    const out = { online: navigator.onLine, registrations: [], caches: [] };
    try { out.registrations = (await navigator.serviceWorker.getRegistrations()).map((r) => ({ scope: r.scope, active: r.active && r.active.scriptURL })); } catch (e) { out.registrations = 'erro: ' + e.message; }
    try { out.caches = await caches.keys(); } catch (e) { out.caches = 'erro: ' + e.message; }
    return out;
  };

  const report = () => {
    const imgs = brokenImages();
    const summary = {
      url: location.href,
      consoleErrors: store.consoleErrors.length,
      consoleWarns: store.consoleWarns.length,
      jsErrors: store.jsErrors.length,
      rejections: store.rejections.length,
      resourceErrors: store.resourceErrors.length,
      netFailures: store.netFailures.length,
      brokenImagesNow: imgs.length,
    };
    console.log('%c[kabooDebug] RESUMO', 'font-weight:bold;font-size:13px', summary);
    if (store.jsErrors.length) console.log('  JS errors:', store.jsErrors.slice(-10));
    if (store.netFailures.length) console.log('  Net failures:', store.netFailures.slice(-15));
    if (store.resourceErrors.length) console.log('  Recursos quebrados:', store.resourceErrors.slice(-15));
    if (imgs.length) console.log('  Imagens quebradas agora:', imgs);
    if (store.consoleErrors.length) console.log('  console.error:', store.consoleErrors.slice(-10));
    return summary;
  };

  window.__kabooDebug = {
    __installed: true,
    store,
    brokenImages,
    sw,
    report,
    dump: () => JSON.parse(JSON.stringify({ ...store, brokenImagesNow: brokenImages() })),
    reset: () => { Object.keys(store).forEach((k) => (store[k].length = 0)); console.log('[kabooDebug] limpo'); },
  };

  // varredura inicial de imagens quebradas (após settle)
  setTimeout(() => { const b = brokenImages(); if (b.length) console.warn('[kabooDebug] imagens quebradas no load:', b.length); }, 2500);

  console.log('%c[kabooDebug] sondas instaladas.', 'color:#5D1F58;font-weight:bold', 'Navegue e rode __kabooDebug.report()');
})();
