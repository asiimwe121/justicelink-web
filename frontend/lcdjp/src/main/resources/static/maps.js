






function _getMapsToken() {
    try {
        var token = (typeof getAuthToken === 'function' ? getAuthToken() : null);
        
        if (!token || token === 'null' || token === 'undefined' || token === '') {
            return null;
        }
        return token;
    } catch (e) {
        return null;
    }
}

function _isMapsAuthenticated() {
    var token = _getMapsToken();
    if (!token) return false;
    
    try {
        var parts = token.split('.');
        if (parts.length !== 3) return false;
        var payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
            var now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        }
        return true;
    } catch (e) {
        return false;
    }
}


function _mapsCanUseProtectedApi() {
    return _isMapsAuthenticated();
}

function _mapsAuthFailure(message) {
    var error = new Error(message || 'Authentication is required for this request.');
    error.code = 'AUTH_REQUIRED';
    return error;
}


function _isTokenValid() {
    return _isMapsAuthenticated();
}





// Verification-banner helpers (_lcdjp*VerifBanner, _lcdjpStartVerification)
// live in dashboard-verification-and-voice.js.





function _lcdjpTaggedError(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
}

function loadGoogleMapsSDK() {
    return new Promise(function(resolve, reject) {
        if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
            resolve();
            return;
        }

        
        
        if (window._googleMapsSDKPromise) {
            window._googleMapsSDKPromise.then(resolve, reject);
            return;
        }

        var headers = {
            'Content-Type': 'application/json'
        };
        
        var token = (typeof getAuthToken === 'function' ? getAuthToken() : null);
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        window._googleMapsSDKPromise = fetch(API_BASE_URL + '/api/map/config', {
            headers: headers
        })
        .then(function(r) {
            if (r.status === 401 || r.status === 403) {
                console.warn('[LCDJP] Auth error loading maps config, falling back to public');
                return fetch(API_BASE_URL + '/api/map/config').then(function(r2) {
                    if (!r2.ok) throw _lcdjpTaggedError('config_fetch_failed', 'Maps configuration unavailable (status ' + r2.status + ')');
                    return r2.json();
                });
            }
            if (!r.ok) throw _lcdjpTaggedError('config_fetch_failed', 'Maps configuration unavailable (status ' + r.status + ')');
            return r.json();
        }, function(networkErr) {
            throw _lcdjpTaggedError('config_fetch_failed', 'Could not reach the maps config endpoint: ' + (networkErr && networkErr.message));
        })
        .then(function(cfg) {
            var key = (cfg && cfg.mapsApiKey) ? cfg.mapsApiKey : '';
            if (!key) {
                throw _lcdjpTaggedError('config_invalid', 'Google Maps API key is not configured');
            }
            window._lcdjpMapId = (cfg && cfg.mapId) ? String(cfg.mapId) : '';

            window._googleMapsReady = function() {
                if (typeof google !== 'undefined' && google.maps && google.maps.Map) return;
                console.error('[LCDJP] maps_sdk_error code=sdk_callback_error - Maps callback fired without google.maps.Map present');
            };

            return new Promise(function(resolveScript, rejectScript) {
                var script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js'
                    + '?key=' + encodeURIComponent(key)
                    + '&libraries=places,marker'
                    + '&callback=_googleMapsReady'
                    + '&loading=async';
                script.async = true;
                script.defer = true;
                script.onerror = function() {
                    rejectScript(_lcdjpTaggedError('script_load_failed', 'The Google Maps script failed to load (network error or blocked request)'));
                };
                document.head.appendChild(script);

                var started = Date.now();
                (function waitForMaps() {
                    if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
                        // Make sure the marker library is ready before any map code runs
                        var markerReady = (google.maps.importLibrary) ? google.maps.importLibrary('marker') : null;
                        Promise.resolve(markerReady).then(resolveScript, resolveScript);
                    } else if (Date.now() - started > 10000) {
                        rejectScript(_lcdjpTaggedError('sdk_ready_timeout', 'Google Maps SDK did not become ready within 10s'));
                    } else {
                        setTimeout(waitForMaps, 50);
                    }
                }());
            });
        })
        .catch(function(err) {
            var code = (err && err.code) || 'unknown';
            console.error('[LCDJP] maps_sdk_error code=' + code + ' message=' + (err && err.message));
            window._googleMapsSDKPromise = null;
            throw err;
        });

        window._googleMapsSDKPromise.then(resolve, reject);
    });
}


// ---------------------------------------------------------------------------
// Map ID + AdvancedMarkerElement helpers
// google.maps.Marker is deprecated. AdvancedMarkerElement needs a cloud Map ID
// (delivered by /api/map/config). These helpers keep the legacy call shape so
// existing code keeps working, and fall back to the legacy Marker if the marker
// library or Map ID is unavailable.
// ---------------------------------------------------------------------------
window._lcdjpMapId = window._lcdjpMapId || '';

function lcdjpMapOptions(opts) {
    var o = Object.assign({}, opts || {});
    if (window._lcdjpMapId) {
        o.mapId = window._lcdjpMapId;
        // Inline `styles` are ignored (and warned about) on Map-ID maps; style the map in Cloud Console.
        delete o.styles;
    }
    return o;
}

function lcdjpCreateMap(element, opts) {
    return new google.maps.Map(element, lcdjpMapOptions(opts));
}

function _lcdjpMarkerContent(o) {
    var icon = o.icon || {};
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:block;line-height:0;';
    var w = 0, h = 0, ax, ay;
    var visual = null;

    if (icon.path !== undefined && window.google && google.maps.SymbolPath && icon.path === google.maps.SymbolPath.CIRCLE) {
        var r = icon.scale || 8, sw = icon.strokeWeight || 0;
        w = h = r * 2 + sw;
        ax = w / 2; ay = h / 2;
        visual = document.createElement('div');
        visual.style.cssText = 'box-sizing:border-box;border-radius:50%;width:' + w + 'px;height:' + h + 'px;'
            + 'background:' + (icon.fillColor || '#1a4080') + ';opacity:' + (icon.fillOpacity == null ? 1 : icon.fillOpacity) + ';'
            + 'border:' + sw + 'px solid ' + (icon.strokeColor || '#fff') + ';';
    } else if (icon.url) {
        w = icon.scaledSize ? icon.scaledSize.width : 24;
        h = icon.scaledSize ? icon.scaledSize.height : 24;
        ax = icon.anchor ? icon.anchor.x : w / 2;      // legacy default anchor: bottom centre
        ay = icon.anchor ? icon.anchor.y : h;
        visual = document.createElement('img');
        visual.src = icon.url;
        visual.alt = '';
        visual.draggable = false;
        visual.style.cssText = 'display:block;width:' + w + 'px;height:' + h + 'px;';
    } else {
        w = 28; h = 36; ax = 14; ay = 36;
        var pin = new google.maps.marker.PinElement();
        visual = pin.element || pin;
    }
    wrap.appendChild(visual);

    if (o.label) {
        var lab = (typeof o.label === 'string') ? { text: o.label } : o.label;
        var span = document.createElement('span');
        span.textContent = lab.text || '';
        span.style.cssText = 'position:absolute;left:' + (w / 2) + 'px;top:' + (h / 2) + 'px;transform:translate(-50%,-50%);'
            + 'white-space:nowrap;pointer-events:none;line-height:1;'
            + 'color:' + (lab.color || '#000') + ';font-size:' + (lab.fontSize || '14px') + ';font-weight:' + (lab.fontWeight || '400') + ';';
        wrap.appendChild(span);
    }

    // AdvancedMarkerElement anchors at bottom-centre; shift so the legacy anchor point lands on the position.
    wrap.style.transform = 'translate(' + (w / 2 - ax) + 'px,' + (h - ay) + 'px)';
    return wrap;
}

function lcdjpCreateMarker(o) {
    o = o || {};
    var AME = window.google && google.maps && google.maps.marker && google.maps.marker.AdvancedMarkerElement;
    if (!AME || !window._lcdjpMapId) {
        return new google.maps.Marker(o);   // legacy fallback (still works, just deprecated)
    }
    var adv = new AME({
        position: o.position,
        map: o.map || null,
        title: o.title || '',
        content: _lcdjpMarkerContent(o),
        zIndex: o.zIndex,
        gmpDraggable: !!o.draggable,
        gmpClickable: true
    });
    // Legacy-compatible helpers so existing call sites keep working.
    // AdvancedMarkerElement's own `map` setter calls this.setMap(), and it already has a native
    // setMap, so only add one when it is missing. Overriding it with `adv.map = m` made the
    // setter and setMap call each other forever (Maximum call stack size exceeded).
    if (typeof adv.setMap !== 'function') {
        adv.setMap = function(m) { adv.map = m || null; };
    }
    // AdvancedMarkerElement logs a deprecation warning for addListener('click', ...).
    // Route 'click' through the native 'gmp-click' DOM event; other events fall back
    // to the original MVC addListener so existing call sites keep working.
    var _origAddListener = (typeof adv.addListener === 'function') ? adv.addListener.bind(adv) : null;
    adv.addListener = function(evt, handler) {
        if (evt === 'click') {
            adv.addEventListener('gmp-click', handler);
            return { remove: function() { adv.removeEventListener('gmp-click', handler); } };
        }
        return _origAddListener ? _origAddListener(evt, handler) : { remove: function() {} };
    };
    adv.setPosition = function(p) { adv.position = p; };
    adv.getPosition = function() {
        var p = adv.position;
        if (!p) return null;
        return (typeof p.lat === 'function') ? p : new google.maps.LatLng(p.lat, p.lng);
    };
    return adv;
}
window.lcdjpMapOptions = lcdjpMapOptions;
window.lcdjpCreateMap = lcdjpCreateMap;
window.lcdjpCreateMarker = lcdjpCreateMarker;

// ---- Places helpers --------------------------------------------------------
// Uses the new Places API (google.maps.places.Place) and falls back to the legacy
// PlacesService only if the new API is unavailable or the request errors
// (e.g. "Places API (New)" not enabled for the key).
function _lcdjpPlacesLib() {
    if (!window.google || !google.maps) return Promise.resolve(null);
    if (google.maps.importLibrary) {
        return google.maps.importLibrary('places').catch(function() { return google.maps.places || null; });
    }
    return Promise.resolve(google.maps.places || null);
}

function _lcdjpLatLngParts(loc) {
    if (!loc) return null;
    var lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
    var lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
    return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat: lat, lng: lng } : null;
}

// Great-circle distance in metres.
function _lcdjpDistanceM(aLat, aLng, bLat, bLng) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// opts: { center:{lat,lng}, radiusM, type, keyword, max }
// cb(items) where items = [{ name, vicinity, place_id, lat, lng }]  (always called once)
function lcdjpPlacesNearby(opts, cb) {
    opts = opts || {};
    var center = { lat: opts.center.lat, lng: opts.center.lng };
    var radius = Math.min(opts.radiusM || 5000, 50000);
    var max = Math.max(1, Math.min(opts.max || 10, 20));
    var done = false;
    // Text searches (keyword) only BIAS towards the centre, so with nothing close by Google answers with the best
    // match anywhere in the world (e.g. US legal-aid offices for a user in Uganda). Drop anything outside the radius.
    function finish(list) {
        if (done) return; done = true;
        cb((list || []).filter(function(it) {
            return it && Number.isFinite(it.lat) && Number.isFinite(it.lng) &&
                _lcdjpDistanceM(center.lat, center.lng, it.lat, it.lng) <= radius * 1.1;
        }));
    }

    function legacy(lib) {
        if (!lib || !lib.PlacesService) { finish([]); return; }
        try {
            if (!window._lcdjpLegacyPlacesNode) window._lcdjpLegacyPlacesNode = document.createElement('div');
            if (!window._lcdjpLegacyPlaces) window._lcdjpLegacyPlaces = new lib.PlacesService(window._lcdjpLegacyPlacesNode);
            var req = { location: center, radius: radius };
            if (opts.type) req.type = opts.type;
            if (opts.keyword) req.keyword = opts.keyword;
            window._lcdjpLegacyPlaces.nearbySearch(req, function(items, status) {
                if (status !== lib.PlacesServiceStatus.OK || !items) { finish([]); return; }
                var out = [];
                items.slice(0, max).forEach(function(r) {
                    var ll = _lcdjpLatLngParts(r.geometry && r.geometry.location);
                    if (!ll) return;
                    out.push({ name: r.name || '', vicinity: r.vicinity || '', place_id: r.place_id || '', lat: ll.lat, lng: ll.lng });
                });
                finish(out);
            });
        } catch (e) { finish([]); }
    }

    _lcdjpPlacesLib().then(function(lib) {
        if (!lib || !lib.Place || typeof lib.Place.searchNearby !== 'function') { legacy(lib); return; }
        var fields = ['id', 'displayName', 'location', 'formattedAddress'];
        var p;
        if (opts.keyword) {
            var tq = { textQuery: opts.keyword, fields: fields, locationBias: { center: center, radius: radius }, maxResultCount: max };
            if (opts.type) tq.includedType = opts.type;
            p = lib.Place.searchByText(tq);
        } else {
            var nq = { fields: fields, locationRestriction: { center: center, radius: radius }, maxResultCount: max };
            if (opts.type) nq.includedTypes = [opts.type];
            p = lib.Place.searchNearby(nq);
        }
        p.then(function(res) {
            var out = [];
            ((res && res.places) || []).forEach(function(pl) {
                var ll = _lcdjpLatLngParts(pl.location);
                if (!ll) return;
                out.push({ name: pl.displayName || '', vicinity: pl.formattedAddress || '', place_id: pl.id || '', lat: ll.lat, lng: ll.lng });
            });
            finish(out);
        }).catch(function(err) {
            console.warn('[LCDJP] Places API (New) request failed, falling back to legacy PlacesService:', err && err.message);
            legacy(lib);
        });
    }).catch(function() { finish([]); });
}

