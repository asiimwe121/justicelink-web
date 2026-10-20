package lcdjp.storage;

import org.junit.jupiter.api.Test;

import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.*;

/** Signing is checked against the worked examples in AWS's Signature Version 4 documentation. */
class ObjectStorageServiceTest {

    private static final String SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    private static final String EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    @Test
    void getObjectSignatureMatchesAwsExample() {
        TreeMap<String, String> headers = new TreeMap<>();
        headers.put("host", "examplebucket.s3.amazonaws.com");
        headers.put("range", "bytes=0-9");
        headers.put("x-amz-content-sha256", EMPTY_HASH);
        headers.put("x-amz-date", "20130524T000000Z");
        assertEquals("f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
                ObjectStorageService.signature("GET", "/test.txt", "", headers, EMPTY_HASH,
                        "20130524T000000Z", "us-east-1", SECRET));
    }

    @Test
    void putObjectSignatureMatchesAwsExample() {
        String payloadHash = ObjectStorageService.hex(ObjectStorageService.sha256("Welcome to Amazon S3.".getBytes()));
        assertEquals("44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072", payloadHash);
        TreeMap<String, String> headers = new TreeMap<>();
        headers.put("date", "Fri, 24 May 2013 00:00:00 GMT");
        headers.put("host", "examplebucket.s3.amazonaws.com");
        headers.put("x-amz-content-sha256", payloadHash);
        headers.put("x-amz-date", "20130524T000000Z");
        headers.put("x-amz-storage-class", "REDUCED_REDUNDANCY");
        assertEquals("98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
                ObjectStorageService.signature("PUT", ObjectStorageService.encodePath("/test$file.text"), "",
                        headers, payloadHash, "20130524T000000Z", "us-east-1", SECRET));
    }

    @Test
    void pathEncodingKeepsSlashesAndEscapesTheRest() {
        assertEquals("/b/documents/2026/10/a%20b%24.bin", ObjectStorageService.encodePath("/b/documents/2026/10/a b$.bin"));
    }

    @Test
    void disabledUntilEverythingIsConfigured() {
        assertFalse(new ObjectStorageService("", "", "", "", "auto").enabled());
        assertFalse(new ObjectStorageService("https://x.example", "bucket", "", "secret", "auto").enabled());
        assertTrue(new ObjectStorageService("https://x.example", "bucket", "key", "secret", "auto").enabled());
    }
}
