-- ===========================================
-- WhatsApp RAG Chatbot - Supabase Schema
-- ===========================================
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- MAIN TABLES
-- ===========================================

-- Conversation States - Tracks active conversations
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    contact_name VARCHAR(255),

    -- Conversation tracking
    current_stage VARCHAR(50) DEFAULT 'greeting',
    -- Stages: greeting, discovery, qualification, value_building, scheduling, confirmation, follow_up

    status VARCHAR(50) DEFAULT 'active',
    -- Status: active, awaiting_human, scheduled, completed, cold, disqualified

    -- Collected lead data (JSONB for flexibility)
    collected_data JSONB DEFAULT '{}'::jsonb,
    -- Expected fields: name, email, cep, date_of_birth, cpf, referral_source, address

    -- Conversation history (last N messages)
    message_history JSONB DEFAULT '[]'::jsonb,

    -- Language preference
    language VARCHAR(5) DEFAULT 'pt',
    -- pt = Portuguese, en = English

    -- Analytics
    sentiment_score VARCHAR(20) DEFAULT 'neutral',
    -- positive, neutral, negative

    total_messages INTEGER DEFAULT 0,

    -- LGPD consent
    consent_given_at TIMESTAMP WITH TIME ZONE,
    consent_version VARCHAR(10),

    -- Timestamps
    first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Handoff tracking
    handoff_at TIMESTAMP WITH TIME ZONE,
    handoff_reason TEXT,
    handoff_category VARCHAR(50),
    -- Categories: medical, negotiation, complaint, request, frustration
    handled_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Leads - Qualified leads with complete data
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversation_states(id) ON DELETE SET NULL,

    -- Contact info
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),

    -- Brazilian specifics
    cep VARCHAR(10),
    cpf_encrypted BYTEA, -- Encrypted with pgcrypto
    address TEXT,

    -- Demographics
    date_of_birth DATE,
    age_at_contact INTEGER,

    -- Source tracking
    referral_source VARCHAR(50),
    -- ads, referral, organic, other
    referrer_name VARCHAR(255),

    -- UTM tracking (from Meta Ads)
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),

    -- Lead status
    status VARCHAR(50) DEFAULT 'new',
    -- new, qualified, contacted, scheduled, consulted, converted, lost

    -- Scoring
    lead_score INTEGER DEFAULT 0,
    qualification_notes TEXT,

    -- Appointment
    appointment_date TIMESTAMP WITH TIME ZONE,
    calendar_event_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    qualified_at TIMESTAMP WITH TIME ZONE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    consulted_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    lost_at TIMESTAMP WITH TIME ZONE,
    lost_reason VARCHAR(255),

    -- Indexes
    CONSTRAINT unique_phone_email UNIQUE (phone_number, email)
);

-- Message Log - For analytics and debugging
CREATE TABLE message_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversation_states(id) ON DELETE CASCADE,

    -- Message details
    direction VARCHAR(10) NOT NULL,
    -- inbound, outbound

    message_type VARCHAR(20) NOT NULL,
    -- text, audio, image, template, interactive

    content TEXT,
    media_url TEXT,

    -- WhatsApp message ID
    wa_message_id VARCHAR(100),

    -- Processing info
    tokens_used INTEGER,
    rag_chunks_used INTEGER,
    rag_query TEXT,
    response_time_ms INTEGER,

    -- Stage at time of message
    stage_at_time VARCHAR(50),

    -- Errors
    error_occurred BOOLEAN DEFAULT FALSE,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Handoff Queue - Active handoffs awaiting human response
CREATE TABLE handoff_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversation_states(id) ON DELETE CASCADE,

    phone_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),

    -- Handoff details
    reason TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    -- urgent, high, normal, low

    -- Context summary
    context_summary TEXT,
    last_messages JSONB,
    collected_data JSONB,

    -- Assignment
    assigned_to VARCHAR(255),
    assigned_at TIMESTAMP WITH TIME ZONE,

    -- Resolution
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, assigned, in_progress, resolved, abandoned
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Notifications sent
    telegram_notified_at TIMESTAMP WITH TIME ZONE,
    email_notified_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Reminders - For appointment reminders
CREATE TABLE scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

    phone_number VARCHAR(20) NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    -- confirmation, reminder_24h, reminder_1h, follow_up

    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    template_name VARCHAR(100),
    template_params JSONB,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, sent, failed, cancelled

    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to encrypt CPF
