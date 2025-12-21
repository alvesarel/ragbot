/**
 * Clinic AI Dashboard - n8n-first approach
 * All data comes from n8n API
 */

// Configuration - loaded from config.js or localStorage
const config = {
    n8nUrl: null,
    n8nApiKey: null,
    workflowIds: {
        sofia: null,
        diana: null,
        yara: null
    }
};

// State
const state = {
    workflows: {},
    executions: [],
    connected: false
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    setupNavigation();
    setupSettings();
    setupRefresh();
    init();
});

// Load configuration from config.js or localStorage
function loadConfig() {
    // Try config.js first
    if (typeof DASHBOARD_CONFIG !== 'undefined') {
        config.n8nUrl = DASHBOARD_CONFIG.N8N_URL || null;
        config.n8nApiKey = DASHBOARD_CONFIG.N8N_API_KEY || null;
        if (DASHBOARD_CONFIG.WORKFLOW_IDS) {
            config.workflowIds = { ...DASHBOARD_CONFIG.WORKFLOW_IDS };
        }
    }

    // localStorage overrides
    const storedUrl = localStorage.getItem('n8n_url');
    const storedKey = localStorage.getItem('n8n_api_key');
    if (storedUrl) config.n8nUrl = storedUrl;
    if (storedKey) config.n8nApiKey = storedKey;

    // Update settings form
    const urlInput = document.getElementById('input-n8n-url');
    const keyInput = document.getElementById('input-n8n-key');
    if (urlInput && config.n8nUrl) urlInput.value = config.n8nUrl;
    if (keyInput && config.n8nApiKey) keyInput.value = '••••••••••••';

    // Show workflow IDs in settings
    document.getElementById('settings-sofia-id').textContent = config.workflowIds.sofia || '--';
    document.getElementById('settings-diana-id').textContent = config.workflowIds.diana || '--';
    document.getElementById('settings-yara-id').textContent = config.workflowIds.yara || '--';
}

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

// Switch view
function switchView(viewName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`view-${viewName}`).classList.add('active');

    // Load view-specific data
    if (viewName === 'sofia' || viewName === 'diana' || viewName === 'yara') {
        loadAgentDetail(viewName);
    } else if (viewName === 'executions') {
        loadAllExecutions();
    }
}

// View agent helper
function viewAgent(agent) {
    switchView(agent);
}

// Setup settings form
function setupSettings() {
    const form = document.getElementById('settings-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const url = document.getElementById('input-n8n-url').value.trim();
        const key = document.getElementById('input-n8n-key').value.trim();

        if (url && !key.includes('••••')) {
            localStorage.setItem('n8n_url', url);
            config.n8nUrl = url;
        }
        if (key && !key.includes('••••')) {
            localStorage.setItem('n8n_api_key', key);
            config.n8nApiKey = key;
        }

        showSettingsStatus('Connecting...', '');
        await init();
    });
}

// Setup refresh button
function setupRefresh() {
    document.getElementById('btn-refresh').addEventListener('click', () => {
        init();
    });
}

// Show settings status
function showSettingsStatus(message, type) {
    const status = document.getElementById('settings-status');
    status.textContent = message;
    status.className = 'settings-status ' + type;
    status.style.display = message ? 'block' : 'none';
}

// Initialize dashboard
async function init() {
    if (!config.n8nUrl || !config.n8nApiKey) {
        updateConnectionBadge('error', 'Not configured');
        showNoConfig();
        return;
    }

    updateConnectionBadge('checking', 'Connecting...');

    try {
        // Fetch workflows
        const workflows = await fetchWorkflows();
        if (!workflows) {
            updateConnectionBadge('error', 'Connection failed');
            showSettingsStatus('Failed to connect to n8n', 'error');
            return;
        }

        state.workflows = workflows;
        state.connected = true;
        updateConnectionBadge('connected', 'Connected to n8n');
        showSettingsStatus('Connected successfully!', 'success');

        // Update agent statuses
        updateAgentStatuses();

        // Fetch recent executions
        await loadRecentExecutions();

    } catch (error) {
        console.error('Init error:', error);
        updateConnectionBadge('error', 'Error');
        showSettingsStatus('Error: ' + error.message, 'error');
    }
}

// Update connection badge
function updateConnectionBadge(status, text) {
    const badge = document.getElementById('connection-badge');
    badge.className = 'connection-badge ' + status;
    badge.querySelector('span:last-child').textContent = text;
}

