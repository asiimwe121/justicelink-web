package lcdjp.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The account-file side of object storage: ID photos, CV and verification documents in users.*, the shared
 * upload-once memo, the admin "inline" view, avatar URL lifetime and the delete-after-commit cleanup.
 * Uses an in-memory bucket, so no network is involved.
 */
class AccountFileStorageTest {

    private final Map<String, byte[]> bucket = new HashMap<>();
    private ObjectStorageService storage;
    private FileRefService files;

    private static String dataUri(String mime, int size) {
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(new byte[size]);
    }

    @BeforeEach
    void setUp() {
        storage = new ObjectStorageService("https://acct.r2.cloudflarestorage.com", "bucket", "key", "secret", "auto") {
            @Override public void put(String key, byte[] data, String contentType) { bucket.put(key, data); }
            @Override public byte[] get(String key) { return bucket.get(key); }
            @Override public void delete(String key) { bucket.remove(key); }
        };
        files = new FileRefService(storage, "", "jwt-secret-for-tests-0123456789");
    }

    @Test
    void sameFileInOneRequestIsUploadedOnce() {
        Map<String, String> memo = new HashMap<>();
        String img = dataUri("image/png", 200);
        String a = files.externalizeIfDataUri(img, "users", memo);
        String b = files.externalizeIfDataUri(img, "users", memo);
        assertTrue(a.startsWith(FileRefService.REF_PREFIX));
        assertEquals(a, b);
        assertEquals(1, bucket.size());
    }

    @Test
    void jsonColumnValuesAreMovedAndPlainFieldsKept() {
        Map<String, String> memo = new HashMap<>();
        String img = dataUri("image/png", 200);
        String column = files.externalizeIfDataUri(img, "users", memo);
        String json = "{\"idFront\":\"" + img + "\",\"lawyerCVData\":\"" + dataUri("application/pdf", 300)
                + "\",\"nationalId\":\"CM123\"}";

        String out = files.externalizeJsonValues(json, "users", memo);

        assertFalse(out.contains("data:"));
        assertTrue(out.contains(column), "the id photo reuses the reference already uploaded for the column");
        assertTrue(out.contains("CM123"));
        assertEquals(2, bucket.size());
        assertEquals("{\"a\":\"hello\"}", files.externalizeJsonValues("{\"a\":\"hello\"}", "users", memo));
        assertEquals("not json data:", files.externalizeJsonValues("not json data:", "users", memo));
    }

    @Test
    void referencesInFindsOnlySignedReferences() {
        String ref = files.externalizeIfDataUri(dataUri("image/png", 100), "users");
        String json = "{\"idFront\":\"" + ref + "\",\"note\":\"objref:v1:image/png:users/x:forged\"}";

        assertEquals(Set.of(ref), files.referencesIn(ref));
        assertEquals(Set.of(ref), files.referencesIn(json));
        assertTrue(files.referencesIn("objref:v1:image/png:users/x:forged").isEmpty());
        assertTrue(files.referencesIn(dataUri("image/png", 10)).isEmpty());
        assertTrue(files.referencesIn(null).isEmpty());
    }

    @Test
    void adminViewGetsInlineDataBack() {
        String img = dataUri("image/png", 200);
        Map<String, String> memo = new HashMap<>();
        String ref = files.externalizeIfDataUri(img, "users", memo);

        assertEquals(img, files.inlineAsDataUri(ref));
        String json = files.externalizeJsonValues("{\"idFront\":\"" + img + "\"}", "users", memo);
        assertEquals("{\"idFront\":\"" + img + "\"}", files.inlineJsonRefs(json));
        String forged = ref.replace("users/", "users/other-");
        assertEquals(forged, files.inlineAsDataUri(forged), "an unsigned reference is never resolved");
        bucket.clear();
        assertNull(files.inlineAsDataUri(ref), "a file that no longer exists comes back as null");
    }

    @Test
    void avatarUrlsStayStableAndLongLivedWhileOtherFilesStayShortLived() {
        String avatar = files.externalizeIfDataUri(dataUri("image/png", 100), FileRefService.AVATAR_FOLDER);
        String id = files.externalizeIfDataUri(dataUri("image/png", 100), "users");

        String first = files.resolveForClient(avatar);
        assertEquals(first, files.resolveForClient(avatar), "same URL on every response so browsers can cache it");
        long now = System.currentTimeMillis() / 1000;
        assertTrue(expiry(first) - now > 6 * 86400L);
        assertTrue(expiry(files.resolveForClient(id)) - now <= FileRefService.URL_TTL_SECONDS);
    }

    @Test
    void cleanupDeletesReferencesAndVoiceObjects() {
        String ref = files.externalizeIfDataUri(dataUri("image/png", 100), "users");
        bucket.put("voice/2026/10/abc", new byte[3]);
        StoredFileCleanupService cleanup = new StoredFileCleanupService(null, files, storage);

        cleanup.deleteAfterCommit(new LinkedHashSet<>(List.of(ref, "voicekey:voice/2026/10/abc")));

        assertTrue(bucket.isEmpty());
        assertEquals(Set.of("a"), cleanup.dropped(Set.of("a", "b"), Set.of("b")));
    }

    /** Reads the expiry out of a /api/files/ URL's token payload (key|mime|expiry). */
    private static long expiry(String url) {
        String token = url.substring(FileRefService.URL_PREFIX.length());
        String payload = new String(Base64.getUrlDecoder().decode(token.substring(0, token.indexOf('.'))));
        return Long.parseLong(payload.split("\\|")[2]);
    }
}
