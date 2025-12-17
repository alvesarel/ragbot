// Sofia Dashboard - Application Logic

let supabase = null;
let currentFilter = 'all';
let selectedConversation = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupNavigation();
    setupFilters();
    setupSearch();
    setupSettingsForm();
});

// Load saved settings
function loadSettings() {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');

    if (url && key) {
        document.getElementById('supabase-url').value = url;
        document.getElementById('supabase-key').value = key;
        connectToSupabase(url, key);
    }
}

// Connect to Supabase
async function connectToSupabase(url, key) {
    try {
        supabase = window.supabase.createClient(url, key);

        // Test connection
        const { data, error } = await supabase.rpc('get_dashboard_summary');

        if (error) throw error;

        showConnectionStatus('Conectado com sucesso!', 'success');
        refreshData();

        // Setup realtime subscription
        setupRealtime();

    } catch (error) {
        console.error('Connection error:', error);
        showConnectionStatus('Erro ao conectar: ' + error.message, 'error');
        supabase = null;
    }
}

// Setup realtime updates
function setupRealtime() {
    if (!supabase) return;

    supabase
        .channel('conversations')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'conversations' },
            () => refreshData()
        )
        .subscribe();
}

// Refresh all data
async function refreshData() {
    if (!supabase) return;

    updateLastUpdate();

    await Promise.all([
        loadSummary(),
        loadRecentConversations(),
        loadConversationsList(),
        loadAnalytics()
    ]);
}

