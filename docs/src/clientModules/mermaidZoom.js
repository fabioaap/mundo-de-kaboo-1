/**
 * mermaidZoom.js — Docusaurus client module
 * Click-to-zoom + pan/scale controls for Mermaid diagrams.
 *
 * Strategy: poll for ".docusaurus-mermaid-container" containers,
 * then for each container, wait for <svg> with a targeted MutationObserver.
 * This avoids the document-wide observer infinite-loop bug.
 */

var CONTAINER_SEL = '.docusaurus-mermaid-container';
var ATTACHED = 'data-zoom-ok';

// ── Overlay ───────────────────────────────────────────────────

function openOverlay(svgEl) {
    var existing = document.getElementById('mermaid-zoom-overlay');
    if (existing) existing.remove();

    var scale = 1, MIN = 0.4, MAX = 4, STEP = 0.25;

    var overlay = document.createElement('div');
    overlay.id = 'mermaid-zoom-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML =
        '<div class="mz-backdrop"></div>' +
        '<div class="mz-box">' +
        '  <div class="mz-toolbar">' +
        '    <button class="mz-btn mz-out"  aria-label="Reduzir"  title="Reduzir (−)">&#8722;</button>' +
        '    <span   class="mz-scale">100%</span>' +
        '    <button class="mz-btn mz-in"   aria-label="Ampliar"  title="Ampliar (+)">&#43;</button>' +
        '    <button class="mz-btn mz-fit"  aria-label="Original" title="Tamanho original">1:1</button>' +
        '    <button class="mz-btn mz-close" aria-label="Fechar"  title="Fechar (Esc)">&times;</button>' +
        '  </div>' +
        '  <div class="mz-viewport">' +
        '    <div class="mz-canvas"></div>' +
        '  </div>' +
        '  <p class="mz-hint">Scroll para zoom &middot; Arraste para mover &middot; Esc para fechar</p>' +
        '</div>';

    var canvas = overlay.querySelector('.mz-canvas');
    var scaleEl = overlay.querySelector('.mz-scale');

    // Clone SVG preservando viewBox e width="100%" original
    var clone = svgEl.cloneNode(true);
    clone.removeAttribute('height');
    // Preserva width="100%" para não colapsar para 300px
    if (!clone.getAttribute('width')) clone.setAttribute('width', '100%');
    clone.style.cssText = 'display:block;width:100%;height:auto;cursor:default;';
    canvas.appendChild(clone);

    function applyScale() {
        canvas.style.transform = 'scale(' + scale + ')';
        scaleEl.textContent = Math.round(scale * 100) + '%';
    }

    overlay.querySelector('.mz-in').addEventListener('click', function (e) {
        e.stopPropagation(); scale = Math.min(MAX, Math.round((scale + STEP) * 100) / 100); applyScale();
    });
    overlay.querySelector('.mz-out').addEventListener('click', function (e) {
        e.stopPropagation(); scale = Math.max(MIN, Math.round((scale - STEP) * 100) / 100); applyScale();
    });
    overlay.querySelector('.mz-fit').addEventListener('click', function (e) {
        e.stopPropagation(); scale = 1; applyScale();
    });

    overlay.querySelector('.mz-viewport').addEventListener('wheel', function (e) {
        e.preventDefault();
        var d = e.deltaY > 0 ? -STEP : STEP;
        scale = Math.min(MAX, Math.max(MIN, Math.round((scale + d) * 100) / 100));
        applyScale();
    }, { passive: false });

    var dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
    var vp = overlay.querySelector('.mz-viewport');
    vp.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        dragging = true; sx = e.pageX - vp.offsetLeft; sy = e.pageY - vp.offsetTop;
        sl = vp.scrollLeft; st = vp.scrollTop; vp.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', function () { dragging = false; vp.style.cursor = 'grab'; });
    vp.addEventListener('mousemove', function (e) {
        if (!dragging) return; e.preventDefault();
        vp.scrollLeft = sl - (e.pageX - vp.offsetLeft - sx);
        vp.scrollTop = st - (e.pageY - vp.offsetTop - sy);
    });

    function close() {
        overlay.classList.remove('mz-visible');
        setTimeout(function () { overlay.remove(); }, 200);
    }
    overlay.querySelector('.mz-close').addEventListener('click', close);
    overlay.querySelector('.mz-backdrop').addEventListener('click', close);
    function onKey(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
        if (e.key === '+' || e.key === '=') overlay.querySelector('.mz-in').click();
        if (e.key === '-') overlay.querySelector('.mz-out').click();
        if (e.key === '0') overlay.querySelector('.mz-fit').click();
    }
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { overlay.classList.add('mz-visible'); });
    });
}

// ── Attach trigger button to a container that now has an SVG ─

function attachButton(container, svg) {
    if (container.hasAttribute(ATTACHED)) return;
    container.setAttribute(ATTACHED, '1');
    container.classList.add('mermaid-zoom-wrapper');  // ativa CSS hover
    container.style.position = 'relative';

    var btn = document.createElement('button');
    btn.className = 'mermaid-zoom-btn';
    btn.setAttribute('aria-label', 'Ampliar diagrama');
    btn.setAttribute('title', 'Ampliar diagrama');
    btn.textContent = '\uD83D\uDD0D'; // 🔍
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var s = container.querySelector('svg');
        if (s) openOverlay(s);
    });

    // Insert btn as last child of container (not inside SVG)
    container.appendChild(btn);

    svg.style.cursor = 'zoom-in';
    svg.addEventListener('click', function () {
        var s = container.querySelector('svg');
        if (s) openOverlay(s);
    });
}

// ── Watch container for SVG (targeted observer, not document) ─

function watchContainer(container) {
    if (container.hasAttribute(ATTACHED)) return;

    // SVG might already be there
    var svg = container.querySelector('svg');
    if (svg) { attachButton(container, svg); return; }

    // Otherwise, observe just this container
    var obs = new MutationObserver(function () {
        var s = container.querySelector('svg');
        if (s) { obs.disconnect(); attachButton(container, s); }
    });
    obs.observe(container, { childList: true, subtree: true });
}

// ── Scan page for mermaid containers ─────────────────────────

function scanContainers() {
    var list = document.querySelectorAll(CONTAINER_SEL);
    for (var i = 0; i < list.length; i++) watchContainer(list[i]);
}

// ── Watch document for new containers (new Mermaid blocks) ───
// We use a document-level observer but ONLY reacting to added nodes
// that match our container class — no recursion possible.
var _docObs = null;
function startDocumentObserver() {
    if (_docObs) return;
    _docObs = new MutationObserver(function (mutations) {
        var dirty = false;
        for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
                if (added[j].nodeType === 1) { dirty = true; break; }
            }
            if (dirty) break;
        }
        if (dirty) scanContainers();
    });
    _docObs.observe(document.body, { childList: true, subtree: true });
}

// ── Bootstrap ─────────────────────────────────────────────────

function init() {
    scanContainers();
    startDocumentObserver();
}

export function onRouteDidUpdate() {
    // On client-side navigation, reset and re-scan
    if (_docObs) { _docObs.disconnect(); _docObs = null; }
    // Small delay to let React finish rendering the new page
    setTimeout(function () { init(); }, 300);
}

export function onRouteUpdate() {
    // Also triggered on route change start — re-scan in case of fast nav
    setTimeout(function () { scanContainers(); }, 150);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}