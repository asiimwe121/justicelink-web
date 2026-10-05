CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    requested_role VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    user_type VARCHAR(255),
    district VARCHAR(255),
    sub_county VARCHAR(255),
    parish VARCHAR(255),
    village VARCHAR(255),
    national_id VARCHAR(255),
    gender VARCHAR(255),
    date_of_birth VARCHAR(255),
    approval_status VARCHAR(255),
    id_front LONGTEXT,
    id_back LONGTEXT,
    lawyer_work_id LONGTEXT,
    lawyer_certificate LONGTEXT,
    lawyer_cv_data LONGTEXT,
    lawyer_cv_name VARCHAR(255),
    lawyer_cv_size BIGINT,
    lawyer_cv_type VARCHAR(255),
    lc_appointment_letter LONGTEXT,
    lc_official_id VARCHAR(255),
    documents LONGTEXT,
    lawyer_specialization VARCHAR(255),
    law_firm_name VARCHAR(255),
    law_school VARCHAR(255),
    years_experience INT,
    bar_number VARCHAR(255),
    lc_level VARCHAR(255),
    lc_position VARCHAR(255),
    organization_name VARCHAR(255),
    organization_type VARCHAR(255),
    specialization VARCHAR(255),
    next_of_kin_name VARCHAR(255),
    next_of_kin_phone VARCHAR(255),
    next_of_kin_email VARCHAR(255),
    next_of_kin_relationship VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    avatar_data LONGTEXT,
    verification_status VARCHAR(255) DEFAULT 'BASIC',
    verification_level VARCHAR(255) DEFAULT 'BASIC',
    verification_documents LONGTEXT,
    verification_submitted_at TIMESTAMP NULL,
    verification_reviewed_at TIMESTAMP NULL,
    verification_reviewed_by VARCHAR(255),
    verification_rejection_reason VARCHAR(255),
    password_changed BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expiry TIMESTAMP NULL,
    created_by VARCHAR(255),
    fallback_reason VARCHAR(255),
    declined_lawyers VARCHAR(2000),
    routing_choice VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS cases (
    case_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_reference VARCHAR(255) UNIQUE,
    case_number VARCHAR(255),
    case_type VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description VARCHAR(255),
    citizen_name VARCHAR(255),
    citizen_phone VARCHAR(255),
    citizen_email VARCHAR(255),
    case_status VARCHAR(255) DEFAULT 'PENDING',
    current_level VARCHAR(255),
    assigned_to VARCHAR(255),
    assigned_role VARCHAR(255),
    district VARCHAR(255),
    sub_county VARCHAR(255),
    parish VARCHAR(255),
    village VARCHAR(255),
    full_location VARCHAR(255),
    citizen_id VARCHAR(255),
    assigned_lawyer VARCHAR(255),
    assigned_lc VARCHAR(255),
    assigned_org VARCHAR(255),
    legal_advice VARCHAR(255),
    legal_advice_provided_by VARCHAR(255),
    legal_advice_date TIMESTAMP NULL,
    timeline TEXT,
    status_history TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    routing_status VARCHAR(50),
    kin_name VARCHAR(255),
    kin_phone VARCHAR(50),
    kin_email VARCHAR(255),
    kin_relationship VARCHAR(100),
    attached_media VARCHAR(500),
    attached_file_data LONGTEXT,
    attached_file_size BIGINT,
    attached_file_type VARCHAR(100),
    has_voice_statement BOOLEAN DEFAULT FALSE,
    voice_statement LONGTEXT,
    voice_duration INT,
    has_video_statement BOOLEAN DEFAULT FALSE,
    video_statement LONGTEXT,
    video_duration INT,
    extra_notes TEXT,
    voice_note_data LONGTEXT,
    voice_note_duration INT,
    accepted_date DATETIME,
    assigned_specialization VARCHAR(100),
    available_lawyers TEXT,
    current_handler VARCHAR(100),
    handler_role VARCHAR(50),
    lc_comments TEXT,
    lc_evidence_file VARCHAR(500),
    lc_statements TEXT,
    messaging_enabled BOOLEAN DEFAULT TRUE,
    messaging_locked BOOLEAN DEFAULT FALSE,
    resolution_details TEXT,
    resolved_by VARCHAR(100),
    resolved_by_role VARCHAR(50),
    selected_lawyer VARCHAR(100),
    selected_lawyer_name VARCHAR(255),
    selected_lawyer_specialization VARCHAR(100),
    selected_lawyer_status VARCHAR(50),
    lc_referral_notes TEXT,
    referred_to VARCHAR(50),
    referred_by VARCHAR(100),
    lc_location_choice VARCHAR(50),
    lc_location_source VARCHAR(50)
);

