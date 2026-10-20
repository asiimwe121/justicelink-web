package lcdjp.lcinvite;

import lcdjp.admin.AuditLogService;
import lcdjp.notification.EmailService;
import lcdjp.user.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** The invite-link flow end to end, with the two repositories replaced by in-memory fakes. */
class LcInviteServiceTest {

    // ---- fakes

    private static class FakeInvites extends LcInviteRepository {
        List<Map<String, Object>> rows = new ArrayList<>();
        List<String> inserted = new ArrayList<>();
        String storedHash;
        boolean claimed;
        boolean openRequestExists;

        FakeInvites() { super(new JdbcTemplate()); }

        @Override public void insertRequest(String email, String district, LocalDateTime now) { inserted.add(email + "|" + district); }
        @Override public boolean hasOpenRequest(String email, String district) { return openRequestExists; }
        @Override public List<Map<String, Object>> findOpenRequests() { return rows; }
        @Override public Map<String, Object> findById(long id) {
            for (Map<String, Object> r : rows) if (((Number) r.get("id")).longValue() == id) return r;
            return null;
        }
        @Override public boolean markSent(long id, String admin, String hash, LocalDateTime now, LocalDateTime exp) { storedHash = hash; return true; }
        @Override public boolean markDeclined(long id, String admin, LocalDateTime now) { return true; }
        @Override public Map<String, Object> findByValidToken(String hash, LocalDateTime now) {
            if (storedHash == null || !storedHash.equals(hash) || claimed) return null;
            Map<String, Object> m = new HashMap<>();
            m.put("email", "lc@example.com");
            m.put("district", "Mbale");
            m.put("decided_by", "dadmin1");
            return m;
        }
        @Override public boolean claimToken(String hash, LocalDateTime now) {
            if (claimed) return false;
            claimed = true;
            return true;
        }
    }

    private static class FakeUsers extends UserAccountRepository {
        boolean emailTaken;
        boolean usernameTaken;
        boolean districtHasAdmin;
        List<String> created = new ArrayList<>();

        FakeUsers() { super(new JdbcTemplate()); }

        @Override public Integer countByEmail(String email) { return emailTaken ? 1 : 0; }
        @Override public Integer countByUsername(String username) { return usernameTaken ? 1 : 0; }
        @Override public List<Map<String, Object>> findDistrictAdmins(String district) {
            if (!districtHasAdmin) return List.of();
            Map<String, Object> admin = new HashMap<>();
            admin.put("username", "dadmin1");
            admin.put("approval_status", "Approved");
            admin.put("is_active", Boolean.TRUE);
            return List.of(admin);
        }
        @Override public void insertInvitedLcAccount(String username, String passwordHash, String firstName, String lastName,
                                                     String email, String phone, String district, String village,
                                                     String parish, String subCounty, String lcLevel, String createdBy) {
            created.add(String.join("|", username, email, district, String.valueOf(village),
                    String.valueOf(parish), String.valueOf(subCounty), lcLevel, createdBy));
        }
    }

    private FakeInvites invites;
    private FakeUsers users;
    private EmailService emailService;
    private LcInviteService service;

    @BeforeEach
    void setUp() {
        invites = new FakeInvites();
        users = new FakeUsers();
        emailService = mock(EmailService.class);
        service = new LcInviteService(invites, users, emailService, mock(AuditLogService.class),
                new BCryptPasswordEncoder(), "https://justicelinkug.org/", "support@justicelinkug.org",
                "JusticeLink Support", 72);
    }

    // ---- helpers

