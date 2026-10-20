/*
 * On-screen error log for phones, which have no developer console.
 * Open the site with ?debug=1 on the end of the address (for example https://yoursite/?debug=1).
 * A small "Debug" button appears; tap it to see script errors, failed requests and what happened when you tapped.
 * It stays off, and sends nothing anywhere, unless ?debug=1 is in the address (or you turned it on before).
 */
(function () {
    'use strict';
    var on = false;
    try {
        if (/[?&]debug=1\b/.test(location.search)) localStorage.setItem('lcdjp_debug', '1');
        if (/[?&]debug=0\b/.test(location.search)) localStorage.removeItem('lcdjp_debug');
        on = localStorage.getItem('lcdjp_debug') === '1';
    } catch (e) { on = /[?&]debug=1\b/.test(location.search); }
    if (!on) return;

    var lines = [];
    function stamp() { var d = new Date(); return d.toTimeString().slice(0, 8); }
    function add(kind, text) {
        lines.push(stamp() + ' ' + kind + ' ' + String(text).replace(/(password|token)["']?\s*[:=]\s*["'][^"']*["']/gi, '$1=***'));
        if (lines.length > 150) lines.shift();
        paint();
    }

    var btn, box, pre;
    function build() {
        if (btn || !document.body) return;
        btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Debug';
        btn.style.cssText = 'position:fixed;right:8px;top:8px;z-index:2147483647;background:#b71c1c;color:#fff;border:0;border-radius:14px;padding:6px 12px;font:700 12px sans-serif;opacity:.9';
        box = document.createElement('div');
        box.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;max-height:60vh;z-index:2147483647;background:#111;color:#9f9;font:11px/1.4 monospace;padding:8px;overflow:auto;box-sizing:border-box';
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:8px;margin-bottom:6px';
        ['Copy', 'Clear', 'Close'].forEach(function (label) {
            var b = document.createElement('button');
            b.type = 'button'; b.textContent = label;
            b.style.cssText = 'background:#333;color:#fff;border:0;border-radius:8px;padding:6px 12px;font:700 12px sans-serif';
            b.onclick = function () {
                if (label === 'Close') box.style.display = 'none';
                else if (label === 'Clear') { lines = []; paint(); }
                else { try { navigator.clipboard.writeText(lines.join('\n')); b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1200); } catch (e) { b.textContent = 'Select text'; } }
            };
            bar.appendChild(b);
        });
        pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;user-select:text;-webkit-user-select:text';
        box.appendChild(bar); box.appendChild(pre);
        btn.onclick = function () { box.style.display = box.style.display === 'none' ? 'block' : 'none'; paint(); };
        document.body.appendChild(btn); document.body.appendChild(box);
        paint();
    }
    function paint() {
        build();
        if (!pre) return;
        pre.textContent = lines.length ? lines.join('\n') : 'Nothing logged yet.';
        if (btn) btn.textContent = 'Debug (' + lines.length + ')';
        box.scrollTop = box.scrollHeight;
    }

    window.addEventListener('error', function (e) {
        add('ERROR', (e.message || 'error') + ' @ ' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || 0));
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
        add('PROMISE', e.reason && (e.reason.stack || e.reason.message) || e.reason);
    });
    var ce = console.error;
    console.error = function () { try { add('console.error', Array.prototype.slice.call(arguments).join(' ').slice(0, 400)); } catch (x) {} return ce.apply(console, arguments); };

    var f = window.fetch;
    window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var short = url.replace(/^https?:\/\/[^/]+/, '');
        var method = (init && init.method) || 'GET';
        return f.apply(this, arguments).then(function (r) {
            if (!r.ok || /\/api\/auth\//.test(short)) add('HTTP ' + r.status, method + ' ' + short);
            return r;
        }, function (err) { add('NETWORK', method + ' ' + short + ' - ' + err.message); throw err; });
    };

    // Shows where taps land, to catch a button that is covered or moved.
    document.addEventListener('click', function (e) {
        var t = e.target;
        add('tap', (t.tagName || '') + (t.id ? '#' + t.id : '') + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : '')
            + ' at ' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' (screen ' + innerWidth + 'x' + innerHeight + ')');
    }, true);

    add('info', 'Debug on. ' + innerWidth + 'x' + innerHeight + ' ' + (innerHeight > innerWidth ? 'portrait' : 'landscape'));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
