package lcdjp;

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

    public static boolean isSharedAdminInboxRole(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase().replace(' ', '_');
        return normalized.equals("ADMIN") || normalized.equals("SYSTEM_ADMIN")
                || normalized.equals("SYSTEM_ADMINISTRATOR") || normalized.equals("DISTRICT_ADMIN");
    }
}
