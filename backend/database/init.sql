-- Zenith PDF Database Schema
-- Version: 2.0.0
-- PostgreSQL 16+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    s3_key TEXT NOT NULL UNIQUE,
    s3_bucket VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    page_count INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    checksum_sha256 CHAR(64), -- For integrity verification
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800), -- 50MB limit
    CONSTRAINT valid_page_count CHECK (page_count IS NULL OR page_count > 0)
);

CREATE INDEX idx_documents_owner ON documents(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_upload_date ON documents(upload_date);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);

-- =====================================================
-- PERMISSIONS TABLE
-- =====================================================
CREATE TYPE access_level AS ENUM ('view', 'comment', 'edit', 'admin');

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level access_level NOT NULL DEFAULT 'view',
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT unique_document_user UNIQUE(document_id, user_id)
);

CREATE INDEX idx_permissions_lookup ON permissions(document_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_permissions_user ON permissions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_permissions_expires ON permissions(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- SHARE LINKS TABLE (for anonymous sharing)
-- =====================================================
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    access_level access_level NOT NULL DEFAULT 'view',
    password_hash TEXT, -- Optional password protection
    max_uses INTEGER, -- NULL = unlimited
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
    CONSTRAINT valid_use_count CHECK (use_count >= 0)
);

CREATE INDEX idx_share_links_token ON share_links(share_token) WHERE revoked_at IS NULL;
CREATE INDEX idx_share_links_document ON share_links(document_id);

-- =====================================================
-- ANNOTATIONS TABLE (CRDT-backed)
-- =====================================================
CREATE TYPE annotation_type AS ENUM ('highlight', 'comment', 'sticky_note', 'underline', 'strikethrough', 'drawing', 'shape', 'text_edit', 'image_edit');

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    annotation_type annotation_type NOT NULL,
    page_number INTEGER NOT NULL,

    -- CRDT data (stored as JSONB for flexibility with Yjs)
    crdt_state JSONB NOT NULL,

    -- Visual properties
    position JSONB NOT NULL, -- {x, y, width, height}
    style JSONB, -- {color, thickness, opacity, font, etc.}

    -- Content (for text-based annotations)
    content TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_page_number CHECK (page_number > 0)
);

CREATE INDEX idx_annotations_document ON annotations(document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_annotations_user ON annotations(user_id);
CREATE INDEX idx_annotations_page ON annotations(document_id, page_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_annotations_type ON annotations(annotation_type);
CREATE INDEX idx_annotations_updated ON annotations(updated_at);

-- GIN index for JSONB queries on CRDT state
CREATE INDEX idx_annotations_crdt_state ON annotations USING GIN(crdt_state);

-- =====================================================
-- COMMENTS TABLE (threaded discussions)
-- =====================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,

    -- Mentions
    mentioned_user_ids UUID[],

    -- Status
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_content_length CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 5000)
);

CREATE INDEX idx_comments_annotation ON comments(annotation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_document ON comments(document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_resolved ON comments(resolved) WHERE deleted_at IS NULL;

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TYPE notification_type AS ENUM ('mention', 'comment_reply', 'document_shared', 'annotation_added', 'comment_resolved');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT notification_has_reference CHECK (document_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- =====================================================
-- AUDIT LOG TABLE (for security and compliance)
-- =====================================================
CREATE TYPE audit_action AS ENUM ('user_login', 'user_logout', 'document_upload', 'document_download', 'document_delete', 'permission_grant', 'permission_revoke', 'annotation_create', 'annotation_update', 'annotation_delete');

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_document ON audit_logs(document_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Partition by month for better performance (optional, for production)
-- CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =====================================================
-- SESSIONS TABLE (for active WebSocket connections)
-- =====================================================
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    connection_id VARCHAR(255) UNIQUE NOT NULL, -- WebSocket connection ID
    cursor_position JSONB, -- {page, x, y}
    active_page INTEGER,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_active_sessions_document ON active_sessions(document_id) WHERE disconnected_at IS NULL;
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id) WHERE disconnected_at IS NULL;
CREATE INDEX idx_active_sessions_connection ON active_sessions(connection_id);

-- =====================================================
-- RATE LIMITING TABLE
-- =====================================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    action VARCHAR(50) NOT NULL, -- e.g., 'upload', 'api_call', 'websocket_message'
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT rate_limit_identifier CHECK (user_id IS NOT NULL OR ip_address IS NOT NULL)
);

CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action, window_start);
CREATE INDEX idx_rate_limits_ip_action ON rate_limits(ip_address, action, window_start);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired share links
CREATE OR REPLACE FUNCTION cleanup_expired_share_links()
RETURNS void AS $$
BEGIN
    UPDATE share_links
    SET revoked_at = NOW()
    WHERE expires_at < NOW() AND revoked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has document access
CREATE OR REPLACE FUNCTION user_has_document_access(
    p_user_id UUID,
    p_document_id UUID,
    p_required_level access_level DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_access_level access_level;
    v_is_owner BOOLEAN;
BEGIN
    -- Check if user is document owner
    SELECT EXISTS(
        SELECT 1 FROM documents
        WHERE id = p_document_id AND owner_id = p_user_id AND deleted_at IS NULL
    ) INTO v_is_owner;

    IF v_is_owner THEN
        RETURN TRUE;
    END IF;

    -- Check permissions
    SELECT access_level INTO v_access_level
    FROM permissions
    WHERE document_id = p_document_id
        AND user_id = p_user_id
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW());

    -- Access level hierarchy: view < comment < edit < admin
    IF v_access_level IS NULL THEN
        RETURN FALSE;
    END IF;

    CASE p_required_level
        WHEN 'view' THEN RETURN TRUE;
        WHEN 'comment' THEN RETURN v_access_level IN ('comment', 'edit', 'admin');
        WHEN 'edit' THEN RETURN v_access_level IN ('edit', 'admin');
        WHEN 'admin' THEN RETURN v_access_level = 'admin';
        ELSE RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SEED DATA (Development only)
-- =====================================================

-- Create a test user (password: 'testpassword123')
INSERT INTO users (id, email, hashed_password, first_name, last_name, email_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@zenith-pdf.com',
    crypt('testpassword123', gen_salt('bf')),
    'Test',
    'User',
    true
) ON CONFLICT (email) DO NOTHING;

-- Grant the database user necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zenith_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zenith_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO zenith_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Zenith PDF database schema initialized successfully';
END $$;
