package lcdjp.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;

/**
 * Minimal client for S3-compatible object storage (Cloudflare R2, Oracle Object Storage's S3 API,
 * AWS S3, MinIO). It signs requests with AWS Signature V4 using only the JDK, so no extra
 * dependency is needed. Path-style addressing: {@code <endpoint>/<bucket>/<key>}.
 *
 * Switched off unless endpoint, bucket and both keys are configured ({@code app.storage.*});
 * {@link #enabled()} is then false and callers keep storing files in MySQL as before.
 */
@Service
public class ObjectStorageService {

    private static final Logger log = LoggerFactory.getLogger(ObjectStorageService.class);
    private static final String EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    private static final DateTimeFormatter AMZ_DATE = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    private final String endpoint;
    private final String bucket;
    private final String accessKey;
    private final String secretKey;
    private final String region;
    private final HttpClient http;
    // Retries are safe here: PUT of the same key, GET and DELETE are idempotent. A run of failures opens the circuit so a dead
    // bucket makes uploads fail fast instead of tying up a request thread for up to 60 s each.
    private final lcdjp.common.OutboundGuard guard = lcdjp.common.OutboundGuard.withRetries("object-storage");

    public ObjectStorageService(
            @Value("${app.storage.endpoint:}") String endpoint,
            @Value("${app.storage.bucket:}") String bucket,
            @Value("${app.storage.access-key:}") String accessKey,
            @Value("${app.storage.secret-key:}") String secretKey,
            @Value("${app.storage.region:auto}") String region) {
        this.endpoint = endpoint == null ? "" : endpoint.trim().replaceAll("/+$", "");
        this.bucket = bucket == null ? "" : bucket.trim();
        this.accessKey = accessKey == null ? "" : accessKey.trim();
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.region = region == null || region.isBlank() ? "auto" : region.trim();
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        if (enabled()) {
            log.info("Object storage enabled: bucket={} endpoint={}", this.bucket, this.endpoint);
        }
    }

    public boolean enabled() {
        return !endpoint.isEmpty() && !bucket.isEmpty() && !accessKey.isEmpty() && !secretKey.isEmpty();
    }

    public void put(String key, byte[] data, String contentType) throws IOException {
        HttpResponse<byte[]> r = send("PUT", key, data, contentType);
        if (r.statusCode() / 100 != 2) {
            throw new IOException("Object storage PUT " + key + " failed: " + describe(r));
        }
    }

    /** @return the object bytes, or null when the object does not exist. */
    public byte[] get(String key) throws IOException {
        HttpResponse<byte[]> r = send("GET", key, null, null);
        if (r.statusCode() == 404) return null;
        if (r.statusCode() / 100 != 2) {
            throw new IOException("Object storage GET " + key + " failed: " + describe(r));
        }
        return r.body();
    }

    public void delete(String key) throws IOException {
        HttpResponse<byte[]> r = send("DELETE", key, null, null);
        if (r.statusCode() / 100 != 2 && r.statusCode() != 404) {
            throw new IOException("Object storage DELETE " + key + " failed: " + describe(r));
        }
    }

    private static String describe(HttpResponse<byte[]> r) {
        String body = r.body() == null ? "" : new String(r.body(), StandardCharsets.UTF_8);
        if (body.length() > 300) body = body.substring(0, 300);
        return "HTTP " + r.statusCode() + " " + body;
    }