// Load dashboard summary
async function loadSummary() {
    try {
        const { data, error } = await supabase.rpc('get_dashboard_summary');

        if (error) throw error;

        document.getElementById('stat-total').textContent = data.total_conversations || 0;
        document.getElementById('stat-active').textContent = data.active_conversations || 0;
        document.getElementById('stat-scheduled').textContent = data.scheduled_appointments || 0;
        document.getElementById('stat-handoff').textContent = data.awaiting_human || 0;
        document.getElementById('stat-messages-today').textContent = data.messages_today || 0;
        document.getElementById('stat-conv-today').textContent = data.conversations_today || 0;
        document.getElementById('stat-avg-msg').textContent = data.avg_messages_per_conversation || '--';

    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Load recent conversations for overview
async function loadRecentConversations() {
    try {
        const { data, error } = await supabase
            .from('recent_conversations')
            .select('*')
            .limit(10);

        if (error) throw error;

        const tbody = document.getElementById('recent-conversations');
        tbody.innerHTML = data.length ? data.map(conv => `
            <tr>
                <td>
                    <strong>${conv.name || conv.contact_name || 'Desconhecido'}</strong>
                    <br><small style="color: var(--text-muted)">${formatPhone(conv.phone_number)}</small>
                </td>
                <td><span class="badge badge-info">${formatStage(conv.current_stage)}</span></td>
                <td><span class="badge ${getStatusBadge(conv.status)}">${formatStatus(conv.status)}</span></td>
                <td>${conv.total_messages}</td>
                <td>${formatDate(conv.last_message_at)}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="loading">Nenhuma conversa</td></tr>';

    } catch (error) {
        console.error('Error loading recent conversations:', error);
    }
}

// Load conversations list
async function loadConversationsList() {
    try {
        let query = supabase
            .from('conversations')
            .select('*')
            .order('last_message_at', { ascending: false })
            .limit(100);

        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        const container = document.getElementById('conversations-list-items');
        container.innerHTML = data.length ? data.map(conv => `
            <div class="list-item ${selectedConversation === conv.phone_number ? 'active' : ''}"
                 onclick="selectConversation('${conv.phone_number}')">
                <div class="list-item-header">
                    <span class="list-item-name">${conv.collected_data?.name || conv.contact_name || 'Desconhecido'}</span>
                    <span class="list-item-time">${formatTimeAgo(conv.last_message_at)}</span>
                </div>
                <div class="list-item-phone">${formatPhone(conv.phone_number)}</div>
                <div class="list-item-meta">
                    <span class="badge badge-info">${formatStage(conv.current_stage)}</span>
                    <span class="badge ${getStatusBadge(conv.status)}">${formatStatus(conv.status)}</span>
                </div>
            </div>
        `).join('') : '<div class="loading">Nenhuma conversa</div>';

    } catch (error) {
        console.error('Error loading conversations list:', error);
    }
}

// Select and load conversation detail
async function selectConversation(phoneNumber) {
    selectedConversation = phoneNumber;
    loadConversationsList(); // Refresh to show active state

    try {
        const { data, error } = await supabase.rpc('get_conversation_details', {
            p_phone: phoneNumber
        });

        if (error) throw error;

        const conv = data.conversation;
        const messages = data.messages || [];

        const container = document.getElementById('conversation-detail');
        container.innerHTML = `
            <div class="detail-header">
                <div class="detail-info">
                    <h3>${conv.collected_data?.name || conv.contact_name || 'Desconhecido'}</h3>
                    <p>${formatPhone(conv.phone_number)}</p>
                </div>
                <span class="badge ${getStatusBadge(conv.status)}">${formatStatus(conv.status)}</span>
            </div>
            <div class="detail-body">
                <div class="detail-section">
                    <h4>Informacoes</h4>
                    <div class="data-grid">
                        <div class="data-item">
                            <div class="data-label">Estagio</div>
                            <div class="data-value">${formatStage(conv.current_stage)}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Mensagens</div>
                            <div class="data-value">${conv.total_messages}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Email</div>
                            <div class="data-value">${conv.collected_data?.email || '--'}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">CEP</div>
                            <div class="data-value">${conv.collected_data?.cep || '--'}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Origem</div>
                            <div class="data-value">${conv.collected_data?.referral_source || '--'}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Primeiro Contato</div>
                            <div class="data-value">${formatDate(conv.first_contact_at)}</div>
                        </div>
                    </div>
                </div>

                ${conv.handoff_reason ? `
                    <div class="detail-section">
                        <h4>Motivo do Handoff</h4>
                        <p style="color: var(--warning)">${conv.handoff_reason}</p>
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h4>Historico de Mensagens</h4>
                    <div class="messages-list">
                        ${messages.map(msg => `
                            <div class="message-item ${msg.direction}">
                                <div class="message-content">${msg.content}</div>
                                <div class="message-time">${formatDate(msg.created_at)}</div>
                            </div>
                        `).join('') || '<p style="color: var(--text-muted)">Nenhuma mensagem registrada</p>'}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading conversation detail:', error);
    }
}

// Load analytics data
async function loadAnalytics() {
    await Promise.all([
        loadConversionFunnel(),
        loadStageDistribution(),
        loadDailyMetrics()
    ]);
}

// Load conversion funnel
async function loadConversionFunnel() {
    try {
        const { data, error } = await supabase
            .from('conversion_funnel')
            .select('*')
            .limit(30);

        if (error) throw error;

        // Aggregate all data
        const totals = data.reduce((acc, row) => ({
            total: acc.total + (row.total || 0),
            engaged: acc.engaged + (row.engaged || 0),
            scheduled: acc.scheduled + (row.scheduled || 0),
            handoffs: acc.handoffs + (row.handoffs || 0)
        }), { total: 0, engaged: 0, scheduled: 0, handoffs: 0 });

        const maxValue = Math.max(totals.total, 1);

        const container = document.getElementById('conversion-funnel');
        container.innerHTML = `
            <div class="funnel-bar">
                <div class="funnel-bar-fill" style="height: ${(totals.total / maxValue) * 150}px"></div>
                <div class="funnel-bar-label">Total</div>
                <div class="funnel-bar-value">${totals.total}</div>
            </div>
            <div class="funnel-bar">
                <div class="funnel-bar-fill" style="height: ${(totals.engaged / maxValue) * 150}px; background: var(--info)"></div>
                <div class="funnel-bar-label">Engajados</div>
                <div class="funnel-bar-value">${totals.engaged}</div>
            </div>
            <div class="funnel-bar">
                <div class="funnel-bar-fill" style="height: ${(totals.scheduled / maxValue) * 150}px; background: var(--success)"></div>
                <div class="funnel-bar-label">Agendados</div>
                <div class="funnel-bar-value">${totals.scheduled}</div>
            </div>
            <div class="funnel-bar">
                <div class="funnel-bar-fill" style="height: ${(totals.handoffs / maxValue) * 150}px; background: var(--warning)"></div>
                <div class="funnel-bar-label">Handoffs</div>
                <div class="funnel-bar-value">${totals.handoffs}</div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading funnel:', error);
    }
}

// Load stage distribution
async function loadStageDistribution() {
    try {
        const { data, error } = await supabase
            .from('stage_distribution')
            .select('*');

        if (error) throw error;

        const container = document.getElementById('stage-distribution');
        container.innerHTML = data.length ? data.map(item => `
            <div class="stage-item">
                <div class="stage-name">${formatStage(item.current_stage)}</div>
                <div class="stage-count">${item.count}</div>
                <div class="stage-percent">${item.percentage}%</div>
            </div>
        `).join('') : '<div class="loading">Sem dados</div>';

    } catch (error) {
        console.error('Error loading stage distribution:', error);
    }
}

// Load daily metrics
async function loadDailyMetrics() {
    try {
        const { data, error } = await supabase
            .from('daily_metrics')
            .select('*')
            .limit(14);

        if (error) throw error;

        const tbody = document.getElementById('daily-metrics');
        tbody.innerHTML = data.length ? data.map(row => `
            <tr>
                <td>${formatDateShort(row.date)}</td>
                <td>${row.inbound || 0}</td>
                <td>${row.outbound || 0}</td>
                <td>${row.unique_users || 0}</td>
                <td>${row.avg_rag_chunks || 0}</td>
            </tr>
        `).join('') : '<tr><td colspan="5" class="loading">Sem dados</td></tr>';

    } catch (error) {
        console.error('Error loading daily metrics:', error);
    }
}

// Setup navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;

            // Update nav
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update views
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${view}`).classList.add('active');

            // Update title
            const titles = {
                overview: 'Visao Geral',
                conversations: 'Conversas',
                analytics: 'Metricas',
                settings: 'Configuracoes'
            };
            document.getElementById('page-title').textContent = titles[view];
        });
    });
}

// Setup filter tabs
function setupFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            loadConversationsList();
        });
    });
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    let debounceTimer;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = searchInput.value.trim();

            if (!query) {
                loadConversationsList();
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('conversations')
                    .select('*')
                    .or(`phone_number.ilike.%${query}%,contact_name.ilike.%${query}%`)
                    .order('last_message_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                const container = document.getElementById('conversations-list-items');
                container.innerHTML = data.length ? data.map(conv => `
                    <div class="list-item" onclick="selectConversation('${conv.phone_number}')">
                        <div class="list-item-header">
                            <span class="list-item-name">${conv.collected_data?.name || conv.contact_name || 'Desconhecido'}</span>
                            <span class="list-item-time">${formatTimeAgo(conv.last_message_at)}</span>
                        </div>
                        <div class="list-item-phone">${formatPhone(conv.phone_number)}</div>
                    </div>
                `).join('') : '<div class="loading">Nenhum resultado</div>';

            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });
}

// Setup settings form
function setupSettingsForm() {
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const url = document.getElementById('supabase-url').value.trim();
        const key = document.getElementById('supabase-key').value.trim();

        if (!url || !key) {
            showConnectionStatus('Preencha todos os campos', 'error');
            return;
        }

        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);

        await connectToSupabase(url, key);
    });
}

// Helper functions
function showConnectionStatus(message, type) {
    const status = document.getElementById('connection-status');
    status.textContent = message;
    status.className = 'connection-status ' + type;
}

function updateLastUpdate() {
    document.getElementById('last-update').textContent =
        `Ultima atualizacao: ${new Date().toLocaleTimeString('pt-BR')}`;
}

function formatPhone(phone) {
    if (!phone) return '--';
    // Format: +55 (11) 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
        return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
}

function formatDate(date) {
    if (!date) return '--';
    return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateShort(date) {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
    });
}

function formatTimeAgo(date) {
    if (!date) return '--';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
}

function formatStage(stage) {
    const stages = {
        greeting: 'Saudacao',
        discovery: 'Descoberta',
        qualification: 'Qualificacao',
        value_building: 'Valor',
        scheduling: 'Agendamento',
        confirmation: 'Confirmacao'
    };
    return stages[stage] || stage;
}

function formatStatus(status) {
    const statuses = {
        active: 'Ativo',
        awaiting_human: 'Handoff',
        scheduled: 'Agendado',
        completed: 'Concluido',
        cold: 'Frio'
    };
    return statuses[status] || status;
}

function getStatusBadge(status) {
    const badges = {
        active: 'badge-success',
        awaiting_human: 'badge-warning',
        scheduled: 'badge-info',
        completed: 'badge-neutral',
        cold: 'badge-danger'
    };
    return badges[status] || 'badge-neutral';
}

// Make functions available globally
window.refreshData = refreshData;
window.selectConversation = selectConversation;
