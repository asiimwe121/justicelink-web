package lcdjp.legal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LegalOrganizationControllerTest {

    @Mock private LegalOrganizationRepository repository;

    @InjectMocks
    private LegalOrganizationController controller;

    @Test
    void getAllOrganizations_returnsRepositoryResult() {
        LegalOrganization org = new LegalOrganization();
        when(repository.findAll()).thenReturn(List.of(org));

        List<LegalOrganization> result = controller.getAllOrganizations();

        assertEquals(1, result.size());
    }

    @Test
    void getOrganization_found_returns200WithBody() {
        LegalOrganization org = new LegalOrganization();
        org.setId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(org));

        ResponseEntity<?> result = controller.getOrganization(1L);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertSame(org, result.getBody());
    }

    @Test
    void getOrganization_notFound_returns404() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        ResponseEntity<?> result = controller.getOrganization(99L);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        assertEquals("Organization not found", ((Map<?, ?>) result.getBody()).get("error"));
    }

    @Test
    void createOrganization_savesAndReturnsRepositoryResult() {
        LegalOrganization toSave = new LegalOrganization();
        LegalOrganization saved = new LegalOrganization();
        saved.setId(5L);
        when(repository.save(toSave)).thenReturn(saved);

        LegalOrganization result = controller.createOrganization(toSave);

        assertEquals(5L, result.getId());
    }

    @Test
    void deleteOrganization_exists_deletesAndReturnsSuccess() {
        when(repository.existsById(1L)).thenReturn(true);

        ResponseEntity<?> result = controller.deleteOrganization(1L);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(true, ((Map<?, ?>) result.getBody()).get("success"));
        verify(repository).deleteById(1L);
    }

    @Test
    void deleteOrganization_missing_returns404_withoutCallingDelete() {
        when(repository.existsById(99L)).thenReturn(false);

        ResponseEntity<?> result = controller.deleteOrganization(99L);

        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        assertEquals(false, ((Map<?, ?>) result.getBody()).get("success"));
        verify(repository, never()).deleteById(anyLong());
    }
}
