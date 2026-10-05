package lcdjp;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
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
                return getOsrmDirections(originLat, originLng, destLat, destLng);
            }

            String url = "https://maps.googleapis.com/maps/api/directions/json" +
                    "?origin=" + originLat + "," + originLng +
                    "&destination=" + destLat + "," + destLng +
                    "&mode=" + mode.toLowerCase() +
                    "&key=" + apiKey;

            log.info("📡 Calling Google Maps Directions API");
            String jsonResponse = fetchJson(url);
            return normalizeGoogleDirections(jsonResponse);

        } catch (Exception e) {
            log.error("❌ Directions error: {}", e.getMessage());
            throw new RuntimeException("Failed to get directions: " + e.getMessage());
        }
    }

    private Map<String, Object> getOsrmDirections(double originLat, double originLng,
                                                  double destLat, double destLng) {
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
                    .queryParam("result_type", "administrative_area_level_1|administrative_area_level_2|locality|sublocality|neighborhood")
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

    private static final int MAX_FETCH_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MILLIS = 400;

    private String fetchJson(String urlString) {
        Exception lastFailure = null;
        for (int attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
            try {
                return fetchJsonOnce(urlString);
            } catch (Exception e) {
                lastFailure = e;
                log.warn("⚠️ Google Maps API call failed (attempt {}/{}): {}",
                        attempt, MAX_FETCH_ATTEMPTS, e.getMessage());
                if (attempt < MAX_FETCH_ATTEMPTS) {
                    sleepBeforeRetry(attempt);
                }
            }
        }
        log.error("❌ Google Maps API call failed after {} attempts: {}",
                MAX_FETCH_ATTEMPTS, lastFailure != null ? lastFailure.getMessage() : "unknown error");
        return "";
    }

    private String fetchJsonOnce(String urlString) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(10000);
        conn.setRequestProperty("Accept", "application/json");

        int status = conn.getResponseCode();
        log.info("📊 HTTP Status: {}", status);

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(status < 400 ? conn.getInputStream() : conn.getErrorStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }

        if (status >= 400) {
            log.error("❌ API Error Response: {}", sb.toString());
        }
        return sb.toString();
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(RETRY_BACKOFF_MILLIS * attempt);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
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