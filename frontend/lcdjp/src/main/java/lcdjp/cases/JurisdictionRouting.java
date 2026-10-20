package lcdjp.cases;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Rule-based decision on which kind of institution a report belongs with.
 *
 * This is deliberately NOT done by the AI model: it is a fixed, reviewable list of rules.
 * It never refuses a report. Its job is to (1) keep serious criminal, protection and detention
 * reports out of the LC mediation queue, and (2) tell the citizen where to go for help now.
 *
 * LEGAL REVIEW NEEDED: the keyword groups, tracks and the advice texts below reflect general
 * understanding of the Local Council Courts Act 2006 and related law and must be checked by a
 * Ugandan lawyer before relying on them. Matching works on English text only; a report written
 * in a local language is only classified correctly if it has been translated first.
 */
public final class JurisdictionRouting {

    private JurisdictionRouting() {}

    /** Highest-priority track wins when several match (order here is the priority order). */
    public enum Track {
        DETENTION(true, false),
        PROTECTION(true, false),
        CRIMINAL_SERIOUS(true, false),
        FRAUD(false, false),
        EMPLOYMENT(false, false),
        LAND(false, true),
        LC_MEDIATION(false, true);

        private final boolean urgent;
        private final boolean lcEligible;

        Track(boolean urgent, boolean lcEligible) {
            this.urgent = urgent;
            this.lcEligible = lcEligible;
        }

        public boolean isUrgent() { return urgent; }

        /** Whether the case may appear in the district-wide LC queue. */
        public boolean isLcEligible() { return lcEligible; }
    }

    public static final class Assessment {
        public final Track track;
        public final Set<String> matchedGroups;
        public final String advisory;
        public final List<Map<String, String>> contacts;

        Assessment(Track track, Set<String> matchedGroups, String advisory, List<Map<String, String>> contacts) {
            this.track = track;
            this.matchedGroups = matchedGroups;
            this.advisory = advisory;
            this.contacts = contacts;
        }

