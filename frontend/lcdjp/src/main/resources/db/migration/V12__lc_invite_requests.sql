-- People who say they are a Local Council (LC) leader ask for an account link by email.
-- The responsible admin (the district's District Admin, or a System Admin when the district has none)
-- looks at each request and either sends a one-time sign-up link or declines it.
-- The link carries the district, so the new account is always created inside that district.
-- Plain SQL that MySQL and H2 both accept.
--
-- status: PENDING (waiting for an admin) -> SENT (link emailed) -> USED (account created)
--         or DECLINED (admin said no). A SENT link that runs past expires_at simply stops working;
--         the admin can send a fresh one, which replaces it.
-- Only a hash of the link token is stored, never the token itself (same idea as password_reset_links).
CREATE TABLE IF NOT EXISTS lc_invite_requests (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    email        VARCHAR(320) NOT NULL,
    district     VARCHAR(100) NOT NULL,
    status       VARCHAR(10)  NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP    NOT NULL,
    decided_by   VARCHAR(255) NULL,
    decided_at   TIMESTAMP    NULL,
    token_hash   VARCHAR(64)  NULL UNIQUE,
    expires_at   TIMESTAMP    NULL,
    used_at      TIMESTAMP    NULL
);

CREATE INDEX idx_lc_invite_district_status ON lc_invite_requests (district, status);
CREATE INDEX idx_lc_invite_email ON lc_invite_requests (email);