CREATE OR REPLACE FUNCTION encrypt_cpf(cpf_plain TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(cpf_plain, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt CPF
CREATE OR REPLACE FUNCTION decrypt_cpf(cpf_encrypted BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(cpf_encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate age from DOB
CREATE OR REPLACE FUNCTION calculate_age(dob DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob));
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at on conversation_states
CREATE TRIGGER update_conversation_states_updated_at
    BEFORE UPDATE ON conversation_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-calculate age when DOB is set on leads
CREATE OR REPLACE FUNCTION set_age_on_lead()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age_at_contact = calculate_age(NEW.date_of_birth);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_lead_age
    BEFORE INSERT OR UPDATE OF date_of_birth ON leads
    FOR EACH ROW
    EXECUTE FUNCTION set_age_on_lead();

-- ===========================================
-- INDEXES
-- ===========================================

-- Conversation states
CREATE INDEX idx_conv_phone ON conversation_states(phone_number);
CREATE INDEX idx_conv_status ON conversation_states(status);
CREATE INDEX idx_conv_stage ON conversation_states(current_stage);
CREATE INDEX idx_conv_last_message ON conversation_states(last_message_at);

-- Leads
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_phone ON leads(phone_number);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_appointment ON leads(appointment_date);
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_leads_source ON leads(referral_source);

-- Message log
CREATE INDEX idx_messages_conv ON message_log(conversation_id);
CREATE INDEX idx_messages_created ON message_log(created_at);
CREATE INDEX idx_messages_direction ON message_log(direction);

-- Handoff queue
CREATE INDEX idx_handoff_status ON handoff_queue(status);
CREATE INDEX idx_handoff_priority ON handoff_queue(priority);
CREATE INDEX idx_handoff_created ON handoff_queue(created_at);

-- Scheduled reminders
CREATE INDEX idx_reminders_scheduled ON scheduled_reminders(scheduled_for);
CREATE INDEX idx_reminders_status ON scheduled_reminders(status);

-- ===========================================
-- ANALYTICS VIEWS
-- ===========================================

-- Conversion funnel by date
CREATE OR REPLACE VIEW conversion_funnel AS
SELECT
    DATE(first_contact_at) as date,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE current_stage != 'greeting') as engaged,
    COUNT(*) FILTER (WHERE status = 'scheduled' OR status = 'completed') as qualified,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'awaiting_human') as needed_human,
    COUNT(*) FILTER (WHERE status = 'disqualified') as disqualified,
    COUNT(*) FILTER (WHERE status = 'cold') as went_cold
FROM conversation_states
GROUP BY DATE(first_contact_at)
ORDER BY date DESC;

-- Stage drop-off analysis
CREATE OR REPLACE VIEW stage_dropoff AS
SELECT
    current_stage,
    status,
    COUNT(*) as conversation_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - last_message_at))/3600)::NUMERIC(10,2) as avg_hours_since_last_msg
FROM conversation_states
WHERE status IN ('active', 'cold')
GROUP BY current_stage, status
ORDER BY conversation_count DESC;

-- Response time metrics by date
CREATE OR REPLACE VIEW response_metrics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_messages,
    AVG(response_time_ms)::INTEGER as avg_response_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_ms,
    AVG(tokens_used)::INTEGER as avg_tokens,
    AVG(rag_chunks_used)::NUMERIC(3,1) as avg_rag_chunks
FROM message_log
WHERE direction = 'outbound'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Source attribution
CREATE OR REPLACE VIEW source_performance AS
SELECT
    COALESCE(referral_source, 'unknown') as source,
    utm_campaign,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    COUNT(*) FILTER (WHERE status = 'consulted') as consulted,
    COUNT(*) FILTER (WHERE status = 'converted') as converted,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'scheduled') /
          NULLIF(COUNT(*), 0), 2) as schedule_rate,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') /
          NULLIF(COUNT(*), 0), 2) as conversion_rate
FROM leads
GROUP BY referral_source, utm_campaign
ORDER BY total_leads DESC;

-- Handoff analysis
CREATE OR REPLACE VIEW handoff_analysis AS
SELECT
    category,
    COUNT(*) as total_handoffs,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)::INTEGER as avg_resolution_minutes,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'resolved') /
          NULLIF(COUNT(*), 0), 2) as resolution_rate
FROM handoff_queue
GROUP BY category
ORDER BY total_handoffs DESC;

-- Daily summary
CREATE OR REPLACE VIEW daily_summary AS
SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_messages,
    COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_messages,
    COUNT(DISTINCT conversation_id) as active_conversations,
    SUM(tokens_used) as total_tokens,
    COUNT(*) FILTER (WHERE error_occurred = TRUE) as errors