// Text search anywhere in Uganda (no radius), for administrators looking for providers outside their own area.
// opts: { query, max }   cb(items) where items = [{ name, vicinity, place_id, lat, lng }]  (always called once)
// Results outside Uganda are dropped: a text search with nothing matching returns the best match in the world.
function lcdjpPlacesTextSearch(opts, cb) {
    opts = opts || {};
    var max = Math.max(1, Math.min(opts.max || 20, 20));
    var done = false;
    function inUganda(it) {
        return it && Number.isFinite(it.lat) && Number.isFinite(it.lng) &&
            it.lat >= -1.6 && it.lat <= 4.4 && it.lng >= 29.5 && it.lng <= 35.1;
    }
    function finish(list) {
        if (done) return; done = true;
        cb((list || []).filter(inUganda));
    }
    function legacy(lib) {
        if (!lib || !lib.PlacesService) { finish([]); return; }
        try {
            if (!window._lcdjpLegacyPlacesNode) window._lcdjpLegacyPlacesNode = document.createElement('div');
            if (!window._lcdjpLegacyPlaces) window._lcdjpLegacyPlaces = new lib.PlacesService(window._lcdjpLegacyPlacesNode);
            window._lcdjpLegacyPlaces.textSearch({ query: opts.query, region: 'ug' }, function(items, status) {
                if (status !== lib.PlacesServiceStatus.OK || !items) { finish([]); return; }
                var out = [];
                items.slice(0, max).forEach(function(r) {
                    var ll = _lcdjpLatLngParts(r.geometry && r.geometry.location);
                    if (!ll) return;
                    out.push({ name: r.name || '', vicinity: r.formatted_address || r.vicinity || '', place_id: r.place_id || '', lat: ll.lat, lng: ll.lng });
                });
                finish(out);
            });
        } catch (e) { finish([]); }
    }
    _lcdjpPlacesLib().then(function(lib) {
        if (!lib || !lib.Place || typeof lib.Place.searchByText !== 'function') { legacy(lib); return; }
        lib.Place.searchByText({
            textQuery: opts.query,
            fields: ['id', 'displayName', 'location', 'formattedAddress'],
            maxResultCount: max,
            region: 'ug'
        }).then(function(res) {
            var out = [];
            ((res && res.places) || []).forEach(function(pl) {
                var ll = _lcdjpLatLngParts(pl.location);
                if (!ll) return;
                out.push({ name: pl.displayName || '', vicinity: pl.formattedAddress || '', place_id: pl.id || '', lat: ll.lat, lng: ll.lng });
            });
            finish(out);
        }).catch(function(err) {
            console.warn('[LCDJP] Places text search failed, falling back to legacy PlacesService:', err && err.message);
            legacy(lib);
        });
    }).catch(function() { finish([]); });
}

// cb(phoneString)  (always called once; '' when none)
function lcdjpPlacePhone(placeId, cb) {
    var done = false;
    function finish(v) { if (done) return; done = true; cb(v || ''); }
    function legacy(lib) {
        if (!lib || !lib.PlacesService) { finish(''); return; }
        try {
            if (!window._lcdjpLegacyPlacesNode) window._lcdjpLegacyPlacesNode = document.createElement('div');
            if (!window._lcdjpLegacyPlaces) window._lcdjpLegacyPlaces = new lib.PlacesService(window._lcdjpLegacyPlacesNode);
            window._lcdjpLegacyPlaces.getDetails(
                { placeId: placeId, fields: ['formatted_phone_number', 'international_phone_number'] },
                function(d, status) {
                    finish((status === lib.PlacesServiceStatus.OK && d) ? (d.formatted_phone_number || d.international_phone_number || '') : '');
                });
        } catch (e) { finish(''); }
    }
    _lcdjpPlacesLib().then(function(lib) {
        if (!lib || !lib.Place) { legacy(lib); return; }
        var place = new lib.Place({ id: placeId });
        place.fetchFields({ fields: ['nationalPhoneNumber', 'internationalPhoneNumber'] }).then(function() {
            finish(place.nationalPhoneNumber || place.internationalPhoneNumber || '');
        }).catch(function() { legacy(lib); });
    }).catch(function() { finish(''); });
}
window.lcdjpPlacesNearby = lcdjpPlacesNearby;
window.lcdjpPlacesTextSearch = lcdjpPlacesTextSearch;
window.lcdjpPlacePhone = lcdjpPlacePhone;

function _lcdjpMapsErrorToUserMessage(err) {
    switch (err && err.code) {
        case 'config_fetch_failed':
        case 'config_invalid':
            return 'Could not load the map. Check your connection and try again.';
        case 'script_load_failed':
            return 'Could not load the map (blocked or network error). Check your connection and try again.';
        case 'sdk_ready_timeout':
            return 'Map is still loading - please try Directions again in a moment.';
        default:
            return 'Could not load the map. Check your connection and try again.';
    }
}






function reverseGeocodeLocation(lat, lng) {
    var addr   = document.getElementById('pickerAddressDisplay');
    var coords = document.getElementById('pickerCoordsDisplay');

    if (coords) coords.textContent = ' Lat: ' + lat.toFixed(5) + ', Lng: ' + lng.toFixed(5);
    if (addr)   addr.textContent   = ' Looking up address…';

    return fetch(API_BASE_URL + '/api/map/reverse-geocode?lat=' + lat + '&lng=' + lng)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.status !== 'OK') {
                if (addr) addr.textContent = ' Address not found';
                return data;
            }

            var displayName  = data.formatted_address || '';
            var district     = data.district   || '';
            var subCounty    = data.sub_county  || '';
            var parish       = data.parish      || '';
            var village      = data.village     || '';

            if (addr) {
                addr.textContent = displayName || [village, parish, subCounty, district].filter(Boolean).join(', ');
                addr.style.color = '#1a4080';
            }

            selectedPickerLocation = {
                formatted_address : displayName,
                district  : district,
                sub_county: subCounty,
                parish    : parish,
                village   : village,
                lat       : lat,
                lng       : lng
            };

            return data;
        })
        .catch(function(err) {
            console.error('Reverse geocode error:', err);
            if (addr) addr.textContent = ' Could not look up address';
        });
}





var pickerMap         = null;
var pickerMarker      = null;
var selectedPickerLocation = null;
var pickerLatLng      = null;

function openMapPicker() {
    var overlay = document.getElementById('mapPickerOverlay');
    if (!overlay) { console.error('mapPickerOverlay not found'); return; }

    if (pickerMap) { pickerMap = null; }
    pickerMarker = null;
    selectedPickerLocation = null;
    pickerLatLng = null;

    var info = document.getElementById('pickerLocationInfo');
    if (info) info.style.display = 'none';

    window._pickerScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = '';
    lockScroll();

    var loading = document.getElementById('pickerMapLoading');
    if (loading) loading.style.display = 'block';

    setTimeout(function() { initializePickerMap(); }, 100);
}

function closeMapPicker() {
    pickerMap    = null;
    pickerMarker = null;
    var overlay = document.getElementById('mapPickerOverlay');
    if (overlay) { overlay.style.display = 'none'; overlay.style.pointerEvents = 'none'; }
    unlockScroll();
    if (typeof window._pickerScrollY === 'number') {
        window.scrollTo(0, window._pickerScrollY);
        window._pickerScrollY = undefined;
    }
    var info = document.getElementById('pickerLocationInfo');
    if (info) info.style.display = 'none';
    selectedPickerLocation = null;
    pickerLatLng = null;
}

