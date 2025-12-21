// Dashboard Configuration Example
// Copy this file to config.js and fill in your values.
// config.js is gitignored and will not be committed.

const DASHBOARD_CONFIG = {
    // n8n Configuration
    N8N_URL: 'https://your-n8n-instance.com',
    N8N_API_KEY: 'your_n8n_api_key_here',

    // Workflow IDs (found in n8n URL when viewing workflow)
    WORKFLOW_IDS: {
        sofia: 'workflow_id_for_sofia',
        diana: 'workflow_id_for_diana',
        yara: 'workflow_id_for_yara'
    },

    // Supabase Configuration (optional - can also be set via UI)
    SUPABASE_URL: '',
    SUPABASE_KEY: ''
};
