package lcdjp.notification;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class UssdMenuTest {

    static class FakeBackend implements UssdBackend {
        Optional<String> citizen = Optional.of("citizen1");
        List<String> created = new ArrayList<>();
        List<String> statusLines = List.of("LCDJP-1: Pending");

        public Optional<String> citizenForPhone(String phone) { return citizen; }
        public String createReport(String user, String phone, String type, String district, String text) {
            created.add(type + "|" + district + "|" + text);
            return "LCDJP-TEST-1";
        }
        public List<String> recentCaseStatusLines(String user, int limit) { return statusLines; }
    }

    private final FakeBackend backend = new FakeBackend();
    private final UssdMenu menu = new UssdMenu(backend);

    @Test
    void emptyText_showsMainMenu() {
        assertTrue(menu.handle("+256700000001", "").startsWith("CON JusticeLink"));
        assertTrue(menu.handle("+256700000001", null).startsWith("CON JusticeLink"));
    }

    @Test
    void emergencyNumbers_endSession() {
        String r = menu.handle("+256700000001", "3");
        assertTrue(r.startsWith("END"));
        assertTrue(r.contains("999"));
        assertTrue(r.contains("116"));
    }

    @Test
    void report_collectsStepsAndOnlyCreatesOnConfirm() {
        assertTrue(menu.handle("+256700000001", "1").startsWith("CON What is it about?"));
        assertTrue(menu.handle("+256700000001", "1*1").startsWith("CON Which district"));
        assertTrue(menu.handle("+256700000001", "1*1*Wakiso").startsWith("CON Say what happened"));
        assertTrue(menu.handle("+256700000001", "1*1*Wakiso*Boundary moved").startsWith("CON Send this report?"));
        assertTrue(backend.created.isEmpty());

        String done = menu.handle("+256700000001", "1*1*Wakiso*Boundary moved*1");
        assertTrue(done.startsWith("END Report received. Reference: LCDJP-TEST-1"));
        assertEquals(List.of("Land Matter|Wakiso|Boundary moved"), backend.created);
    }

    @Test
    void report_declined_createsNothing() {
        String r = menu.handle("+256700000001", "1*1*Wakiso*Boundary moved*2");
        assertEquals("END Report not sent.", r);
        assertTrue(backend.created.isEmpty());
    }

    @Test
    void arrestedOption_asksWhoIsHeld_andPrefixesDescription() {
        assertTrue(menu.handle("+256700000001", "1*3*Mbale").contains("Who is held"));
        menu.handle("+256700000001", "1*3*Mbale*John at Mbale police*1");
        assertEquals(List.of("Others|Mbale|Person arrested or detained: John at Mbale police"), backend.created);
    }

    @Test
    void unregisteredPhone_cannotReportOrCheck() {
        backend.citizen = Optional.empty();
        assertTrue(menu.handle("+256700000002", "1*1*Wakiso*text*1").contains("not registered"));
        assertTrue(menu.handle("+256700000002", "2").contains("not registered"));
        assertTrue(backend.created.isEmpty());
    }

    @Test
    void status_showsReferenceAndStatusOnly() {
        assertEquals("END LCDJP-1: Pending", menu.handle("+256700000001", "2"));
    }

    @Test
    void invalidChoices_endCleanly() {
        assertTrue(menu.handle("+256700000001", "9").startsWith("END"));
        assertTrue(menu.handle("+256700000001", "1*7").startsWith("END"));
    }

    @Test
    void typedText_isCappedAndCleaned() {
        String longText = "x".repeat(500);
        menu.handle("+256700000001", "1*1*Wakiso*" + longText + "*1");
        assertEquals("Land Matter|Wakiso|" + "x".repeat(UssdMenu.MAX_FIELD), backend.created.get(0));
    }
}
