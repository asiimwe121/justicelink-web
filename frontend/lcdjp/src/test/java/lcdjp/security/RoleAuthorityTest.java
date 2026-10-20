package lcdjp.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RoleAuthorityTest {

    @Test
    void isSystemAdminRole_acceptsKnownVariants() {
        assertTrue(RoleAuthority.isSystemAdminRole("SYSTEM_ADMIN"));
        assertTrue(RoleAuthority.isSystemAdminRole("System Admin"));
        assertTrue(RoleAuthority.isSystemAdminRole("System Administrator"));
        assertTrue(RoleAuthority.isSystemAdminRole("Admin"));
        assertTrue(RoleAuthority.isSystemAdminRole("admin"));
    }

    @Test
    void isSystemAdminRole_rejectsDistrictAdminAndOtherRoles() {
        assertFalse(RoleAuthority.isSystemAdminRole("DISTRICT_ADMIN"));
        assertFalse(RoleAuthority.isSystemAdminRole("Citizen"));
        assertFalse(RoleAuthority.isSystemAdminRole("Lawyer"));
        assertFalse(RoleAuthority.isSystemAdminRole(null));
    }

    @Test
    void isSharedAdminInboxRole_acceptsAllThreeAdminTiers() {
        assertTrue(RoleAuthority.isSharedAdminInboxRole("Admin"));
        assertTrue(RoleAuthority.isSharedAdminInboxRole("SYSTEM_ADMIN"));
        assertTrue(RoleAuthority.isSharedAdminInboxRole("System Administrator"));
        assertTrue(RoleAuthority.isSharedAdminInboxRole("DISTRICT_ADMIN"));
        assertTrue(RoleAuthority.isSharedAdminInboxRole("district admin"));
    }

    @Test
    void isSharedAdminInboxRole_rejectsNonAdminRoles() {
        assertFalse(RoleAuthority.isSharedAdminInboxRole("Citizen"));
        assertFalse(RoleAuthority.isSharedAdminInboxRole("Lawyer"));
        assertFalse(RoleAuthority.isSharedAdminInboxRole(null));
    }

    @Test
    void isAdministratorRole_acceptsEveryAdminTierAndSpellingVariant() {
        for (String role : new String[]{"ADMIN", "admin", "SYSTEM_ADMIN", "System Admin",
                "SYSTEM_ADMINISTRATOR", "System Administrator", "DISTRICT_ADMIN", "District Admin", "  Admin  "}) {
            assertTrue(RoleAuthority.isAdministratorRole(role), role);
        }
    }

    @Test
    void isAdministratorRole_rejectsEveryoneElse() {
        for (String role : new String[]{"Citizen", "Lawyer", "LC", "", " ", "ADMINISTRATOR", "DISTRICT"}) {
            assertFalse(RoleAuthority.isAdministratorRole(role), role);
        }
        assertFalse(RoleAuthority.isAdministratorRole(null));
    }
}
