package lcdjp.lcinvite;

import lcdjp.admin.AuditLogService;
import lcdjp.admin.LcLevelRules;
import lcdjp.notification.EmailService;
import lcdjp.security.PasswordPolicy;
import lcdjp.security.RoleAuthority;
import lcdjp.user.PhoneUtil;
import lcdjp.user.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * LCs get their accounts through a link an admin chooses to send.
 *
 * Flow: the person asks for a link (email + district) -> the responsible admin reads the request and
 * sends or declines -> the person opens the link and signs up -> the link is spent.
 * The district is fixed by the request, so the account always lands in that district.
 */
@Service
public class LcInviteService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LcInviteService.class);

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter EXPIRY_FORMAT = DateTimeFormatter.ofPattern("HH:mm 'on' d MMM yyyy");
    private static final int MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything past this

    private final LcInviteRepository invites;
    private final UserAccountRepository userAccounts;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final String baseUrl;
    private final String supportEmail;
    private final String supportName;
    private final long linkTtlHours;

    public LcInviteService(LcInviteRepository invites,
                           UserAccountRepository userAccounts,
                           EmailService emailService,
                           AuditLogService auditLogService,
                           BCryptPasswordEncoder passwordEncoder,
                           @Value("${app.base-url:https://justicelinkug.org}") String baseUrl,
                           @Value("${app.support.email:support@justicelinkug.org}") String supportEmail,
                           @Value("${app.support.name:JusticeLink Support}") String supportName,
                           @Value("${app.lc-invite.link-ttl-hours:72}") long linkTtlHours) {
        this.invites = invites;
        this.userAccounts = userAccounts;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.passwordEncoder = passwordEncoder;
        this.baseUrl = baseUrl;
        this.supportEmail = supportEmail;
        this.supportName = supportName;
        this.linkTtlHours = linkTtlHours;
    }

    // ---------------------------------------------------------------- step 1: asking for a link

    /**
     * Saves the request. Always quiet about the outcome: the caller shows the same message whether or not
     * the email already has an account or a request, so the form can't be used to find out who is registered.
     */
    public void recordRequest(String rawEmail, String rawDistrict) {
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        String district = rawDistrict.trim();

        if (emailHasAccount(email)) {
            logger.info("LC link request skipped, email already has an account (district {})", district);
            return;
        }
        if (invites.hasOpenRequest(email, district)) {
            return;
        }
        invites.insertRequest(email, district, LocalDateTime.now());
        logger.info("LC link request saved for district {}", district);
    }

    // ---------------------------------------------------------------- step 2: the admin decides

    /** Requests this admin may act on: a District Admin sees their own district; a System Admin sees districts with no active District Admin. */
    public List<Map<String, Object>> listOpenRequests(String adminRole, String adminDistrict) {
        Map<String, Boolean> districtHasAdminCache = new HashMap<>();
        List<Map<String, Object>> visible = new ArrayList<>();
        for (Map<String, Object> row : invites.findOpenRequests()) {
            if (mayManage(adminRole, adminDistrict, text(row.get("district")), districtHasAdminCache)) {
                visible.add(toView(row));
            }
        }
        return visible;
    }

    /** Emails the sign-up link. Sending again replaces the earlier link. @return when the new link expires. */
    public LocalDateTime sendLink(long id, String adminUsername, String adminRole, String adminDistrict) {
        Map<String, Object> request = requireManageable(id, adminRole, adminDistrict);
        requireStillOpen(request);

        String token = newToken();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(linkTtlHours);

        // Email first: if it can't be delivered the request stays as it was and the admin can try again.
        emailLink(text(request.get("email")), text(request.get("district")), linkFor(token), expiresAt);

        if (!invites.markSent(id, adminUsername, hash(token), now, expiresAt)) {
            throw new LcInviteException(HttpStatus.CONFLICT, "This request was changed by someone else. Refresh and try again.");
        }
        return expiresAt;
    }

    public void decline(long id, String adminUsername, String adminRole, String adminDistrict) {
        Map<String, Object> request = requireManageable(id, adminRole, adminDistrict);
        requireStillOpen(request);
        if (!invites.markDeclined(id, adminUsername, LocalDateTime.now())) {
            throw new LcInviteException(HttpStatus.CONFLICT, "This request was changed by someone else. Refresh and try again.");
        }
    }

    // ---------------------------------------------------------------- step 3: the person signs up

    /** @return the email and district the link is for, or null when the link is not usable. */
    public Map<String, String> describeLink(String token) {
        Map<String, Object> invite = findUsableInvite(token);
        if (invite == null) return null;
        Map<String, String> info = new LinkedHashMap<>();
        info.put("email", text(invite.get("email")));
        info.put("district", text(invite.get("district")));
        return info;
    }

    /** Checks the form, spends the link and creates the account. All or nothing. @return the new username. */
    @Transactional
    public String completeSignup(LcInviteRegisterRequest form) {
        Map<String, Object> invite = findUsableInvite(form.getToken());
        if (invite == null) throw invalidLink();

        CleanSignup clean = cleanSignup(form);
        requirePasswordOk(form);
        requireUsernameFree(clean.username());

        String email = text(invite.get("email"));
        if (emailHasAccount(email)) {
            throw new LcInviteException(HttpStatus.CONFLICT, "An account already exists for this email. Try logging in or resetting your password.");
        }

        // Spend the link only after the form passed, so a typo doesn't burn it.
        if (!invites.claimToken(hash(form.getToken().trim()), LocalDateTime.now())) throw invalidLink();

        String district = text(invite.get("district"));
        String sentBy = text(invite.get("decided_by"));
        userAccounts.insertInvitedLcAccount(
                clean.username(), passwordEncoder.encode(form.getPassword()),
                clean.firstName(), clean.lastName(), email, clean.phone(), district,
                blankToNull(clean.village()), blankToNull(clean.parish()), blankToNull(clean.subCounty()),
                clean.level(), sentBy.isEmpty() ? "invite-link" : "invite-link:" + sentBy);

        auditLogService.logAction(clean.username(), "LC", "LC_ACCOUNT_SELF_REGISTERED", "user", clean.username(),
                "LC account (" + clean.level() + ") created from an invite link sent by " + sentBy + " for district: " + district);
        return clean.username();
    }

    // ---------------------------------------------------------------- form checks

    /** The sign-up fields after trimming, with the level normalised and areas that don't apply dropped. */
    private record CleanSignup(String username, String firstName, String lastName, String phone,
                               String level, String village, String parish, String subCounty) {
    }

    private CleanSignup cleanSignup(LcInviteRegisterRequest form) {
        String username = text(form.getUsername());
        if (username.length() < 8 || username.matches(".*\\s.*")) {
            throw badRequest("Username must be at least 8 characters with no spaces.");
        }
        String firstName = text(form.getFirstName());
        String lastName = text(form.getLastName());
        if (firstName.isEmpty() || lastName.isEmpty()) {
            throw badRequest("First name and last name are required.");
        }
        String phone = text(form.getPhone());
        if (PhoneUtil.normalizeLast9(phone) == null) {
            throw badRequest("Enter a valid phone number.");
        }
        if (!form.isAcceptedTerms()) {
            throw badRequest("You must accept the Terms and Conditions to continue.");
        }

        String level = LcLevelRules.normalizeLevel(form.getLcLevel());
        if (level == null) {
            throw badRequest("LC level is required and must be one of LC1, LC2, LC3, LC4 or LC5.");
        }
        String village = text(form.getVillage());
        String parish = text(form.getParish());
        String subCounty = text(form.getSubCounty());
        String missing = LcLevelRules.missingArea(level, village, parish, subCounty);
        if (missing != null) {
            throw badRequest(level + " accounts need the " + missing + ".");
        }
        if (!LcLevelRules.usesVillage(level)) village = "";
        if (!LcLevelRules.usesParish(level)) parish = "";
        if (!LcLevelRules.usesSubCounty(level)) subCounty = "";

        return new CleanSignup(username, firstName, lastName, phone, level, village, parish, subCounty);
    }

    private void requirePasswordOk(LcInviteRegisterRequest form) {
        String password = form.getPassword() == null ? "" : form.getPassword();
        if (PasswordPolicy.tooShort(password)) {
            throw badRequest(PasswordPolicy.message());
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw badRequest("That password is too long. Please use a shorter one.");
        }
        if (form.getConfirmPassword() != null && !password.equals(form.getConfirmPassword())) {
            throw badRequest("The two passwords do not match.");
        }
    }

    private void requireUsernameFree(String username) {
        Integer taken = userAccounts.countByUsername(username);
        if (taken != null && taken > 0) {
            throw new LcInviteException(HttpStatus.CONFLICT, "That username is taken. Please choose another.");
        }
    }

    // ---------------------------------------------------------------- who may act on a request

    private Map<String, Object> requireManageable(long id, String adminRole, String adminDistrict) {
        Map<String, Object> request = invites.findById(id);
        if (request == null) {
            throw new LcInviteException(HttpStatus.NOT_FOUND, "Request not found.");
        }
        boolean allowed = mayManage(adminRole, adminDistrict, text(request.get("district")), new HashMap<>());
        if (!allowed) {
            throw new LcInviteException(HttpStatus.FORBIDDEN, "You can't manage link requests for this district.");
        }
        return request;
    }

    private void requireStillOpen(Map<String, Object> request) {
        String status = text(request.get("status"));
        if (!LcInviteRepository.PENDING.equals(status) && !LcInviteRepository.SENT.equals(status)) {
            throw new LcInviteException(HttpStatus.CONFLICT, "This request is already " + status.toLowerCase(Locale.ROOT) + ".");
        }
    }

    /** Same rule as creating an LC account by hand: the District Admin owns the district, a System Admin only steps in when there isn't one. */
    private boolean mayManage(String adminRole, String adminDistrict, String requestDistrict,
                              Map<String, Boolean> districtHasAdminCache) {
        if (RoleAuthority.isDistrictAdminRole(adminRole)) {
            return !text(adminDistrict).isEmpty() && text(adminDistrict).equalsIgnoreCase(requestDistrict);
        }
        if (RoleAuthority.isSystemAdminRole(adminRole)) {
            return !districtHasAdminCache.computeIfAbsent(requestDistrict.toLowerCase(Locale.ROOT),
                    key -> districtHasActiveAdmin(requestDistrict));
        }
        return false;
    }

    private boolean districtHasActiveAdmin(String district) {
        for (Map<String, Object> row : userAccounts.findDistrictAdmins(district)) {
            boolean disabled = "disabled".equalsIgnoreCase(text(row.get("approval_status")));
            boolean inactive = (row.get("is_active") instanceof Boolean active) && !active;
            if (!disabled && !inactive) return true;
        }
        return false;
    }

    // ---------------------------------------------------------------- the email

    private void emailLink(String to, String district, String link, LocalDateTime expiresAt) {
        try {
            emailService.sendEmailFrom(supportEmail, supportName, to,
                    "Create your JusticeLink Local Council account", buildEmailBody(district, link, expiresAt));
        } catch (Exception e) {
            logger.error("LC invite email failed for district {}: {}", district, e.getMessage());
            throw new LcInviteException(HttpStatus.BAD_GATEWAY, "The link could not be emailed. Please try again shortly.");
        }
    }

    String buildEmailBody(String district, String link, LocalDateTime expiresAt) {
        String safeLink = HtmlUtils.htmlEscape(link);
        String safeSupport = HtmlUtils.htmlEscape(supportEmail);
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1a2e;max-width:560px;\">"
                + "<h2 style=\"color:#1a237e;margin:0 0 16px;\">Create your JusticeLink account</h2>"
                + "<p>Hello,</p>"
                + "<p>A JusticeLink administrator has approved your request for a Local Council account in "
                + "<strong>" + HtmlUtils.htmlEscape(district) + "</strong> district. Use the button below to finish signing up.</p>"
                + "<p style=\"margin:24px 0;\"><a href=\"" + safeLink + "\" "
                + "style=\"background:#1a237e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;"
                + "font-weight:bold;display:inline-block;\">Create my account</a></p>"
                + "<p>If the button does not work, copy and paste this address into your browser:<br>"
                + "<a href=\"" + safeLink + "\" style=\"color:#1a237e;word-break:break-all;\">" + safeLink + "</a></p>"
                + "<p><strong>This link can be used once and expires in " + linkTtlHours + " hours</strong> (at "
                + expiresAt.format(EXPIRY_FORMAT) + "). If it has expired, ask your administrator to send a new one.</p>"
                + "<p>If you did not ask for this, ignore this email and no account will be created. "
                + "You can also tell us at <a href=\"mailto:" + safeSupport + "\" style=\"color:#1a237e;\">" + safeSupport + "</a>.</p>"
                + "<p style=\"color:#555;font-size:13px;\">JusticeLink staff will never ask you for your password or a verification code.</p>"
                + "<p>Regards,<br>JusticeLink Support Team</p>"
                + "</div>";
    }

    String linkFor(String token) {
        String base = baseUrl == null ? "" : baseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/lc-register.html?token=" + token;
    }

    // ---------------------------------------------------------------- small helpers

    private Map<String, Object> findUsableInvite(String token) {
        if (token == null || token.isBlank()) return null;
        return invites.findByValidToken(hash(token.trim()), LocalDateTime.now());
    }

    private boolean emailHasAccount(String email) {
        Integer count = userAccounts.countByEmail(email);
        return count != null && count > 0;
    }

    private Map<String, Object> toView(Map<String, Object> row) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", row.get("id"));
        view.put("email", text(row.get("email")));
        view.put("district", text(row.get("district")));
        view.put("status", text(row.get("status")));
        view.put("requestedAt", iso(row.get("requested_at")));
        view.put("decidedBy", text(row.get("decided_by")));
        view.put("expiresAt", iso(row.get("expires_at")));
        return view;
    }

    private static LcInviteException invalidLink() {
        return new LcInviteException(HttpStatus.BAD_REQUEST,
                "This link is invalid, has expired, or has already been used. Please ask your administrator to send a new one.");
    }

    private static LcInviteException badRequest(String message) {
        return new LcInviteException(HttpStatus.BAD_REQUEST, message);
    }

    private static String iso(Object value) {
        if (value instanceof Timestamp ts) return ts.toLocalDateTime().toString();
        return value == null ? "" : value.toString();
    }

    private static String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }

    static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Only the hash is stored, so a copy of the database can't be used to open a link. */
    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