        public boolean isUrgent() { return track.isUrgent(); }
        public boolean isLcEligible() { return track.isLcEligible(); }

        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("track", track.name());
            m.put("urgent", isUrgent());
            m.put("lcEligible", isLcEligible());
            m.put("advisory", advisory);
            m.put("contacts", contacts);
            return m;
        }
    }

    private static Pattern p(String regex) {
        return Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
    }

    private static final Pattern DETENTION = p(
            "\\b(arrested|detained|in custody|police cell|police station cells?|remand|locked up|"
            + "held at (?:the )?police|taken to (?:the )?police|bail|48 hours|released on police bond)\\b");

    private static final Pattern PROTECTION = p(
            "\\b(domestic violence|beaten by (?:my )?(?:husband|wife|partner|father|mother|uncle|stepfather)|"
            + "(?:husband|wife|partner) (?:beats|beat|beating|hits|hit|is beating)|battered|"
            + "child abuse|abused (?:my|the) child|defile\\w*|sexually abused|sexual abuse|"
            + "child marriage|forced marriage|female genital|fgm|child labou?r|"
            + "(?:my|the) child (?:is|was) being (?:beaten|abused|mistreated))\\b");

    private static final Pattern CRIMINAL_SERIOUS = p(
            "\\b(rape\\w*|sexual assault|murder\\w*|manslaughter|kidnap\\w*|abduct\\w*|human trafficking|"
            + "trafficked|armed robbery|robbed at gun ?point|arson|set fire to|threatened to kill|"
            + "tried to kill|attempted murder|stabbed|shot (?:me|him|her|them)|wounded|grievous harm)\\b");

    private static final Pattern FRAUD = p(
            "\\b(mobile ?money|momo|airtel money|mtn money|fraud\\w*|scam\\w*|conned|swindled|"
            + "fake (?:agent|number)|sim ?swap|wrong(?:ly)? (?:transfer|sent)|reversed (?:transaction|payment))\\b");

    private static final Pattern EMPLOYMENT = p(
            "\\b(unpaid (?:wages?|salary)|(?:wages?|salary|pay) (?:not|has not|have not|was not) (?:been )?paid|"
            + "not paid (?:my )?(?:wages?|salary)|dismissed|fired|terminated|sacked|"
            + "employer|employment|workplace|overtime|severance|no contract at work)\\b");

    private static final Pattern LAND = p(
            "\\b(land|plot|title deed|certificate of title|kibanja|mailo|customary tenure|boundary|"
            + "encroach\\w*|squatter|evict\\w*|landlord|tenant|survey(?:or)?|land board|sold (?:my )?land)\\b");

    private static final List<Map<String, String>> POLICE_CONTACTS = List.of(
            contact("Police emergency", "999 or 112"));
    private static final List<Map<String, String>> CHILD_CONTACTS = List.of(
            contact("Police emergency", "999 or 112"),
            contact("Uganda Child Helpline (Sauti)", "116"));

    private static Map<String, String> contact(String name, String number) {
        Map<String, String> c = new LinkedHashMap<>();
        c.put("name", name);
        c.put("number", number);
        return c;
    }

    /**
     * @param caseType the category chosen or suggested for the report (may be null)
     * @param description the citizen's own description (may be null)
     */
    public static Assessment assess(String caseType, String description) {
        String text = ((description == null ? "" : description) + " "
                + (caseType == null ? "" : caseType)).toLowerCase(Locale.ROOT);

        Set<String> matched = new LinkedHashSet<>();
        if (DETENTION.matcher(text).find()) matched.add("detention");
        if (PROTECTION.matcher(text).find()) matched.add("protection");
        if (CRIMINAL_SERIOUS.matcher(text).find()) matched.add("serious_crime");
        if (FRAUD.matcher(text).find()) matched.add("fraud");
        if (EMPLOYMENT.matcher(text).find()) matched.add("employment");
        if (LAND.matcher(text).find()) matched.add("land");

        Track track;
        if (matched.contains("detention")) track = Track.DETENTION;
        else if (matched.contains("protection")) track = Track.PROTECTION;
        else if (matched.contains("serious_crime")) track = Track.CRIMINAL_SERIOUS;
        else if (matched.contains("fraud")) track = Track.FRAUD;
        else if (matched.contains("employment")) track = Track.EMPLOYMENT;
        else if (matched.contains("land")) track = Track.LAND;
        else track = Track.LC_MEDIATION;

        return new Assessment(track, matched, advisoryFor(track), contactsFor(track));
    }

    private static List<Map<String, String>> contactsFor(Track track) {
        return switch (track) {
            case PROTECTION -> CHILD_CONTACTS;
            case DETENTION, CRIMINAL_SERIOUS -> POLICE_CONTACTS;
            default -> List.of();
        };
    }

    private static String advisoryFor(Track track) {
        return switch (track) {
            case DETENTION -> "If someone has been arrested or detained, they should be brought before a court "
                    + "within 48 hours. Contact a lawyer or a legal aid provider right away. We have recorded "
                    + "your report as urgent so that it can be handled quickly.";
            case PROTECTION -> "This looks like a violence or child-protection matter. Local council mediation "
                    + "is not the right place for it. If anyone is in danger now, call the police. "
                    + "We have recorded your report as urgent and will not send it to local council mediation.";
            case CRIMINAL_SERIOUS -> "This looks like a serious crime. It should be reported to the police and "
                    + "is not suitable for local council mediation. If anyone is in danger now, call the police. "
                    + "We have recorded your report as urgent.";
            case FRAUD -> "Money lost to fraud should be reported to the police, and to your mobile money "
                    + "provider as soon as possible. A lawyer or legal aid provider can help you after that.";
            case EMPLOYMENT -> "Problems with wages or dismissal are usually handled by the district labour "
                    + "office or a lawyer, not by local council mediation. We will look for legal aid for you.";
            case LAND -> "Land disputes often start with mediation, but keep your documents safe (title, "
                    + "agreements, receipts, photos) and note the names of witnesses. Local councils can only "
                    + "handle some land matters, so a lawyer may be needed later.";
            case LC_MEDIATION -> "";
        };
    }

    /** All tracks that may appear in the district-wide LC queue, for SQL building and tests. */
    public static List<String> lcEligibleTrackNames() {
        List<String> names = new ArrayList<>();
        for (Track t : Track.values()) if (t.isLcEligible()) names.add(t.name());
        return names;
    }
}
