package lcdjp.auth;

import lcdjp.security.PasswordPolicy;
import lcdjp.admin.AuditLogService;
import lcdjp.admin.DistrictAssignmentService;
import lcdjp.storage.FileRefService;
import lcdjp.notification.NotificationDispatcher;
import lcdjp.security.OtpConfig;
import lcdjp.user.PhoneUtil;
import lcdjp.common.RateLimited;
import lcdjp.security.SessionIdentity;
import lcdjp.storage.StoredFileCleanupService;
import lcdjp.verification.SubmitVerificationRequest;
import lcdjp.verification.VerificationAuthorityService;
import lcdjp.verification.VerificationOtpRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.ArrayList;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
public class RegistrationController {
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(RegistrationController.class);

    @Autowired
    private NotificationDispatcher notificationDispatcher;

    @Autowired
    private RegistrationRepository registration;

    @Autowired
    private AuthRepository authRepository;

    @org.springframework.beans.factory.annotation.Value("${app.base-url:https://justicelinkug.org}")
    private String appBaseUrl;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private DistrictAssignmentService districtAssignmentService;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private PhoneUtil phoneUtil;

    @Autowired
    private VerificationAuthorityService verificationAuthorityService;

    /** Optional: when null (or object storage is off) uploaded files stay in MySQL exactly as before. */
    @Autowired(required = false)
    private FileRefService fileRefService;

    @Autowired(required = false)
    private StoredFileCleanupService fileCleanup;

    private String storeUserFile(String value, Map<String, String> uploaded) {
        return fileRefService == null ? value : fileRefService.externalizeIfDataUri(value, "users", uploaded);
    }

    private void discardUploaded(Map<String, String> uploaded) {
        if (fileRefService == null) return;
        uploaded.values().forEach(fileRefService::deleteQuietly);
    }

    @PostMapping("/register")
    @RateLimited(limit = 10, durationMinutes = 15)
    public ResponseEntity<?> register(@Valid @RequestBody RegistrationRequest userData,
                                      HttpServletRequest httpRequest) {
        try {

            if (!Boolean.TRUE.equals(userData.getOtpVerified())) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                        .body(Map.of("error", "OTP verification is required before creating an account"));
            }
            HttpSession verifiedSession = httpRequest.getSession(false);
            String verifiedUsername = verifiedSession == null
                    ? null
                    : String.valueOf(verifiedSession.getAttribute("lcdjp_otp_verified_username"));
            String requestedUsername = userData.getUsername() == null ? "" : userData.getUsername();
            if (verifiedUsername == null || !verifiedUsername.equals(requestedUsername)) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                        .body(Map.of("error", "A valid server-side OTP verification is required"));
            }

            logger.info("📝 Registration received for: " + userData.getUsername());

            String username = userData.getUsername();
            String password = userData.getPassword();
            String passwordHash = userData.getPasswordHash();
            boolean looksLikeBcrypt = passwordHash != null
                    && passwordHash.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
            if (!looksLikeBcrypt) {
                passwordHash = passwordEncoder.encode(password);
            }
            String firstName = userData.getFirstName();
            String lastName = userData.getLastName();

            String role = "Citizen";
            String phone = userData.getPhoneNumber();
            String email = userData.getEmail();
            String district = userData.getDistrict();
            String subCounty = userData.getSubCounty();
            String parish = userData.getParish();
            String village = userData.getVillage();
            String nationalId = userData.getNationalId();
            String gender = userData.getGender();
            String dateOfBirthRaw = userData.getDateOfBirth();

            double latitude = 0.0;
            double longitude = 0.0;
            try {
                if (userData.getLatitude() != null) {
                    latitude = Double.parseDouble(userData.getLatitude());
                }
                if (userData.getLongitude() != null) {
                    longitude = Double.parseDouble(userData.getLongitude());
                }
            } catch (NumberFormatException e) {
                logger.error("⚠️ Invalid Lat/Lng during registration");
            }

            logger.info("👤 Gender received: '" + gender + "'");
            logger.info("📅 Date of Birth received: '" + dateOfBirthRaw + "'");

