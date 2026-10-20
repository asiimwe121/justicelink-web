package lcdjp.maps;

import lcdjp.common.OutboundGuard;
import lcdjp.common.OutboundHttp;
import lcdjp.common.ProviderRejectedException;
import lcdjp.cases.RouteEstimates;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class GoogleMapsService {

    private static final String GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
    private static final String OSRM_BASE = "https://router.project-osrm.org/route/v1/driving/";
    private static final Logger log = LoggerFactory.getLogger(GoogleMapsService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private GoogleMapsProperties googleMapsProperties;

    public Map<String, Object> geocodeAddress(String address) {
        log.info("🌐 Geocoding address: {}", address);

        String apiKey = googleMapsProperties.getApiKey();
        if (apiKey == null || apiKey.isEmpty() || apiKey.startsWith("your_") || apiKey.startsWith("${")) {
            log.error("❌ Google Maps API key is not properly configured!");
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "ERROR");
            errorResult.put("error", "Google Maps API key is not configured");
            return errorResult;
        }

        try {
            String encodedAddress = URLEncoder.encode(address, "UTF-8");
            String url = UriComponentsBuilder.fromHttpUrl(GEOCODE_BASE)
                    .queryParam("address", encodedAddress)
                    .queryParam("key", apiKey)
                    .build(false)
                    .toUriString();

            log.info("📡 Calling Google Maps Geocoding API");
            String jsonResponse = fetchJson(url);
            return parseGeocodeResponse(jsonResponse);

        } catch (Exception e) {
            log.error("❌ Geocoding error", e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "ERROR");
            errorResult.put("error", "Unable to geocode address. Please try again later.");
            return errorResult;
        }
    }

    public Map<String, Object> geocodeUgandaLocation(String location) {
        log.info("🇺🇬 Geocoding Uganda location: {}", location);
        String fullAddress = location + ", Uganda";
        return geocodeAddress(fullAddress);
    }
    public Map<String, Object> getDirections(double originLat, double originLng,
                                             double destLat, double destLng,
                                             String mode) {
        try {
            String apiKey = googleMapsProperties.getApiKey();
            if (apiKey == null || apiKey.isEmpty() || apiKey.startsWith("your_") || apiKey.startsWith("${")) {
                log.warn("Google Maps API key is not configured; using the public OSRM route service.");
                return getOsrmDirections(originLat, originLng, destLat, destLng, mode);
            }

            String url = "https://maps.googleapis.com/maps/api/directions/json" +
                    "?origin=" + originLat + "," + originLng +
                    "&destination=" + destLat + "," + destLng +
                    "&mode=" + mode.toLowerCase() +
                    "&key=" + apiKey;

            log.info("📡 Calling Google Maps Directions API");
            Map<String, Object> googleResult;
            try {
                googleResult = normalizeGoogleDirections(fetchJson(url));
            } catch (Exception googleFailure) {
                log.error("❌ Google Directions call failed: {}", googleFailure.getMessage());
                googleResult = null;
            }
            if (googleResult != null && "OK".equals(googleResult.get("status"))) {
                return googleResult;
            }

            // Google refused (REQUEST_DENIED / API not enabled / quota) or was unreachable: do not leave the
            // person with a dead Directions button, fall back to the public road router.
            log.warn("Google Directions unavailable ({}); falling back to OSRM",
                    googleResult != null ? googleResult.get("error") : "request failed");
            return getOsrmDirections(originLat, originLng, destLat, destLng, mode);

        } catch (Exception e) {
            log.error("❌ Directions error: {}", e.getMessage());
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "ERROR");
            errorResult.put("error", "Could not calculate a road route right now.");
            return errorResult;
        }
    }

    private Map<String, Object> getOsrmDirections(double originLat, double originLng,
                                                  double destLat, double destLng, String mode) {
        try {
            String url = OSRM_BASE + originLng + "," + originLat + ";"
                    + destLng + "," + destLat
                    + "?overview=full&geometries=geojson&steps=true";
            String json = fetchJson(url);
            Map<String, Object> result = objectMapper.readValue(
                    json, new TypeReference<Map<String, Object>>() {});
            if (!"Ok".equals(result.get("code"))) {
                Map<String, Object> error = new HashMap<>();
                error.put("status", "ERROR");
                error.put("error", "No road route was found for this service.");
                return error;
            }
            result.put("status", "OK");
            // OSRM only routes for cars: re-estimate walking/cycling times and flag the answer as approximate.
            RouteEstimates.applyFallbackEstimate(result, mode);
            return result;
        } catch (Exception e) {
            log.error("OSRM directions fallback failed: {}", e.getMessage());
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "ERROR");
            errorResult.put("error", "Could not calculate a road route right now.");
            return errorResult;
        }
    }

    private Map<String, Object> normalizeGoogleDirections(String json) throws Exception {
        Map<String, Object> google = objectMapper.readValue(
                json, new TypeReference<Map<String, Object>>() {});
        if (!"OK".equals(google.get("status"))) {

            Object statusObj = google.get("status");
            Object messageObj = google.get("error_message");
            log.error("❌ Directions API returned status={} message={}", statusObj, messageObj);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("error", "Directions API returned: " + statusObj
                    + (messageObj != null ? " - " + messageObj : ""));
            return error;
        }

        List<Map<String, Object>> googleRoutes = listOfMaps(google.get("routes"));
        if (googleRoutes.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("error", "No road route was found for this service.");
            return error;
        }

        Map<String, Object> sourceRoute = googleRoutes.get(0);
        Map<String, Object> route = new HashMap<>();
        Object overviewPolyline = sourceRoute.get("overview_polyline");
        String encodedPolyline = "";
        if (overviewPolyline instanceof Map<?, ?> overviewMap) {
            Object points = overviewMap.get("points");
            if (points != null) encodedPolyline = String.valueOf(points);
        }
        route.put("geometry", Map.of(
                "type", "LineString",
                "coordinates", decodePolylineCoordinates(encodedPolyline)));

        List<Map<String, Object>> legs = listOfMaps(sourceRoute.get("legs"));
        if (!legs.isEmpty()) {
            Map<String, Object> sourceLeg = legs.get(0);
            Map<String, Object> leg = new HashMap<>();
            leg.put("distance", numberValue(sourceLeg.get("distance"), "value"));
            leg.put("duration", numberValue(sourceLeg.get("duration"), "value"));

            List<Map<String, Object>> steps = new ArrayList<>();
            for (Map<String, Object> sourceStep : listOfMaps(sourceLeg.get("steps"))) {
                Map<String, Object> step = new HashMap<>();
                step.put("distance", numberValue(sourceStep.get("distance"), "value"));
                step.put("name", sourceStep.getOrDefault("html_instructions", ""));
                step.put("maneuver", Map.of("instruction",
                        stripHtml(String.valueOf(sourceStep.getOrDefault(
                                "html_instructions", "Continue")))));
                steps.add(step);
            }
            leg.put("steps", steps);
            route.put("legs", List.of(leg));
            route.put("distance", numberValue(sourceLeg.get("distance"), "value"));
            route.put("duration", numberValue(sourceLeg.get("duration"), "value"));
        }

        return Map.of("status", "OK", "routes", List.of(route));
    }

    private List<Map<String, Object>> listOfMaps(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Map<String, Object> copy = new HashMap<>();
                map.forEach((key, itemValue) -> copy.put(String.valueOf(key), itemValue));
                result.add(copy);
            }
        }
        return result;
    }

    private Object numberValue(Object value, String key) {
        if (value instanceof Map<?, ?> map && map.get(key) instanceof Number number) {
            return number;
        }
        return 0;
    }

    private String stripHtml(String value) {
        return value.replaceAll("<[^>]*>", "")
                .replace("&amp;", "&")
                .replace("&nbsp;", " ")
                .replace("&quot;", "\"")
                .replace("&#39;", "'");
    }

    private List<List<Double>> decodePolylineCoordinates(String encoded) {
        List<List<Double>> coordinates = new ArrayList<>();
        int index = 0;
        int latitude = 0;
        int longitude = 0;
        while (index < encoded.length()) {
            int result = 0;
            int shift = 0;
            int value;
            do {
                if (index >= encoded.length()) return coordinates;
                value = encoded.charAt(index++) - 63;
                result |= (value & 0x1f) << shift;
                shift += 5;
            } while (value >= 0x20);
            latitude += (result & 1) != 0 ? ~(result >> 1) : result >> 1;

            result = 0;
            shift = 0;
            do {
                if (index >= encoded.length()) return coordinates;
                value = encoded.charAt(index++) - 63;
                result |= (value & 0x1f) << shift;
                shift += 5;
            } while (value >= 0x20);
            longitude += (result & 1) != 0 ? ~(result >> 1) : result >> 1;
            coordinates.add(List.of(longitude / 1e5, latitude / 1e5));
        }
        return coordinates;
    }

    public Map<String, Object> reverseGeocode(double lat, double lng) {
        String apiKey = googleMapsProperties.getApiKey();
        if (apiKey == null || apiKey.isEmpty() || apiKey.startsWith("your_") || apiKey.startsWith("${")) {
            log.error("❌ Google Maps API key is not properly configured!");
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "ERROR");
            errorResult.put("error", "Google Maps API key is not configured");
            return errorResult;
        }

        try {
            String latlng = lat + "," + lng;
            String url = UriComponentsBuilder.fromHttpUrl(GEOCODE_BASE)
                    .queryParam("latlng", latlng)
                    // No result_type filter: restricting to district-level types hid the sub-county, parish and
                    // village names Google does know, which the client needs to match against the Uganda hierarchy.
                    .queryParam("language", "en")
                    .queryParam("key", apiKey)
                    .build(false)
                    .toUriString();
            return parseReverseGeocodeResponse(fetchJson(url));

        } catch (Exception e) {
            log.error("❌ Reverse geocoding error", e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "ERROR");
            errorResult.put("error", "Unable to reverse geocode location. Please try again later.");
            return errorResult;
        }
    }

    private static final java.time.Duration FETCH_TIMEOUT = java.time.Duration.ofSeconds(10);

    /** No new attempt starts after this long, so a struggling Google cannot hold a request thread for a minute. */
    private static final long FETCH_TIME_LIMIT_MILLIS = 15_000L;

    // Retries transient failures (5xx, 429, timeouts) and opens a circuit after repeated ones, so a Google outage
    // is not waited on by every request.
    private OutboundHttp http = new OutboundHttp("google-maps", OutboundGuard.withRetries("google-maps"));

    /** Test hook. */
    void setHttp(OutboundHttp http) {
        this.http = http;
    }

    private String fetchJson(String urlString) {
        try {
            return http.get(urlString, Map.of("Accept", "application/json"), FETCH_TIMEOUT, FETCH_TIME_LIMIT_MILLIS).body();
        } catch (ProviderRejectedException e) {
            // Google answered with a client error; its JSON body (for example status INVALID_REQUEST) is still
            // parsed by the callers, exactly as before.
            log.error("❌ API Error Response: {}", e.getBody());
            return e.getBody() == null ? "" : e.getBody();
        } catch (Exception e) {
            log.error("❌ Google Maps API call failed: {}", e.getMessage());
            return "";
        }
    }

    private Map<String, Object> parseGeocodeResponse(String json) {
        Map<String, Object> result = new HashMap<>();

        if (json == null || json.isEmpty()) {
            result.put("status", "ERROR");
            result.put("error", "Empty response from Google Maps");
            return result;
        }

        String status = extractJsonValue(json, "\"status\"");
        result.put("status", status);

        log.info("📊 Geocode Status: {}", status);

        if (!"OK".equals(status)) {
            String errorMsg = extractJsonValue(json, "\"error_message\"");
            log.error("❌ Geocoding error: {} - {}", status, errorMsg);
            result.put("error", "Google Geocoding API returned status: " + status +
                    (errorMsg != null ? " - " + errorMsg : ""));
            return result;
        }

        int locationIdx = json.indexOf("\"location\"");
        if (locationIdx == -1) {
            log.warn("⚠️ No location found in response");
            result.put("error", "No location found in response");
            return result;
        }

        int latIdx = json.indexOf("\"lat\"", locationIdx);
        if (latIdx != -1) {
            String latVal = extractNumberAfterColon(json, latIdx + 5);
            if (latVal != null) {
                try {
                    double lat = Double.parseDouble(latVal);
                    result.put("lat", lat);
                    log.info("📍 Latitude: {}", lat);
                } catch (NumberFormatException e) {
                    log.warn("⚠️ Could not parse latitude: {}", latVal);
                }
            }
        }

        int lngIdx = json.indexOf("\"lng\"", locationIdx);
        if (lngIdx != -1) {
            String lngVal = extractNumberAfterColon(json, lngIdx + 5);
            if (lngVal != null) {
                try {
                    double lng = Double.parseDouble(lngVal);
                    result.put("lng", lng);
                    log.info("📍 Longitude: {}", lng);
                } catch (NumberFormatException e) {
                    log.warn("⚠️ Could not parse longitude: {}", lngVal);
                }
            }
        }

        String formatted = extractJsonValue(json, "\"formatted_address\"");
        if (formatted != null) {
            result.put("formatted_address", formatted);
            log.info("📍 Formatted Address: {}", formatted);
        }

        return result;
    }

    private Map<String, Object> parseReverseGeocodeResponse(String json) {
        Map<String, Object> result = new HashMap<>();

        String status = extractJsonValue(json, "\"status\"");
        result.put("status", status);

        if (!"OK".equals(status)) {
            String errorMsg = extractJsonValue(json, "\"error_message\"");
            result.put("error", "Google Reverse Geocoding API returned status: " + status +
                    (errorMsg != null ? " - " + errorMsg : ""));
            return result;
        }

        String formatted = extractJsonValue(json, "\"formatted_address\"");
        if (formatted != null) result.put("formatted_address", formatted);

        result.put("names", collectPlaceNames(json));
        result.put("country", extractAddressComponent(json, "country"));
        result.put("district", coalesce(
                extractAddressComponent(json, "administrative_area_level_1"),
                extractAddressComponent(json, "administrative_area_level_2")));
        result.put("sub_county", coalesce(
                extractAddressComponent(json, "administrative_area_level_3"),
                extractAddressComponent(json, "locality")));
        result.put("parish", coalesce(
                extractAddressComponent(json, "administrative_area_level_4"),
                extractAddressComponent(json, "sublocality_level_1"),
                extractAddressComponent(json, "sublocality")));
        result.put("village", coalesce(
                extractAddressComponent(json, "administrative_area_level_5"),
                extractAddressComponent(json, "neighborhood"),
                extractAddressComponent(json, "sublocality_level_2")));

        return result;
    }
    /** Address component types that are never an administrative area or place name worth matching. */
    private static final java.util.Set<String> NON_PLACE_TYPES = java.util.Set.of(
            "country", "postal_code", "postal_code_prefix", "postal_code_suffix", "route", "street_number",
            "street_address", "premise", "subpremise", "plus_code", "floor", "room", "post_box", "establishment",
            "point_of_interest");

    /**
     * Every distinct place name in the first few reverse-geocode results (district, county, sub-county, parish,
     * village, neighbourhood...), nearest first. The client matches these against the Uganda hierarchy to
     * pre-fill the report location, so a missing or oddly named level does not lose the others.
     */
    List<String> collectPlaceNames(String json) {
        java.util.LinkedHashSet<String> names = new java.util.LinkedHashSet<>();
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            com.fasterxml.jackson.databind.JsonNode results = objectMapper.readTree(json).path("results");
            int seen = 0;
            for (com.fasterxml.jackson.databind.JsonNode result : results) {
                if (seen++ >= 8) break;
                for (com.fasterxml.jackson.databind.JsonNode comp : result.path("address_components")) {
                    boolean skip = false;
                    for (com.fasterxml.jackson.databind.JsonNode t : comp.path("types")) {
                        if (NON_PLACE_TYPES.contains(t.asText())) { skip = true; break; }
                    }
                    if (skip) continue;
                    String name = comp.path("long_name").asText("").trim();
                    if (!name.isEmpty()) names.add(name);
                }
            }
        } catch (Exception e) {
            log.warn("Could not read place names from reverse geocode response: {}", e.getMessage());
        }
        return new ArrayList<>(names);
    }

    private int findMatchingBrace(String json, int start) {
        int depth = 0;
        for (int i = start; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) return i;
            }
        }
        return -1;
    }
    private String extractJsonValue(String json, String key) {
        int idx = json.indexOf(key);
        if (idx == -1) return null;
        int colon = json.indexOf(':', idx);
        if (colon == -1) return null;
        int quote1 = json.indexOf('"', colon + 1);
        if (quote1 == -1) return null;
        int quote2 = json.indexOf('"', quote1 + 1);
        if (quote2 == -1) return null;
        return json.substring(quote1 + 1, quote2);
    }

    private String extractNumberAfterColon(String json, int startIdx) {
        int colon = json.indexOf(':', startIdx);
        if (colon == -1) return null;
        int start = colon + 1;
        while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '\n' || json.charAt(start) == '\r' || json.charAt(start) == '\t')) {
            start++;
        }
        if (start < json.length() && json.charAt(start) == '-') {
            start++;
        }
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '.')) {
            end++;
        }
        if (end == start) return null;
        return json.substring(start, end);
    }

    private String extractAddressComponent(String json, String type) {
        int searchFrom = 0;
        while (true) {
            int typeIdx = json.indexOf("\"" + type + "\"", searchFrom);
            if (typeIdx == -1) return null;

            int blockStart = Math.max(0, typeIdx - 500);
            int blockEnd = Math.min(json.length(), typeIdx + 300);
            String block = json.substring(blockStart, blockEnd);

            int sn = block.indexOf("\"short_name\"");
            if (sn == -1) sn = block.indexOf("\"long_name\"");
            if (sn != -1) {
                int q1 = block.indexOf('"', block.indexOf(':', sn) + 1);
                if (q1 != -1) {
                    int q2 = block.indexOf('"', q1 + 1);
                    if (q2 != -1) return block.substring(q1 + 1, q2);
                }
            }
            searchFrom = typeIdx + 1;
        }
    }

    private String coalesce(String... values) {
        for (String v : values) {
            if (v != null && !v.isEmpty()) return v;
        }
        return null;
    }

}