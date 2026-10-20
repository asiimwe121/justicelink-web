CREATE TABLE IF NOT EXISTS contact_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_aid_organizations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_name VARCHAR(255),
    district VARCHAR(255),
    sub_county VARCHAR(255),
    parish VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    specialization VARCHAR(255),
    description TEXT,
    latitude DOUBLE,
    longitude DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