async function initializePickerMap() {
    try {
        await loadGoogleMapsSDK();
    } catch(e) {
        console.error('Could not load Google Maps:', e);
        return;
    }

    var container  = document.getElementById('pickerMapContainer');
    var mapElement = document.getElementById('pickerMap');
    var loading    = document.getElementById('pickerMapLoading');

    if (!container || !mapElement) { console.error('Picker map elements not found'); return; }
    if (loading) loading.style.display = 'none';

    var mapH = container.offsetHeight || Math.max(300, Math.floor(window.innerHeight * 0.55));
    mapElement.style.height = mapH + 'px';
    mapElement.style.width  = '100%';

    if (!navigator.geolocation) {
        mapElement.style.display = 'none';
        var noGpsDiv = document.createElement('div');
        noGpsDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;height:' + mapH + 'px;flex-direction:column;gap:10px;color:#c62828;';
        noGpsDiv.innerHTML = '<span style="font-size:26px;">&#128205;</span><span style="font-size:14px;font-weight:600;">Geolocation not supported</span><span style="font-size:12px;color:#888;">Your browser does not support GPS location.</span>';
        mapElement.parentNode.appendChild(noGpsDiv);
        return;
    }

    mapElement.style.display = 'none';
    var detectingDiv = document.createElement('div');
    detectingDiv.id = 'pickerGpsMsg';
    detectingDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;height:' + mapH + 'px;flex-direction:column;gap:10px;color:#1a4080;';
    detectingDiv.innerHTML = '<span style="font-size:24px;">&#128205;</span><span style="font-size:14px;font-weight:600;">Detecting your location…</span>';
    mapElement.parentNode.appendChild(detectingDiv);

    navigator.geolocation.getCurrentPosition(
        function(pos) {
            var ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            var msg = document.getElementById('pickerGpsMsg');
            if (msg) msg.parentNode.removeChild(msg);
            mapElement.style.display = '';

            pickerMap = lcdjpCreateMap(mapElement, {
                center          : ll,
                zoom            : 14,
                mapTypeId       : 'roadmap',
                mapTypeControl  : false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl     : true,
                gestureHandling : 'cooperative',
                styles          : LCDJP_MAP_STYLES
            });

            lcdjpCreateMarker({
                position: ll,
                map     : pickerMap,
                icon    : {
                    path        : google.maps.SymbolPath.CIRCLE,
                    scale       : 8,
                    fillColor   : '#1a4080',
                    fillOpacity : 1,
                    strokeColor : '#fff',
                    strokeWeight: 2
                },
                title: 'Your Location',
                zIndex: 10
            });

            _addPickerDistrictMarkers();
            pickerMap.addListener('click', function(e) {
                handlePickerMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            });
            _addPickerSearchBox();
            pickerMap.addListener('zoom_changed', _updatePickerZoomHint);
            _updatePickerZoomHint();
        },
        function(err) {
            var msg = document.getElementById('pickerGpsMsg');
            if (msg) {
                msg.style.color = '#c62828';
                msg.innerHTML = '<span style="font-size:26px;">&#128205;</span>'
                    + '<span style="font-size:14px;font-weight:600;">Location access required</span>'
                    + '<span style="font-size:12px;color:#888;text-align:center;">Allow location access in your browser settings, then reopen this map.</span>';
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function _addPickerDistrictMarkers() {
    if (typeof ugandaCoordinates === 'undefined' || !ugandaCoordinates.districts) return;
    Object.keys(ugandaCoordinates.districts).forEach(function(distName) {
        var c = ugandaCoordinates.districts[distName];
        lcdjpCreateMarker({
            position : { lat: c.lat, lng: c.lng },
            map      : pickerMap,
            label    : { text: distName, color: '#1a4080', fontSize: '10px', fontWeight: '600' },
            icon     : {
                path        : google.maps.SymbolPath.CIRCLE,
                scale       : 4,
                fillColor   : '#1a4080',
                fillOpacity : 0.5,
                strokeColor : '#1a4080',
                strokeWeight: 1
            },
            title  : distName,
            zIndex : 1
        });
    });
}

function _addPickerSearchBox() {
    if (!google.maps.places || !google.maps.places.SearchBox) return;

    var input = document.createElement('input');
    input.type        = 'text';
    input.placeholder = 'Search location…';
    input.style.cssText = 'margin:8px;padding:8px 12px;width:240px;border:1px solid #ccc;'
        + 'border-radius:6px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.2);outline:none;';

    pickerMap.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    var searchBox = new google.maps.places.SearchBox(input);
    pickerMap.addListener('bounds_changed', function() { searchBox.setBounds(pickerMap.getBounds()); });

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();
        if (!places || places.length === 0) return;
        var place = places[0];
        if (!place.geometry || !place.geometry.location) return;
        pickerMap.setCenter(place.geometry.location);
        pickerMap.setZoom(14);
        handlePickerMapClick({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        });
    });
}

function _updatePickerZoomHint() {
    var hint = document.getElementById('pickerZoomHint');
    if (!hint || !pickerMap) return;
    var zoom = pickerMap.getZoom();
    hint.textContent = zoom >= 12
        ? ' Good zoom level – click to drop a pin'
        : ' Zoom in for more precision, then click to drop a pin';
}

function handlePickerMapClick(latlng) {
    var info   = document.getElementById('pickerLocationInfo');
    var addr   = document.getElementById('pickerAddressDisplay');
    var coords = document.getElementById('pickerCoordsDisplay');

    pickerLatLng = { lat: latlng.lat, lng: latlng.lng };

    if (pickerMarker) { pickerMarker.setMap(null); pickerMarker = null; }

    pickerMarker = lcdjpCreateMarker({
        position : { lat: latlng.lat, lng: latlng.lng },
        map      : pickerMap,
        draggable: true,
        animation: google.maps.Animation.DROP,
        icon     : {
            url      : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(40, 40),
            anchor   : new google.maps.Point(20, 40)
        },
        zIndex: 100
    });

    pickerMarker.addListener('dragend', function(e) {
        handlePickerMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    if (info)   { info.style.display = 'block'; info.style.background = '#f0f5ff'; info.style.borderLeft = '4px solid #1a4080'; }
    if (addr)   { addr.textContent = ' Looking up address…'; addr.style.color = '#1a4080'; }
    if (coords) { coords.textContent = ' Lat: ' + latlng.lat.toFixed(5) + ', Lng: ' + latlng.lng.toFixed(5); }

    reverseGeocodeLocation(latlng.lat, latlng.lng);
}





var LCDJP_MAP_STYLES = [
    { featureType: 'water',        elementType: 'geometry',     stylers: [{ color: '#c9d8f0' }] },
    { featureType: 'landscape',    elementType: 'geometry',     stylers: [{ color: '#f5f7fa' }] },
    { featureType: 'road',         elementType: 'geometry',     stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial',elementType: 'geometry',     stylers: [{ color: '#e8edf5' }] },
    { featureType: 'road.highway', elementType: 'geometry',     stylers: [{ color: '#d0daf0' }] },
    { featureType: 'poi',          elementType: 'labels',       stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park',     elementType: 'geometry',     stylers: [{ color: '#d4ecc8' }] },
    { featureType: 'administrative',elementType:'labels.text.fill', stylers:[{ color:'#1a4080' }] },
    { featureType: 'administrative',elementType:'labels.text.stroke',stylers:[{ color:'#ffffff' },{ weight:2 }] },
    { featureType: 'transit',      elementType: 'all',          stylers: [{ visibility: 'off' }] }
];


function removeLocationMarker() {
    if (window.tempLocationMarker) { window.tempLocationMarker.setMap(null); window.tempLocationMarker = null; }
}





(function(){
    var SERVICES = [];
    window._lcdjpMapServiceCatalog = SERVICES;

    var _gmap = null, _gmMarkers = {}, _gmUserMarker = null, _gmUserLabel = null, _gmAccuracyCircle = null, _gmInfoWindow = null;
    var _routePolyline = null, _routeDestinationMarker = null, _routeRequestId = 0;
    var _routeCasing = null, _routeAnimRaf = null, _navWatchId = null, _routePath = null, _routeTotalMeters = 0,
        _routeTotalSeconds = 0, _routeApproximate = false, _routeDestPoint = null, _navMapPlaceholder = null, _navFollow = true,
        _navOffCount = 0, _navLastReroute = 0, _navSilent = false, _navRerouteFn = null, _routeDrawIn = false, _navSavedStyle = '', _navHiddenMarkers = [];
    var _initialized = false;
    var _recenterOnNextLocation = true;
    var _lcdjpLiveWatchId = null;

    
    
    var _gmResizeTimer = null;
    window.addEventListener('resize', function () {
        if (!_gmap) return;
        clearTimeout(_gmResizeTimer);
        _gmResizeTimer = setTimeout(function () {
            var center = _gmap.getCenter();
            google.maps.event.trigger(_gmap, 'resize');
            if (center) _gmap.setCenter(center);
        }, 150);
    });

    
    
    
    function _startLCDJPLiveLocation(onSuccess, onError) {
        if (!navigator.geolocation) {
            if (typeof onError === 'function') {
                onError({ code: 0, message: 'Geolocation is not supported on this device.' });
            }
            return null;
        }
        if (_lcdjpLiveWatchId !== null) {
            navigator.geolocation.clearWatch(_lcdjpLiveWatchId);
            _lcdjpLiveWatchId = null;
        }
        _lcdjpLiveWatchId = navigator.geolocation.watchPosition(
            function(pos) {
                var ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                var meta = { accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null };
                if (typeof onSuccess === 'function') onSuccess(ll, meta);
            },
            function(err) {
                if (typeof onError === 'function') onError(err);
            },
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
        );
        return _lcdjpLiveWatchId;
    }

    function _lcdjpLocationErrorMessage(err) {
        var code = err && err.code;
        if (code === 1) return 'Location access was denied.';
        if (code === 2) return 'Your location is currently unavailable.';
        if (code === 3) return 'Location request timed out.';
        return 'Could not determine your location.';
    }

    function pinSVG(color) {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">'
            + '<path d="M17 0C7.6 0 0 7.6 0 17c0 13 17 25 17 25S34 30 34 17C34 7.6 26.4 0 17 0z" fill="' + color + '"/>'
            + '<circle cx="17" cy="17" r="8" fill="white" fill-opacity="0.9"/>'
            + '</svg>'
        );
    }

    function userDotSVG() {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">'
            + '<circle cx="10" cy="10" r="9" fill="#1a237e" fill-opacity="0.2"/>'
            + '<circle cx="10" cy="10" r="5" fill="#1a237e"/>'
            + '<circle cx="10" cy="10" r="5" fill="none" stroke="white" stroke-width="2"/>'
            + '</svg>'
        );
    }

    // ---- Cluster ("group") marker popup: list the services, let the user pick one ----
    var GROUP_LABELS = {
        police: 'Police', hospitals: 'Hospitals', courts: 'Courts',
        localCouncil: 'Local Council', garages: 'Garages', legalAid: 'Legal Aid'
    };

    function _gmGroupLabel(group) {
        return GROUP_LABELS[group] || String(group || 'Services');
    }

    function _gmServiceDetailHtml(s, showBack) {
        var dist = '';
        try {
            var dd = typeof cmGetDistanceAndDirection === 'function' && cmGetDistanceAndDirection(s.lat, s.lng);
            dist = dd ? dd.distanceText + ' ' + dd.direction : (s.dist || '');
        } catch (e) { dist = s.dist || ''; }
        return '<div style="font-family:inherit;padding:8px 6px;min-width:200px;max-width:260px;">'
            + (showBack ? '<button onclick="window._lcdjpGroupBack();event.stopPropagation();" style="border:0;background:none;color:#1a237e;font-size:11px;font-weight:700;cursor:pointer;padding:0 0 6px;">&larr; Back to list</button>' : '')
            + '<div style="font-weight:700;font-size:13px;color:#1a237e;margin-bottom:3px;">' + escapeHtml(s.label) + '</div>'
            + '<div style="font-size:11px;color:#666;margin-bottom:6px;">' + escapeHtml(s.sub || s.vicinity || '') + '</div>'
            + (dist ? '<div style="display:inline-block;background:#e8f0fe;color:#1a237e;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;margin-bottom:10px;">' + escapeHtml(dist) + '</div>' : '')
            + '<div style="display:flex;gap:8px;margin-top:2px;">'
            + '<button onclick="window.cmContactPlace(' + escapeHtml(JSON.stringify(String(s.phone || ''))) + ',' + escapeHtml(JSON.stringify(String(s.place_id || ''))) + ',' + escapeHtml(JSON.stringify(String(s.label))) + ');event.stopPropagation();" '
            + 'style="flex:1;background:#eef0f8;color:#1a237e;border:none;border-radius:14px;font-size:11px;font-weight:700;padding:9px 4px;cursor:pointer;">&#128222; Contact</button>'
            + '<button onclick="window.cmDrawRouteOnMap(' + Number(s.lat) + ',' + Number(s.lng) + ',' + escapeHtml(JSON.stringify(String(s.label))) + ');event.stopPropagation();" '
            + 'style="flex:1;background:#1a237e;color:#fff;border:none;border-radius:14px;font-size:11px;font-weight:700;padding:9px 4px;cursor:pointer;">&#128506; Directions</button>'
            + '</div></div>';
    }

    function _gmGroupListHtml(group, services) {
        var rows = services.map(function (s, i) {
            return '<button onclick="window._lcdjpGroupPick(' + i + ');event.stopPropagation();" '
                + 'style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:#f5f6fb;border-radius:10px;padding:8px 10px;margin-bottom:6px;cursor:pointer;font-family:inherit;">'
                + '<span style="flex:none;width:10px;height:10px;border-radius:50%;background:' + escapeHtml(s.color || '#1a237e') + ';"></span>'
                + '<span style="flex:1;min-width:0;">'
                + '<span style="display:block;font-size:12px;font-weight:700;color:#1a237e;">' + escapeHtml(s.label) + '</span>'
                + ((s.sub || s.vicinity) ? '<span style="display:block;font-size:10px;color:#666;margin-top:1px;">' + escapeHtml(s.sub || s.vicinity) + '</span>' : '')
                + '</span>'
                + '<span style="flex:none;color:#1a237e;font-size:14px;">&rsaquo;</span>'
                + '</button>';
        }).join('');
        return '<div style="font-family:inherit;padding:6px 4px 0;min-width:220px;max-width:270px;">'
            + '<div style="font-weight:700;font-size:13px;color:#1a237e;margin-bottom:8px;">' + escapeHtml(_gmGroupLabel(group)) + '</div>'
            + '<div style="max-height:220px;overflow-y:auto;">' + rows + '</div></div>';
    }

    // Opens the picker for a group. One service skips straight to its details.
    function _gmOpenGroupPopup(group, services, anchor) {
        if (!_gmInfoWindow || !services || !services.length) return;
        window._lcdjpGroupPopup = { group: group, services: services, anchor: anchor };
        if (services.length === 1) {
            _gmInfoWindow.setContent(_gmServiceDetailHtml(services[0], false));
        } else {
            _gmInfoWindow.setContent(_gmGroupListHtml(group, services));
        }
        _gmInfoWindow.open(_gmap, anchor);
    }

    window._lcdjpGroupPick = function (index) {
        var st = window._lcdjpGroupPopup;
        if (!st || !st.services[index]) return;
        _gmInfoWindow.setContent(_gmServiceDetailHtml(st.services[index], true));
    };

    window._lcdjpGroupBack = function () {
        var st = window._lcdjpGroupPopup;
        if (!st) return;
        _gmInfoWindow.setContent(_gmGroupListHtml(st.group, st.services));
    };

    var MAP_STYLES = [
        { featureType:'poi', elementType:'labels', stylers:[{ visibility:'off' }] },
        { featureType:'transit', elementType:'labels', stylers:[{ visibility:'off' }] },
        { featureType:'road', elementType:'geometry', stylers:[{ color:'#f5f5f5' }] },
        { featureType:'road.arterial', elementType:'geometry', stylers:[{ color:'#ffffff' }] },
        { featureType:'road.highway', elementType:'geometry', stylers:[{ color:'#e8e8e8' }] },
        { featureType:'water', elementType:'geometry', stylers:[{ color:'#c9d8f0' }] },
        { featureType:'landscape', elementType:'geometry', stylers:[{ color:'#f2f6fb' }] }
    ];

    var NEARBY_RADIUS_KM = 20;

    function _kmBetween(aLat, aLng, bLat, bLng) {
        var dLat = (bLat - aLat) * Math.PI / 180;
        var dLng = (bLng - aLng) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
              + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180)
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function _withinRadius(userLL, point, km) {
        if (!userLL || !point) return false;
        var lat = typeof point.lat === 'function' ? point.lat() : point.lat;
        var lng = typeof point.lng === 'function' ? point.lng() : point.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        return _kmBetween(userLL.lat, userLL.lng, lat, lng) <= (km || NEARBY_RADIUS_KM);
    }

    function _fitToRadius(userLL, km) {
        if (!_gmap || !userLL) return;
        km = km || NEARBY_RADIUS_KM;
        var latSpan = km / 111;
        var cosLat = Math.cos(userLL.lat * Math.PI / 180);
        var lngSpan = km / (111 * (Math.abs(cosLat) < 0.01 ? 0.01 : cosLat));
        var bounds = new google.maps.LatLngBounds(
            { lat: userLL.lat - latSpan, lng: userLL.lng - lngSpan },
            { lat: userLL.lat + latSpan, lng: userLL.lng + lngSpan }
        );
        _gmap.fitBounds(bounds, { top: 70, right: 24, bottom: 24, left: 24 });
    }

    function _fitToNearbyPoints(userLL, points, km) {
        if (!_gmap || !userLL) return;
        km = km || NEARBY_RADIUS_KM;
        var near = (points || []).filter(function(p) { return _withinRadius(userLL, p, km); });
        if (!near.length) { _fitToRadius(userLL, km); return; }

        var bounds = new google.maps.LatLngBounds();
        bounds.extend(userLL);
        near.forEach(function(p) { bounds.extend({ lat: p.lat, lng: p.lng }); });
        _gmap.fitBounds(bounds, { top: 70, right: 24, bottom: 24, left: 24 });
        google.maps.event.addListenerOnce(_gmap, 'idle', function() {
            if (_gmap.getZoom() > 16) _gmap.setZoom(16);
        });
    }

    function _fitToNearestServices(userLL) {
        if (!_gmap || !userLL) return;

        var RADII = [0.5, 1, 2, 5, 10, NEARBY_RADIUS_KM];
        var found = [];
        var usedRadius = NEARBY_RADIUS_KM;

        for (var ri = 0; ri < RADII.length; ri++) {
            var r = RADII[ri];
            found = SERVICES.filter(function(s) {
                return _kmBetween(userLL.lat, userLL.lng, s.lat, s.lng) <= r;
            });
            if (found.length > 0) { usedRadius = r; break; }
        }

        if (!found.length) {
            _fitToRadius(userLL, NEARBY_RADIUS_KM);
            return;
        }

        var bounds = new google.maps.LatLngBounds();
        bounds.extend(userLL);
        found.forEach(function(s) { bounds.extend({ lat: s.lat, lng: s.lng }); });
        _gmap.fitBounds(bounds, { top: 70, right: 24, bottom: 24, left: 24 });

        google.maps.event.addListenerOnce(_gmap, 'idle', function() {
            if (_gmap.getZoom() > 17) _gmap.setZoom(17);
        });

        if (typeof showToast === 'function' && usedRadius !== Infinity) {
            var label = usedRadius < 1
                ? Math.round(usedRadius * 1000) + ' m'
                : usedRadius + ' km';
            showToast(found.length + ' service' + (found.length > 1 ? 's' : '') + ' found within ' + label);
        }
    }

    var _citizenGpsAccuracy = null;
    var _citizenPlacesRequestId = 0;

    function _loadNearbyPlaces(userCenter) {
        if (!_gmap || !google.maps.places) {
            return;
        }

        var requestId = ++_citizenPlacesRequestId;
        var queries = [
            { type: 'police',                  group: 'police',       color: '#1a237e' },
            { type: 'hospital',                group: 'hospitals',    color: '#c62828' },
            { type: 'courthouse',              group: 'courts',       color: '#e65100' },
            { type: 'local_government_office', group: 'localCouncil', color: '#e57c00' },
            { type: 'car_repair',              group: 'garages',      color: '#00695c' },
            
            
            
            
            
            
            { keyword: 'legal aid',                              group: 'legalAid', color: '#6a1b9a' },
            { keyword: 'Law Development Centre',                 group: 'legalAid', color: '#6a1b9a' },
            { keyword: 'Judiciary of Uganda',                    group: 'legalAid', color: '#6a1b9a' },
            { keyword: 'Uganda Law Society',                     group: 'legalAid', color: '#6a1b9a' },
            { keyword: 'Justice Law and Order Sector',           group: 'legalAid', color: '#6a1b9a' },
            { keyword: 'law firm',                                group: 'legalAid', color: '#6a1b9a' },
            { keyword: 'UNDP international development organization', group: 'legalAid', color: '#6a1b9a' }
        ];
        var results = [];
        var pending = queries.length;

        queries.forEach(function(query) {
            lcdjpPlacesNearby({ center: userCenter, radiusM: NEARBY_RADIUS_KM * 1000, type: query.type, keyword: query.keyword, max: 10 }, function(items) {
                items.forEach(function(place, index) {
                    if (!_withinRadius(userCenter, place, NEARBY_RADIUS_KM)) return;
                    results.push({
                        id: query.group + '_place_' + index + '_' + requestId,
                        lat: place.lat,
                        lng: place.lng,
                        label: place.name || 'Nearby place',
                        sub: place.vicinity || '',
                        dist: '',
                        color: query.color,
                        group: query.group,
                        vicinity: place.vicinity || '',
                        place_id: place.place_id || '',
                        phone: ''
                    });
                });

                pending -= 1;
                if (pending !== 0 || requestId !== _citizenPlacesRequestId) return;

                var catalog = results;
                window._lcdjpMapServiceCatalog = catalog;
                _renderCitizenServices(catalog);

                _fitToNearbyPoints(userCenter, results, NEARBY_RADIUS_KM);
            });
        });
    }

    function _renderCitizenServices(serviceList) {
        if (!_gmap) return;
        Object.keys(_gmMarkers).forEach(function(key) {
            if (_gmMarkers[key]) _gmMarkers[key].setMap(null);
        });
        _gmMarkers = {};
        window._lcdjpMapGroups = {};

        var groupTotals = {};
        var groupPositions = {};
        serviceList.forEach(function(service) {
            var marker = lcdjpCreateMarker({
                position: { lat: service.lat, lng: service.lng },
                map: _gmap,
                icon: {
                    url: pinSVG(service.color),
                    scaledSize: new google.maps.Size(28, 36),
                    anchor: new google.maps.Point(14, 36)
                },
                title: service.label,
                zIndex: 100
            });
            var content = '<div style="font-family:inherit;padding:8px 6px;min-width:190px;">'
                + '<div style="font-weight:700;color:#1a237e;margin-bottom:4px;">' + escapeHtml(service.label) + '</div>'
                + '<div style="font-size:11px;color:#666;">' + escapeHtml(service.sub || service.vicinity || '') + '</div>'
                + '<div style="margin-top:8px;display:flex;gap:6px;">'
                + '<button onclick="window.cmContactPlace(' + escapeHtml(JSON.stringify(String(service.phone || ''))) + ',' + escapeHtml(JSON.stringify(String(service.place_id || ''))) + ',' + escapeHtml(JSON.stringify(String(service.label))) + ');event.stopPropagation();" style="flex:1;border:0;border-radius:10px;padding:7px 4px;background:#eef0f8;color:#1a237e;font-size:11px;font-weight:700;cursor:pointer;">Contact</button>'
                + '<button onclick="window.cmDrawRouteOnMap(' + Number(service.lat) + ',' + Number(service.lng) + ',' + escapeHtml(JSON.stringify(String(service.label))) + ');event.stopPropagation();" style="flex:1;border:0;border-radius:10px;padding:7px 4px;background:#1a237e;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">Directions</button>'
                + '</div></div>';
            marker.addListener('click', function() {
                _gmInfoWindow.setContent(content);
                _gmInfoWindow.open(_gmap, marker);
            });
            _gmMarkers[service.id] = marker;

            if (service.group) {
                if (!groupTotals[service.group]) {
                    groupTotals[service.group] = 0;
                    groupPositions[service.group] = { lat: 0, lng: 0 };
                }
                groupTotals[service.group] += 1;
                groupPositions[service.group].lat += service.lat;
                groupPositions[service.group].lng += service.lng;
            }
        });

        Object.keys(groupTotals).forEach(function(group) {
            var total = groupTotals[group];
            var position = {
                lat: groupPositions[group].lat / total,
                lng: groupPositions[group].lng / total
            };
            var groupMarker = lcdjpCreateMarker({
                position: position,
                map: _gmap,
                label: { text: String(total), color: '#fff', fontSize: '12px', fontWeight: '700' },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 15,
                    fillColor: '#1a237e',
                    fillOpacity: 0.95,
                    strokeColor: '#fff',
                    strokeWeight: 2
                },
                title: total + ' ' + group + ' services',
                zIndex: 250
            });
            var groupServices = serviceList.filter(function(service) { return service.group === group; });
            groupMarker.addListener('click', function() {
                _gmOpenGroupPopup(group, groupServices, groupMarker);
            });
            window._lcdjpMapGroups[group] = {
                marker: groupMarker,
                services: serviceList.filter(function(service) { return service.group === group; })
            };
            document.querySelectorAll('[data-map-count="' + group + '"]').forEach(function(el) {
                el.textContent = String(total);
            });
        });
    }

    // ---- In-app navigation: full-screen map, animated route line, live position following ----
    function _cmHav(a, b) {
        var R = 6371000, toRad = Math.PI / 180;
        var dLat = (b.lat - a.lat) * toRad, dLng = (b.lng - a.lng) * toRad;
        var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
    function _cmStopRouteAnim() {
        if (_routeAnimRaf) { cancelAnimationFrame(_routeAnimRaf); _routeAnimRaf = null; }
    }
    function _cmStopNavWatch() {
        if (_navWatchId != null && navigator.geolocation) { try { navigator.geolocation.clearWatch(_navWatchId); } catch (e) {} }
        _navWatchId = null;
        _navRerouteFn = null;
    }
    function _cmClearRouteGraphics() {
        _cmStopRouteAnim();
        _routeDrawIn = false;
        if (_routeCasing) { _routeCasing.setMap(null); _routeCasing = null; }
        if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
        if (_routeDestinationMarker) { _routeDestinationMarker.setMap(null); _routeDestinationMarker = null; }
    }
    function _cmResizeMapSoon() {
        if (!_gmap) return;
        setTimeout(function() { try { google.maps.event.trigger(_gmap, 'resize'); } catch (e) {} }, 80);
    }
    // Keep the app's own top bar, sidebar and bottom buttons visible: measure them and leave
    // exactly that space around the full-screen map instead of covering them.
    function _cmApplyNavInsets() {
        var vh = window.innerHeight, top = 0, bottom = 0, left = 0;
        function shown(sel) {
            var el = document.querySelector(sel);
            if (!el) return null;
            var cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return null;
            var r = el.getBoundingClientRect();
            return (r.width > 0 && r.height > 0) ? r : null;
        }
        var wide = window.innerWidth >= 900;
        if (wide) {            // desktop keeps its top bar and sidebar
            var bar = shown('header.topbar');
            if (bar && bar.top < 80 && bar.bottom < vh * 0.4) top = Math.max(0, Math.round(bar.bottom));
        }                      // phones: the top header is hidden so the map gets the whole top
        // The sidebar can also be on screen on tablets narrower than 900px (it is ~220px there): keep the map and the
        // route card clear of it. Full-width phone drawers (wider than half the screen) are ignored on purpose.
        var side = shown('#mainSidebar');
        if (side && side.left >= -1 && side.right > 0 && side.width < 420 && side.width < window.innerWidth * 0.5) left = Math.round(side.right);
        var nav = shown('.cm-bottom-nav');
        if (nav && nav.top > vh * 0.5) bottom = Math.max(0, Math.round(vh - nav.top));
        var root = document.documentElement.style;
        root.setProperty('--cm-nav-top', top + 'px');
        root.setProperty('--cm-nav-bottom', bottom + 'px');
        root.setProperty('--cm-nav-left', left + 'px');
        root.setProperty('--cm-nav-lift', (bottom > 0 ? 52 : 12) + 'px');
        var mapEl = document.getElementById('cmMobileMap');
        if (mapEl) {
            // Explicit pixel size (inline + !important) so no stylesheet rule or flex layout can shrink the map.
            var mapH = Math.max(200, vh - top - bottom), mapW = Math.max(200, window.innerWidth - left);
            mapEl.style.cssText = (_navSavedStyle || '') + ';position:fixed !important;top:' + top + 'px !important;left:' + left
                + 'px !important;right:auto !important;bottom:auto !important;width:' + mapW + 'px !important;height:' + mapH
                + 'px !important;min-height:0 !important;max-height:none !important;margin:0 !important;border-radius:0 !important;'
                + 'flex:none !important;z-index:900 !important;';
        }
        _cmResizeMapSoon();
    }
    // Pressing Home / My Cases / Report / Alerts / Menu (or a sidebar item) ends navigation and then does its normal job.
    function _cmNavNavClick(e) {
        var t = e.target;
        if (t && t.closest && t.closest('.cm-bottom-nav, #mainSidebar')) {
            if (typeof window._cmClearRouteRenderer === 'function') window._cmClearRouteRenderer();
        }
    }
    function _cmNavOnResize() {
        if (document.body.classList.contains('cm-nav-active')) _cmApplyNavInsets();
    }
    function _cmScrollPageTop() {
        try { window.scrollTo(0, 0); } catch (e) {}
        var bar = document.querySelector('#citizenMobileView .cm-bar') || document.querySelector('header.topbar');
        for (var n = bar && bar.parentNode; n && n !== document.documentElement; n = n.parentNode) {
            if (n.scrollTop) n.scrollTop = 0;
        }
        if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    }
    function _cmEnterNavMode() {
        var el = document.getElementById('cmMobileMap');
        if (!el || document.body.classList.contains('cm-nav-active')) return;
        _navMapPlaceholder = document.createElement('div');
        _navMapPlaceholder.style.cssText = 'width:100%;height:' + (el.offsetHeight || 280) + 'px;';
        if (el.parentNode) el.parentNode.insertBefore(_navMapPlaceholder, el);
        _navSavedStyle = el.getAttribute('style') || '';
        document.body.appendChild(el);
        document.body.classList.add('cm-nav-active');
        // Only "you" and the destination matter while navigating: hide the other service pins and the accuracy circle.
        _navHiddenMarkers = [];
        Object.keys(_gmMarkers).forEach(function(k) {
            if (_gmMarkers[k]) { _navHiddenMarkers.push(_gmMarkers[k]); _gmMarkers[k].setMap(null); }
        });
        if (_gmAccuracyCircle) _gmAccuracyCircle.setMap(null);
        if (_gmInfoWindow) { try { _gmInfoWindow.close(); } catch (e) {} }
        document.addEventListener('click', _cmNavNavClick, true);
        _cmScrollPageTop();
        _cmApplyNavInsets();
        window.addEventListener('resize', _cmNavOnResize);
        window.addEventListener('orientationchange', _cmNavOnResize);
        _navFollow = true;
        var btn = document.createElement('button');
        btn.className = 'cm-nav-recenter';
        btn.type = 'button';
        btn.title = 'Recenter';
        btn.innerHTML = '&#10148; Recenter';
        btn.onclick = function() {
            _navFollow = true;
            if (window._lcdjpUserPosition && _gmap) { _gmap.panTo(window._lcdjpUserPosition); if (_gmap.getZoom() < 16) _gmap.setZoom(17); }
            btn.style.display = 'none';
        };
        btn.style.display = 'none';
        el.appendChild(btn);
        if (_gmap) {
            _gmap.setOptions({ gestureHandling: 'greedy' });
            google.maps.event.addListener(_gmap, 'dragstart', function() {
                if (!document.body.classList.contains('cm-nav-active')) return;
                _navFollow = false;
                var b = el.querySelector('.cm-nav-recenter');
                if (b) b.style.display = 'block';
            });
        }
        _cmResizeMapSoon();
    }
    function _cmExitNavMode() {
        var el = document.getElementById('cmMobileMap');
        document.body.classList.remove('cm-nav-active');
        document.removeEventListener('click', _cmNavNavClick, true);
        if (el) el.setAttribute('style', _navSavedStyle || '');
        Object.keys(_gmMarkers).forEach(function(k) {
            if (_gmMarkers[k] && _navHiddenMarkers.indexOf(_gmMarkers[k]) >= 0) _gmMarkers[k].setMap(_gmap);
        });
        _navHiddenMarkers = [];
        if (_gmAccuracyCircle && _gmap) _gmAccuracyCircle.setMap(_gmap);
        window.removeEventListener('resize', _cmNavOnResize);
        window.removeEventListener('orientationchange', _cmNavOnResize);
        if (el) {
            var b = el.querySelector('.cm-nav-recenter');
            if (b && b.parentNode) b.parentNode.removeChild(b);
            if (_navMapPlaceholder && _navMapPlaceholder.parentNode) {
                _navMapPlaceholder.parentNode.replaceChild(el, _navMapPlaceholder);
            }
        }
        _navMapPlaceholder = null;
        if (_gmap) {
            _gmap.setOptions({ gestureHandling: 'cooperative' });
            if (typeof google !== 'undefined' && google.maps && google.maps.event) google.maps.event.clearListeners(_gmap, 'dragstart');
        }
        _cmResizeMapSoon();
    }
    // Draws the route progressively, then keeps white direction arrows flowing along it.
    function _cmDrawRouteLine(path, animate) {
        _cmStopRouteAnim();
        if (_routeCasing) { _routeCasing.setMap(null); _routeCasing = null; }
        if (_routePolyline) { _routePolyline.setMap(null); _routePolyline = null; }
        _routeCasing = new google.maps.Polyline({
            map: _gmap, path: animate ? [] : path, geodesic: false, clickable: false,
            strokeColor: '#0b3d91', strokeOpacity: 1, strokeWeight: 11, zIndex: 18
        });
        _routePolyline = new google.maps.Polyline({
            map: _gmap, path: animate ? [] : path, geodesic: false, clickable: false,
            strokeColor: '#1a73e8', strokeOpacity: 1, strokeWeight: 7, zIndex: 20,
            icons: [{
                icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.4, strokeColor: '#ffffff',
                        fillColor: '#ffffff', fillOpacity: 1, strokeWeight: 1 },
                offset: '0px', repeat: '64px'
            }]
        });
        function flow() {
            var offset = 0, last = 0;
            function tick(now) {
                if (!_routePolyline) return;
                if (now - last > 40) {
                    last = now;
                    offset = (offset + 2) % 64;
                    var icons = _routePolyline.get('icons');
                    if (icons && icons[0]) { icons[0].offset = offset + 'px'; _routePolyline.set('icons', icons); }
                }
                _routeAnimRaf = requestAnimationFrame(tick);
            }
            _routeAnimRaf = requestAnimationFrame(tick);
        }
        if (!animate || path.length < 3) { flow(); return; }
        _routeDrawIn = true;
        var start = performance.now(), dur = Math.min(1800, 600 + path.length * 2), total = path.length;
        function frame(now) {
            if (!_routePolyline) return;
            var t = Math.min(1, (now - start) / dur);
            var eased = 1 - Math.pow(1 - t, 3);
            var sub = path.slice(0, Math.max(2, Math.ceil(eased * total)));
            _routeCasing.setPath(sub);
            _routePolyline.setPath(sub);
            if (t < 1) _routeAnimRaf = requestAnimationFrame(frame);
            else { _routeAnimRaf = null; _routeDrawIn = false; flow(); }
        }
        _routeAnimRaf = requestAnimationFrame(frame);
    }
    function _cmFormatDistance(m) { return m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 0 : 1) + ' km' : Math.round(m) + ' m'; }
    function _cmFormatDuration(sec) {
        var min = Math.max(1, Math.round(sec / 60));
        return min >= 60 ? Math.floor(min / 60) + ' hr ' + (min % 60 ? min % 60 + ' min' : '') : min + ' min';
    }
    // Follows the person along the route: moves their dot, trims the part already travelled,
    // updates time/distance left, re-routes if they leave the road, and announces arrival.
    function _cmStartNavFollow() {
        _cmStopNavWatch();
        if (!navigator.geolocation) return;
        _navOffCount = 0;
        _navWatchId = navigator.geolocation.watchPosition(function(pos) {
            if (!_gmap || !_routePath || _routePath.length < 2) return;
            var me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            var acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : 30;
            window._lcdjpUserPosition = me;
            if (_gmUserMarker) { _gmUserMarker.setPosition(me); _gmUserMarker.setMap(_gmap); }
            if (_gmUserLabel) { _gmUserLabel.setPosition(me); _gmUserLabel.setMap(_gmap); }
            if (_gmAccuracyCircle) { _gmAccuracyCircle.setCenter(me); _gmAccuracyCircle.setRadius(acc); }

            var best = 0, bestD = Infinity, i, d;
            for (i = 0; i < _routePath.length; i++) {
                d = _cmHav(me, _routePath[i]);
                if (d < bestD) { bestD = d; best = i; }
            }
            var toDest = _routeDestPoint ? _cmHav(me, _routeDestPoint) : Infinity;
            var statEl = document.getElementById('cmNavTimeLeft'), distEl = document.getElementById('cmNavDistLeft');

            if (toDest <= 30) {
                _cmStopNavWatch();
                if (statEl) statEl.textContent = 'Arrived';
                if (distEl) distEl.textContent = '0 m';
                if (typeof showToast === 'function') showToast('You have arrived.');
                return;
            }
            if (bestD > Math.max(80, acc * 1.5)) {
                _navOffCount++;
                if (_navOffCount >= 2 && Date.now() - _navLastReroute > 15000 && typeof _navRerouteFn === 'function') {
                    _navLastReroute = Date.now();
                    _navOffCount = 0;
                    _navRerouteFn(me);
                }
            } else {
                _navOffCount = 0;
                var remaining = [me].concat(_routePath.slice(best));
                _routePath = remaining;
                if (_routePolyline && !_routeDrawIn) {
                    // trim the travelled part once the draw-in animation has finished
                    _routePolyline.setPath(remaining);
                    if (_routeCasing) _routeCasing.setPath(remaining);
                }
                var left = 0;
                for (i = 1; i < remaining.length; i++) left += _cmHav(remaining[i - 1], remaining[i]);
                if (distEl) distEl.textContent = _cmFormatDistance(left);
                if (statEl && _routeTotalMeters > 0) statEl.textContent = (_routeApproximate ? '~' : '') + _cmFormatDuration(_routeTotalSeconds * Math.min(1, left / _routeTotalMeters));
            }
            if (_navFollow) _gmap.panTo(me);
        }, function() {}, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
    }

    window.initCitizenMobileMap = function(locate) {
        var el = document.getElementById('cmMobileMap');
        if (!el) return;

        if (_initialized && _gmap) {
            var _mapDiv = (typeof _gmap.getDiv === 'function') ? _gmap.getDiv() : null;
            if (_mapDiv && el.contains(_mapDiv)) {
                google.maps.event.trigger(_gmap, 'resize');
                if (locate) geoLocate();
                return;
            }
            // The home view was re-rendered, so the old map is attached to a detached element: rebuild it.
            _initialized = false;
            _gmap = null;
            _gmMarkers = {};
        }

        loadGoogleMapsSDK().then(function() {
            var fallback = document.getElementById('cmMapFallback');

            if (fallback) {
                fallback.style.display = 'flex';
                fallback.innerHTML = '<span style="font-size:12px;color:#5a6a8a;font-weight:600;text-align:center;padding:12px;">'
                    + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a4080" stroke-width="2" stroke-linecap="round" style="display:block;margin:0 auto 6px;">'
                    + '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>'
                    + 'Detecting your location\u2026</span>';
            }

            function _doInitCitizenMap(center, isLiveLocation, accuracy) {
                _initialized = true;
                if (fallback) fallback.style.display = 'none';

                _gmap = lcdjpCreateMap(el, {
                    center: center,
                    zoom: isLiveLocation ? 15 : 11,
                    minZoom: 10,
                    mapTypeId: 'roadmap',
                    styles: MAP_STYLES,
                    disableDefaultUI: true,
                    zoomControl: true,
                    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
                    clickableIcons: false,
                    gestureHandling: 'cooperative'
                });

                _gmInfoWindow = new google.maps.InfoWindow();

                _gmUserMarker = lcdjpCreateMarker({
                    position: center,
                    map: isLiveLocation ? _gmap : null,
                    icon: { url: userDotSVG(), scaledSize: new google.maps.Size(20, 20), anchor: new google.maps.Point(10, 10) },
                    title: 'You are here',
                    zIndex: 999
                });

                _gmUserLabel = lcdjpCreateMarker({
                    position: center,
                    map: isLiveLocation ? _gmap : null,
                    icon: { url: 'data:image/png;base64,iVBORw0KGgo=', scaledSize: new google.maps.Size(1, 1) },
                    label: { text: 'You are here', color: '#fff', fontWeight: '700', fontSize: '10px' },
                    zIndex: 998
                });

                _gmAccuracyCircle = new google.maps.Circle({
                    map: isLiveLocation ? _gmap : null,
                    center: center,
                    radius: accuracy || 500,
                    strokeColor: '#1a4080',
                    strokeOpacity: 0.45,
                    strokeWeight: 2,
                    fillColor: '#1a4080',
                    fillOpacity: 0.07
                });

                function _renderServices(svcList) {
                    Object.keys(_gmMarkers).forEach(function(k) { if (_gmMarkers[k]) _gmMarkers[k].setMap(null); });
                    _gmMarkers = {};
                    var groupTotals = {}, groupPositions = {};

                    svcList.forEach(function(s) {
                        var marker = lcdjpCreateMarker({
                            position: { lat: s.lat, lng: s.lng },
                            map: _gmap,
                            icon: { url: pinSVG(s.color), scaledSize: new google.maps.Size(28, 36), anchor: new google.maps.Point(14, 36) },
                            title: s.label,
                            zIndex: 100
                        });

                        var _sDist = (function() {
                            var dd = typeof cmGetDistanceAndDirection === 'function' && cmGetDistanceAndDirection(s.lat, s.lng);
                            if (dd) return dd.distanceText + ' ' + dd.direction;
                            return s.dist || '';
                        })();
                        var _safeLabel = s.label.replace(/'/g, "\'");
                        var infoContent = '<div style="font-family:inherit;padding:8px 6px;min-width:200px;max-width:260px;">'
                            + '<div style="font-weight:700;font-size:13px;color:#1a237e;margin-bottom:3px;">' + escapeHtml(s.label) + '</div>'
                            + '<div style="font-size:11px;color:#666;margin-bottom:6px;">' + escapeHtml(s.sub || s.vicinity || '') + '</div>'
                            + (_sDist ? '<div style="display:inline-block;background:#e8f0fe;color:#1a237e;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;margin-bottom:10px;" id="cmDistLabel_' + s.id + '">' + _sDist + '</div>' : '')
                            + '<div style="display:flex;gap:8px;margin-top:2px;">'
                            + '<button onclick="window.cmContactPlace(' + escapeHtml(JSON.stringify(String(s.phone||''))) + ',' + escapeHtml(JSON.stringify(String(s.place_id||''))) + ',' + escapeHtml(JSON.stringify(String(s.label))) + ');event.stopPropagation();" '
                            + 'style="flex:1;background:#eef0f8;color:#1a237e;border:none;border-radius:14px;font-size:11px;font-weight:700;padding:9px 4px;cursor:pointer;">&#128222; Contact</button>'
                            + '<button onclick="window.cmDrawRouteOnMap(' + Number(s.lat) + ',' + Number(s.lng) + ',' + escapeHtml(JSON.stringify(String(s.label))) + ');event.stopPropagation();" '
                            + 'style="flex:1;background:#1a237e;color:#fff;border:none;border-radius:14px;font-size:11px;font-weight:700;padding:9px 4px;cursor:pointer;">&#128506; Directions</button>'
                            + '</div></div>';

                        marker.addListener('click', function() {
                            _gmInfoWindow.setContent(infoContent);
                            _gmInfoWindow.open(_gmap, marker);
                        });
                        _gmMarkers[s.id] = marker;

                        if (s.group) {
                            if (!groupTotals[s.group]) { groupTotals[s.group] = 0; groupPositions[s.group] = { lat: 0, lng: 0 }; }
                            groupTotals[s.group]++;
                            groupPositions[s.group].lat += s.lat;
                            groupPositions[s.group].lng += s.lng;
                        }
                    });

                    window._lcdjpMapGroups = {};
                    Object.keys(groupTotals).forEach(function(group) {
                        var total = groupTotals[group];
                        var gc = { lat: groupPositions[group].lat / total, lng: groupPositions[group].lng / total };
                        var groupMarker = lcdjpCreateMarker({
                            position: gc, map: _gmap,
                            label: { text: String(total), color: '#fff', fontSize: '12px', fontWeight: '700' },
                            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 15, fillColor: '#1a237e', fillOpacity: 0.95, strokeColor: '#fff', strokeWeight: 2 },
                            title: total + ' ' + group + ' services', zIndex: 250
                        });
                        var groupServices = svcList.filter(function(s) { return s.group === group; });
                        groupMarker.addListener('click', function() {
                            _gmOpenGroupPopup(group, groupServices, groupMarker);
                        });
                        window._lcdjpMapGroups[group] = { marker: groupMarker, services: svcList.filter(function(s) { return s.group === group; }) };
                        document.querySelectorAll('[data-map-count="' + group + '"]').forEach(function(el) { el.textContent = total; });
                    });
                }

                function _loadNearbyPlaces(userCenter) {
                    if (!google.maps.places) {
                        _renderServices(SERVICES); return;
                    }
                    var PLACE_QUERIES = [
                        { type: 'police',                  group: 'police',       color: '#1a237e' },
                        { type: 'hospital',                group: 'hospitals',    color: '#c62828' },
                        { type: 'courthouse',              group: 'courts',       color: '#e65100' },
                        { type: 'local_government_office', group: 'localCouncil', color: '#e57c00' },
                        { type: 'car_repair',              group: 'garages',      color: '#00695c' },
                        
                        
                        
                        
                        
                        
                        { keyword: 'legal aid',                              group: 'legalAid', color: '#6a1b9a' },
                        { keyword: 'Law Development Centre',                 group: 'legalAid', color: '#6a1b9a' },
                        { keyword: 'Judiciary of Uganda',                    group: 'legalAid', color: '#6a1b9a' },
                        { keyword: 'Uganda Law Society',                     group: 'legalAid', color: '#6a1b9a' },
                        { keyword: 'Justice Law and Order Sector',           group: 'legalAid', color: '#6a1b9a' },
                        { keyword: 'law firm',                                group: 'legalAid', color: '#6a1b9a' },
                        { keyword: 'UNDP international development organization', group: 'legalAid', color: '#6a1b9a' }
                    ];
                    var allResults = [], pending = PLACE_QUERIES.length, _ts = Date.now();

                    PLACE_QUERIES.forEach(function(q) {
                        lcdjpPlacesNearby({ center: userCenter, radiusM: NEARBY_RADIUS_KM * 1000, type: q.type, keyword: q.keyword, max: 3 }, function(results) {
                            pending--;
                            results.forEach(function(r, idx) {
                                if (!_withinRadius(userCenter, r, NEARBY_RADIUS_KM)) return;
                                allResults.push({
                                    id:       q.group + '_p' + idx + '_' + _ts,
                                    lat:      r.lat,
                                    lng:      r.lng,
                                    label:    r.name,
                                    sub:      r.vicinity || '',
                                    dist:     '',
                                    color:    q.color,
                                    group:    q.group,
                                    vicinity: r.vicinity || '',
                                    place_id: r.place_id  || '',
                                    phone:    ''
                                });
                            });
                            if (pending === 0) {
                                var nearbySeeded = SERVICES.filter(function(s) {
                                    return _withinRadius(userCenter, s, NEARBY_RADIUS_KM);
                                });
                                var final = allResults.length > 0 ? allResults : nearbySeeded;
                                window._lcdjpMapServiceCatalog = final;
                                _renderServices(final);

                                _fitToNearbyPoints(userCenter, final, NEARBY_RADIUS_KM);
                            }
                        });
                    });
                }

                if (isLiveLocation) _loadNearbyPlaces(center);

                _startLCDJPLiveLocation(function(ll, meta) {
                    window._lcdjpUserPosition = { lat: ll.lat, lng: ll.lng };
                    if (_recenterOnNextLocation) {
                        _recenterOnNextLocation = false;
                        _fitToNearestServices(ll);
                    }
                    
                    var activeSvcs = window._lcdjpMapServiceCatalog || SERVICES;
                    activeSvcs.forEach(function(s) {
                        var lbl = document.getElementById('cmDistLabel_' + s.id);
                        if (lbl && typeof cmGetDistanceAndDirection === 'function') {
                            var dd = cmGetDistanceAndDirection(s.lat, s.lng);
                            if (dd) lbl.textContent = dd.distanceText + ' ' + dd.direction;
                        }
                    });
                    if (_gmUserMarker) { _gmUserMarker.setPosition(ll); _gmUserMarker.setMap(_gmap); }
                    if (_gmUserLabel)  { _gmUserLabel.setPosition(ll);  _gmUserLabel.setMap(_gmap);  }
                    if (_gmAccuracyCircle) {
                        _gmAccuracyCircle.setCenter(ll);
                        _gmAccuracyCircle.setRadius(meta && meta.accuracy ? meta.accuracy : 30);
                    }
                }, function(err) {
                    var fallback = document.getElementById('cmMapFallback');
                    if (fallback) {
                        fallback.style.display = 'flex';
                        fallback.innerHTML = '<span style="font-size:12px;color:#9b2c2c;font-weight:700;text-align:center;padding:16px;">'
                            + _lcdjpLocationErrorMessage(err)
                            + '<br><small style="font-weight:400;">Tap the locate button and allow location access.</small></span>';
                    }
                });

            } 
            
            window.cmDrawRouteOnMap = function(destLat, destLng, destName, mode) {
                mode = ['WALKING', 'DRIVING', 'BICYCLING'].indexOf(String(mode || 'WALKING').toUpperCase()) >= 0
                    ? String(mode || 'WALKING').toUpperCase() : 'WALKING';
                var panel = document.getElementById('cmRoutePanel');
                if (!panel) {
                    panel = document.createElement('div');
                    panel.id = 'cmRoutePanel';
                }
                // The panel is position:fixed, but it is authored inside the map card. Any hidden, clipped or
                // transformed ancestor (a hidden view, overflow, transform) makes it invisible, so the
                // Directions button seemed to do nothing. Hang it off <body> so it always shows.
                if (panel.parentNode !== document.body) document.body.appendChild(panel);

                function esc(value) {
                    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
                        return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch];
                    });
                }
                function show(html, error, nav) {
                    var wasExpanded = panel.classList.contains('cm-route-expanded');
                    panel.innerHTML = html;
                    panel.classList.add('cm-route-visible');
                    panel.classList.toggle('cm-route-error-visible', !!error);
                    panel.classList.toggle('cm-route-nav', !!nav);
                    panel.classList.toggle('cm-route-expanded', !!nav && wasExpanded);
                }
                function clearRouteLine() { _cmClearRouteGraphics(); }
                function errorPanel(message) {
                    show('<div class="cm-route-handle"></div>'
                        + '<div class="cm-route-header">'
                        + '<button class="cm-route-back" onclick="window._cmClearRouteRenderer&&window._cmClearRouteRenderer()">&#10005; Close</button>'
                        + '<div class="cm-route-title"><strong>' + esc(destName || 'Nearby service') + '</strong><span>Directions</span></div>'
                        + '</div><div class="cm-route-error">' + esc(message)
                        + '<br><button class="cm-route-retry" onclick="window.cmDrawRouteOnMap('
                        + Number(destLat) + ',' + Number(destLng) + ',' + esc(JSON.stringify(String(destName))) + ',\'' + mode + '\')">Try again</button></div>', true);
                }
                function distanceText(meters) {
                    return meters >= 1000 ? (meters / 1000).toFixed(meters >= 10000 ? 0 : 1) + ' km' : Math.round(meters) + ' m';
                }
                function durationText(seconds) {
                    var minutes = Math.max(1, Math.round(seconds / 60));
                    return minutes >= 60 ? Math.floor(minutes / 60) + ' hr ' + (minutes % 60 ? minutes % 60 + ' min' : '') : minutes + ' min';
                }
                function routePanel(route, requestId, origin) {
                    if (requestId !== _routeRequestId) return;
                    var coordinates = route.geometry && route.geometry.coordinates;
                    if (!Array.isArray(coordinates) || !coordinates.length) {
                        errorPanel('No road route was found for this service.');
                        return;
                    }
                    var silent = _navSilent;
                    _navSilent = false;
                    var path = coordinates.map(function(pair) {
                        return { lat: Number(pair[1]), lng: Number(pair[0]) };
                    }).filter(function(point) { return isFinite(point.lat) && isFinite(point.lng); });
                    if (path.length < 2) { errorPanel('No road route was found for this service.'); return; }
                    _cmEnterNavMode();
                    clearRouteLine();
                    _routePath = path.slice();
                    _routeTotalMeters = Number(route.distance || 0);
                    _routeTotalSeconds = Number(route.duration || 0);
                    _routeApproximate = !!route.approximate;   // fallback router: show the time as an estimate (~)
                    _routeDestPoint = { lat: Number(destLat), lng: Number(destLng) };
                    _cmDrawRouteLine(path, !silent);
                    _routeDestinationMarker = lcdjpCreateMarker({
                        map: _gmap, position: { lat: Number(destLat), lng: Number(destLng) },
                        title: destName || 'Destination',
                        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 11, fillColor: '#e65100', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }
                    });
                    var bounds = new google.maps.LatLngBounds();
                    path.forEach(function(point) { bounds.extend(point); });
                    if (!silent) {
                        // The map is now full screen; leave room for the compact bottom panel.
                        setTimeout(function() {
                            try { google.maps.event.trigger(_gmap, 'resize'); } catch (e) {}
                            var mh = (document.getElementById('cmMobileMap') || {}).clientHeight || window.innerHeight || 600;
                            var wide = window.innerWidth >= 900;
                            _gmap.fitBounds(bounds, {
                                top: Math.min(80, Math.round(mh * 0.12)),
                                right: Math.min(40, Math.round(mh * 0.08)),
                                bottom: wide ? 60 : Math.min(210, Math.round(mh * 0.34)),
                                left: wide ? 450 : 30
                            });
                        }, 150);
                    }

                    var steps = (route.legs && route.legs[0] && route.legs[0].steps) || [];
                    var stepsHtml = steps.slice(0, 30).map(function(step, index) {
                        var maneuver = step.maneuver && step.maneuver.instruction;
                        var road = step.name ? ' on ' + step.name : '';
                        var instruction = maneuver || ((index === 0 ? 'Start' : 'Continue') + road);
                        var icon = index === 0 ? '&#128205;' : (index === steps.length - 1 ? '&#127937;' : (mode === 'DRIVING' ? '&#8599;' : '&#128694;'));
                        return '<div class="cm-route-step"><div class="cm-route-step-icon">' + icon + '</div>'
                            + '<div><div>' + esc(instruction) + '</div><div class="cm-route-step-dist">'
                            + distanceText(Number(step.distance || 0)) + '</div></div></div>';
                    }).join('');
                    show('<div class="cm-route-handle" onclick="document.getElementById(\'cmRoutePanel\').classList.toggle(\'cm-route-expanded\')"></div>'
                        + '<div class="cm-route-header">'
                        + '<button class="cm-route-back" onclick="window._cmClearRouteRenderer&&window._cmClearRouteRenderer()">&#10005; End</button>'
                        + '<div class="cm-route-title"><strong>' + esc(destName || 'Nearby service') + '</strong>'
                        + '<span><b id="cmNavTimeLeft">' + (route.approximate ? '~' : '') + durationText(Number(route.duration || 0)) + '</b> &bull; <b id="cmNavDistLeft">' + distanceText(Number(route.distance || 0)) + '</b> left</span></div>'
                        + '</div><div class="cm-route-modes">'
                        + '<button class="cm-route-mode-btn' + (mode === 'WALKING' ? ' active' : '') + '" onclick="window.cmDrawRouteOnMap(' + Number(destLat) + ',' + Number(destLng) + ',' + esc(JSON.stringify(String(destName))) + ',\'WALKING\')">&#128694; Walk</button>'
                        + '<button class="cm-route-mode-btn' + (mode === 'DRIVING' ? ' active' : '') + '" onclick="window.cmDrawRouteOnMap(' + Number(destLat) + ',' + Number(destLng) + ',' + esc(JSON.stringify(String(destName))) + ',\'DRIVING\')">&#128663; Drive</button>'
                        + '<button class="cm-route-mode-btn' + (mode === 'BICYCLING' ? ' active' : '') + '" onclick="window.cmDrawRouteOnMap(' + Number(destLat) + ',' + Number(destLng) + ',' + esc(JSON.stringify(String(destName))) + ',\'BICYCLING\')">&#128692; Bike</button>'
                        + '<button class="cm-route-mode-btn cm-route-steps-btn" onclick="document.getElementById(\'cmRoutePanel\').classList.toggle(\'cm-route-expanded\')">&#9776; Steps</button>'
                        + '</div>'
                        + '<div class="cm-route-steps">' + stepsHtml + '</div>', false, true);
                    _navRerouteFn = function(me) { _navSilent = true; requestRoute(me, true); };
                    _cmStartNavFollow();
                }
                function requestRoute(origin, silentReroute) {
                    if (!_gmap) { errorPanel('The map is still loading. Please try again in a moment.'); return; }
                    var requestId = ++_routeRequestId;
                    if (!silentReroute) {
                        _cmStopNavWatch();
                        clearRouteLine();
                        show('<div class="cm-route-handle"></div><div class="cm-route-header">'
                            + '<button class="cm-route-back" onclick="window._cmClearRouteRenderer&&window._cmClearRouteRenderer()">&#10005; Close</button>'
                            + '<div class="cm-route-title"><strong>' + esc(destName || 'Nearby service') + '</strong><span>Calculating route…</span></div>'
                            + '</div><div class="cm-route-spinner">&#128506;&#65039; Calculating route on this map…</div>');
                    }
                    var base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
                    var query = '?originLat=' + encodeURIComponent(origin.lat)
                        + '&originLng=' + encodeURIComponent(origin.lng)
                        + '&destinationLat=' + encodeURIComponent(destLat)
                        + '&destinationLng=' + encodeURIComponent(destLng)
                        + '&mode=' + encodeURIComponent(mode);
                    fetch(base + '/api/map/route' + query, { signal: AbortSignal.timeout(15000) })
                        .then(function(response) {
                            return response.json().then(function(data) {
                                if (!response.ok) throw new Error(data.error || 'Could not calculate this route.');
                                return data;
                            });
                        })
                        .then(function(data) {
                            if (data && data.routes && data.routes[0]) routePanel(data.routes[0], requestId, origin);
                            else throw new Error('No road route was found for this service.');
                        })
                        .catch(function(error) {
                            _navSilent = false;
                            if (requestId !== _routeRequestId) return;
                            if (silentReroute) return;   // keep the current line; try again on the next off-route check
                            errorPanel(error.message || 'Could not calculate this route.');
                        });
                }

                _gmInfoWindow && _gmInfoWindow.close();
                var stored = window._lcdjpUserPosition;
                if (stored && isFinite(stored.lat) && isFinite(stored.lng)) {
                    requestRoute({ lat: stored.lat, lng: stored.lng });
                } else if (navigator.geolocation) {
                    show('<div class="cm-route-handle"></div><div class="cm-route-header">'
                        + '<button class="cm-route-back" onclick="window._cmClearRouteRenderer&&window._cmClearRouteRenderer()">&#10005; Close</button>'
                        + '<div class="cm-route-title"><strong>' + esc(destName || 'Nearby service') + '</strong><span>Locating you…</span></div>'
                        + '</div><div class="cm-route-spinner">&#128205; Getting your location…</div>');
                    navigator.geolocation.getCurrentPosition(function(pos) {
                        window._lcdjpUserPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        requestRoute(window._lcdjpUserPosition);
                    }, function() {
                        errorPanel('Location access is needed to calculate a route from your current position.');
                    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
                } else {
                    errorPanel('This device does not provide a location.');
                }
            };

            window._cmClearRouteRenderer = function() {
                _cmStopNavWatch();
                _cmClearRouteGraphics();
                _routePath = null;
                _routeRequestId++;
                var panel = document.getElementById('cmRoutePanel');
                if (panel) panel.classList.remove('cm-route-visible', 'cm-route-error-visible', 'cm-route-nav', 'cm-route-expanded');
                _cmExitNavMode();
                if (_gmap && window._lcdjpUserPosition) {
                    setTimeout(function() {
                        _gmap.panTo(window._lcdjpUserPosition);
                        _gmap.setZoom(15);
                    }, 160);
                }
            };

            window._lcdjpGetDirectionsInApp = function(destLat, destLng, destName, mode) {
                // The assistant modal sits above the map; hide it so the route is visible.
                var _aiModal = document.getElementById('aiAssistantModal');
                if (_aiModal && _aiModal.classList.contains('open') && typeof window.closeAIAssistant === 'function') {
                    try { window.closeAIAssistant(); } catch (e) {}
                }
                if (typeof showGISPage === 'function') showGISPage();

                var draw = function() {
                    if (typeof window.cmDrawRouteOnMap === 'function') {
                        window.cmDrawRouteOnMap(destLat, destLng, destName || 'Destination', mode || 'WALKING');
                    }
                };
                function isMapReady() {
                    return !!(_gmap && typeof window.cmDrawRouteOnMap === 'function');
                }

                if (isMapReady()) {
                    setTimeout(draw, 350);
                    return;
                }

                if (typeof window.initCitizenMobileMap === 'function') {
                    try { window.initCitizenMobileMap(false); } catch (e) {}
                }

                function pollForReady(maxAttempts, notReadyMessage) {
                    var attempts = 0;
                    var interval = setInterval(function() {
                        attempts++;
                        if (isMapReady()) {
                            clearInterval(interval);
                            setTimeout(draw, 150);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(interval);
                            if (typeof showToast === 'function') showToast(notReadyMessage);
                        }
                    }, 200);
                }

                if (window._googleMapsSDKPromise) {
                    window._googleMapsSDKPromise.then(function() {
                        pollForReady(60, 'Map is still loading - please try Directions again in a moment.');
                    }, function(err) {
                        console.error('[LCDJP] directions_map_load_failed code=' + ((err && err.code) || 'unknown'));
                        if (typeof showToast === 'function') showToast(_lcdjpMapsErrorToUserMessage(err));
                    });
                } else {
                    pollForReady(90, 'Map is still loading - please try Directions again in a moment.');
                }
            };

            window.cmContactPlace = function(phone, placeId, name) {
                if (phone && phone.length > 2) {
                    window.location.href = 'tel:' + phone;
                } else if (placeId) {
                    window.open('https://www.google.com/maps/place/?q=place_id:' + placeId, '_blank');
                } else {
                    window.open('https://www.google.com/maps/search/' + encodeURIComponent(name || ''), '_blank');
                }
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(pos) {
                        window._lcdjpUserPosition = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        };
                        _doInitCitizenMap(window._lcdjpUserPosition, true, Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null);
                    },
                    function() {
                        // GPS denied/slow: still create the map (centered on Kampala) so Directions and
                        // route drawing have a map to draw on instead of timing out.
                        if (!_gmap) _doInitCitizenMap({ lat: 0.3476, lng: 32.5825 }, false, null);
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
                );
            } else if (!_gmap) {
                _doInitCitizenMap({ lat: 0.3476, lng: 32.5825 }, false, null);
            }

        }).catch(function(err) {
            console.error('[LCDJP] maps_sdk_error code=' + ((err && err.code) || 'unknown') + ' (citizen map init) -', err);
            var fallback = document.getElementById('cmMapFallback');
            if (fallback) {
                fallback.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a4080" stroke-width="1.5"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>'
                    + '<span style="font-size:12px;color:#c62828;font-weight:600;margin-top:6px;">Map unavailable</span>';
            }
        });
    };

    function geoLocate() {
        if (!_gmap) return;
        _recenterOnNextLocation = true;
        _startLCDJPLiveLocation(function(ll, meta) {
            _gmap.panTo(ll);
            _gmap.setZoom(16);
            _recenterOnNextLocation = false;
            if (_gmUserMarker) _gmUserMarker.setPosition(ll);
            if (_gmUserLabel)  _gmUserLabel.setPosition(ll);
            if (_gmAccuracyCircle) {
                _gmAccuracyCircle.setCenter(ll);
                _gmAccuracyCircle.setRadius(meta && meta.accuracy ? meta.accuracy : 30);
            }
        });
    }

    window.cmMapFilter = function(evt, id) {
        document.querySelectorAll('.cm-map-chip').forEach(function(c) { c.classList.remove('cm-map-chip-active'); });
        evt.currentTarget.classList.add('cm-map-chip-active');
        if (!_gmap) return;
        if (id === 'all') {
            if (!window._lcdjpUserPosition) return;
            var resetCenter = window._lcdjpUserPosition;
            var resetZoom   = 15;
            _gmap.panTo(resetCenter);
            _gmap.setZoom(resetZoom);
            if (_gmInfoWindow) _gmInfoWindow.close();
        } else {
            var group = window._lcdjpMapGroups && window._lcdjpMapGroups[id];
            var matches = group
                ? group.services
                : SERVICES.filter(function(x) { return x.id === id; });
            if (!matches.length) return;
            var bounds = new google.maps.LatLngBounds();
            matches.forEach(function(s) {
                bounds.extend({ lat: s.lat, lng: s.lng });
            });
            _gmap.fitBounds(bounds);
            if (matches.length === 1) _gmap.setZoom(16);
            if (group && group.marker) google.maps.event.trigger(group.marker, 'click');
        }
    };

    window.cmMapFlyToService = function(id, lat, lng) {
        var section = document.getElementById('cmMobileMapSection');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        function resolvePos() {
            if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
                return { lat: lat, lng: lng };
            }
            for (var i = 0; i < SERVICES.length; i++) {
                if (SERVICES[i].id === id) return { lat: SERVICES[i].lat, lng: SERVICES[i].lng };
            }
            return null;
        }

        function fly() {
            var pos = resolvePos();
            if (pos && _gmap) { _gmap.panTo(pos); _gmap.setZoom(17); }
            if (_gmap && _gmMarkers[id]) google.maps.event.trigger(_gmMarkers[id], 'click');
        }

        if (!_gmap) {
            initCitizenMobileMap(false);
            var _flyAttempts = 0;
            var _flyPoll = setInterval(function() {
                _flyAttempts++;
                if (_gmap) { clearInterval(_flyPoll); setTimeout(fly, 300); }
                else if (_flyAttempts > 25) clearInterval(_flyPoll);
            }, 200);
        } else {
            fly();
        }
    };

    function tryAutoInit() {
        
        
        
        
        var dashboardVisible = document.getElementById('dashboardPage') &&
            document.getElementById('dashboardPage').style.display !== 'none';
        var canRun = dashboardVisible && _getMapsToken();

        if (window.innerWidth <= 767 && document.getElementById('cmMobileMap') && canRun) {
            setTimeout(initCitizenMobileMap, 800);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryAutoInit);
    } else {
        tryAutoInit();
    }
})();