    private HttpResponse<byte[]> send(String method, String key, byte[] body, String contentType) throws IOException {
        if (!enabled()) throw new IOException("Object storage is not configured");
        String path = "/" + bucket + "/" + key;
        URI uri = URI.create(endpoint + encodePath(path));
        String host = uri.getPort() > 0 && uri.getPort() != 443 && uri.getPort() != 80
                ? uri.getHost() + ":" + uri.getPort() : uri.getHost();
        String payloadHash = body == null ? EMPTY_SHA256 : hex(sha256(body));
        String amzDate = AMZ_DATE.format(ZonedDateTime.now(ZoneOffset.UTC));

        TreeMap<String, String> signed = new TreeMap<>();
        signed.put("host", host);
        signed.put("x-amz-content-sha256", payloadHash);
        signed.put("x-amz-date", amzDate);
        String authorization = authorizationHeader(method, encodePath(path), "", signed, payloadHash,
                amzDate, region, accessKey, secretKey);

        HttpRequest.Builder b = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(60))
                .header("x-amz-content-sha256", payloadHash)
                .header("x-amz-date", amzDate)
                .header("Authorization", authorization);
        if (contentType != null) b.header("Content-Type", contentType);
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(body));
        HttpRequest request = b.build();
        try {
            return guard.call(() -> {
                HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (lcdjp.common.OutboundHttp.isTransient(response.statusCode())) {
                    // 5xx / 429 / 408: counts toward the circuit and is retried; other statuses (404, 403...) go back to the caller.
                    throw new lcdjp.common.TransientProviderException(
                            "Object storage " + method + " " + key + " returned HTTP " + response.statusCode(),
                            response.statusCode(), null, 0L);
                }
                return response;
            });
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while calling object storage", e);
        } catch (IOException e) {
            throw e;
        } catch (lcdjp.common.OutboundGuard.CircuitOpenException e) {
            throw new IOException("Object storage is temporarily unavailable (circuit open); try again shortly", e);
        } catch (Exception e) {
            throw new IOException("Object storage " + method + " " + key + " failed: " + e.getMessage(), e);
        }
    }

    // ---- AWS Signature Version 4 (pure functions, unit tested against AWS's published examples) ----

    /**
     * @param canonicalPath already URI-encoded path (see {@link #encodePath})
     * @param signedHeaders lower-case header name to value, sorted; must include host and x-amz-date
     */
    static String authorizationHeader(String method, String canonicalPath, String canonicalQuery,
                                      TreeMap<String, String> signedHeaders, String payloadHash,
                                      String amzDate, String region, String accessKey, String secretKey) {
        String date = amzDate.substring(0, 8);
        String scope = date + "/" + region + "/s3/aws4_request";
        String names = String.join(";", signedHeaders.keySet());
        String signature = signature(method, canonicalPath, canonicalQuery, signedHeaders, payloadHash,
                amzDate, region, secretKey);
        return "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + scope
                + ", SignedHeaders=" + names + ", Signature=" + signature;
    }

    static String signature(String method, String canonicalPath, String canonicalQuery,
                            TreeMap<String, String> signedHeaders, String payloadHash,
                            String amzDate, String region, String secretKey) {
        StringBuilder headers = new StringBuilder();
        for (Map.Entry<String, String> h : signedHeaders.entrySet()) {
            headers.append(h.getKey()).append(':').append(h.getValue().trim()).append('\n');
        }
        String names = String.join(";", signedHeaders.keySet());
        String canonicalRequest = method + "\n" + canonicalPath + "\n" + canonicalQuery + "\n"
                + headers + "\n" + names + "\n" + payloadHash;
        String date = amzDate.substring(0, 8);
        String scope = date + "/" + region + "/s3/aws4_request";
        String stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n"
                + hex(sha256(canonicalRequest.getBytes(StandardCharsets.UTF_8)));
        byte[] kDate = hmac(("AWS4" + secretKey).getBytes(StandardCharsets.UTF_8), date);
        byte[] kRegion = hmac(kDate, region);
        byte[] kService = hmac(kRegion, "s3");
        byte[] kSigning = hmac(kService, "aws4_request");
        return hex(hmac(kSigning, stringToSign));
    }

    /** URI-encodes every path segment per the SigV4 rules, keeping the slashes. */
    static String encodePath(String path) {
        StringBuilder out = new StringBuilder();
        for (byte c : path.getBytes(StandardCharsets.UTF_8)) {
            int ch = c & 0xFF;
            if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')
                    || ch == '-' || ch == '_' || ch == '.' || ch == '~' || ch == '/') {
                out.append((char) ch);
            } else {
                out.append('%').append(String.format("%02X", ch));
            }
        }
        return out.toString();
    }

    static byte[] sha256(byte[] data) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(data);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
