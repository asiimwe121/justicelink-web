package lcdjp.notification;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SmsContentGuardTest {

    @Test
    void existingMessageTypesPass() {
        assertDoesNotThrow(() -> SmsContentGuard.requireNeutral(
                "Your JusticeLink verification code is 123456. It expires in 5 minutes."));
        assertDoesNotThrow(() -> SmsContentGuard.requireNeutral(
                "JusticeLink: Hello Amina, an administrator sent you a link to reset your password:\n"
                        + "https://justicelinkug.org/reset-password.html?token=ab-rape-land_cd\n"
                        + "It works once and expires in 30 minutes. Not expecting this? Don't open it."));
        assertDoesNotThrow(() -> SmsContentGuard.requireNeutral(
                "JusticeLink: there is an update on your case. Open the app to read it."));
    }

    @Test
    void sensitiveWordingIsRefusedWithoutEchoingIt() {
        SmsContentGuard.SensitiveSmsException e = assertThrows(SmsContentGuard.SensitiveSmsException.class,
                () -> SmsContentGuard.requireNeutral("Your defilement case was assigned to an LC official"));
        assertFalse(e.getMessage().contains("defilement"));
        assertTrue(e.getMessage().contains("child-protection"));

        assertThrows(SmsContentGuard.SensitiveSmsException.class,
                () -> SmsContentGuard.requireNeutral("He was arrested and is held at the police cells"));
        assertThrows(SmsContentGuard.SensitiveSmsException.class,
                () -> SmsContentGuard.requireNeutral("Reminder about your rape report"));
        assertThrows(SmsContentGuard.SensitiveSmsException.class,
                () -> SmsContentGuard.requireNeutral("Domestic violence case update"));
        assertThrows(SmsContentGuard.SensitiveSmsException.class,
                () -> SmsContentGuard.requireNeutral("Your HIV status letter is ready"));
    }

    @Test
    void emptyAndNullAreNotThisGuardsJob() {
        assertDoesNotThrow(() -> SmsContentGuard.requireNeutral(null));
        assertDoesNotThrow(() -> SmsContentGuard.requireNeutral(" "));
    }
}
