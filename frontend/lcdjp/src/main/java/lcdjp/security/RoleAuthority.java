package lcdjp.security;

public final class RoleAuthority {

    private RoleAuthority() {
    }

    public static boolean isSystemAdminRole(String role) {
        return role != null && (
                "SYSTEM_ADMIN".equalsIgnoreCase(role)
                        || "SYSTEM ADMIN".equalsIgnoreCase(role)
                        || "SYSTEM ADMINISTRATOR".equalsIgnoreCase(role)
                        || "ADMIN".equalsIgnoreCase(role)
        );
    }

    public static boolean isDistrictAdminRole(String role) {
        return role != null && (
                "DISTRICT_ADMIN".equalsIgnoreCase(role)
                        || "DISTRICT ADMIN".equalsIgnoreCase(role)
                        || "DISTRICT ADMINISTRATOR".equalsIgnoreCase(role)
        );
    }

    /**
     * Any admin tier: system admin (ADMIN, SYSTEM_ADMIN, SYSTEM_ADMINISTRATOR) or district admin.
     * This is the one definition of "is an administrator" for ownership/access checks; do not copy it
     * into a controller. Case differences, surrounding spaces and spaces-for-underscores are ignored.
     */
    public static boolean isAdministratorRole(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                || normalized.equals("SYSTEM_ADMINISTRATOR") || normalized.equals("DISTRICT_ADMIN");
    }

    /** The shared admin inbox is deliberately open to every admin tier. */
    public static boolean isSharedAdminInboxRole(String role) {
        return isAdministratorRole(role);
    }
}
