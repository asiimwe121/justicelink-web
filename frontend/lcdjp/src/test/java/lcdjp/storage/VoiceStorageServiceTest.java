package lcdjp.storage;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class VoiceStorageServiceTest {

    private static String uri(String mime, byte[] bytes) {
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    @Test
    void parsesAudioDataUriWithCodecParameter() {
        byte[] audio = {1, 2, 3, 4};
        VoiceStorageService.Parsed p = VoiceStorageService.parse(uri("audio/webm;codecs=opus", audio));
        assertNotNull(p);
        assertEquals("audio/webm", p.mimeType());
        assertArrayEquals(audio, p.bytes());
    }

    @Test
    void plainStringsAreLeftAlone() {
        assertNull(VoiceStorageService.parse("/api/voice/12"));
        assertNull(VoiceStorageService.parse("hello"));
        assertNull(VoiceStorageService.parse(null));
    }

    @Test
    void nonAudioDataUriIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> VoiceStorageService.parse(uri("text/html", new byte[]{1})));
    }

    @Test
    void invalidBase64IsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> VoiceStorageService.parse("data:audio/webm;base64,@@@not-base64@@@"));
    }

    @Test
    void emptyAudioIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> VoiceStorageService.parse("data:audio/webm;base64,"));
    }

    @Test
    void oversizedAudioIsRejected() {
        byte[] big = new byte[VoiceStorageService.MAX_BYTES + 1];
        assertThrows(IllegalArgumentException.class,
                () -> VoiceStorageService.parse(uri("audio/webm", big)));
    }

    @Test
    void existingReferenceIsReturnedUnchangedWithoutTouchingTheDatabase() {
        // jdbcTemplate is null here; a reference must short-circuit before any insert.
        VoiceStorageService service = new VoiceStorageService();
        assertEquals("/api/voice/7", service.storeIfAudioDataUri("/api/voice/7", "CHAT", "u", "r", null));
        assertNull(service.storeIfAudioDataUri(null, "CHAT", "u", "r", null));
    }
}
