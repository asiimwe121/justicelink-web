package lcdjp.notification;

import java.util.List;
import java.util.Optional;

/** What the USSD menu needs from the rest of the system. Kept small so the menu can be tested on its own. */
public interface UssdBackend {

    /** The citizen account linked to this phone number, if exactly one exists. */
    Optional<String> citizenForPhone(String phoneNumber);

    /** Creates a report and returns its case reference. */
    String createReport(String citizenUsername, String phoneNumber, String caseType, String district,
                        String shortDescription);

    /** Reference and status word for the citizen's newest cases (no descriptions, no names). */
    List<String> recentCaseStatusLines(String citizenUsername, int limit);
}