// Show no config message
function showNoConfig() {
    document.getElementById('recent-executions').innerHTML = `
        <tr><td colspan="4" class="loading">Configure n8n connection in Settings</td></tr>
    `;
}

// Fetch workflows from n8n
async function fetchWorkflows() {
    try {
        const response = await fetch(`${config.n8nUrl}/api/v1/workflows`, {
            headers: {
                'X-N8N-API-KEY': config.n8nApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Index by ID
        const workflows = {};
        for (const w of data.data || []) {
            workflows[w.id] = w;
        }

        return workflows;

    } catch (error) {
        console.error('Fetch workflows error:', error);
        return null;
    }
}

// Fetch executions from n8n
async function fetchExecutions(workflowId = null, limit = 20) {
    try {
        let url = `${config.n8nUrl}/api/v1/executions?limit=${limit}`;
        if (workflowId) {
            url += `&workflowId=${workflowId}`;
        }

        const response = await fetch(url, {
            headers: {
                'X-N8N-API-KEY': config.n8nApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.data || [];

    } catch (error) {
        console.error('Fetch executions error:', error);
        return [];
    }
}

// Update agent statuses based on workflow active state
function updateAgentStatuses() {
    const agents = ['sofia', 'diana', 'yara'];

    for (const agent of agents) {
        const workflowId = config.workflowIds[agent];
        const workflow = workflowId ? state.workflows[workflowId] : null;

        const isActive = workflow?.active === true;
        const statusText = isActive ? 'Live' : 'Offline';
        const statusClass = isActive ? 'live' : 'offline';

        // Update card status
        const cardStatus = document.getElementById(`status-${agent}`);
        if (cardStatus) {
            cardStatus.textContent = statusText;
            cardStatus.className = `agent-status ${statusClass}`;
        }

        // Update detail status
        const detailStatus = document.getElementById(`status-${agent}-detail`);
        if (detailStatus) {
            detailStatus.textContent = statusText;
            detailStatus.className = `agent-status large ${statusClass}`;
        }

        // Update nav dot
        const navDot = document.getElementById(`nav-status-${agent}`);
        if (navDot) {
            navDot.className = `status-dot ${isActive ? 'online' : 'offline'}`;
        }
    }
}

// Load recent executions for overview
async function loadRecentExecutions() {
    const tbody = document.getElementById('recent-executions');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';

    const executions = await fetchExecutions(null, 10);
    state.executions = executions;

    if (executions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No executions found</td></tr>';
        return;
    }

    tbody.innerHTML = executions.map(exec => {
        const workflow = state.workflows[exec.workflowId];
        const workflowName = workflow?.name || exec.workflowId;
        const agentName = identifyAgent(exec.workflowId);

        return `
            <tr>
                <td>${agentName ? `<strong>${agentName}</strong>` : workflowName}</td>
                <td>${formatStatus(exec.status)}</td>
                <td>${formatDate(exec.startedAt)}</td>
                <td>${formatDuration(exec.startedAt, exec.stoppedAt)}</td>
            </tr>
        `;
    }).join('');

    // Update agent stats
    updateAgentStats(executions);
}

// Identify agent from workflow ID
function identifyAgent(workflowId) {
    if (workflowId === config.workflowIds.sofia) return 'Sofia';
    if (workflowId === config.workflowIds.diana) return 'Diana';
    if (workflowId === config.workflowIds.yara) return 'Yara';
    return null;
}

// Update agent stats in cards
function updateAgentStats(executions) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const agents = ['sofia', 'diana', 'yara'];

    for (const agent of agents) {
        const workflowId = config.workflowIds[agent];
        const agentExecs = executions.filter(e =>
            e.workflowId === workflowId &&
            new Date(e.startedAt) > oneDayAgo
        );

        const total = agentExecs.length;
        const success = agentExecs.filter(e => e.status === 'success').length;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

        document.getElementById(`${agent}-executions`).textContent = total;
        document.getElementById(`${agent}-success`).textContent = total > 0 ? `${successRate}%` : '--';
    }
}

// Load agent detail view
async function loadAgentDetail(agent) {
    const workflowId = config.workflowIds[agent];
    const workflow = workflowId ? state.workflows[workflowId] : null;

    // Update workflow info
    document.getElementById(`${agent}-workflow-id`).textContent = workflowId || '--';
    document.getElementById(`${agent}-updated`).textContent = workflow ? formatDate(workflow.updatedAt) : '--';

    const triggersEl = document.getElementById(`${agent}-triggers`);
    if (triggersEl) {
        triggersEl.textContent = workflow?.triggerCount ?? '--';
    }

    // Fetch executions for this workflow
    const tbody = document.getElementById(`${agent}-executions-list`);
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';

    if (!workflowId) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Workflow ID not configured</td></tr>';
        return;
    }

    const executions = await fetchExecutions(workflowId, 20);

    if (executions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No executions found</td></tr>';
        updateAgentDetailStats(agent, []);
        return;
    }

    tbody.innerHTML = executions.map(exec => `
        <tr>
            <td><code>${exec.id.substring(0, 8)}...</code></td>
            <td>${formatStatus(exec.status)}</td>
            <td>${formatDate(exec.startedAt)}</td>
            <td>${formatDuration(exec.startedAt, exec.stoppedAt)}</td>
            <td>${exec.mode || 'trigger'}</td>
        </tr>
    `).join('');

    updateAgentDetailStats(agent, executions);
}

// Update agent detail stats
function updateAgentDetailStats(agent, executions) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent = executions.filter(e => new Date(e.startedAt) > oneDayAgo);
    const total = recent.length;
    const success = recent.filter(e => e.status === 'success').length;
    const errors = recent.filter(e => e.status === 'error').length;

    document.getElementById(`${agent}-total-24h`).textContent = total;
    document.getElementById(`${agent}-success-24h`).textContent = success;
    document.getElementById(`${agent}-error-24h`).textContent = errors;
}

// Load all executions
async function loadAllExecutions() {
    const tbody = document.getElementById('all-executions-list');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';

    const executions = await fetchExecutions(null, 50);

    if (executions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No executions found</td></tr>';
        return;
    }

    // Populate workflow filter
    const filterSelect = document.getElementById('filter-workflow');
    const workflowIds = [...new Set(executions.map(e => e.workflowId))];
    filterSelect.innerHTML = '<option value="">All Workflows</option>' +
        workflowIds.map(id => {
            const w = state.workflows[id];
            const name = w?.name || id;
            return `<option value="${id}">${name}</option>`;
        }).join('');

    // Render table
    renderAllExecutions(executions);

    // Setup filters
    filterSelect.onchange = () => filterExecutions(executions);
    document.getElementById('filter-status').onchange = () => filterExecutions(executions);
}

// Filter executions
function filterExecutions(executions) {
    const workflowFilter = document.getElementById('filter-workflow').value;
    const statusFilter = document.getElementById('filter-status').value;

    let filtered = executions;

    if (workflowFilter) {
        filtered = filtered.filter(e => e.workflowId === workflowFilter);
    }

    if (statusFilter) {
        filtered = filtered.filter(e => e.status === statusFilter);
    }

    renderAllExecutions(filtered);
}

// Render all executions table
function renderAllExecutions(executions) {
    const tbody = document.getElementById('all-executions-list');

    if (executions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No matching executions</td></tr>';
        return;
    }

    tbody.innerHTML = executions.map(exec => {
        const workflow = state.workflows[exec.workflowId];
        const workflowName = workflow?.name || exec.workflowId;
        const agentName = identifyAgent(exec.workflowId);

        return `
            <tr>
                <td>${agentName ? `<strong>${agentName}</strong>` : workflowName}</td>
                <td><code>${exec.id.substring(0, 8)}...</code></td>
                <td>${formatStatus(exec.status)}</td>
                <td>${formatDate(exec.startedAt)}</td>
                <td>${formatDuration(exec.startedAt, exec.stoppedAt)}</td>
                <td>${exec.mode || 'trigger'}</td>
            </tr>
        `;
    }).join('');
}

// Format status badge
function formatStatus(status) {
    const statusMap = {
        success: { class: 'success', text: 'Success' },
        error: { class: 'error', text: 'Error' },
        running: { class: 'running', text: 'Running' },
        waiting: { class: 'waiting', text: 'Waiting' }
    };

    const s = statusMap[status] || { class: '', text: status };
    return `<span class="status-badge ${s.class}">${s.text}</span>`;
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';

    // Less than 1 hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }

    // Format as date
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format duration
function formatDuration(start, end) {
    if (!start) return '--';
    if (!end) return 'Running...';

    const duration = new Date(end) - new Date(start);

    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;

    const mins = Math.floor(duration / 60000);
    const secs = Math.floor((duration % 60000) / 1000);
    return `${mins}m ${secs}s`;
}

// Global functions for onclick handlers
window.switchView = switchView;
window.viewAgent = viewAgent;
