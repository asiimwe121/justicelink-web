package lcdjp.storage;

import lcdjp.cases.CaseAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoiceControllerTest {

    @Mock private VoiceStorageService voiceStorage;
    @Mock private CaseAccessService caseAccessService;

    @InjectMocks
    private VoiceController controller;

    private static Map<String, Object> chatRow(String uploader, String recipient) {
        return Map.of("kind", "CHAT", "uploader", uploader, "recipient", recipient, "mime_type", "audio/webm");
    }

    @Test
    void anonymousCaller_isUnauthorized() {
        when(caseAccessService.authenticatedUsername()).thenReturn(null);

        assertEquals(HttpStatus.UNAUTHORIZED, controller.get(5).getStatusCode());
        verifyNoInteractions(voiceStorage);
    }

    @Test
    void unknownId_isNotFound() {
        when(caseAccessService.authenticatedUsername()).thenReturn("amina");
        when(voiceStorage.findMetadata(5)).thenReturn(null);

        assertEquals(HttpStatus.NOT_FOUND, controller.get(5).getStatusCode());
        verify(voiceStorage, never()).findData(anyLong());
    }

    @Test
    void uploader_canListen() {
        when(caseAccessService.authenticatedUsername()).thenReturn("amina");
        when(voiceStorage.findMetadata(5)).thenReturn(chatRow("amina", "peter"));
        when(voiceStorage.findData(5)).thenReturn(new byte[]{1, 2, 3});

        ResponseEntity<Resource> result = controller.get(5);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("audio/webm", result.getHeaders().getContentType().toString());
        assertEquals("nosniff", result.getHeaders().getFirst("X-Content-Type-Options"));
    }

    @Test
    void unrelatedUser_getsSameAnswerAsMissing_andDataIsNeverRead() {
        when(caseAccessService.authenticatedUsername()).thenReturn("mallory");
        when(caseAccessService.authenticatedRole()).thenReturn("Citizen");
        when(voiceStorage.findMetadata(5)).thenReturn(chatRow("amina", "peter"));

        assertEquals(HttpStatus.NOT_FOUND, controller.get(5).getStatusCode());
        verify(voiceStorage, never()).findData(anyLong());
    }

    @Test
    void chatRecipient_canListen() {
        when(caseAccessService.authenticatedUsername()).thenReturn("peter");
        when(voiceStorage.findMetadata(5)).thenReturn(chatRow("amina", "peter"));
        when(voiceStorage.findData(5)).thenReturn(new byte[]{9});

        assertEquals(HttpStatus.OK, controller.get(5).getStatusCode());
    }
}
