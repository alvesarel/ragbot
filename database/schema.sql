-- ===========================================
-- Sofia Assistant - Simplified Database Schema
-- ===========================================
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- CORE TABLES (Simplified)
-- ===========================================

-- Conversations - Main table for all interactions
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    contact_name VARCHAR(255),

    -- Stage tracking
    current_stage VARCHAR(50) DEFAULT 'greeting',
    -- Stages: greeting, discovery, qualification, value_building, scheduling, confirmation

    status VARCHAR(50) DEFAULT 'active',
    -- Status: active, awaiting_human, scheduled, completed, cold

    -- Collected data (flexible JSON)
    collected_data JSONB DEFAULT '{}'::jsonb,
    -- Fields: name, email, cep, date_of_birth, referral_source

    -- Conversation memory
    message_history JSONB DEFAULT '[]'::jsonb,

    -- Metrics
    language VARCHAR(5) DEFAULT 'pt',
    sentiment VARCHAR(20) DEFAULT 'neutral',
    total_messages INTEGER DEFAULT 0,

    -- Scheduling
    appointment_date TIMESTAMP WITH TIME ZONE,
    calendar_event_id VARCHAR(255),

    -- Handoff
    handoff_reason TEXT,
    handled_by VARCHAR(255),

    -- Timestamps
    first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages - Log of all messages for analytics
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,

    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    content TEXT,

    -- Analytics
    rag_chunks_used INTEGER DEFAULT 0,
    stage_at_time VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_conv_phone ON conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_stage ON conversations(current_stage);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_msg_phone ON messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_direction ON messages(direction);

-- ===========================================
-- AUTO-UPDATE TRIGGER
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- ANALYTICS VIEWS
-- ===========================================

-- Daily metrics
CREATE OR REPLACE VIEW daily_metrics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
    COUNT(*) FILTER (WHERE direction = 'outbound') as outbound,
    COUNT(DISTINCT phone_number) as unique_users,
    AVG(rag_chunks_used)::NUMERIC(3,1) as avg_rag_chunks
FROM messages
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Conversion funnel
CREATE OR REPLACE VIEW conversion_funnel AS
SELECT
    DATE(first_contact_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE current_stage != 'greeting') as engaged,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    COUNT(*) FILTER (WHERE status = 'awaiting_human') as handoffs,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'scheduled') / NULLIF(COUNT(*), 0), 1) as conversion_rate
FROM conversations
WHERE first_contact_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(first_contact_at)
ORDER BY date DESC;

-- Stage distribution
CREATE OR REPLACE VIEW stage_distribution AS
SELECT
    current_stage,
    status,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM conversations
WHERE last_message_at >= NOW() - INTERVAL '7 days'
GROUP BY current_stage, status
ORDER BY count DESC;

-- Hourly activity (for peak hours)
CREATE OR REPLACE VIEW hourly_activity AS
SELECT
    EXTRACT(HOUR FROM created_at)::INTEGER as hour,
    EXTRACT(DOW FROM created_at)::INTEGER as day_of_week,
    COUNT(*) as messages
FROM messages
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)
ORDER BY messages DESC;

-- Recent conversations (for dashboard)
CREATE OR REPLACE VIEW recent_conversations AS
SELECT
    id,
    phone_number,
    contact_name,
    current_stage,
    status,
    sentiment,
    collected_data->>'name' as name,
    collected_data->>'email' as email,
    total_messages,
    appointment_date,
    first_contact_at,
    last_message_at
FROM conversations
ORDER BY last_message_at DESC
LIMIT 100;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role conversations" ON conversations
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role messages" ON messages
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Anon read access for dashboard
CREATE POLICY "Anon read conversations" ON conversations
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Anon read messages" ON messages
    FOR SELECT TO anon
    USING (true);

-- ===========================================
-- GRANTS
-- ===========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ===========================================
-- DASHBOARD FUNCTIONS
-- ===========================================

-- Get dashboard summary
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_conversations', (SELECT COUNT(*) FROM conversations),
        'active_conversations', (SELECT COUNT(*) FROM conversations WHERE status = 'active'),
        'scheduled_appointments', (SELECT COUNT(*) FROM conversations WHERE status = 'scheduled'),
        'awaiting_human', (SELECT COUNT(*) FROM conversations WHERE status = 'awaiting_human'),
        'messages_today', (SELECT COUNT(*) FROM messages WHERE DATE(created_at) = CURRENT_DATE),
        'conversations_today', (SELECT COUNT(*) FROM conversations WHERE DATE(first_contact_at) = CURRENT_DATE),
        'avg_messages_per_conversation', (SELECT ROUND(AVG(total_messages)::NUMERIC, 1) FROM conversations WHERE total_messages > 0)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get conversation details with messages
CREATE OR REPLACE FUNCTION get_conversation_details(p_phone VARCHAR)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'conversation', (
            SELECT row_to_json(c)
            FROM conversations c
            WHERE phone_number = p_phone
        ),
        'messages', (
            SELECT json_agg(row_to_json(m) ORDER BY m.created_at)
            FROM messages m
            WHERE phone_number = p_phone
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_dashboard_summary() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_conversation_details(VARCHAR) TO anon, authenticated, service_role;