            String formattedDateOfBirth = null;
            if (dateOfBirthRaw != null && !dateOfBirthRaw.isEmpty()) {
                try {
                    String[] parts = dateOfBirthRaw.split("/");
                    if (parts.length == 3) {
                        String month = parts[0].trim();
                        String day = parts[1].trim();
                        String year = parts[2].trim();
                        if (month.matches("\\d+") && day.matches("\\d+") && year.matches("\\d+")) {
                            formattedDateOfBirth = year + "-" + String.format("%02d", Integer.parseInt(month)) + "-" + String.format("%02d", Integer.parseInt(day));
                            logger.info("✅ Converted date: " + dateOfBirthRaw + " -> " + formattedDateOfBirth);
                        } else {
                            formattedDateOfBirth = dateOfBirthRaw;
                        }
                    } else {
                        formattedDateOfBirth = dateOfBirthRaw;
                    }
                } catch (Exception e) {
                    logger.error("❌ Error parsing date: " + dateOfBirthRaw);
                    formattedDateOfBirth = dateOfBirthRaw;
                }
            }

            String nextOfKinName = userData.getNextOfKinName();
            String nextOfKinPhone = userData.getNextOfKinPhone();
            String nextOfKinEmail = userData.getNextOfKinEmail();
            String nextOfKinRelationship = userData.getNextOfKinRelationship();

            String lawyerSpecialization = userData.getLawyerSpecialization();
            String lawFirmName = userData.getLawFirmName();
            String lawSchool = userData.getLawSchool();
            String yearsExperience = userData.getYearsExperience();
            String barNumber = userData.getBarNumber();

            String lcLevel = userData.getLcLevel();
            String lcPosition = userData.getLcPosition();

            String organizationName = userData.getOrganizationName();
            String organizationType = userData.getOrganizationType();
            String specialization = userData.getSpecialization();

            String idFront = userData.getIdFront();
            String idBack = userData.getIdBack();
            String lawyerWorkId = userData.getLawyerWorkId();
            String lawyerCertificate = userData.getLawyerCertificate();
            String lawyerCVData = userData.getLawyerCVData();
            String lawyerCVName = userData.getLawyerCVName();
            Long lawyerCVSize = 0L;
            if (userData.getLawyerCVSize() != null) {
                try {
                    lawyerCVSize = Long.parseLong(userData.getLawyerCVSize());
                } catch (NumberFormatException e) {
                    lawyerCVSize = 0L;
                }
            }
            String lawyerCVType = userData.getLawyerCVType();
            String lcAppointmentLetter = userData.getLcAppointmentLetter();
            String lcOfficialId = userData.getLcOfficialId();

            String approvalStatus = "Citizen".equals(role) ? "Approved" : "Pending";
            String userType = "individual";

