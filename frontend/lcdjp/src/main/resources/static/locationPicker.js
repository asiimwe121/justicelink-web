/*
 * LcdjpGeo: pick where an incident happened as district > sub-county > parish > village, using only the
 * Uganda hierarchy already shipped in notifications.js / uganda-geo.js.
 *
 * The person never types a place. "Detect my location" reads GPS, asks /api/map/reverse-geocode for every
 * place name Google knows around that point, and matches those names against the hierarchy to find the
 * full chain (the same name can exist in many districts, so the district Google reports and the nearest
 * district decide which one is right). The best match pre-fills the four selects and the next best are
 * offered as one-tap chips; the person confirms or changes any level from the lists.
 *
 * Why this matters: the Local Council / provider lookup requires the whole chain to agree, so a village from
 * one place with a parish from another (e.g. a registered address) used to route to the wrong office.
 *
 * Data globals used (all optional, read lazily): ugandaDistricts, ugandaCounties, ugandaGeo (the full
 * district > county > sub-county > parish > village tree in uganda-geo.js), ugandaCoordinates, API_BASE_URL.
 */
(function (global) {
  'use strict';

  var LEVELS = ['district', 'subCounty', 'parish', 'village'];
  var LABELS = { district: 'District', subCounty: 'Sub-county', parish: 'Parish', village: 'Village' };
  var NOT_LISTED = '__other__';
  var NOT_SURE = '__unsure__';

  // ---- matching ----------------------------------------------------------------------------------
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/['’`.]/g, '')
      .replace(/\b(district|county|sub-?county|town council|town board|municipal council|municipality|city council|city|division|parish|ward|village|cell|region)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // Top-level `const` data in classic scripts is not a window property, so read it by bare name.
  function data() {
    var out = {};
    try { out.districts = (typeof ugandaDistricts !== 'undefined') ? ugandaDistricts : []; } catch (e) { out.districts = []; }
    try { out.counties = (typeof ugandaCounties !== 'undefined') ? ugandaCounties : {}; } catch (e) { out.counties = {}; }
    try { out.geo = (typeof ugandaGeo !== 'undefined') ? ugandaGeo : null; } catch (e) { out.geo = null; }
    try { out.coords = (typeof ugandaCoordinates !== 'undefined') ? ugandaCoordinates : null; } catch (e) { out.coords = null; }
    return out;
  }

  // Lists for the cascade. Sub-counties are grouped under their county, so the person is never asked for one.
  // Every list is looked up through its parents (district > county > sub-county > parish), so a namesake
  // elsewhere in Uganda can never leak in. `county` may be '' when not known; then same-named sub-counties
  // of that district (a few two-county places) are combined.
  function subCountyGroups(district) {
    var d = data();
    if (!d.geo) return [];
    return (d.counties[district] || []).map(function (county) {
      return { county: county, items: d.geo.subCounties(district, county).slice() };
    }).filter(function (grp) { return grp.items.length; });
  }
  function parishList(district, county, subCounty) {
    var g = data().geo; return g ? g.parishes(district, county, subCounty).slice() : [];
  }
  function villageList(district, county, subCounty, parish) {
    var g = data().geo; return g ? g.villages(district, county, subCounty, parish).slice() : [];
  }
  function countyOf(district, subCounty) {
    var g = data().geo; if (!g) return '';
    return g.countiesOf(district, subCounty)[0] || '';
  }
  // The county of the sub-county option currently chosen (set from its optgroup).
  function selectedCounty(prefix) {
    var s = el(prefix, 'subCounty');
    if (!s || s.selectedIndex < 0) return '';
    var o = s.options[s.selectedIndex];
    return (o && o.getAttribute('data-county')) || '';
  }

  var _index = null;
  function buildIndex() {
    if (_index) return _index;
    var d = data();
    var by = { district: {}, subCounty: {}, parish: {}, village: {} };
    function add(level, node) {
      var k = norm(node[level]);
      if (!k) return;
      (by[level][k] = by[level][k] || []).push(node);
    }
    var g = d.geo;
    d.districts.forEach(function (dist) {
      add('district', { district: dist });
      if (!g) return;
      (d.counties[dist] || []).forEach(function (county) {
        g.subCounties(dist, county).forEach(function (sub) {
          add('subCounty', { district: dist, county: county, subCounty: sub });
          g.parishes(dist, county, sub).forEach(function (par) {
            add('parish', { district: dist, county: county, subCounty: sub, parish: par });
            g.villages(dist, county, sub, par).forEach(function (vil) {
              add('village', { district: dist, county: county, subCounty: sub, parish: par, village: vil });
            });
          });
        });
      });
    });
    _index = by;
    return by;
  }

  function nearestDistricts(lat, lng, n) {
    var c = data().coords;
    if (!c || !c.districts || !isFinite(lat) || !isFinite(lng)) return [];
    return Object.keys(c.districts).map(function (name) {
      var p = c.districts[name];
      return { name: name, d: Math.sqrt(Math.pow(lat - p.lat, 2) + Math.pow(lng - p.lng, 2)) };
    }).sort(function (a, b) { return a.d - b.d; }).slice(0, n || 3).map(function (x) { return x.name; });
  }

  // How much a name match at each level is worth, and extra credit when a parent level matched too.
  var BASE = { village: 3, parish: 2.5, subCounty: 2 };
  var PARENT_BONUS = { parish: 2, subCounty: 1.5, district: 4 };

  /**
   * names: place names around the point (district, sub-county, parish, village... any order).
   * Returns up to `max` candidate chains, best first:
   *   { district, county, subCounty, parish, village, score, depth }
   * Always returns at least a district-only candidate when a district can be told.
   */
  function resolve(names, lat, lng, max) {
    max = max || 3;
    var by = buildIndex();
    var norms = [];
    (names || []).forEach(function (n) { var k = norm(n); if (k && norms.indexOf(k) === -1) norms.push(k); });
    var has = function (name) { return norms.indexOf(norm(name)) !== -1; };

    var districtHits = [];
    norms.forEach(function (k) {
      (by.district[k] || []).forEach(function (n) { if (districtHits.indexOf(n.district) === -1) districtHits.push(n.district); });
    });
    var near = nearestDistricts(lat, lng, 3);

    var found = {};
    ['village', 'parish', 'subCounty'].forEach(function (level) {
      norms.forEach(function (k) {
        (by[level][k] || []).forEach(function (node) {
          var score = BASE[level];
          ['parish', 'subCounty'].forEach(function (anc) {
            if (anc !== level && node[anc] && LEVELS.indexOf(anc) < LEVELS.indexOf(level) && has(node[anc])) score += PARENT_BONUS[anc];
          });
          if (districtHits.length) score += districtHits.indexOf(node.district) !== -1 ? PARENT_BONUS.district : -6;
          if (near.length) score += near.indexOf(node.district) !== -1 ? 3 : (districtHits.length ? 0 : -3);
          if (score <= 0) return;
          var key = [node.district, node.subCounty, node.parish || '', node.village || ''].join('|');
          var depth = level === 'village' ? 3 : level === 'parish' ? 2 : 1;
          if (!found[key] || found[key].score < score) {
            found[key] = { district: node.district, county: node.county || '', subCounty: node.subCounty || '',
              parish: node.parish || '', village: node.village || '', score: score, depth: depth };
          }
        });
      });
    });

    var list = Object.keys(found).map(function (k) { return found[k]; });
    // A chain that is only the parent of a better-matched deeper chain adds nothing.
    list = list.filter(function (c) {
      return !list.some(function (o) {
        return o !== c && o.depth > c.depth && o.district === c.district && o.subCounty === c.subCounty &&
          (c.depth < 2 || o.parish === c.parish);
      });
    });
    list.sort(function (a, b) { return (b.score - a.score) || (b.depth - a.depth); });
    // Weak matches next to a strong one are noise (usually a same-named place in another district).
    if (list.length) list = list.filter(function (c) { return c.score >= list[0].score * 0.6; });
    list = list.slice(0, max);

    if (!list.length) {
      var d = districtHits[0] || near[0] || '';
      if (d) list.push({ district: d, county: '', subCounty: '', parish: '', village: '', score: 1, depth: 0 });
    }
    return list;
  }

  // ---- widget ------------------------------------------------------------------------------------
  var _state = {};   // prefix -> { initial, candidates }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function el(prefix, level) { return document.getElementById(prefix + '-' + level); }
  function otherEl(prefix, level) { return document.getElementById(prefix + '-' + level + '-other'); }

  function opt(value, text, selected, county) {
    return '<option value="' + esc(value) + '"' + (county ? ' data-county="' + esc(county) + '"' : '')
      + (selected ? ' selected' : '') + '>' + esc(text) + '</option>';
  }

  function optionsFor(level, ctx, selected) {
    var h = '<option value="">Select ' + LABELS[level].toLowerCase() + '</option>';
    if (level === 'district') {
      (data().districts || []).slice().sort().forEach(function (x) { h += opt(x, x, x === selected); });
      return h;
    }
    if (level === 'subCounty') {
      var groups = subCountyGroups(ctx.district), picked = false;
      // Same-named sub-counties can sit under two counties; only the one in ctx.county is pre-selected.
      var want = ctx.county && groups.some(function (g) { return g.county === ctx.county && g.items.indexOf(selected) !== -1; }) ? ctx.county : '';
      groups.forEach(function (grp) {
        h += '<optgroup label="' + esc(grp.county) + '">';
        grp.items.forEach(function (x) {
          var sel = !picked && x === selected && (!want || grp.county === want);
          if (sel) picked = true;
          h += opt(x, x, sel, grp.county);
        });
        h += '</optgroup>';
      });
    } else {
      var list = level === 'parish' ? parishList(ctx.district, ctx.county, ctx.subCounty)
        : villageList(ctx.district, ctx.county, ctx.subCounty, ctx.parish);
      list.forEach(function (x) { h += opt(x, x, x === selected); });
    }
    h += opt(NOT_LISTED, 'My ' + LABELS[level].toLowerCase() + ' is not listed', selected === NOT_LISTED);
    if (level === 'parish' || level === 'village') h += opt(NOT_SURE, "I'm not sure", selected === NOT_SURE);
    return h;
  }

  var SELECT_CSS = 'width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;background:#fff;margin-bottom:8px;';
  var LABEL_CSS = 'display:block;font-size:11px;font-weight:600;color:#555;margin-bottom:3px;';

  function levelBlock(prefix, level, ctx, selected, hidden) {
    return '<div id="' + prefix + '-' + level + '-wrap"' + (hidden ? ' style="display:none;"' : '') + '>'
      + '<label for="' + prefix + '-' + level + '" style="' + LABEL_CSS + '">' + LABELS[level] + '</label>'
      + '<select id="' + prefix + '-' + level + '" style="' + SELECT_CSS + '" onchange="LcdjpGeo._changed(\'' + prefix + '\',\'' + level + '\')">'
      + optionsFor(level, ctx, selected) + '</select>'
      + '<input id="' + prefix + '-' + level + '-other" type="text" maxlength="80" placeholder="Type the ' + LABELS[level].toLowerCase() + ' name"'
      + ' style="' + SELECT_CSS + 'display:none;" oninput="LcdjpGeo._typed(\'' + prefix + '\')">'
      + '</div>';
  }

  /**
   * Markup for the widget. `initial` pre-selects a chain (e.g. the registered address). After the markup is in
   * the page, call LcdjpGeo.afterMount(prefix, {onPosition}) to start detection when permission was already given.
   */
  function html(prefix, initial) {
    initial = initial || {};
    _state[prefix] = { initial: initial, candidates: [], source: initial.district ? 'registered' : '' };
    var ctx = { district: initial.district || '', county: initial.county || '', subCounty: initial.subCounty || '', parish: initial.parish || '' };
    return '<div id="' + prefix + '" class="lcdjp-geo" style="background:#f8f9fa;border:1px solid #ddd;border-radius:10px;padding:14px;max-width:420px;">'
      + '<button type="button" id="' + prefix + '-detect" class="ai-choice-btn" style="width:100%;background:#e3f2fd;border-color:#1565c0;color:#1565c0;margin-bottom:8px;" onclick="LcdjpGeo.detect(\'' + prefix + '\')">&#128205; Detect my location</button>'
      + '<div id="' + prefix + '-status" role="status" style="font-size:12px;color:#555;margin-bottom:8px;min-height:16px;"></div>'
      + '<div id="' + prefix + '-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;"></div>'
      + levelBlock(prefix, 'district', ctx, initial.district, false)
      + levelBlock(prefix, 'subCounty', ctx, initial.subCounty, !initial.district)
      + levelBlock(prefix, 'parish', ctx, initial.parish, !initial.subCounty)
      + levelBlock(prefix, 'village', ctx, initial.village, !initial.parish)
      + '</div>';
  }

  function valueOf(prefix, level) {
    var s = el(prefix, level);
    if (!s) return '';
    if (s.value === NOT_LISTED) { var o = otherEl(prefix, level); return o ? o.value.trim() : ''; }
    if (s.value === NOT_SURE) return '';
    return s.value || '';
  }

  /** The chosen chain. `unsure` lists levels the person said they don't know. */
  function getValue(prefix) {
    var v = { district: valueOf(prefix, 'district'), subCounty: valueOf(prefix, 'subCounty'),
      parish: valueOf(prefix, 'parish'), village: valueOf(prefix, 'village'), unsure: [], source: '' };
    ['parish', 'village'].forEach(function (lv) { var s = el(prefix, lv); if (s && s.value === NOT_SURE) v.unsure.push(lv); });
    v.county = selectedCounty(prefix) || countyOf(v.district, v.subCounty);
    var st = _state[prefix] || {};
    v.source = st.source || 'selected';
    v.lat = st.lat; v.lng = st.lng;
    return v;
  }

  /** Returns an error message, or '' when complete. */
  function validate(prefix) {
    var v = getValue(prefix);
    if (!v.district) return 'Please select the district.';
    if (!v.subCounty) return 'Please select the sub-county.';
    if (!v.parish && v.unsure.indexOf('parish') === -1) return 'Please select the parish, or choose "I\'m not sure".';
    if (!v.village && v.unsure.indexOf('village') === -1) return 'Please select the village, or choose "I\'m not sure".';
    return '';
  }

  function show(prefix, level, visible) {
    var w = document.getElementById(prefix + '-' + level + '-wrap');
    if (w) w.style.display = visible ? '' : 'none';
  }

  function refill(prefix, level, ctx, selected) {
    var s = el(prefix, level);
    if (!s) return;
    s.innerHTML = optionsFor(level, ctx, selected);
    var o = otherEl(prefix, level); if (o) { o.style.display = 'none'; o.value = ''; }
  }

  function clearBelow(prefix, level) {
    var i = LEVELS.indexOf(level);
    for (var k = i + 1; k < LEVELS.length; k++) {
      var s = el(prefix, LEVELS[k]);
      if (s) { s.innerHTML = optionsFor(LEVELS[k], {}, ''); s.value = ''; }
      var o = otherEl(prefix, LEVELS[k]); if (o) { o.style.display = 'none'; o.value = ''; }
      show(prefix, LEVELS[k], false);
    }
  }

  function changed(prefix, level) {
    var st = _state[prefix] || (_state[prefix] = {});
    if (st.source === 'detected') st.source = 'detected_edited';
    else if (!st.source || st.source === 'registered') st.source = 'selected';
    var s = el(prefix, level);
    var o = otherEl(prefix, level);
    if (o) { o.style.display = (s && s.value === NOT_LISTED) ? '' : 'none'; if (!(s && s.value === NOT_LISTED)) o.value = ''; }
    clearBelow(prefix, level);
    if (!s || !s.value || s.value === NOT_SURE) return;
    var next = LEVELS[LEVELS.indexOf(level) + 1];
    if (!next) return;
    if (s.value === NOT_LISTED) {
      // Without a known place there are no lists below it: those levels are typed (or "not sure").
      for (var k = LEVELS.indexOf(next); k < LEVELS.length; k++) {
        var lv = LEVELS[k], sel = el(prefix, lv), oth = otherEl(prefix, lv);
        if (!sel) continue;
        sel.innerHTML = opt(NOT_LISTED, 'Type the ' + LABELS[lv].toLowerCase(), true)
          + (lv === 'parish' || lv === 'village' ? opt(NOT_SURE, "I'm not sure", false) : '');
        if (oth) { oth.style.display = ''; oth.value = ''; }
        show(prefix, lv, true);
      }
      return;
    }
    var ctx = { district: valueOf(prefix, 'district'), county: selectedCounty(prefix), subCounty: valueOf(prefix, 'subCounty'), parish: valueOf(prefix, 'parish') };
    if (level === 'district') {
      refill(prefix, 'subCounty', ctx, '');
    } else if (level === 'subCounty') {
      refill(prefix, 'parish', ctx, '');
    } else if (level === 'parish') {
      refill(prefix, 'village', ctx, '');
    }
    show(prefix, next, true);
  }

  function typed(prefix) { var st = _state[prefix]; if (st && st.source !== 'typed') st.source = 'typed'; }

  function setChain(prefix, c) {
    var ctx = { district: c.district || '', county: c.county || '', subCounty: c.subCounty || '', parish: c.parish || '' };
    var s = el(prefix, 'district'); if (s) s.value = c.district || '';
    refill(prefix, 'subCounty', ctx, c.subCounty); show(prefix, 'subCounty', !!c.district);
    refill(prefix, 'parish', ctx, c.parish); show(prefix, 'parish', !!c.subCounty);
    refill(prefix, 'village', ctx, c.village); show(prefix, 'village', !!c.parish);
  }

  function chainText(c) {
    return [c.village, c.parish, c.subCounty, c.district].filter(Boolean).join(', ');
  }

  function setStatus(prefix, text, color) {
    var s = document.getElementById(prefix + '-status');
    if (s) { s.textContent = text || ''; s.style.color = color || '#555'; }
  }

  function renderChips(prefix, cands) {
    var box = document.getElementById(prefix + '-chips');
    if (!box) return;
    box.innerHTML = '';
    if (!cands || cands.length < 2) return;
    var lead = document.createElement('div');
    lead.style.cssText = 'width:100%;font-size:11px;color:#777;';
    lead.textContent = 'Other places that match:';
    box.appendChild(lead);
    cands.slice(1).forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-choice-btn';
      b.style.cssText = 'font-size:12px;padding:6px 10px;';
      b.textContent = chainText(c);
      b.onclick = function () {
        setChain(prefix, c);
        var st = _state[prefix]; if (st) st.source = 'detected';
        setStatus(prefix, 'Selected: ' + chainText(c) + '. Please confirm or change any level below.', '#2e7d32');
      };
      box.appendChild(b);
    });
  }

  function getPosition(cb, errCb) {
    var p = global._lcdjpUserPosition;
    if (p && isFinite(p.lat) && isFinite(p.lng)) { cb({ lat: p.lat, lng: p.lng }); return; }
    if (!navigator.geolocation) { errCb({ code: 0 }); return; }
    navigator.geolocation.getCurrentPosition(
      function (pos) { cb({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      errCb, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  }

  function reverse(lat, lng) {
    var base = '';
    try { base = (typeof API_BASE_URL === 'string') ? API_BASE_URL : ''; } catch (e) { base = ''; }
    return fetch(base + '/api/map/reverse-geocode?lat=' + encodeURIComponent(lat) + '&lng=' + encodeURIComponent(lng))
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /** Names to match: the full list when the server sends it, plus the older single-value fields. */
  function namesFrom(data) {
    var out = [];
    if (data && Array.isArray(data.names)) out = out.concat(data.names);
    if (data) ['district', 'sub_county', 'parish', 'village'].forEach(function (k) { if (data[k]) out.push(data[k]); });
    return out;
  }

  var _hooks = {};

  function detect(prefix) {
    var btn = document.getElementById(prefix + '-detect');
    if (btn) btn.disabled = true;
    setStatus(prefix, 'Finding your location…', '#1a4080');
    getPosition(function (pos) {
      var st = _state[prefix] || (_state[prefix] = {});
      st.lat = pos.lat; st.lng = pos.lng;
      if (_hooks[prefix] && _hooks[prefix].onPosition) { try { _hooks[prefix].onPosition(pos.lat, pos.lng); } catch (e) {} }
      // 1. Local data first: nearest districts from our own coordinates fill the district straight away
      //    (and keep working if the network lookup below fails).
      var local = nearestDistricts(pos.lat, pos.lng, 3);
      if (local.length) {
        var regd = (st.initial && st.initial.district) || '';
        var first = local.indexOf(regd) !== -1 ? regd : local[0];
        st.source = 'detected';
        setChain(prefix, { district: first });
        renderChips(prefix, local.slice(0, 3).map(function (dn) { return { district: dn }; }));
        setStatus(prefix, 'Checking the exact sub-county, parish and village\u2026', '#1a4080');
      }
      // 2. Then Google names, matched against the local hierarchy, refine it down to the village.
      reverse(pos.lat, pos.lng).then(function (resp) {
        if (btn) btn.disabled = false;
        var names = (resp && resp.status === 'OK') ? namesFrom(resp) : [];
        var cands = resolve(names, pos.lat, pos.lng, 3);
        if (!cands.length || (cands.length === 1 && cands[0].depth === 0 && local.length)) {
          setStatus(prefix, 'We found the district (' + (local.length ? el(prefix, 'district').value || local[0] : '') + '). Please choose the sub-county, parish and village from the lists below.', '#e65100');
          return;
        }
        st.candidates = cands;
        st.source = 'detected';
        setChain(prefix, cands[0]);
        renderChips(prefix, cands);
        var best = cands[0];
        setStatus(prefix, best.depth >= 2
          ? 'We found: ' + chainText(best) + '. Please confirm, or change any level below.'
          : 'We found ' + chainText(best) + '. Please choose the rest from the lists below.',
          best.depth >= 2 ? '#2e7d32' : '#e65100');
      });
    }, function () {
      if (btn) btn.disabled = false;
      setStatus(prefix, 'We could not read your location. You can allow location access and try again, or choose the place from the lists below.', '#c62828');
    });
  }

  /** Start detection straight away only if the browser already has location permission (never prompts by surprise). */
  function afterMount(prefix, hooks) {
    _hooks[prefix] = hooks || {};
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
          if (r && r.state === 'granted') detect(prefix);
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /** Keeps a known chain (e.g. the registered address) only down to the first level that is not in the lists. */
  function cleanChain(c) {
    c = c || {};
    var out = { district: '', subCounty: '', parish: '', village: '' };
    var d = data();
    var dist = (typeof regFindDistrict === 'function') ? regFindDistrict(c.district) : c.district;
    if (!dist || d.districts.indexOf(dist) === -1) return out;
    out.district = dist;
    if (!c.subCounty || !subCountyGroups(dist).some(function (grp) { return grp.items.indexOf(c.subCounty) !== -1; })) return out;
    out.subCounty = c.subCounty;
    var cty = (c.county && d.geo && d.geo.countiesOf(dist, c.subCounty).indexOf(c.county) !== -1) ? c.county : '';
    if (cty) out.county = cty;
    if (!c.parish || parishList(dist, cty, c.subCounty).indexOf(c.parish) === -1) return out;
    out.parish = c.parish;
    if (c.village && villageList(dist, cty, c.subCounty, c.parish).indexOf(c.village) !== -1) out.village = c.village;
    return out;
  }

  global.LcdjpGeo = {
    cleanChain: cleanChain,
    html: html, afterMount: afterMount, detect: detect, getValue: getValue, validate: validate,
    resolve: resolve, norm: norm, nearestDistricts: nearestDistricts, countyOf: countyOf,
    _changed: changed, _typed: typed, _resetIndex: function () { _index = null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