CREATE INDEX idx_cases_assigned_lawyer ON cases (assigned_lawyer);
CREATE INDEX idx_cases_selected_lawyer ON cases (selected_lawyer, selected_lawyer_status);
CREATE INDEX idx_cases_routing_lookup ON cases (routing_status, status, district, parish, sub_county);
CREATE INDEX idx_cases_created_at ON cases (created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    user_role VARCHAR(255),
    action VARCHAR(255),
    entity_type VARCHAR(255),
    entity_id VARCHAR(255),
    details VARCHAR(2000),
    ip_address VARCHAR(255),
    user_agent VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    activity_type VARCHAR(255) NOT NULL,
    description TEXT,
    username VARCHAR(255),
    user_role VARCHAR(255),
    entity_type VARCHAR(255),
    entity_id VARCHAR(255),
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    action VARCHAR(255),
    case_id BIGINT,
    latitude DOUBLE,
    longitude DOUBLE,
    details TEXT,
    created_at TIMESTAMP NULL,
    CONSTRAINT fk_activity_logs_case FOREIGN KEY (case_id) REFERENCES cases (case_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(255),
    case_reference VARCHAR(255),
    sender VARCHAR(255),
    sender_name VARCHAR(255),
    sender_role VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    file_data LONGTEXT,
    owner VARCHAR(100),
    case_id VARCHAR(100),
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    shared_with TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_documents_owner ON documents (owner);
CREATE INDEX idx_documents_case_id ON documents (case_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    from_user VARCHAR(100) NOT NULL,
    from_name VARCHAR(200),
    from_role VARCHAR(50),
    sent_to VARCHAR(100),
    message TEXT,
    type VARCHAR(50) DEFAULT 'text',
    audio_data LONGTEXT,
    duration INT DEFAULT 0,
    timestamp DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    delivered BOOLEAN DEFAULT FALSE,
    reply TEXT,
    reply_timestamp VARCHAR(50)
);
CREATE INDEX idx_chat_messages_from_user ON chat_messages (from_user);
CREATE INDEX idx_chat_messages_sent_to ON chat_messages (sent_to);

CREATE TABLE IF NOT EXISTS case_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    from_user VARCHAR(50) NOT NULL,
    from_name VARCHAR(100) NOT NULL,
    from_username VARCHAR(50),
    message_text TEXT NOT NULL,
    sent_to VARCHAR(50),
    sent_to_role VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    pre_acceptance BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_case_messages_case_id ON case_messages (case_id);

CREATE TABLE IF NOT EXISTS contact_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    audience VARCHAR(20) DEFAULT 'all',
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_organizations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(255),
    district VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    specialization VARCHAR(255),
    address VARCHAR(255),
    description TEXT,
    latitude DOUBLE,
    longitude DOUBLE,
    role VARCHAR(255) DEFAULT 'Organization',
    approval_status VARCHAR(255) DEFAULT 'Approved',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
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

CREATE TABLE IF NOT EXISTS legal_source_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_document_id VARCHAR(128) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    document_title VARCHAR(255),
    document_type VARCHAR(32),
    file_extension VARCHAR(16),
    relative_source_path VARCHAR(1024) NOT NULL,
    source_folder VARCHAR(255),
    folder_hierarchy VARCHAR(1024),
    file_size BIGINT,
    last_modified TIMESTAMP NULL,
    content_hash VARCHAR(64),
    ingestion_timestamp TIMESTAMP NULL,
    status VARCHAR(32) DEFAULT 'PENDING',
    requires_ocr BOOLEAN DEFAULT FALSE,
    total_chunks INT DEFAULT 0,
    failure_reason TEXT,
    CONSTRAINT uq_legal_source_documents_path UNIQUE (relative_source_path)
);

CREATE TABLE IF NOT EXISTS legal_document_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_document_id VARCHAR(128) NOT NULL,
    content_hash VARCHAR(64),
    original_filename VARCHAR(255),
    document_title VARCHAR(255),
    document_type VARCHAR(32),
    relative_source_path VARCHAR(1024),
    source_folder VARCHAR(255),
    folder_hierarchy VARCHAR(1024),
    chunk_number INT,
    total_chunks INT,
    page_number INT,
    legal_section VARCHAR(255),
    chunk_text LONGTEXT,
    embedding LONGTEXT,
    ingestion_timestamp TIMESTAMP NULL
);
CREATE INDEX idx_legal_chunk_source_doc ON legal_document_chunks (source_document_id);
CREATE INDEX idx_legal_chunk_content_hash ON legal_document_chunks (content_hash);