            if (username == null || username.length() < 8 || username.length() > 255) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Username must be between 8 and 255 characters"));
            }
            if (isReservedUsername(username)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "That username is reserved. Please choose another."));
            }
            if (!looksLikeBcrypt && PasswordPolicy.tooShort(password)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", PasswordPolicy.message()));
            }

            int count = (email != null && !email.isEmpty())
                    ? registration.countByUsernameOrEmail(username, email)
                    : registration.countByUsername(username);
            if (count > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Username or email already exists"));
            }
            if (phone != null && !phone.isBlank() && phoneUtil.isAlreadyUsed(phone, null)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "This phone number is already registered to another account"));
            }

            Map<String, String> uploaded = new HashMap<>();
            idFront = storeUserFile(idFront, uploaded);
            idBack = storeUserFile(idBack, uploaded);
            lawyerWorkId = storeUserFile(lawyerWorkId, uploaded);
            lawyerCertificate = storeUserFile(lawyerCertificate, uploaded);
            lawyerCVData = storeUserFile(lawyerCVData, uploaded);
            lcAppointmentLetter = storeUserFile(lcAppointmentLetter, uploaded);

            try {
            registration.insertUser(
                    username, passwordHash, firstName, lastName, role,
                    phone, email, district, subCounty, parish, village, nationalId,
                    gender, formattedDateOfBirth,
                    nextOfKinName, nextOfKinPhone, nextOfKinEmail, nextOfKinRelationship,
                    lawyerSpecialization, lawFirmName, lawSchool,
                    yearsExperience != null && !yearsExperience.isEmpty() ? Integer.parseInt(yearsExperience) : 0,
                    barNumber,
                    lcLevel, lcPosition,
                    organizationName, organizationType, specialization,
                    idFront, idBack, lawyerWorkId, lawyerCertificate, lawyerCVData, lawyerCVName,
                    lawyerCVSize != null ? lawyerCVSize : 0L,
                    lawyerCVType,
                    lcAppointmentLetter, lcOfficialId,
                    approvalStatus, userType
            );
            } catch (RuntimeException insertFailed) {
                discardUploaded(uploaded); // no row will ever point at these files
                throw insertFailed;
            }

            logger.info("✅ User registered successfully: " + username);
            logger.info("📍 Location saved: Lat " + latitude + ", Lng " + longitude);

            auditLogService.logAction(
                    username,
                    role,
                    "REGISTER",
                    "user",
                    username,
                    "User registered with role: " + role +
                            (organizationName != null ? ", Organization: " + organizationName : "") +
                            (lawFirmName != null ? ", Law Firm: " + lawFirmName : "") +
                            (lcLevel != null ? ", LC Level: " + lcLevel : "")
            );

            try {
                if (email != null && !email.isEmpty()) {
                    String welcomeBody = "<h1>🎉 Welcome to JusticeLink!</h1>"
                            + "<p>Hi " + firstName + " " + lastName + ",</p>"
                            + "<p>Thank you for registering with JusticeLink. Your account has been created successfully.</p>"
                            + "<p><strong>Account Details:</strong></p>"
                            + "<ul>"
                            + "<li><strong>Username:</strong> " + username + "</li>"
                            + "<li><strong>Role:</strong> " + role + "</li>"
                            + "<li><strong>User Type:</strong> " + userType + "</li>"
                            + "</ul>";

                    if ("Pending".equals(approvalStatus)) {
                        welcomeBody += "<p>Your account is pending approval by the administrator. You will receive an email once your account is approved.</p>";
                    } else {
                        welcomeBody += "<p>Your account is approved. You can now login to the system.</p>";
                    }

                    welcomeBody += "<p><strong>Login URL:</strong> <a href='" + appBaseUrl + "/'>" + appBaseUrl + "/</a></p>"
                            + "<p>Best regards,<br>JusticeLink Team</p>";

                    // Best-effort: queued, not sent on the request thread.
                    notificationDispatcher.sendEmail(email, "Welcome to JusticeLink", welcomeBody);
                }
            } catch (Exception e) {
                logger.error("⚠️ Failed to send welcome email: " + e.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User registered successfully");
            response.put("username", username);
            response.put("firstName", firstName);
            response.put("lastName", lastName);
            response.put("role", role);
            response.put("userType", userType);
            response.put("approvalStatus", approvalStatus);
            response.put("hasIdFront", idFront != null);
            response.put("hasIdBack", idBack != null);
            response.put("hasLawyerWorkId", lawyerWorkId != null);
            response.put("hasLawyerCertificate", lawyerCertificate != null);
            response.put("hasLawyerCV", lawyerCVData != null);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Registration failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed. Please try again later."));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerificationOtpRequest request,
                                       HttpServletRequest httpRequest) {
        try {
            String username = request.getUsername();
            String otpCode = request.getOtp();

            if (username == null || otpCode == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Username and OTP are required"));
            }

            if (!otpCode.matches("\\d{6}")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "OTP must be a 6-digit code"));
            }

            HttpSession session = httpRequest.getSession(false);
            Object pendingObject = session == null ? null : session.getAttribute("lcdjp_pending_registration");
            if (pendingObject instanceof Map) {
                String pendingOtp = session.getAttribute("lcdjp_pending_otp") == null
                        ? null
                        : String.valueOf(session.getAttribute("lcdjp_pending_otp"));
                Object expiryObject = session.getAttribute("lcdjp_pending_otp_expiry");
                int attempts = session.getAttribute("lcdjp_pending_otp_attempts") instanceof Number
                        ? ((Number) session.getAttribute("lcdjp_pending_otp_attempts")).intValue()
                        : 0;
                long expiry = expiryObject instanceof Number
                        ? ((Number) expiryObject).longValue()
                        : 0L;

                @SuppressWarnings("unchecked")
                Map<String, Object> pending = (Map<String, Object>) pendingObject;
                String pendingUsername = String.valueOf(pending.get("username"));
                if (!pendingUsername.equals(username)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(Map.of("error", "Registration session does not match this username"));
                }
                if (attempts >= OtpConfig.MAX_OTP_ATTEMPTS) {
                    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                            .body(Map.of("error", "Too many incorrect attempts. Request a new code."));
                }
                if (pendingOtp == null || expiry <= System.currentTimeMillis()) {
                    session.removeAttribute("lcdjp_pending_otp");
                    session.removeAttribute("lcdjp_pending_otp_expiry");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Invalid or expired OTP code. Please request a new one."));
                }
                if (!MessageDigest.isEqual(
                        pendingOtp.getBytes(StandardCharsets.UTF_8),
                        otpCode.getBytes(StandardCharsets.UTF_8))) {
                    session.setAttribute("lcdjp_pending_otp_attempts", attempts + 1);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Incorrect OTP code"));
                }

                Map<String, Object> verifiedRegistration = new HashMap<>(pending);
                verifiedRegistration.put("_otpVerified", true);
                verifiedRegistration.remove("otpVerified");
                session.setAttribute("lcdjp_otp_verified_username", pendingUsername);
                RegistrationRequest registrationRequest = new com.fasterxml.jackson.databind.ObjectMapper()
                        .convertValue(verifiedRegistration, RegistrationRequest.class);
                registrationRequest.setOtpVerified(true);
                ResponseEntity<?> registrationResult = register(registrationRequest, httpRequest);
                if (registrationResult.getStatusCode().is2xxSuccessful()) {
                    session.removeAttribute("lcdjp_pending_registration");
                    session.removeAttribute("lcdjp_pending_otp");
                    session.removeAttribute("lcdjp_pending_otp_expiry");
                    session.removeAttribute("lcdjp_pending_otp_sent_at");
                    session.removeAttribute("lcdjp_pending_otp_attempts");
                    session.removeAttribute("lcdjp_otp_verified_username");
                } else {

                    session.removeAttribute("lcdjp_otp_verified_username");
                }
                return registrationResult;
            }

            String legacyUsername = session == null ? null
                    : String.valueOf(session.getAttribute("lcdjp_legacy_otp_username"));
            String legacyOtp = session == null ? null
                    : String.valueOf(session.getAttribute("lcdjp_legacy_otp"));
            long legacyExpiry = session != null && session.getAttribute("lcdjp_legacy_otp_expiry") instanceof Number
                    ? ((Number) session.getAttribute("lcdjp_legacy_otp_expiry")).longValue()
                    : 0L;
            int legacyAttempts = session != null && session.getAttribute("lcdjp_legacy_otp_attempts") instanceof Number
                    ? ((Number) session.getAttribute("lcdjp_legacy_otp_attempts")).intValue()
                    : 0;

            if (session == null || !username.equals(legacyUsername) || legacyOtp == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No active OTP verification was found"));
            }
            if (legacyAttempts >= OtpConfig.MAX_OTP_ATTEMPTS) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of("error", "Too many incorrect attempts. Request a new code."));
            }
            if (legacyExpiry <= System.currentTimeMillis()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired OTP code"));
            }
            if (!MessageDigest.isEqual(
                    legacyOtp.getBytes(StandardCharsets.UTF_8),
                    otpCode.getBytes(StandardCharsets.UTF_8))) {
                session.setAttribute("lcdjp_legacy_otp_attempts", legacyAttempts + 1);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Incorrect OTP code"));
            }

            session.removeAttribute("lcdjp_legacy_otp_username");
            session.removeAttribute("lcdjp_legacy_otp");
            session.removeAttribute("lcdjp_legacy_otp_expiry");
            session.removeAttribute("lcdjp_legacy_otp_sent_at");
            session.removeAttribute("lcdjp_legacy_otp_attempts");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "OTP verified successfully"
            ));

        } catch (Exception e) {
            logger.error("❌ Error verifying OTP: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Request could not be processed. Please try again later."));
        }
    }

    @PostMapping("/register-pending")
    public ResponseEntity<?> registerPending(@Valid @RequestBody RegistrationRequest userData,
                                             HttpServletRequest httpRequest) {
        try {
            String username = userData.getUsername() == null ? "" : userData.getUsername().trim();
            String email = userData.getEmail() == null ? "" : userData.getEmail().trim();
            String password = userData.getPassword() == null ? "" : userData.getPassword();
            if (email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email address is required"));
            }
            if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "A valid email address is required"));
            }
            if (PasswordPolicy.tooShort(password)) {
                return ResponseEntity.badRequest().body(Map.of("error", PasswordPolicy.message()));
            }
            if (isReservedUsername(username)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "That username is reserved. Please choose another."));
            }

            int count = registration.countByUsernameOrEmail(username, email);
            if (count > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Username or email already exists"));
            }

            String phoneNumber = userData.getPhoneNumber() == null
                    ? "" : userData.getPhoneNumber().trim();
            if (!phoneNumber.isEmpty()) {
                if (PhoneUtil.normalizeLast9(phoneNumber) == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Please enter a valid phone number"));
                }
                if (phoneUtil.isAlreadyUsed(phoneNumber, null)) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("error", "This phone number is already registered to another account"));
                }
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> pendingRegistration = new com.fasterxml.jackson.databind.ObjectMapper()
                    .convertValue(userData, Map.class);
            pendingRegistration.put("_passwordHash", passwordEncoder.encode(password));
            pendingRegistration.remove("password");

            HttpSession session = httpRequest.getSession(true);
            session.setAttribute("lcdjp_pending_registration", pendingRegistration);
            session.removeAttribute("lcdjp_pending_otp");
            session.removeAttribute("lcdjp_pending_otp_expiry");
            session.removeAttribute("lcdjp_pending_otp_sent_at");
            session.removeAttribute("lcdjp_pending_otp_attempts");
            session.removeAttribute("lcdjp_otp_verified_username");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Registration details saved. OTP verification is required."
            ));
        } catch (Exception e) {
            logger.error("❌ Pending registration error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not start registration. Please try again later."));
        }
    }

    @PostMapping("/submit-verification")
    public ResponseEntity<?> submitDocumentsForVerification(@Valid @RequestBody SubmitVerificationRequest request,
                                                              HttpServletRequest httpRequest) {
        try {
            String username = SessionIdentity.username(httpRequest);
            if (username == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }

            HttpSession session = httpRequest.getSession(false);
            String actorRole = SessionIdentity.role(httpRequest, username, u -> authRepository.findRole(u));

            String idFront = request.getIdFront();
            String idBack = request.getIdBack();
            String nationalId = request.getNationalId();
            String lawyerWorkId = request.getLawyerWorkId();
            String lawyerCertificate = request.getLawyerCertificate();
            String lawyerCVData = request.getLawyerCVData();

            String lawyerSpecialization = request.getLawyerSpecialization();
            String barNumber = request.getBarNumber();
            if (lawyerSpecialization != null) lawyerSpecialization = lawyerSpecialization.trim();
            if (barNumber != null) barNumber = barNumber.trim();
            if (lawyerSpecialization != null && lawyerSpecialization.isEmpty()) lawyerSpecialization = null;
            if (barNumber != null && barNumber.isEmpty()) barNumber = null;

            String submittedRole = request.getVerificationRole();
            submittedRole = normalizeVerificationRole(submittedRole);
            if (!isAllowedVerificationRole(submittedRole)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "Only Citizen and Lawyer accounts can be requested here. " +
                                "LC Official, Legal Organization, and Admin roles are not self-service."));
            }

            String submittedDistrict = request.getDistrict();

            if (idFront == null || idFront.isBlank()
                    || idBack == null || idBack.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "Both the front and back of your National ID are required."));
            }
            if (nationalId == null || nationalId.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "Your National ID number is required."));
            }
            String normalizedNationalId = nationalId.trim().toUpperCase();

            boolean hasGpsCoordinates;
            try {
                String latRaw = request.getLatitude();
                String lngRaw = request.getLongitude();
                hasGpsCoordinates = latRaw != null && lngRaw != null
                        && Double.parseDouble(latRaw) != 0.0
                        && Double.parseDouble(lngRaw) != 0.0;
            } catch (NumberFormatException e) {
                hasGpsCoordinates = false;
            }
            if ((submittedDistrict == null || submittedDistrict.trim().isEmpty()) && !hasGpsCoordinates) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "Please select the district responsible for reviewing your verification."));
            }

            int nationalIdInUse = registration.countOtherUsersWithNationalId(normalizedNationalId, username);
            if (nationalIdInUse > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "This National ID has already been used to verify another account."));
            }

            double latitude = 0.0;
            double longitude = 0.0;
            try {
                if (request.getLatitude() != null) {
                    latitude = Double.parseDouble(request.getLatitude());
                }
                if (request.getLongitude() != null) {
                    longitude = Double.parseDouble(request.getLongitude());
                }
            } catch (NumberFormatException e) {
                logger.error("⚠️ Invalid Lat/Lng during verification");
            }

            if (latitude != 0.0 && longitude != 0.0) {

                String newDistrict = districtAssignmentService.determineDistrictFromCoordinates(latitude, longitude);

                if (newDistrict != null && !newDistrict.equals("Unknown")) {

                    registration.updateDistrictAndLocation(newDistrict, latitude, longitude, username);
                    logger.info("📍 User " + username + " district updated to: " + newDistrict + " during verification submission.");

                    if (submittedDistrict == null || submittedDistrict.isEmpty()) submittedDistrict = newDistrict;
                }
            }

            java.util.Set<String> filesBefore = fileCleanup == null
                    ? java.util.Set.of() : fileCleanup.userAccountFiles(username);
            Map<String, String> uploaded = new HashMap<>();
            idFront = storeUserFile(idFront, uploaded);
            idBack = storeUserFile(idBack, uploaded);
            lawyerWorkId = storeUserFile(lawyerWorkId, uploaded);
            lawyerCertificate = storeUserFile(lawyerCertificate, uploaded);
            lawyerCVData = storeUserFile(lawyerCVData, uploaded);
            String verificationDocuments = serializeVerificationDocuments(request);
            if (fileRefService != null) {
                verificationDocuments = fileRefService.externalizeJsonValues(verificationDocuments, "users", uploaded);
            }
            try {
                registration.submitVerification(idFront, idBack, normalizedNationalId, lawyerWorkId, lawyerCertificate, lawyerCVData,
                        lawyerSpecialization, barNumber,
                        verificationDocuments, submittedRole, username);
            } catch (RuntimeException updateFailed) {
                discardUploaded(uploaded);
                throw updateFailed;
            }
            if (fileCleanup != null) {
                // A resubmission replaces the earlier ID photos; remove the ones no longer referenced.
                fileCleanup.deleteAfterCommit(fileCleanup.dropped(filesBefore, fileCleanup.userAccountFiles(username)));
            }

            if (submittedDistrict != null && !submittedDistrict.isEmpty()) {
                registration.updateDistrict(submittedDistrict, username);
            }

            auditLogService.logAction(
                    username,
                    actorRole,
                    "VERIFICATION_SUBMITTED",
                    "user",
                    username,
                    "User submitted documents for verification"
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Documents submitted for verification",
                    "verificationStatus", "PENDING"
            ));

        } catch (Exception e) {
            logger.error("❌ Error submitting verification: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Submission failed. Please try again later."));
        }
    }

    @PostMapping("/verification/submit")
    public ResponseEntity<?> submitVerification(@Valid @RequestBody SubmitVerificationRequest request,
                                                 HttpServletRequest httpRequest) {

        return submitDocumentsForVerification(request, httpRequest);
    }

    @PostMapping("/register-with-otp")
    public ResponseEntity<?> registerWithOTP(@RequestBody RetiredRegistrationRequest userData) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("error", "This registration endpoint is retired. Use register-pending, send-otp, and verify-otp."));
    }

    private static final java.util.Set<String> RESERVED_USERNAMES = java.util.Set.of(
            "admin", "administrator", "system_admin", "systemadmin",
            "district_admin", "districtadmin", "system_administrator");

    private boolean isReservedUsername(String username) {
        if (username == null) return false;
        String normalized = username.trim().toLowerCase().replace(" ", "_");
        return RESERVED_USERNAMES.contains(normalized);
    }

    private String serializeVerificationDocuments(SubmitVerificationRequest request) {
        try {
            com.fasterxml.jackson.databind.node.ObjectNode documents =
                    new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(request);
            documents.remove(java.util.Set.of("latitude", "longitude", "district", "locationLabel",
                    "verificationDistrict", "districtAdminDistrict"));
            return documents.toString();
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not store verification documents", e);
        }
    }

    private String normalizeVerificationRole(String requestedRole) {
        return verificationAuthorityService.normalizeVerificationRole(requestedRole);
    }

    private boolean isAllowedVerificationRole(String requestedRole) {
        return verificationAuthorityService.isAllowedVerificationRole(requestedRole);
    }
}
