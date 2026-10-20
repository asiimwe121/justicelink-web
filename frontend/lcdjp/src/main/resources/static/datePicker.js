/*
 * Date picker used for date-of-birth fields. Any <input data-datepicker> becomes a text field (yyyy-mm-dd, typed or
 * picked) with a calendar button. The popup shows a day grid; tapping the "Nov 1998" title switches to two lists
 * (month, year) with an Apply button. The input keeps its id and always holds "yyyy-mm-dd" (or ""), and fires
 * input/change events, so existing validation code that reads input.value keeps working.
 *
 * Options (data attributes): data-min-year (default: this year - 120), data-max (default: today, "yyyy-mm-dd").
 * Without JavaScript the input stays a native <input type="date">.
 */
(function () {
    'use strict';

    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h8M8 17.2h5"/></svg>';
    var ICON_CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l5 5 5-5"/></svg>';
    var ICON_PREV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>';
    var ICON_NEXT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';
    var ICON_CHECK = '<svg class="ck" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7.5-8"/></svg>';

    var uid = 0;
    var openPicker = null;

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
    function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }
    function cmp(a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); }

    /** "yyyy-mm-dd" -> {y, m (0-11), d} for a real calendar date, otherwise null. */
    function parse(s) {
        var r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
        if (!r) return null;
        var y = +r[1], m = +r[2] - 1, d = +r[3];
        if (m < 0 || m > 11 || d < 1 || d > daysIn(y, m)) return null;
        return { y: y, m: m, d: d };
    }

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }

    function Picker(input) {
        var self = this;
        var now = new Date();
        this.today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
        this.input = input;
        this.id = 'ljdp' + (++uid);
        this.max = parse(input.getAttribute('data-max')) || this.today;
        var minYear = parseInt(input.getAttribute('data-min-year'), 10);
        this.minYear = isNaN(minYear) ? this.today.y - 120 : minYear;
        this.min = { y: this.minYear, m: 0, d: 1 };

        // Wrap the input and turn it into a typeable text field.
        input.type = 'text';
        input.removeAttribute('max');
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('maxlength', '10');
        if (!input.placeholder) input.placeholder = 'yyyy-mm-dd';
        input.setAttribute('aria-haspopup', 'dialog');

        this.wrap = el('div', 'ljdp');
        input.parentNode.insertBefore(this.wrap, input);
        this.wrap.appendChild(input);

        this.btn = el('button', 'ljdp-toggle', ICON_CAL);
        this.btn.type = 'button';
        this.btn.setAttribute('aria-label', 'Choose date from calendar');
        this.btn.setAttribute('aria-expanded', 'false');
        this.wrap.appendChild(this.btn);

        var pop = this.pop = el('div', 'ljdp-pop');
        pop.id = this.id;
        pop.hidden = true;
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Choose date');
        pop.setAttribute('data-mode', 'days');

        var head = el('div', 'ljdp-head');
        this.prev = el('button', 'ljdp-nav', ICON_PREV); this.prev.type = 'button'; this.prev.setAttribute('aria-label', 'Previous month');
        this.next = el('button', 'ljdp-nav', ICON_NEXT); this.next.type = 'button'; this.next.setAttribute('aria-label', 'Next month');
        this.title = el('button', 'ljdp-title'); this.title.type = 'button';
        this.title.setAttribute('aria-label', 'Choose month and year');
        head.appendChild(this.prev); head.appendChild(el('span', 'ljdp-spacer'));
        head.appendChild(this.title);
        head.appendChild(el('span', 'ljdp-spacer')); head.appendChild(this.next);

        this.days = el('div', 'ljdp-days');
        this.lists = el('div', 'ljdp-lists');
        this.monthCol = el('div', 'ljdp-col'); this.monthCol.setAttribute('role', 'listbox'); this.monthCol.setAttribute('aria-label', 'Month');
        this.yearCol = el('div', 'ljdp-col'); this.yearCol.setAttribute('role', 'listbox'); this.yearCol.setAttribute('aria-label', 'Year');
        this.lists.appendChild(this.monthCol); this.lists.appendChild(this.yearCol);
        var foot = el('div', 'ljdp-foot');
        this.apply = el('button', 'ljdp-apply', 'Apply'); this.apply.type = 'button';
        foot.appendChild(this.apply);

        pop.appendChild(head); pop.appendChild(this.days); pop.appendChild(this.lists); pop.appendChild(foot);
        this.wrap.appendChild(pop);

        // ---- events
        this.btn.addEventListener('click', function () { self.isOpen() ? self.close(true) : self.open(); });
        input.addEventListener('click', function () { if (!self.isOpen()) self.open(); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' && !self.isOpen()) { e.preventDefault(); self.open(); }
            else if (e.key === 'Escape' && self.isOpen()) { e.preventDefault(); self.close(true); }
        });
        input.addEventListener('input', function () { self.onType(); });
        this.prev.addEventListener('click', function () { self.shiftMonth(-1); });
        this.next.addEventListener('click', function () { self.shiftMonth(1); });
        this.title.addEventListener('click', function () { self.setMode(self.mode === 'days' ? 'lists' : 'days'); });
        this.apply.addEventListener('click', function () { self.applyLists(); });
        pop.addEventListener('keydown', function (e) { self.onKey(e); });
    }

    Picker.prototype.isOpen = function () { return !this.pop.hidden; };

    Picker.prototype.value = function () { return parse(this.input.value); };

    Picker.prototype.inRange = function (d) { return cmp(d, this.min) >= 0 && cmp(d, this.max) <= 0; };

    Picker.prototype.open = function () {
        if (openPicker && openPicker !== this) openPicker.close(false);
        openPicker = this;
        var v = this.value();
        var start = v && this.inRange(v) ? v : { y: Math.min(this.today.y - 25, this.max.y), m: 0, d: 1 };
        this.vy = start.y; this.vm = start.m;
        this.ty = this.vy; this.tm = this.vm;
        this.pop.hidden = false;
        this.btn.setAttribute('aria-expanded', 'true');
        this.setMode('days');
        try { this.pop.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* older browsers */ }
    };

    Picker.prototype.close = function (focusInput) {
        this.pop.hidden = true;
        this.btn.setAttribute('aria-expanded', 'false');
        if (openPicker === this) openPicker = null;
        if (focusInput) this.input.focus();
    };

    Picker.prototype.setMode = function (mode) {
        this.mode = mode;
        this.pop.setAttribute('data-mode', mode);
        if (mode === 'lists') { this.ty = this.vy; this.tm = this.vm; this.renderLists(); }
        else this.renderDays();
        this.renderTitle();
    };

    Picker.prototype.renderTitle = function () {
        var y = this.mode === 'lists' ? this.ty : this.vy, m = this.mode === 'lists' ? this.tm : this.vm;
        this.title.innerHTML = '<span>' + MONTHS[m].slice(0, 3) + ' ' + y + '</span>' + ICON_CHEV;
    };

    Picker.prototype.shiftMonth = function (delta) {
        var m = this.vm + delta, y = this.vy;
        if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
        if (y < this.min.y || y > this.max.y || (y === this.max.y && m > this.max.m)) return;
        this.vy = y; this.vm = m;
        this.renderDays(); this.renderTitle();
    };

    Picker.prototype.renderDays = function () {
        var self = this, y = this.vy, m = this.vm, sel = this.value();
        this.days.innerHTML = '';
        var grid = el('div', 'ljdp-grid');
        grid.setAttribute('role', 'grid');
        DOW.forEach(function (n) { grid.appendChild(el('div', 'ljdp-dow', n)); });
        var lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
        for (var i = 0; i < lead; i++) grid.appendChild(el('div'));
        var total = daysIn(y, m);
        for (var d = 1; d <= total; d++) {
            (function (d) {
                var cell = { y: y, m: m, d: d };
                var b = el('button', 'ljdp-day', String(d));
                b.type = 'button';
                b.setAttribute('data-d', d);
                b.setAttribute('aria-label', d + ' ' + MONTHS[m] + ' ' + y);
                b.setAttribute('aria-pressed', sel && cmp(sel, cell) === 0 ? 'true' : 'false');
                if (cmp(cell, self.today) === 0) b.classList.add('today');
                if (!self.inRange(cell)) b.disabled = true;
                b.tabIndex = -1;
                b.addEventListener('click', function () { self.pick(cell); });
                grid.appendChild(b);
            })(d);
        }
        this.days.appendChild(grid);
        // One tab stop: the selected day, else the first enabled day.
        var target = grid.querySelector('[aria-pressed="true"]:not([disabled])') || grid.querySelector('.ljdp-day:not([disabled])');
        if (target) target.tabIndex = 0;
        this.prev.disabled = (y === this.min.y && m === 0);
        this.next.disabled = (y === this.max.y && m >= this.max.m);
    };

    Picker.prototype.renderLists = function () {
        var self = this;
        this.monthCol.innerHTML = ''; this.yearCol.innerHTML = '';
        MONTHS.forEach(function (name, i) {
            var o = el('button', 'ljdp-opt', ICON_CHECK + '<span>' + name + '</span>');
            o.type = 'button'; o.setAttribute('role', 'option');
            o.setAttribute('aria-selected', i === self.tm ? 'true' : 'false');
            if (self.ty === self.max.y && i > self.max.m) o.disabled = true;
            o.addEventListener('click', function () { self.tm = i; self.refreshLists(); });
            self.monthCol.appendChild(o);
        });
        for (var y = this.max.y; y >= this.min.y; y--) {
            (function (y) {
                var o = el('button', 'ljdp-opt', ICON_CHECK + '<span>' + y + '</span>');
                o.type = 'button'; o.setAttribute('role', 'option');
                o.setAttribute('aria-selected', y === self.ty ? 'true' : 'false');
                o.addEventListener('click', function () {
                    self.ty = y;
                    if (y === self.max.y && self.tm > self.max.m) self.tm = self.max.m;
                    self.refreshLists();
                });
                self.yearCol.appendChild(o);
            })(y);
        }
        this.centerSelected(this.monthCol); this.centerSelected(this.yearCol);
    };

    /** Update checks/disabled state after a choice, without rebuilding (keeps scroll position). */
    Picker.prototype.refreshLists = function () {
        var self = this;
        Array.prototype.forEach.call(this.monthCol.children, function (o, i) {
            o.setAttribute('aria-selected', i === self.tm ? 'true' : 'false');
            o.disabled = (self.ty === self.max.y && i > self.max.m);
        });
        Array.prototype.forEach.call(this.yearCol.children, function (o, i) {
            o.setAttribute('aria-selected', (self.max.y - i) === self.ty ? 'true' : 'false');
        });
        this.renderTitle();
    };

    Picker.prototype.centerSelected = function (col) {
        var s = col.querySelector('[aria-selected="true"]');
        if (s) col.scrollTop = s.offsetTop - col.clientHeight / 2 + s.offsetHeight / 2;
    };

    Picker.prototype.applyLists = function () {
        this.vy = this.ty; this.vm = this.tm;
        this.setMode('days');
        var t = this.days.querySelector('.ljdp-day[tabindex="0"]');
        if (t) t.focus();
    };

    Picker.prototype.set = function (d) {
        this.input.value = d ? iso(d.y, d.m, d.d) : '';
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    Picker.prototype.pick = function (d) {
        this.set(d);
        this.close(true);
    };

    /** Typing: keep only digits, format as yyyy-mm-dd, and follow a complete valid date in the popup. */
    Picker.prototype.onType = function () {
        var digits = this.input.value.replace(/\D/g, '').slice(0, 8);
        var f = digits.slice(0, 4) + (digits.length > 4 ? '-' + digits.slice(4, 6) : '') + (digits.length > 6 ? '-' + digits.slice(6) : '');
        if (f !== this.input.value) this.input.value = f;
        var v = parse(f);
        if (v && this.inRange(v) && this.isOpen()) {
            this.vy = v.y; this.vm = v.m;
            if (this.mode === 'days') { this.renderDays(); this.renderTitle(); }
        }
    };

    Picker.prototype.onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(true); return; }
        var t = e.target;
        if (!t.classList || !t.classList.contains('ljdp-day')) return;
        var d = parseInt(t.getAttribute('data-d'), 10), delta = 0;
        if (e.key === 'ArrowLeft') delta = -1;
        else if (e.key === 'ArrowRight') delta = 1;
        else if (e.key === 'ArrowUp') delta = -7;
        else if (e.key === 'ArrowDown') delta = 7;
        else if (e.key === 'PageUp') { e.preventDefault(); this.shiftMonth(-1); this.focusDay(Math.min(d, daysIn(this.vy, this.vm))); return; }
        else if (e.key === 'PageDown') { e.preventDefault(); this.shiftMonth(1); this.focusDay(Math.min(d, daysIn(this.vy, this.vm))); return; }
        else return;
        e.preventDefault();
        var nd = new Date(this.vy, this.vm, d + delta);
        var cell = { y: nd.getFullYear(), m: nd.getMonth(), d: nd.getDate() };
        if (!this.inRange(cell)) return;
        if (cell.y !== this.vy || cell.m !== this.vm) { this.vy = cell.y; this.vm = cell.m; this.renderDays(); this.renderTitle(); }
        this.focusDay(cell.d);
    };

    Picker.prototype.focusDay = function (d) {
        var b = this.days.querySelector('.ljdp-day[data-d="' + d + '"]:not([disabled])');
        if (!b) return;
        Array.prototype.forEach.call(this.days.querySelectorAll('.ljdp-day'), function (x) { x.tabIndex = -1; });
        b.tabIndex = 0; b.focus();
    };

    document.addEventListener('mousedown', function (e) {
        if (openPicker && !openPicker.wrap.contains(e.target)) openPicker.close(false);
    });
    document.addEventListener('focusin', function (e) {
        if (openPicker && !openPicker.wrap.contains(e.target)) openPicker.close(false);
    });

    function attach(input) {
        if (!input || input.__ljdp) return input && input.__ljdp;
        input.__ljdp = new Picker(input);
        return input.__ljdp;
    }

    function scan(root) {
        var list = (root || document).querySelectorAll ? (root || document).querySelectorAll('input[data-datepicker]') : [];
        Array.prototype.forEach.call(list, attach);
    }

    window.lcdjpDatePicker = { attach: attach, scan: scan };

    function start() {
        scan(document);
        // Inputs created later by innerHTML (admin edit dialogs etc.).
        if (window.MutationObserver) {
            new MutationObserver(function (muts) {
                muts.forEach(function (mu) {
                    Array.prototype.forEach.call(mu.addedNodes, function (n) {
                        if (n.nodeType !== 1) return;
                        if (n.matches && n.matches('input[data-datepicker]')) attach(n); else scan(n);
                    });
                });
            }).observe(document.body, { childList: true, subtree: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