FROM message_log
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Policies for service role (n8n uses service key)
-- Service role bypasses RLS by default, but we create policies for documentation

CREATE POLICY "Service role full access to conversation_states"
    ON conversation_states
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to leads"
    ON leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to message_log"
    ON message_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to handoff_queue"
    ON handoff_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to scheduled_reminders"
    ON scheduled_reminders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- DATA RETENTION (LGPD Compliance)
-- ===========================================

-- Function to anonymize old data (run via cron)
CREATE OR REPLACE FUNCTION anonymize_old_data(retention_days INTEGER DEFAULT 730)
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Anonymize conversation_states older than retention period
    UPDATE conversation_states
    SET
        contact_name = 'ANONYMIZED',
        collected_data = '{"anonymized": true}'::jsonb,
        message_history = '[]'::jsonb
    WHERE
        first_contact_at < NOW() - (retention_days || ' days')::INTERVAL
        AND contact_name != 'ANONYMIZED';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- Anonymize leads
    UPDATE leads
    SET
        name = 'ANONYMIZED',
        email = 'anonymized@example.com',
        cpf_encrypted = NULL,
        address = 'ANONYMIZED',
        qualification_notes = NULL
    WHERE
        created_at < NOW() - (retention_days || ' days')::INTERVAL
        AND name != 'ANONYMIZED';

    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ANALYTICS REPORTS TABLE
-- ===========================================

-- Store generated analytics reports for historical tracking
CREATE TABLE analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_type VARCHAR(50) NOT NULL,
    -- Types: daily_summary, biweekly_analysis, monthly_report

    report_data JSONB NOT NULL,
    -- Stores the summary data from each report

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for quick lookup by type and date
    CONSTRAINT unique_report_per_day UNIQUE (report_type, DATE(generated_at))
);

-- Index for analytics reports
CREATE INDEX idx_reports_type ON analytics_reports(report_type);
CREATE INDEX idx_reports_generated ON analytics_reports(generated_at);

-- RLS for analytics_reports
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to analytics_reports"
    ON analytics_reports
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===========================================
-- ADDITIONAL ANALYTICS VIEWS
-- ===========================================

-- Weekly trend comparison
CREATE OR REPLACE VIEW weekly_trends AS
SELECT
    DATE_TRUNC('week', first_contact_at) as week_start,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'scheduled') / NULLIF(COUNT(*), 0), 1) as conversion_rate,
    COUNT(*) FILTER (WHERE status = 'cold') as went_cold,
    COUNT(*) FILTER (WHERE status = 'awaiting_human') as needed_handoff
FROM conversation_states
WHERE first_contact_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', first_contact_at)
ORDER BY week_start DESC;

-- Lead source ROI view (for comparing ad spend effectiveness)
CREATE OR REPLACE VIEW lead_source_roi AS
SELECT
    COALESCE(referral_source, 'unknown') as source,
    utm_campaign,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    COUNT(*) FILTER (WHERE status = 'consulted') as consulted,
    COUNT(*) FILTER (WHERE status = 'converted') as converted,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'scheduled') / NULLIF(COUNT(*), 0), 1) as schedule_rate,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / NULLIF(COUNT(*), 0), 1) as conversion_rate,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / NULLIF(COUNT(*) FILTER (WHERE status = 'scheduled'), 0), 1) as show_rate
FROM leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY referral_source, utm_campaign
ORDER BY total_leads DESC;

-- Peak hours analysis
CREATE OR REPLACE VIEW peak_hours AS
SELECT
    EXTRACT(HOUR FROM first_contact_at) as hour_of_day,
    EXTRACT(DOW FROM first_contact_at) as day_of_week,
    COUNT(*) as conversations,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'scheduled') / NULLIF(COUNT(*), 0), 1) as conversion_rate
FROM conversation_states
WHERE first_contact_at >= NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM first_contact_at), EXTRACT(DOW FROM first_contact_at)
ORDER BY conversations DESC;

-- ===========================================
-- SAMPLE DATA (for testing)
-- ===========================================

-- Uncomment to insert test data
/*
INSERT INTO conversation_states (phone_number, contact_name, current_stage, status, collected_data, language)
VALUES
    ('5511999990001', 'Maria Silva', 'qualification', 'active',
     '{"name": "Maria Silva", "email": "maria@example.com"}'::jsonb, 'pt'),
    ('5511999990002', 'John Doe', 'discovery', 'active',
     '{"name": "John Doe"}'::jsonb, 'en');
*/

-- ===========================================
-- GRANTS
-- ===========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