    private static Map<String, Object> request(long id, String email, String district, String status) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("email", email);
        row.put("district", district);
        row.put("status", status);
        return row;
    }

    private static LcInviteRegisterRequest form(String token) {
        LcInviteRegisterRequest f = new LcInviteRegisterRequest();
        f.setToken(token);
        f.setUsername("nyondo.lc3.user");
        f.setFirstName("Ann");
        f.setLastName("Okello");
        f.setPhone("+256712345678");
        f.setLcLevel("lc 3");
        f.setVillage("Gone");     // doesn't apply to LC3, should be dropped
        f.setParish("Gone");      // same
        f.setSubCounty("Nyondo");
        f.setPassword("longenough1");
        f.setConfirmPassword("longenough1");
        f.setAcceptedTerms(true);
        return f;
    }

    /** Sends a link for request 1 and returns the token that was put in the email. */
    private String sendLinkAndGetToken() throws Exception {
        invites.rows.add(request(1, "lc@example.com", "Mbale", "PENDING"));
        service.sendLink(1, "dadmin1", "DISTRICT_ADMIN", "Mbale");

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmailFrom(anyString(), anyString(), anyString(), anyString(), body.capture());
        String html = body.getValue();
        int start = html.indexOf("token=") + "token=".length();
        return html.substring(start, html.indexOf('"', start));
    }

    private void assertRejected(HttpStatus expected, Runnable action) {
        LcInviteException e = assertThrows(LcInviteException.class, action::run);
        assertEquals(expected, e.getStatus());
    }

    // ---- asking for a link

    @Test
    void requestIsSavedWithLowercaseEmail() {
        service.recordRequest("  Lc@Example.com ", "Mbale");
        assertEquals(List.of("lc@example.com|Mbale"), invites.inserted);
    }

    @Test
    void requestIsQuietlyIgnoredWhenTheEmailAlreadyHasAnAccount() {
        users.emailTaken = true;
        service.recordRequest("lc@example.com", "Mbale");
        assertTrue(invites.inserted.isEmpty());
    }

    @Test
    void requestIsNotDuplicatedWhileOneIsStillOpen() {
        invites.openRequestExists = true;
        service.recordRequest("lc@example.com", "Mbale");
        assertTrue(invites.inserted.isEmpty());
    }

    // ---- who sees and acts on requests

    @Test
    void districtAdminSeesOnlyTheirOwnDistrict() {
        invites.rows.add(request(1, "a@x.com", "Mbale", "PENDING"));
        invites.rows.add(request(2, "b@x.com", "Gulu", "PENDING"));
        assertEquals(1, service.listOpenRequests("DISTRICT_ADMIN", "Mbale").size());
        assertTrue(service.listOpenRequests("DISTRICT_ADMIN", "").isEmpty());
    }

    @Test
    void systemAdminOnlySeesDistrictsThatHaveNoActiveDistrictAdmin() {
        invites.rows.add(request(1, "a@x.com", "Mbale", "PENDING"));
        invites.rows.add(request(2, "b@x.com", "Gulu", "PENDING"));
        assertEquals(2, service.listOpenRequests("SYSTEM_ADMIN", null).size());

        users.districtHasAdmin = true;
        assertTrue(service.listOpenRequests("SYSTEM_ADMIN", null).isEmpty());
    }

    @Test
    void districtAdminCannotSendALinkForAnotherDistrict() {
        invites.rows.add(request(2, "b@x.com", "Gulu", "PENDING"));
        assertRejected(HttpStatus.FORBIDDEN, () -> service.sendLink(2, "dadmin1", "DISTRICT_ADMIN", "Mbale"));
    }

    // ---- sending the link

    @Test
    void theLinkHasALongTokenAndOnlyItsHashIsStored() throws Exception {
        String token = sendLinkAndGetToken();
        assertTrue(token.length() >= 43);
        assertEquals(64, invites.storedHash.length());
        assertFalse(invites.storedHash.contains(token));
    }

    @Test
    void ifTheEmailFailsNothingIsMarkedSent() throws Exception {
        invites.rows.add(request(1, "lc@example.com", "Mbale", "PENDING"));
        doThrow(new IOException("mail down")).when(emailService)
                .sendEmailFrom(anyString(), anyString(), anyString(), anyString(), anyString());

        assertRejected(HttpStatus.BAD_GATEWAY, () -> service.sendLink(1, "dadmin1", "DISTRICT_ADMIN", "Mbale"));
        assertNull(invites.storedHash);
    }

    @Test
    void aDeclinedRequestCannotBeSent() {
        invites.rows.add(request(1, "lc@example.com", "Mbale", "DECLINED"));
        assertRejected(HttpStatus.CONFLICT, () -> service.sendLink(1, "dadmin1", "DISTRICT_ADMIN", "Mbale"));
    }

    // ---- opening the link and signing up

    @Test
    void aGoodLinkShowsItsDistrictAndAnUnknownOneShowsNothing() throws Exception {
        String token = sendLinkAndGetToken();
        assertEquals("Mbale", service.describeLink(token).get("district"));
        assertNull(service.describeLink("not-a-real-token"));
        assertNull(service.describeLink(""));
    }

    @Test
    void signingUpCreatesTheAccountInTheInvitedDistrictAndSpendsTheLink() throws Exception {
        String token = sendLinkAndGetToken();

        String username = service.completeSignup(form(token));

        assertEquals("nyondo.lc3.user", username);
        // district and email come from the invite; an LC3 only keeps the sub-county
        assertEquals(List.of("nyondo.lc3.user|lc@example.com|Mbale|null|null|Nyondo|LC3|invite-link:dadmin1"), users.created);
        assertTrue(invites.claimed);
    }

    @Test
    void aLinkWorksOnlyOnce() throws Exception {
        String token = sendLinkAndGetToken();
        service.completeSignup(form(token));

        assertRejected(HttpStatus.BAD_REQUEST, () -> service.completeSignup(form(token)));
        assertEquals(1, users.created.size());
    }

    @Test
    void aMistakeInTheFormDoesNotUseUpTheLink() throws Exception {
        String token = sendLinkAndGetToken();

        LcInviteRegisterRequest missingSubCounty = form(token);
        missingSubCounty.setSubCounty("");
        assertRejected(HttpStatus.BAD_REQUEST, () -> service.completeSignup(missingSubCounty));

        LcInviteRegisterRequest mismatch = form(token);
        mismatch.setConfirmPassword("something-else1");
        assertRejected(HttpStatus.BAD_REQUEST, () -> service.completeSignup(mismatch));

        LcInviteRegisterRequest noTerms = form(token);
        noTerms.setAcceptedTerms(false);
        assertRejected(HttpStatus.BAD_REQUEST, () -> service.completeSignup(noTerms));

        users.usernameTaken = true;
        assertRejected(HttpStatus.CONFLICT, () -> service.completeSignup(form(token)));

        assertFalse(invites.claimed);
        assertTrue(users.created.isEmpty());
    }
}