(function() {
    'use strict';

    var ALL_SERVICES = [
        { id:'lc1',    lat:0.3540, lng:32.5750, label:'LC I Nakulabye',      type:'Local Council', icon:'', bg:'#e8f0fe', mapId:'lc1'    },
        { id:'lc2',    lat:0.3420, lng:32.6100, label:'LC II Bugolobi',      type:'Local Council', icon:'', bg:'#e8f0fe', mapId:'lc2'    },
        { id:'lc3',    lat:0.3250, lng:32.6200, label:'LC III Mutungo',      type:'Local Council', icon:'', bg:'#e8f0fe', mapId:'lc3'    },
        { id:'police', lat:0.3380, lng:32.6350, label:'Kireka Police Post',  type:'Police',        icon:'', bg:'#e8eaf6', mapId:'police' },
        { id:'pol2',   lat:0.3100, lng:32.5650, label:'Kampala Central PS',  type:'Police',        icon:'', bg:'#e8eaf6', mapId:'police' },
        { id:'legal1', lat:0.3200, lng:32.5780, label:'Legal Aid Uganda',    type:'Legal Aid',     icon:'',  bg:'#f3e5f5', mapId:null     },
        { id:'hosp1',  lat:0.3290, lng:32.5970, label:'Mulago Hospital',     type:'Hospital',      icon:'', bg:'#fce4ec', mapId:null     },
        { id:'lc4',    lat:0.3600, lng:32.5900, label:'LC I Kamwokya',       type:'Local Council', icon:'', bg:'#e8f0fe', mapId:'lc1'    },
    ];

    var DEFAULT_LAT = 0.3476, DEFAULT_LNG = 32.5825;

    function haversine(lat1, lng1, lat2, lng2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat/2)*Math.sin(dLat/2)
              + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)
                *Math.sin(dLng/2)*Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function fmtDist(km) {
        return km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km';
    }

    function renderNearby(userLat, userLng) {
        var list = document.getElementById('cmNearbyServicesList');
        if (!list) return;

        var sorted = ALL_SERVICES.map(function(s) {
            return Object.assign({}, s, { km: haversine(userLat, userLng, s.lat, s.lng) });
        }).sort(function(a, b) { return a.km - b.km; }).slice(0, 5);

        list.innerHTML = sorted.map(function(s) {
            var onclick = s.mapId ? 'onclick="cmMapFilter && cmMapFilter(event,\'' + s.mapId + '\')"' : '';
            return '<div class="cm-nearby-item" ' + onclick + ' style="' + (s.mapId ? 'cursor:pointer;' : '') + '">'
                + '<div class="cm-nearby-dot" style="background:' + s.bg + ';font-size:14px;line-height:26px;text-align:center;">' + s.icon + '</div>'
                + '<div class="cm-nearby-info">'
                  + '<div class="cm-nearby-name">' + escapeHtml(s.label) + '</div>'
                  + '<div class="cm-nearby-type">' + escapeHtml(s.type) + '</div>'
                + '</div>'
                + '<div class="cm-nearby-dist">' + fmtDist(s.km) + '</div>'
                + '</div>';
        }).join('');

        var nearbyEl = document.getElementById('cmStatNearby');
        if (nearbyEl) nearbyEl.textContent = sorted.length;
    }

    function refreshCmStats() {
        
        if (!_isMapsAuthenticated()) {
            console.log('[LCDJP] Not authenticated - skipping stats refresh');
            return;
        }

        var myCaseCount = 0;
        try {
            var sources = [
                window._citizenCasesCache,
                window._myCases,
                window._loadedCases
            ];
            var username = localStorage.getItem('lcdjp_username') || '';
            for (var i = 0; i < sources.length; i++) {
                if (Array.isArray(sources[i]) && sources[i].length > 0) {
                    var arr = sources[i];
                    myCaseCount = arr.filter(function(cc) {
                        var isOwn = !username ||
                                    (cc.userId && cc.userId === username) ||
                                    (cc.email  && cc.email  === username) ||
                                    (cc.citizenEmail && cc.citizenEmail === username);
                        var open  = cc.status !== 'Resolved' && cc.status !== 'Rejected' && cc.status !== 'Closed';
                        return isOwn && open;
                    }).length;
                    break;
                }
            }
        } catch(e) {}
        var caseEl = document.getElementById('cmStatCases');
        if (caseEl) caseEl.textContent = myCaseCount;

        var msgBadgeEl = document.getElementById('cmMsgBadge');
        var msgStatEl  = document.getElementById('cmStatMsg');
        if (msgStatEl) {
            var msgCount = (msgBadgeEl && msgBadgeEl.style.display !== 'none')
                ? parseInt(msgBadgeEl.textContent) || 0 : 0;
            if (window._unreadMessageCount != null) msgCount = window._unreadMessageCount;
            msgStatEl.textContent = msgCount;
        }

        var bellEl    = document.getElementById('cmBellCount');
        var alertEl   = document.getElementById('cmStatAlerts');
        if (alertEl) {
            var bellCount = (bellEl && bellEl.style.display !== 'none')
                ? parseInt(bellEl.textContent) || 0 : 0;
            if (window._unreadNotifCount != null) bellCount = window._unreadNotifCount;
            alertEl.textContent = bellCount;
        }
    }

    function watchBadges() {
        var targets = ['cmMsgBadge','cmBellCount','cmBellDot'];
        targets.forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            new MutationObserver(refreshCmStats).observe(el, {
                childList: true, characterData: true, subtree: true, attributes: true
            });
        });
    }

    function patchLogin() {
        var orig = window.loginUser;
        if (typeof orig === 'function') {
            window.loginUser = function() {
                var r = orig.apply(this, arguments);
                setTimeout(function() { refreshCmStats(); initNearbyServices(); }, 800);
                return r;
            };
        }
    }

    window.refreshCmStats = refreshCmStats;

    function init() {
        if (typeof _isMapsAuthenticated === 'function' && !_isMapsAuthenticated()) return;
        initNearbyServices();
        refreshCmStats();
        watchBadges();
        patchLogin();
        setInterval(function() {
            if (document.getElementById('citizenMobileView') && window.innerWidth <= 767) {
                refreshCmStats();
            }
        }, 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 400);
    }
})();





