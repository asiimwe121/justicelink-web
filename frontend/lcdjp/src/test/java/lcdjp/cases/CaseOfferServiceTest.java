package lcdjp.cases;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseOfferServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;

    @Test
    void offersTheCaseToTheLeastBusyLawyerAndNotifiesThem() {
        CaseOfferService service = new CaseOfferService(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("C-1"))).thenReturn("");
        when(jdbcTemplate.queryForList(anyString(), eq("Kampala"), eq("Land")))
                .thenReturn(List.of(Map.of("username", "lawyerA", "active_count", 1)));

        CaseOfferService.LawyerOffer offer =
                service.offerCaseToNextLawyer("C-1", "Kampala", "sub", "parish", "Land", null);

        assertNotNull(offer);
        assertEquals("lawyerA", offer.username);
        verify(jdbcTemplate).update(contains("offered_to_lawyer"), eq("lawyerA"), eq("C-1"));
        verify(jdbcTemplate).update(contains("ai_case_offer"), eq("lawyerA"), anyString(), eq("C-1"));
    }

    @Test
    void marksTheCaseAsHavingNoLawyerWhenNobodyIsAvailable() {
        CaseOfferService service = new CaseOfferService(jdbcTemplate);

        CaseOfferService.LawyerOffer offer =
                service.offerCaseToNextLawyer("C-1", "Kampala", "sub", "parish", "Land", null);

        assertNull(offer);
        verify(jdbcTemplate).update(contains("no_lawyer_available"), eq("C-1"));
    }

    @Test
    void doesNotOfferToALawyerWhoJustDeclined() {
        CaseOfferService service = new CaseOfferService(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class), eq("C-1"))).thenReturn("");
        when(jdbcTemplate.queryForList(anyString(), eq("Kampala"), eq("Land")))
                .thenReturn(List.of(Map.of("username", "lawyerA", "active_count", 0),
                        Map.of("username", "lawyerB", "active_count", 3)));

        CaseOfferService.LawyerOffer offer =
                service.offerCaseToNextLawyer("C-1", "Kampala", "sub", "parish", "Land", "lawyerA");

        assertEquals("lawyerB", offer.username);
        verify(jdbcTemplate).update(contains("declined_lawyers"), eq("lawyerA"), eq("C-1"));
    }
}