(function () {
    'use strict';

    function apiRefreshStats() {
        if (!_isMapsAuthenticated()) {
            console.log('[LCDJP] Not authenticated - skipping stats refresh');
            return;
        }

        var chatStatsToken = _getMapsToken();
        if (!chatStatsToken) {
            console.warn('[LCDJP] No token found for apiRefreshStats');
            return;
        }

        var tokenPayload = null;
        try {
            var tokenParts = chatStatsToken.split('.');
            if (tokenParts.length === 3) {
                tokenPayload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
            }
        } catch (e) {}

        var username = tokenPayload && tokenPayload.sub;
        if (!chatStatsToken || !username) {
            console.warn('[LCDJP] Invalid token or no username in token');
            return;
        }
        
        var ep = (typeof API_ENDPOINTS !== 'undefined') ? API_ENDPOINTS : null;
        var role = String((tokenPayload && tokenPayload.role) ||
                         localStorage.getItem('lcdjp_userlevel') ||
                         localStorage.getItem('userRole') || '').trim().toUpperCase();
        var verificationStatus = String(localStorage.getItem('lcdjp_verif_status') ||
                                        localStorage.getItem('verificationStatus') || '').trim().toUpperCase();
        var isAdministrator = role === 'ADMIN' || role === 'SYSTEM_ADMIN' ||
                              role === 'SYSTEM_ADMINISTRATOR' || role === 'DISTRICT_ADMIN';
        var sensitiveStatsAllowed = isAdministrator ||
            verificationStatus === 'APPROVED' || verificationStatus === 'VERIFIED';

        var authHeader = { 
            'Authorization': 'Bearer ' + chatStatsToken,
            'Content-Type': 'application/json'
        };

        if (!sensitiveStatsAllowed) {
            var restrictedCaseEl = document.getElementById('cmStatCases');
            var restrictedMsgEl = document.getElementById('cmStatMsg');
            if (restrictedCaseEl) restrictedCaseEl.textContent = '0';
            if (restrictedMsgEl) restrictedMsgEl.textContent = '0';
            return;
        }

        var caseEl = document.getElementById('cmStatCases');
        if (caseEl && sensitiveStatsAllowed && ep && ep.citizenCases) {
            fetch(ep.citizenCases(username), {
                suppressAuthRedirect: true,
                headers: authHeader
            })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d) return;
                var list = Array.isArray(d) ? d : (d.cases || []);
                var open = list.filter(function (c) {
                    return c.status !== 'Resolved' && c.status !== 'Rejected' && c.status !== 'Closed';
                }).length;
                caseEl.textContent = open;
                window._citizenCasesCache = list; 
            }).catch(function () {});
        }

        var alertEl = document.getElementById('cmStatAlerts');
        if (alertEl && ep && ep.unreadNotifications) {
            fetch(ep.unreadNotifications(username), {
                headers: authHeader
            })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d) return;
                var count = typeof d.count === 'number' ? d.count
                    : Array.isArray(d.notifications) ? d.notifications.filter(function (n) { return !n.read; }).length
                    : Array.isArray(d) ? d.length : 0;
                alertEl.textContent = count;
                window._unreadNotifCount = count;
                var bell = document.getElementById('cmBellCount');
                if (bell) { bell.textContent = count; bell.style.display = count > 0 ? 'flex' : 'none'; }
            }).catch(function () {
                var b = document.getElementById('cmBellCount');
                var c = (b && b.style.display !== 'none') ? (parseInt(b.textContent) || 0) : 0;
                if (window._unreadNotifCount != null) c = window._unreadNotifCount;
                alertEl.textContent = c;
            });
        }

        var msgEl = document.getElementById('cmStatMsg');
        if (msgEl) {
            if (sensitiveStatsAllowed && ep && ep.chatUserMessages && _isMapsAuthenticated()) {
                fetch(ep.chatUserMessages(username), {
                    suppressAuthRedirect: true,
                    headers: authHeader
                })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (d) {
                    if (!d) return;
                    var msgs = Array.isArray(d.messages) ? d.messages : Array.isArray(d) ? d : [];
                    var unread = msgs.filter(function (m) {
                        var sender = m.senderUsername || m.sender_username || m.from_user;
                        return !m.read && sender !== username;
                    }).length;
                    if (window._unreadMessageCount != null) unread = window._unreadMessageCount;
                    msgEl.textContent = unread;
                }).catch(function () {
                    var badge = document.getElementById('cmMsgBadge');
                    var c = (badge && badge.style.display !== 'none') ? (parseInt(badge.textContent) || 0) : 0;
                    if (window._unreadMessageCount != null) c = window._unreadMessageCount;
                    msgEl.textContent = c;
                });
            } else {
                var badge = document.getElementById('cmMsgBadge');
                var c = (badge && badge.style.display !== 'none') ? (parseInt(badge.textContent) || 0) : 0;
                if (window._unreadMessageCount != null) c = window._unreadMessageCount;
                msgEl.textContent = c;
            }
        }
    }

    window.refreshCmStats = apiRefreshStats;
    window._rawApiRefreshStats = apiRefreshStats;

    var _refreshPending = false;
    var _refreshLastRun = 0;
    var DEBOUNCE_MS = 2000; 

    function safeRefresh() {
        var now = Date.now();
        if (_refreshPending || (now - _refreshLastRun) < DEBOUNCE_MS) return;
        _refreshPending = true;
        _refreshLastRun = now;
        setTimeout(function () {
            _refreshPending = false;
            var fn = window._rawApiRefreshStats || window.apiRefreshStats;
            if (typeof fn === 'function') {
                try { fn(); } catch (e) { console.warn('apiRefreshStats error:', e); }
            }
        }, 50);
    }

    if (typeof window.apiRefreshStats !== 'function') {
        window.apiRefreshStats = safeRefresh;
    }
    window.refreshCmStats = safeRefresh;

    function rewireBadgeObservers() {
        ['cmMsgBadge', 'cmBellCount', 'cmBellDot'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
            new MutationObserver(function () {
                safeRefresh();
            }).observe(clone, {
                childList: true, characterData: true, subtree: true, attributes: true
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', rewireBadgeObservers);
    } else {
        rewireBadgeObservers();
    }
})();





(function () {
    'use strict';

    var _b7LoginPatched = false;

    function patchLogin7() {
        if (_b7LoginPatched) return;
        var orig = window.loginUser;
        if (typeof orig !== 'function') return;
        _b7LoginPatched = true;
        window.loginUser = function () {
            var r = orig.apply(this, arguments);
            setTimeout(function () { window.apiRefreshStats(); window.initNearbyServices(); }, 1000);
            return r;
        };
    }

    function boot7() {
        patchLogin7();
        
        
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            ['cmMsgBadge', 'cmBellCount'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) {
                    new MutationObserver(function() { window.apiRefreshStats(); }).observe(el, {
                        childList: true,
                        characterData: true,
                        subtree: true,
                        attributes: true
                    });
                }
            });
            
            
            setInterval(function () {
                if (document.getElementById('citizenMobileView') && window.innerWidth <= 767) {
                    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
                        window.apiRefreshStats();
                    }
                }
            }, 30000);
            
            setTimeout(function () {
                if (typeof isAuthenticated === 'function' && isAuthenticated()) {
                    window.apiRefreshStats();
                }
                if (typeof window.initNearbyServices === 'function') {
                    window.initNearbyServices();
                }
            }, 700);
        } else {
            
            
            
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot7);
    } else {
        boot7();
    }
})();













function showGISPage() {
    if (typeof showHome === 'function') {
        try { showHome(); } catch (e) {}
    }
    var section = document.getElementById('cmMobileMapSection');
    if (section && typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (typeof window.initCitizenMobileMap === 'function') {
        window.initCitizenMobileMap(false);
    }
}
window.showGISPage = showGISPage;

function getDirectionsTo(lat, lng, name) {
    if (typeof window._lcdjpGetDirectionsInApp === 'function') {
        window._lcdjpGetDirectionsInApp(lat, lng, name, 'WALKING');
        return;
    }
    if (typeof showGISPage === 'function') showGISPage();
}


function cmCalculateDistance(lat1, lng1, lat2, lng2) {
    
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function cmCalculateBearing(lat1, lng1, lat2, lng2) {
    
    var toRad = Math.PI / 180;
    var y = Math.sin((lng2 - lng1) * toRad) * Math.cos(lat2 * toRad);
    var x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
        Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lng2 - lng1) * toRad);
    var bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

function cmBearingToCardinal(bearing) {
    var directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    var index = Math.round(bearing / 22.5) % 16;
    return directions[index];
}

function cmFormatDistance(km) {
    if (km == null || isNaN(km)) return '';
    if (km < 1) return Math.round(km * 1000) + ' m';
    return km.toFixed(1) + ' km';
}

function cmNavigateTo(lat, lng, name) {
    if (typeof getDirectionsTo === 'function') {
        getDirectionsTo(lat, lng, name);
        return;
    }
    window.open('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng, '_blank');
}

function cmGetDistanceAndDirection(destLat, destLng) {
    var pos = window._lcdjpUserPosition;
    if (!pos || !pos.lat || !pos.lng) return null;
    var km = cmCalculateDistance(pos.lat, pos.lng, destLat, destLng);
    var bearing = cmCalculateBearing(pos.lat, pos.lng, destLat, destLng);
    return {
        distance: km,
        distanceText: cmFormatDistance(km),
        bearing: Math.round(bearing),
        direction: cmBearingToCardinal(bearing)
    };
}


window.cmCalculateDistance    = cmCalculateDistance;
window.cmCalculateBearing     = cmCalculateBearing;
window.cmBearingToCardinal    = cmBearingToCardinal;
window.cmFormatDistance       = cmFormatDistance;
window.cmGetDistanceAndDirection = cmGetDistanceAndDirection;
window.cmNavigateTo           = cmNavigateTo;


window._lastGeoResult = null;


function focusServiceOnMap(lat, lng, name) {
    if (typeof showGISPage === 'function') showGISPage();
    if (typeof window.cmMapFlyToService === 'function') {
        window.cmMapFlyToService(null, lat, lng);
    }
    if (typeof showToast === 'function') showToast('' + name);
    const modal = document.getElementById('serviceListModal');
    if (modal) modal.remove();
}