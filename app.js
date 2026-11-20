// ============================================================================
// 1. PERSISTÊNCIA NUVEM / BACKEND POSTGRESQL + AUTENTICAÇÃO POR TOKEN
// ============================================================================
const BACKEND_API_URL = 'https://grupo-mister-backend.onrender.com';

const STORAGE_KEYS = {
  PRODUCTS: 'gm_perfume_products_v5',
  CLIENTS: 'gm_perfume_clients_v5',
  SALES: 'gm_perfume_sales_v5',
  QUOTES: 'gm_perfume_quotes_v5',
  WARRANTIES: 'gm_perfume_warranties_v5',
  CASH_MOVES: 'gm_perfume_cash_v5',
  RATES: 'gm_perfume_rates_v5',
  RMA: 'gm_perfume_rma_v5',
  FINANCE: 'gm_perfume_fin_v5',
  SESSION_USER: 'gm_perfume_session_user_v5',
  SESSION_TOKEN: 'gm_perfume_session_token_v5'
};

let authToken = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || null;
let activeAccount = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_USER)) || null;
let serverUsersList = [];

function isCurrentUserAdmin() {
  return Boolean(activeAccount && (activeAccount.isAdmin === true || activeAccount.role === 'admin' || String(activeAccount.username || '').toLowerCase() === 'admin'));
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

const CloudSyncEngine = {
  async pullState(notifyNewNuvem = true) {
    if (!authToken || authToken === 'demo_token') return false;
    const pill = document.getElementById('cloudSyncPill');
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/state`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        logoutCurrentSession(false);
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.payload) {
          const p = data.payload;
          const prevSalesIds = new Set(sales.map(s => String(s.id)));

          if (Array.isArray(p.products)) products = p.products;
          if (Array.isArray(p.clients)) clients = p.clients;
          if (Array.isArray(p.sales)) sales = p.sales;
          if (Array.isArray(p.warranties)) warranties = p.warranties;
          if (Array.isArray(p.quotes)) quotes = p.quotes;
          if (Array.isArray(p.finEntries)) finEntries = p.finEntries;

          normalizeSalesArray();

          const newNuvemOrder = notifyNewNuvem
            ? sales.find(s => s.type === 'Online / Nuvemshop' && !prevSalesIds.has(String(s.id)) && s.orderStatus === 'Em Separação')
            : null;

          persistLocalOnly();
          renderAll();

          if (newNuvemOrder) {
            triggerNewShippingNotification(newNuvemOrder);
          }
        }
        if (pill) {
          pill.className = 'badge-tag badge-receita';
          pill.innerHTML = '<i class="ph ph-cloud-check"></i> PostgreSQL Sincronizado';
        }
        return true;
      }
    } catch (_) {
      if (pill) {
        pill.className = 'badge-tag badge-warning';
        pill.innerHTML = '<i class="ph ph-cloud-slash"></i> Modo Offline / Preview';
      }
    }
    return false;
  },

  async pushState(payload) {
    const pill = document.getElementById('cloudSyncPill');
    if (!authToken || authToken === 'demo_token') return false;
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/state/sync`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ updatedAt: new Date().toISOString(), payload })
      });
      if (res.ok && pill) {
        pill.className = 'badge-tag badge-receita';
        pill.innerHTML = '<i class="ph ph-cloud-check"></i> Nuvem Sincronizada';
        return true;
      }
    } catch (_) {
      if (pill) {
        pill.className = 'badge-tag badge-info';
        pill.innerHTML = '<i class="ph ph-hard-drives"></i> Modo Local (Pronto p/ Sync)';
      }
    }
    return false;
  }
};

// Polling automático a cada 15 segundos para capturar pedidos novos da Nuvemshop
setInterval(() => {
  if (authToken && authToken !== 'demo_token') {
    CloudSyncEngine.pullState(true);
  }
}, 15000);

// ============================================================================
// 2. DADOS INICIAIS
// ============================================================================
const DEFAULT_PRODUCTS = [
  { id: 'PRD-01', name: 'Lattafa Khamrah Eau de Parfum 100ml', imei: 'BATCH-KHM-26A', expiry: '2028-06-15', condition: 'Árabe', battery: 'EDP 100ml (Gourmand)', cost: 140.00, price: 249.90, qty: 12, nuvemId: '314890101', nuvemVarId: '994120101' },
  { id: 'PRD-02', name: 'Lattafa Asad Eau de Parfum 100ml', imei: 'BATCH-ASD-882C', expiry: '2028-04-10', condition: 'Árabe', battery: 'EDP 100ml (Ambarado)', cost: 120.00, price: 219.90, qty: 7, nuvemId: '314890102', nuvemVarId: '994120102' },
  { id: 'PRD-03', name: 'Baccarat Rouge 540 — MFK 70ml', imei: 'BATCH-BR540-LUX', expiry: '2027-12-20', condition: 'Nicho', battery: 'Extrait 70ml', cost: 1850.00, price: 2490.00, qty: 3, nuvemId: '314890103', nuvemVarId: '994120103' },
  { id: 'PRD-04', name: 'Creed Aventus Eau de Parfum 100ml', imei: 'BATCH-CRD-AV10', expiry: '2028-09-01', condition: 'Importado', battery: 'EDP 100ml', cost: 1600.00, price: 2190.00, qty: 2, nuvemId: '', nuvemVarId: '' },
  { id: 'PRD-05', name: 'Decant 10ml — Parfums de Marly Layton', imei: 'DEC-LAYTON-10', expiry: '2027-01-05', condition: 'Decant', battery: 'Decant Vidro 10ml', cost: 45.00, price: 99.90, qty: 25, nuvemId: '314890105', nuvemVarId: '994120105' },
  { id: 'PRD-06', name: 'Decant 5ml — Tom Ford Oud Wood', imei: 'DEC-TFOW-05', expiry: '2026-12-28', condition: 'Decant', battery: 'Decant Vidro 5ml', cost: 32.00, price: 69.90, qty: 20, nuvemId: '', nuvemVarId: '' },
  { id: 'PRD-07', name: 'Dior Sauvage Eau de Parfum 100ml', imei: 'BATCH-DSV-9011', expiry: '2028-03-15', condition: 'Importado', battery: 'EDP 100ml', cost: 580.00, price: 799.00, qty: 6, nuvemId: '314890107', nuvemVarId: '994120107' },
  { id: 'PRD-08', name: 'Decant 10ml — Baccarat Rouge 540 Extrait', imei: 'DEC-BR540EX-10', expiry: '2027-02-15', condition: 'Decant', battery: 'Decant Vidro 10ml', cost: 75.00, price: 149.90, qty: 30, nuvemId: '', nuvemVarId: '' }
];

const DEFAULT_CLIENTS = [
  { cod: 'CLI-001', name: 'MARCELO SOUZA', cpf: '384.910.228-40', phone: '(11) 98765-4321', category: 'VIP / Recorrente', notes: 'Colecionador de árabes e nichos' },
  { cod: 'CLI-002', name: 'JULIANA ALMEIDA', cpf: '291.445.882-19', phone: '(11) 99412-3308', category: 'Cliente Final', notes: 'Ama decants 10ml e gourmands' },
  { cod: 'CLI-003', name: 'RODRIGO CASTRO', cpf: '412.889.104-55', phone: '(11) 99123-7744', category: 'VIP / Recorrente', notes: 'Comprador de Creed e Tom Ford' }
];

const DEFAULT_SALES = [
  { id: '9054427', client: 'JULIANA ALMEIDA', phone: '(11) 99412-3308', seller: 'VENDEDOR', date: '15/10/2026 10:15', isoDate: '2026-10-15', type: 'Venda Presencial', shippingMethod: 'Motoboy', shippingNotes: 'Rua Barão de Jundiaí, 450 - Centro', trackingCode: 'MOTOBOY-JDI-01', orderStatus: 'Em Separação', observation: 'Enviar amostra extra de Khamrah', shippingPacked: false, payment: 'Pix', discount: 0, items: 'Decant 10ml — Parfums de Marly Layton (1x)', total: 99.90, status: 'Concluído' },
  { id: '9054490', client: 'MARCELO SOUZA', phone: '(11) 98765-4321', seller: 'ADMIN', date: '01/11/2026 16:40', isoDate: '2026-11-01', type: 'Venda Presencial', shippingMethod: 'Retirada na Loja', shippingNotes: '', trackingCode: '', orderStatus: 'Entregue', observation: '', shippingPacked: true, payment: 'Pix', discount: 0, items: 'Decant 5ml — Tom Ford Oud Wood (1x)', total: 69.90, status: 'Concluído' },
  { id: '9053818', client: 'RODRIGO CASTRO', phone: '(11) 99123-7744', seller: 'NUVEMSHOP', date: '18/11/2026 11:30', isoDate: '2026-11-18', type: 'Online / Nuvemshop', shippingMethod: 'Correios', shippingNotes: 'SEDEX — CEP 01310-100 São Paulo/SP', trackingCode: 'SX894120335BR', orderStatus: 'Em Separação', observation: 'Pedido loja online Nuvemshop', shippingPacked: false, payment: 'Cartão de Crédito', discount: 0, items: 'Creed Aventus Eau de Parfum 100ml (1x)', total: 2190.00, status: 'Concluído' }
];

const DEFAULT_WARRANTIES = [
  { cod: 'GAR-1001', saleId: '9054427', clientName: 'JULIANA ALMEIDA', clientPhone: '(11) 99412-3308', deviceModel: 'Decant 10ml — Parfums de Marly Layton', imei: 'DEC-LAYTON-10', term: 'GARANTIA DECANTS (30 DIAS)', startDate: '2026-10-15', days: 30, value: 99.90, invoiceNumber: 'NF-e 000.182' }
];

const DEFAULT_QUOTES = [
  { cod: 'ORC-501', date: '18/11/2026', validUntil: '21/11/2026', clientName: 'MARCELO SOUZA', clientPhone: '(11) 98765-4321', seller: 'ADMIN', items: [{ prodId: 'PRD-03', name: 'Baccarat Rouge 540 — MFK 70ml', qty: 1, price: 2490.00 }], tradeInVal: 100.00, netTotal: 2390.00, status: 'Aberto' }
];

const DEFAULT_RMA = [
  { cod: 'RMA-201', date: '17/11/2026', saleId: '9054427', clientName: 'JULIANA ALMEIDA', deviceName: 'Decant 5ml Oud Wood', type: 'Troca de Fragrância', stockAction: 'retornar_estoque', amount: 69.90, reason: 'Troca de nota olfativa', status: 'Concluído' }
];

const DEFAULT_FINANCE = [
  { cod: 'FIN-001', date: '2026-11-10', desc: 'Importação Lote Lattafa (Árabes)', category: 'Compra de Fragrâncias', type: 'Despesa', amount: 3200.00, status: 'Pago' },
  { cod: 'FIN-002', date: '2026-11-12', desc: 'Frascos Vidro 5ml/10ml & Etiquetas Térmicas', category: 'Embalagens & Insumos', type: 'Despesa', amount: 450.00, status: 'Pago' }
];

const DEFAULT_RATES = [0, 3.49, 4.99, 5.89, 6.79, 7.69, 8.59, 9.49, 10.39, 11.29, 12.19, 12.99, 13.89];

let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || DEFAULT_PRODUCTS;
let clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS)) || DEFAULT_CLIENTS;
let sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES)) || DEFAULT_SALES;
let warranties = JSON.parse(localStorage.getItem(STORAGE_KEYS.WARRANTIES)) || DEFAULT_WARRANTIES;
let quotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUOTES)) || DEFAULT_QUOTES;
let cashMoves = JSON.parse(localStorage.getItem(STORAGE_KEYS.CASH_MOVES)) || [];
let cardRates = JSON.parse(localStorage.getItem(STORAGE_KEYS.RATES)) || DEFAULT_RATES;
let rmaList = JSON.parse(localStorage.getItem(STORAGE_KEYS.RMA)) || DEFAULT_RMA;
let finEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINANCE)) || DEFAULT_FINANCE;

function normalizeSalesArray() {
  sales.forEach(s => {
    if (!s.orderStatus) s.orderStatus = s.shippingPacked ? 'Entregue' : 'Em Separação';
    if (typeof s.observation !== 'string') s.observation = '';
    if (typeof s.trackingCode !== 'string') s.trackingCode = '';
    if (!s.type) s.type = 'Venda Presencial';
  });
}
normalizeSalesArray();

let modalCart = [];
let quoteCart = [];
let thermalLabelQueue = [];
let parsedNuvemItems = [];
let salesViewMode = 'table';

function persistLocalOnly() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  localStorage.setItem(STORAGE_KEYS.WARRANTIES, JSON.stringify(warranties));
  localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
  localStorage.setItem(STORAGE_KEYS.CASH_MOVES, JSON.stringify(cashMoves));
  localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(cardRates));
  localStorage.setItem(STORAGE_KEYS.RMA, JSON.stringify(rmaList));
  localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(finEntries));
}

function saveAll() {
  persistLocalOnly();
  CloudSyncEngine.pushState({ products, clients, sales, warranties, quotes, finEntries });
}

const fmtBRL = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3400);
}

// ============================================================================
// ATALHO DE TESTE RÁPIDO (ADMIN vs VENDEDOR)
// ============================================================================
window.quickDemoLogin = function (roleType) {
  authToken = 'demo_token';
  if (roleType === 'admin') {
    activeAccount = {
      id: 1,
      username: 'admin',
      displayName: 'ADMINISTRADOR',
      isAdmin: true,
      permissions: ['dashboard', 'pdv', 'envios', 'clientes', 'historico_vendas', 'estoque', 'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias', 'trocas', 'financeiro', 'admin_only']
    };
  } else {
    activeAccount = {
      id: 2,
      username: 'vendedor',
      displayName: 'VENDEDOR LOJA',
      isAdmin: false,
      permissions: ['dashboard', 'pdv', 'envios', 'clientes', 'historico_vendas', 'estoque', 'ferramentas', 'garantias', 'trocas']
    };
  }
  localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, authToken);
  localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(activeAccount));
  document.getElementById('loginScreenOverlay')?.classList.remove('active');
  applyAccountVisibility(activeAccount);
  renderAll();
  showToast(`Logado como ${activeAccount.displayName}`);
};

// ============================================================================
// NOTIFICAÇÃO DE ENVIOS
// ============================================================================
function playShippingNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (_) {}
}

function triggerNewShippingNotification(sale) {
  if (!sale || !sale.shippingMethod || sale.shippingMethod === 'Retirada na Loja') return;
  playShippingNotificationSound();
  const banner = document.getElementById('newShippingAlertBanner');
  const titleEl = document.getElementById('shippingBannerTitle');
  const textEl = document.getElementById('shippingBannerText');
  const originLabel = sale.type === 'Online / Nuvemshop' ? ' [NUVEMSHOP]' : '';
  if (banner && titleEl && textEl) {
    titleEl.textContent = `Novo pedido #${sale.id}${originLabel} para envio via ${sale.shippingMethod.toUpperCase()}!`;
    textEl.textContent = `Cliente: ${sale.client} • Itens: ${sale.items}${sale.shippingNotes ? ' • Destino: ' + sale.shippingNotes : ''}`;
    banner.style.display = 'flex';
  }
  showToast(`🔔 Novo envio (${sale.shippingMethod})${originLabel} na fila de Separação!`);
}

window.dismissShippingBanner = function () {
  const banner = document.getElementById('newShippingAlertBanner');
  if (banner) banner.style.display = 'none';
};

// ============================================================================
// 3. AUTENTICAÇÃO & CONTROLE DE VISIBILIDADE POR PERFIL
// ============================================================================
function getAllowedPermissionsForAccount(account) {
  if (!account) return ['dashboard'];
  if (isCurrentUserAdmin()) {
    return [
      'dashboard', 'pdv', 'envios', 'clientes', 'historico_vendas', 'estoque',
      'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias',
      'trocas', 'financeiro', 'admin_only'
    ];
  }
  return (account.permissions || ['dashboard']).filter(p => p !== 'admin_only');
}

function logoutCurrentSession(showMsg = true) {
  activeAccount = null;
  authToken = null;
  localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
  localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  const overlay = document.getElementById('loginScreenOverlay');
  document.getElementById('loginUsernameInput').value = '';
  document.getElementById('loginPasswordInput').value = '';
  overlay?.classList.add('active');
  document.getElementById('loginUsernameInput')?.focus();
  if (showMsg) showToast('Logout realizado com sucesso.');
}

async function fetchServerUsers() {
  if (!authToken || authToken === 'demo_token' || !isCurrentUserAdmin()) return;
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/users`, { headers: getAuthHeaders() });
    if (res.ok) {
      serverUsersList = await res.json();
      renderAccountsTable();
    }
  } catch (_) {}
}

function initLoginByCredentials() {
  const overlay = document.getElementById('loginScreenOverlay');
  const form = document.getElementById('formLoginSystem');
  const btnSwitch = document.getElementById('btnSwitchUser');
  const btnLogout = document.getElementById('btnLogoutSystem');

  if (activeAccount && authToken) {
    overlay?.classList.remove('active');
    applyAccountVisibility(activeAccount);
    CloudSyncEngine.pullState(false).then(() => {
      renderAll();
      if (isCurrentUserAdmin()) fetchServerUsers();
    });
  } else {
    overlay?.classList.add('active');
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsernameInput').value.trim();
    const password = document.getElementById('loginPasswordInput').value;
    const btnSubmit = document.getElementById('btnSubmitLogin');

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="ph ph-spinner"></i> Autenticando no servidor...';
    }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Usuário ou senha inválidos.');
      } else {
        authToken = data.token;
        activeAccount = data.user;
        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, authToken);
        localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(activeAccount));

        document.getElementById('loginUsernameInput').value = '';
        document.getElementById('loginPasswordInput').value = '';
        overlay?.classList.remove('active');
        applyAccountVisibility(activeAccount);
        await CloudSyncEngine.pullState(false);
        if (isCurrentUserAdmin()) await fetchServerUsers();
        renderAll();
        showToast(`Bem-vindo(a), ${activeAccount.displayName || activeAccount.username}!`);
      }
    } catch (_) {
      showToast('Servidor offline ou acordando. Aguarde 15s e tente novamente.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="ph ph-sign-in"></i> Entrar no Sistema';
      }
    }
  });

  btnSwitch?.addEventListener('click', () => logoutCurrentSession(false));
  btnLogout?.addEventListener('click', () => logoutCurrentSession(true));

  document.getElementById('btnForceCloudSync')?.addEventListener('click', async () => {
    const ok = await CloudSyncEngine.pushState({ products, clients, sales, warranties, quotes, finEntries });
    showToast(ok ? 'Dados salvos no PostgreSQL!' : 'Salvo localmente (Modo Preview).');
  });

  document.getElementById('btnPullFromCloud')?.addEventListener('click', async () => {
    const ok = await CloudSyncEngine.pullState(true);
    showToast(ok ? 'Pedidos e estoque atualizados da Nuvem!' : 'Não foi possível conectar ao servidor.');
  });

  document.getElementById('formChangeOwnPassword')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('ownCurrentPassword').value;
    const newPassword = document.getElementById('ownNewPassword').value;
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/users/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Erro ao alterar senha.');
      e.target.reset();
      showToast('Senha atualizada com segurança no banco de dados!');
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    }
  });

  initAdminAccountCreation();
}

function applyAccountVisibility(account) {
  if (!account) return;
  const adminFlag = isCurrentUserAdmin();
  const nameEl = document.getElementById('loggedUserName');
  const roleEl = document.getElementById('loggedUserRole');
  if (nameEl) nameEl.textContent = account.displayName || account.username;
  if (roleEl) roleEl.textContent = adminFlag ? 'Administrador' : 'Vendedor / Estoque';

  const allowed = getAllowedPermissionsForAccount(account);

  document.querySelectorAll('#sidebarNavMenu [data-perm]').forEach(btn => {
    const reqPerm = btn.getAttribute('data-perm');
    btn.style.display = allowed.includes(reqPerm) ? 'flex' : 'none';
  });

  document.querySelectorAll('.admin-only-metric').forEach(el => {
    el.style.display = adminFlag ? '' : 'none';
  });
  document.querySelectorAll('.admin-only-col').forEach(el => {
    el.style.display = adminFlag ? '' : 'none';
  });

  const anySalesSubVisible = Array.from(document.querySelectorAll('.submenu [data-perm]')).some(
    sub => sub.style.display !== 'none'
  );
  const dropdown = document.querySelector('.nav-dropdown');
  if (dropdown) {
    dropdown.style.display = anySalesSubVisible ? 'flex' : 'none';
  }

  ['modalSellerSelect', 'fastPdvSeller', 'quoteSellerSelect'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) inp.value = (account.displayName || account.username).toUpperCase();
  });

  navigateToSection('dashboard', 'Dashboard');
}

function initAdminAccountCreation() {
  const form = document.getElementById('formCreateLoginAccount');
  const btnClear = document.getElementById('btnCancelEditAccount');

  btnClear?.addEventListener('click', () => {
    form?.reset();
    document.getElementById('editAccountId').value = '';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode criar ou editar logins.');

    const editId = document.getElementById('editAccountId').value;
    const username = document.getElementById('accUsernameInput').value.trim();
    const password = document.getElementById('accPasswordInput').value;
    const displayName = document.getElementById('accDisplayNameInput').value.trim() || username;
    const isAdmin = document.getElementById('accRoleTypeInput').value === 'admin';

    if (!editId && !password) return showToast('Defina uma senha para o novo usuário.');

    const checkedPerms = Array.from(document.querySelectorAll('.acc-perm-chk:checked')).map(c => c.value);
    const permissions = isAdmin
      ? ['dashboard', 'pdv', 'envios', 'clientes', 'historico_vendas', 'estoque', 'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias', 'trocas', 'financeiro', 'admin_only']
      : checkedPerms.filter(p => p !== 'admin_only');

    try {
      const url = editId ? `${BACKEND_API_URL}/api/users/${editId}` : `${BACKEND_API_URL}/api/users`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, password, displayName, isAdmin, permissions })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Erro ao salvar usuário.');

      showToast(editId ? 'Usuário atualizado no PostgreSQL!' : 'Novo login criado com segurança!');
      form.reset();
      document.getElementById('editAccountId').value = '';
      await fetchServerUsers();
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    }
  });
}

function renderAccountsTable() {
  const tbody = document.getElementById('tableAccountsList');
  if (!tbody) return;
  if (!serverUsersList || serverUsersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Conectado ao servidor PostgreSQL em produção.</td></tr>';
    return;
  }
  tbody.innerHTML = serverUsersList.map(acc => `
    <tr>
      <td><strong>${acc.username}</strong></td>
      <td>${acc.displayName}</td>
      <td>${acc.isAdmin ? '<span class="badge-tag badge-warning">Administrador</span>' : '<span class="badge-tag badge-info">Usuário</span>'}</td>
      <td>${(acc.permissions || []).filter(p => p !== 'admin_only').map(p => `<span class="badge-tag badge-info">${p.toUpperCase()}</span>`).join(' ')}</td>
      <td style="display:flex; gap:0.35rem;">
        <button type="button" class="btn-sm btn-blue" onclick="editLoginAccount(${acc.id})">Editar</button>
        ${acc.username.toLowerCase() !== 'admin' ? `<button type="button" class="btn-sm btn-danger" onclick="removeLoginAccount(${acc.id})">Excluir</button>` : ''}
      </td>
    </tr>
  `).join('');
}

window.editLoginAccount = function (id) {
  if (!isCurrentUserAdmin()) return;
  const acc = serverUsersList.find(a => a.id === id);
  if (!acc) return;
  document.getElementById('editAccountId').value = acc.id;
  document.getElementById('accUsernameInput').value = acc.username;
  document.getElementById('accPasswordInput').value = '';
  document.getElementById('accDisplayNameInput').value = acc.displayName;
  document.getElementById('accRoleTypeInput').value = acc.isAdmin ? 'admin' : 'user';
  document.querySelectorAll('.acc-perm-chk').forEach(chk => {
    chk.checked = (acc.permissions || []).includes(chk.value);
  });
};

window.removeLoginAccount = async function (id) {
  if (!isCurrentUserAdmin()) return;
  if (!confirm('Deseja realmente excluir este usuário?')) return;
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast('Usuário removido.');
      await fetchServerUsers();
    }
  } catch (_) {}
};

// ============================================================================
// 4. INICIALIZAÇÃO GERAL
// ============================================================================
function startApp() {
  initLoginByCredentials();
  initNavigation();
  initSalesAndPdv();
  initEditSaleModule();
  initOrderObsModule();
  initOrderTrackingModule();
  initShipmentsModule();
  initNuvemshopImportModule();
  initThermalLabelsModule();
  initQuotesModule();
  initWarrantiesAndFiscalModule();
  initSimulators();
  initClientsModule();
  initStockModule();
  initRmaModule();
  initFinanceModule();
  initCashAndTools();
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

function renderAll() {
  renderDashboard();
  renderShipments();
  renderSales();
  renderQuickStock();
  renderRecompraAndBatches();
  renderQuotes();
  renderWarranties();
  renderClients();
  renderStock();
  renderRma();
  renderFinance();
  renderAccountsTable();
  populateSelectDropdowns();
  updateTaxSimulator();
  updateUpgradeSimulator();
}

// ============================================================================
// 5. NAVEGAÇÃO SPA
// ============================================================================
window.navigateToSection = function (targetId, labelText) {
  document.querySelectorAll('.nav-item, .submenu-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

  const activeBtn = document.querySelector(`.nav-item[data-target="${targetId}"], .submenu-item[data-target="${targetId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const targetSection = document.getElementById(targetId);
  if (targetSection) targetSection.classList.add('active');

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle && labelText) pageTitle.textContent = labelText;

  if (targetId === 'estoque') renderStock();
};

function initNavigation() {
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggle.closest('.nav-dropdown')?.classList.toggle('open');
    });
  });

  document.querySelectorAll('.nav-item[data-target], .submenu-item[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const span = btn.querySelector('span');
      navigateToSection(targetId, span ? span.textContent : 'GRUPO MISTER');
    });
  });

  const sidebarSearchInput = document.getElementById('sidebarMenuSearch');
  sidebarSearchInput?.addEventListener('input', () => {
    const q = sidebarSearchInput.value.toLowerCase().trim();
    const dropdown = document.querySelector('.nav-dropdown');
    if (q && dropdown) dropdown.classList.add('open');
    const allowed = getAllowedPermissionsForAccount(activeAccount);

    document.querySelectorAll('#sidebarNavMenu .nav-item[data-target], #sidebarNavMenu .submenu-item').forEach(btn => {
      const reqPerm = btn.getAttribute('data-perm');
      if (!allowed.includes(reqPerm)) {
        btn.style.display = 'none';
        return;
      }
      const text = btn.textContent.toLowerCase();
      btn.style.display = text.includes(q) ? 'flex' : 'none';
    });
  });
}

// ============================================================================
// STATUS, OBSERVAÇÃO & RASTREIO (HISTÓRICO DE VENDAS + ENVIOS)
// ============================================================================
function getOrderStatusClass(status) {
  switch (status) {
    case 'Separado': return 'st-separado';
    case 'Enviado': return 'st-enviado';
    case 'Entregue': return 'st-entregue';
    default: return 'st-separacao';
  }
}

window.updateSaleOrderStatus = function (saleId, newStatus) {
  const sale = sales.find(s => String(s.id) === String(saleId));
  if (!sale) return;
  sale.orderStatus = newStatus;
  sale.shippingPacked = (newStatus !== 'Em Separação');
  saveAll();
  renderAll();
  showToast(`Pedido #${sale.id} atualizado para "${newStatus}".`);
};

function initOrderObsModule() {
  const overlay = document.getElementById('orderObsModalOverlay');
  document.getElementById('btnCloseObsModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelObsModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  document.getElementById('formOrderObs')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const saleId = document.getElementById('obsSaleId').value;
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;
    sale.observation = document.getElementById('obsSaleTextarea').value.trim();
    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast(`Observação salva no pedido #${sale.id}!`);
  });
}

window.openOrderObsModal = function (saleId) {
  const sale = sales.find(s => String(s.id) === String(saleId));
  if (!sale) return;
  document.getElementById('obsSaleHeaderId').textContent = sale.id;
  document.getElementById('obsSaleId').value = sale.id;
  document.getElementById('obsSaleTextarea').value = sale.observation || '';
  document.getElementById('orderObsModalOverlay').classList.add('active');
};

function initOrderTrackingModule() {
  const overlay = document.getElementById('trackingModalOverlay');
  document.getElementById('btnCloseTrackingModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelTrackingModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  document.getElementById('formOrderTracking')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const saleId = document.getElementById('trackingSaleId').value;
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;
    sale.trackingCode = document.getElementById('trackingCodeInput').value.trim().toUpperCase();
    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast(`Rastreio salvo no pedido #${sale.id}!`);
  });
}

window.openOrderTrackingModal = function (saleId) {
  const sale = sales.find(s => String(s.id) === String(saleId));
  if (!sale) return;
  document.getElementById('trackingSaleHeaderId').textContent = sale.id;
  document.getElementById('trackingSaleId').value = sale.id;
  document.getElementById('trackingCodeInput').value = sale.trackingCode || '';
  document.getElementById('trackingModalOverlay').classList.add('active');
};

// ============================================================================
// MÓDULO DE ENVIOS & SEPARAÇÃO (INCLUI PEDIDOS NUVEMSHOP)
// ============================================================================
function initShipmentsModule() {
  ['shippingSearchInput', 'shippingMethodFilter', 'shippingStatusFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderShipments);
    document.getElementById(id)?.addEventListener('change', renderShipments);
  });
}

function renderShipments() {
  const shippingOrders = sales.filter(s => s.shippingMethod === 'Motoboy' || s.shippingMethod === 'Correios');
  const pendingOrders = shippingOrders.filter(s => (s.orderStatus || 'Em Separação') === 'Em Separação');
  const pendingMotoboy = pendingOrders.filter(s => s.shippingMethod === 'Motoboy').length;
  const pendingCorreios = pendingOrders.filter(s => s.shippingMethod === 'Correios').length;
  const doneOrders = shippingOrders.filter(s => (s.orderStatus || 'Em Separação') !== 'Em Separação').length;

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('shipMetricPending', pendingOrders.length);
  setTxt('shipMetricMotoboy', pendingMotoboy);
  setTxt('shipMetricCorreios', pendingCorreios);
  setTxt('shipMetricDone', doneOrders);
  setTxt('dashPendingShipments', `${pendingOrders.length} pedido(s)`);

  const sideBadge = document.getElementById('sidebarEnviosBadge');
  const topBtn = document.getElementById('btnTopbarShippingAlert');
  const topCount = document.getElementById('topbarShippingCount');
  const allowed = getAllowedPermissionsForAccount(activeAccount);

  if (sideBadge) {
    sideBadge.textContent = pendingOrders.length;
    sideBadge.style.display = pendingOrders.length > 0 ? 'inline-block' : 'none';
  }
  if (topBtn && topCount) {
    topCount.textContent = pendingOrders.length;
    topBtn.style.display = (pendingOrders.length > 0 && allowed.includes('envios')) ? 'inline-flex' : 'none';
  }

  const term = (document.getElementById('shippingSearchInput')?.value || '').toLowerCase();
  const methodFilter = document.getElementById('shippingMethodFilter')?.value || 'todos';
  const statusFilter = document.getElementById('shippingStatusFilter')?.value || 'pendentes';

  const filtered = shippingOrders.filter(s => {
    const st = s.orderStatus || 'Em Separação';
    const matchTerm = String(s.id).includes(term) || (s.client || '').toLowerCase().includes(term) || (s.items || '').toLowerCase().includes(term) || (s.trackingCode || '').toLowerCase().includes(term);
    const matchMethod = methodFilter === 'todos' || s.shippingMethod === methodFilter;
    const matchStatus = statusFilter === 'todos'
      || (statusFilter === 'pendentes' && st === 'Em Separação')
      || (statusFilter === 'separados' && st !== 'Em Separação');
    return matchTerm && matchMethod && matchStatus;
  });

  const tbody = document.getElementById('tableShipmentsList');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:1.25rem;">Nenhum pedido de envio encontrado para este filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const st = s.orderStatus || 'Em Separação';
    const methodBadge = s.shippingMethod === 'Motoboy'
      ? `<span class="badge-tag badge-motoboy"><i class="ph ph-moped"></i> Motoboy</span>`
      : `<span class="badge-tag badge-correios"><i class="ph ph-package"></i> Correios</span>`;
    const channelBadge = s.type === 'Online / Nuvemshop'
      ? `<span class="badge-tag badge-nuvem">Nuvemshop</span>`
      : `<span class="badge-tag badge-info">Loja Física</span>`;
    const hasTrack = Boolean(s.trackingCode && s.trackingCode.trim().length > 0);

    return `
      <tr>
        <td>
          <select class="status-inline-select ${getOrderStatusClass(st)}" onchange="updateSaleOrderStatus('${s.id}', this.value)">
            <option value="Em Separação" ${st === 'Em Separação' ? 'selected' : ''}>Em Separação</option>
            <option value="Separado" ${st === 'Separado' ? 'selected' : ''}>Separado</option>
            <option value="Enviado" ${st === 'Enviado' ? 'selected' : ''}>Enviado</option>
            <option value="Entregue" ${st === 'Entregue' ? 'selected' : ''}>Entregue</option>
          </select>
        </td>
        <td><strong>#${s.id}</strong></td>
        <td>${channelBadge}</td>
        <td>${s.date}</td>
        <td>${methodBadge}</td>
        <td>
          <strong>${s.client}</strong>
          ${s.shippingNotes ? `<div style="font-size:0.74rem; color:var(--text-muted);">${s.shippingNotes}</div>` : ''}
          ${s.observation ? `<div style="font-size:0.72rem; color:#fbbf24; margin-top:2px;"><i class="ph ph-note"></i> ${s.observation}</div>` : ''}
        </td>
        <td>
          <button type="button" class="btn-sm ${hasTrack ? 'btn-green' : ''}" onclick="openOrderTrackingModal('${s.id}')">
            <i class="ph ph-barcode"></i> ${hasTrack ? `<code>${s.trackingCode}</code>` : '+ Rastreio'}
          </button>
        </td>
        <td><strong>${s.items}</strong></td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// IMPORTADOR NUVEMSHOP (CSV / PDF)
// ============================================================================
function initNuvemshopImportModule() {
  const overlay = document.getElementById('nuvemImportModalOverlay');
  const fileInput = document.getElementById('nuvemImportFileInput');
  const btnConfirm = document.getElementById('btnConfirmNuvemImport');

  document.getElementById('btnOpenNuvemImportModal')?.addEventListener('click', () => {
    parsedNuvemItems = [];
    if (fileInput) fileInput.value = '';
    document.getElementById('nuvemImportPreviewBox').style.display = 'none';
    if (btnConfirm) btnConfirm.disabled = true;
    overlay.classList.add('active');
  });

  document.getElementById('btnCloseNuvemImport')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelNuvemImport')?.addEventListener('click', () => overlay.classList.remove('active'));

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      parsedNuvemItems = parseNuvemshopCsv(text);
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      parsedNuvemItems = await parseNuvemshopPdf(file);
    } else {
      return showToast('Formato não suportado. Use .CSV ou .PDF.');
    }

    const previewBox = document.getElementById('nuvemImportPreviewBox');
    const previewTbody = document.getElementById('nuvemImportPreviewTable');
    const countLabel = document.getElementById('nuvemImportCountLabel');

    previewBox.style.display = 'block';
    countLabel.textContent = `${parsedNuvemItems.length} item(ns) identificado(s)`;
    btnConfirm.disabled = parsedNuvemItems.length === 0;

    previewTbody.innerHTML = parsedNuvemItems.slice(0, 50).map(item => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td><code>${item.imei || '-'}</code></td>
        <td>${fmtBRL(item.price)}</td>
        <td>${item.qty} un.</td>
      </tr>
    `).join('');
  });

  btnConfirm?.addEventListener('click', () => {
    if (parsedNuvemItems.length === 0) return;
    const defaultCat = document.getElementById('nuvemImportDefaultCat').value;

    parsedNuvemItems.forEach(item => {
      const existing = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        existing.qty = item.qty;
        existing.price = item.price || existing.price;
        if (item.cost) existing.cost = item.cost;
      } else {
        const isDecant = item.name.toLowerCase().includes('decant');
        products.unshift({
          id: 'PRD-' + String(products.length + 1).padStart(2, '0'),
          name: item.name,
          imei: item.imei || ('NUV-' + Math.floor(1000 + Math.random() * 9000)),
          expiry: '',
          condition: isDecant ? 'Decant' : defaultCat,
          battery: isDecant ? 'Decant' : 'Frasco',
          cost: item.cost || Number((item.price * 0.55).toFixed(2)),
          price: item.price || 0,
          qty: item.qty || 1,
          nuvemId: '',
          nuvemVarId: ''
        });
      }
    });

    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast(`${parsedNuvemItems.length} produto(s) importados da Nuvemshop!`);
  });
}

function parseNuvemshopCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const idxName = headers.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('produto'));
  const idxPrice = headers.findIndex(h => h === 'preço' || h === 'preco' || h.includes('preço') || h.includes('price'));
  const idxCost = headers.findIndex(h => h.includes('custo') || h.includes('cost'));
  const idxStock = headers.findIndex(h => h.includes('estoque') || h.includes('stock') || h.includes('quantidade'));
  const idxSku = headers.findIndex(h => h.includes('sku') || h.includes('código') || h.includes('codigo'));

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/^"|"$/g, '').trim());
    const name = idxName >= 0 ? cols[idxName] : cols[0];
    if (!name) continue;
    const rawPrice = idxPrice >= 0 ? cols[idxPrice] : '0';
    const rawCost = idxCost >= 0 ? cols[idxCost] : '0';
    const rawQty = idxStock >= 0 ? cols[idxStock] : '1';
    const sku = idxSku >= 0 ? cols[idxSku] : '';

    const price = parseFloat(String(rawPrice).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const cost = parseFloat(String(rawCost).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const qty = parseInt(String(rawQty).replace(/\D/g, ''), 10) || 0;

    items.push({ name, price, cost, qty, imei: sku });
  }
  return items;
}

async function parseNuvemshopPdf(file) {
  try {
    if (!window.pdfjsLib) return [];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      fullText += content.items.map(it => it.str).join(' ') + '\n';
    }
    const items = [];
    const regex = /([A-Za-zÀ-ÿ0-9\s\-—\(\)\/]+?)\s+R\$\s*([\d.,]+)\s+(\d+)\s*(?:un|unid|estoque)?/gi;
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const name = match[1].trim();
      const price = parseFloat(match[2].replace(/\./g, '').replace(',', '.')) || 0;
      const qty = parseInt(match[3], 10) || 1;
      if (name.length > 3 && price > 0) {
        items.push({ name, price, cost: 0, qty, imei: '' });
      }
    }
    return items;
  } catch (_) {
    return [];
  }
}

// ============================================================================
// 6. ETIQUETAS TÉRMICAS 50x30mm
// ============================================================================
function initThermalLabelsModule() {
  const expInput = document.getElementById('labelExpiryDate');
  if (expInput) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expInput.value = nextYear.toISOString().split('T')[0];
  }

  document.getElementById('btnAddLabelToQueue')?.addEventListener('click', () => {
    const prod = products.find(p => p.id === document.getElementById('labelProductSelect').value);
    if (!prod) return showToast('Selecione uma fragrância!');
    const vol = document.getElementById('labelVolumeSelect').value;
    const expiry = document.getElementById('labelExpiryDate').value;
    const note = document.getElementById('labelOlfactoryNote').value.trim() || prod.condition;
    const qty = Math.min(100, Math.max(1, parseInt(document.getElementById('labelPrintQty').value, 10) || 1));

    for (let i = 0; i < qty; i++) {
      thermalLabelQueue.push({
        code: prod.imei || prod.id,
        name: prod.name,
        volume: vol,
        note,
        expiry: expiry ? new Date(expiry + 'T00:00:00').toLocaleDateString('pt-BR') : '12 meses',
        price: fmtBRL(prod.price)
      });
    }
    renderThermalLabelQueue();
    showToast(`${qty} etiqueta(s) na fila 50×30mm!`);
  });

  document.getElementById('btnAddAllDecantsToQueue')?.addEventListener('click', () => {
    const decants = products.filter(p => p.condition === 'Decant');
    decants.forEach(d => {
      thermalLabelQueue.push({
        code: d.imei || d.id,
        name: d.name,
        volume: d.battery || 'Decant 10ml',
        note: 'Decant Original Fracionado',
        expiry: d.expiry ? new Date(d.expiry + 'T00:00:00').toLocaleDateString('pt-BR') : '12 meses',
        price: fmtBRL(d.price)
      });
    });
    renderThermalLabelQueue();
  });

  document.getElementById('btnClearLabelQueue')?.addEventListener('click', () => { thermalLabelQueue = []; renderThermalLabelQueue(); });
  document.getElementById('btnPrintThermalLabels')?.addEventListener('click', () => {
    if (thermalLabelQueue.length === 0) return showToast('Fila de etiquetas vazia!');
    window.print();
  });
}

function renderThermalLabelQueue() {
  const container = document.getElementById('thermalLabelsPreviewArea');
  if (!container) return;
  if (thermalLabelQueue.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:1.5rem;">Fila vazia. Adicione fragrâncias acima.</div>`;
    return;
  }
  container.innerHTML = thermalLabelQueue.map(lbl => `
    <div class="thermal-label-card">
      <div class="thermal-label-header"><span>GRUPO MISTER</span><span>${lbl.volume}</span></div>
      <div class="thermal-label-title">${lbl.name}</div>
      <div class="thermal-label-sub">${lbl.note} • Val: ${lbl.expiry}</div>
      <div class="thermal-barcode">*${lbl.code}*</div>
      <div class="thermal-label-footer"><span>${lbl.code}</span><span>${lbl.price}</span></div>
    </div>
  `).join('');
}

// ============================================================================
// 7. RECOMPRA & VALIDADES
// ============================================================================
function computeRecompraAlerts() {
  const today = new Date();
  const alerts = [];
  sales.forEach(s => {
    const itemsStr = (s.items || '').toLowerCase();
    let estDays = 90;
    let suggestion = 'Oferecer segundo frasco ou decant de viagem';
    if (itemsStr.includes('5ml')) { estDays = 18; suggestion = 'Upgrade p/ Decant 10ml ou Frasco Lacrado'; }
    else if (itemsStr.includes('10ml') || itemsStr.includes('decant')) { estDays = 30; suggestion = 'Reposição Decant 10ml ou Frasco 100ml c/ 10% OFF'; }

    const saleDate = s.isoDate ? new Date(s.isoDate + 'T00:00:00') : today;
    const elapsed = Math.floor((today - saleDate) / (1000 * 60 * 60 * 24));
    const remaining = estDays - elapsed;

    if (remaining <= 7 && s.client !== 'CONSUMIDOR BALCÃO') {
      alerts.push({
        client: s.client,
        phone: s.phone || clients.find(c => c.name === s.client)?.phone || '',
        items: s.items,
        date: s.date.split(' ')[0],
        elapsed,
        remaining,
        suggestion,
        estValue: s.total
      });
    }
  });
  return alerts;
}

function renderRecompraAndBatches() {
  const alerts = computeRecompraAlerts();
  const today = new Date();
  let expiringLots = 0;

  const batchTbody = document.getElementById('tableBatchExpiry');
  if (batchTbody) {
    batchTbody.innerHTML = products.map(p => {
      const expDate = p.expiry ? new Date(p.expiry + 'T00:00:00') : null;
      const daysLeft = expDate ? Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)) : 365;
      if (daysLeft <= 60) expiringLots++;
      const badge = daysLeft < 0 ? `<span class="badge-tag badge-despesa">Vencido</span>` : daysLeft <= 60 ? `<span class="badge-tag badge-warning">Vence em ${daysLeft}d</span>` : `<span class="badge-tag badge-receita">Válido (${daysLeft}d)</span>`;
      return `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td><code>${p.imei || '-'}</code></td><td>${expDate ? expDate.toLocaleDateString('pt-BR') : '-'}</td><td>${badge}</td><td><strong>${p.qty} un.</strong></td></tr>`;
    }).join('');
  }

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('dashRecompraCount', `${alerts.length} cliente(s)`);
  setTxt('recMetricDue', alerts.length);
  setTxt('recMetricExpiringLots', expiringLots);
  setTxt('recMetricPotential', fmtBRL(alerts.reduce((acc, a) => acc + Number(a.estValue || 0), 0)));

  const tbody = document.getElementById('tableRecompraAlerts');
  if (tbody) {
    tbody.innerHTML = alerts.map(a => {
      const statusLabel = a.remaining <= 0 ? `<span class="badge-tag badge-despesa">Provavelmente acabou (${a.elapsed}d)</span>` : `<span class="badge-tag badge-warning">Acaba em ~${a.remaining}d</span>`;
      const msg = `Olá *${a.client}*! Tudo bem? Aqui é da *GRUPO MISTER Perfumaria*. Notamos que seu *${a.items}* já deve estar no finalzinho! Preparamos uma condição especial para você repor ou garantir o frasco lacrado.`;
      const digits = (a.phone || '').replace(/\D/g, '');
      const waHref = digits ? `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}` : '#';
      return `<tr><td><strong>${a.client}</strong></td><td>${a.items}</td><td>${a.date}</td><td>${statusLabel}</td><td><span class="badge-tag badge-info">${a.suggestion}</span></td><td><a href="${waHref}" target="_blank" class="btn-sm btn-green" style="text-decoration:none;"><i class="ph ph-whatsapp-logo"></i> Cobrar Recompra</a></td></tr>`;
    }).join('');
  }
}

// ============================================================================
// 8. DASHBOARD, PDV & EDIÇÃO DE VENDA
// ============================================================================
function renderDashboard() {
  const adminFlag = isCurrentUserAdmin();
  const totalVendas = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalQty = sales.length;
  const ticketMedio = totalQty > 0 ? totalVendas / totalQty : 0;

  const vendasPresenciais = sales.filter(s => s.type !== 'Online / Nuvemshop');
  const vendasOnline = sales.filter(s => s.type === 'Online / Nuvemshop');
  const totalPresencialVal = vendasPresenciais.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const totalOnlineVal = vendasOnline.reduce((acc, s) => acc + Number(s.total || 0), 0);

  const sharePresencial = totalVendas > 0 ? Number(((totalPresencialVal / totalVendas) * 100).toFixed(1)) : 0;
  const shareOnline = totalVendas > 0 ? Number(((totalOnlineVal / totalVendas) * 100).toFixed(1)) : 0;

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setText('dashReceita', adminFlag ? fmtBRL(totalVendas) : 'Restrito');
  setText('dashTotalQty', `${totalQty} pedido(s)`);
  setText('dashTicketMedio', adminFlag ? fmtBRL(ticketMedio) : 'Restrito');
  setText('dashPresencialCount', `${vendasPresenciais.length} pedidos`);
  setText('dashOnlineCount', `${vendasOnline.length} pedidos`);

  const barPres = document.getElementById('chartBarPresencial');
  const barOnl = document.getElementById('chartBarOnline');
  if (barPres) barPres.style.width = `${sharePresencial}%`;
  if (barOnl) barOnl.style.width = `${shareOnline}%`;
  setText('chartBarPresencialLabel', `${fmtBRL(totalPresencialVal)} (${sharePresencial}%)`);
  setText('chartBarOnlineLabel', `${fmtBRL(totalOnlineVal)} (${shareOnline}%)`);

  const tbody = document.getElementById('dashTableSales');
  if (tbody) {
    tbody.innerHTML = sales.slice(0, 6).map(s => {
      const shipLabel = s.shippingMethod || 'Retirada na Loja';
      const shipBadge = shipLabel === 'Motoboy'
        ? `<span class="badge-tag badge-motoboy">Motoboy</span>`
        : shipLabel === 'Correios'
        ? `<span class="badge-tag badge-correios">Correios</span>`
        : `<span class="badge-tag badge-info">Loja</span>`;
      const channelBadge = s.type === 'Online / Nuvemshop'
        ? `<span class="badge-tag badge-nuvem">Nuvemshop</span>`
        : `<span class="badge-tag badge-info">Loja</span>`;
      const st = s.orderStatus || 'Em Separação';

      return `
        <tr>
          <td>${s.date}</td>
          <td><strong>#${s.id}</strong></td>
          <td>${channelBadge}</td>
          <td>${s.items || 'Venda PDV'}</td>
          <td>${shipBadge}</td>
          <td><span class="badge-tag badge-warning">${st}</span></td>
          <td><span class="badge-tag badge-info">${s.payment || 'Pix'}</span></td>
          ${adminFlag ? `<td><strong>${fmtBRL(s.total)}</strong></td>` : ''}
        </tr>
      `;
    }).join('');
  }
}

async function pushStockToNuvemshop(product) {
  if (!product || !product.nuvemId || !product.nuvemVarId || !authToken || authToken === 'demo_token') return false;
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/nuvemshop/sync-stock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productId: product.nuvemId, variantId: product.nuvemVarId, newQty: product.qty })
    });
    return res.ok;
  } catch (_) { return false; }
}

function populateSelectDropdowns() {
  const clientOptions = `<option value="">Consumidor Balcão / Avulso</option>` + clients.map(c => `<option value="${c.cod}">${c.name} (${c.cpf})</option>`).join('');
  const modalClientSel = document.getElementById('modalClientSelect');
  if (modalClientSel) modalClientSel.innerHTML = clientOptions;

  const availableProducts = products.filter(p => p.qty > 0);
  const prodOptions = `<option value="">Selecionar fragrância...</option>` + availableProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} — ${fmtBRL(p.price)} (${p.qty} un.)</option>`).join('');
  ['modalProductSelect', 'quoteProductSelect', 'upgTargetStockSelect'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = prodOptions; });

  const labelSel = document.getElementById('labelProductSelect');
  if (labelSel) labelSel.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (${p.imei || p.id})</option>`).join('');

  const fastSel = document.getElementById('fastPdvItemSelect');
  if (fastSel) fastSel.innerHTML = `<option value="">Selecionar item...</option>` + availableProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (${fmtBRL(p.price)})</option>`).join('') + `<option value="CUSTOM">+ Item Avulso</option>`;

  const salesOptions = `<option value="">Avulso / Sem vínculo</option>` + sales.map(s => `<option value="${s.id}">#${s.id} — ${s.client} (${s.items})</option>`).join('');
  ['warSaleSelect', 'rmaSaleSelect'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = salesOptions; });
}

function updateFastPdvTotal() {
  const qty = parseInt(document.getElementById('fastPdvQty')?.value, 10) || 1;
  const price = parseFloat(document.getElementById('fastPdvPrice')?.value) || 0;
  const discount = parseFloat(document.getElementById('fastPdvDiscount')?.value) || 0;
  const total = Math.max(0, qty * price - discount);
  const el = document.getElementById('fastPdvTotalDisplay');
  if (el) el.textContent = fmtBRL(total);
}

function initSalesAndPdv() {
  const pdvOverlay = document.getElementById('pdvModalOverlay');
  document.getElementById('btnOpenPdvModal')?.addEventListener('click', () => {
    modalCart = [];
    document.getElementById('modalGeneralDiscount').value = '0';
    renderModalCart();
    document.getElementById('modalShippingMethod').value = 'Retirada na Loja';
    document.getElementById('modalShippingNotes').value = '';
    document.getElementById('modalOrderObservation').value = '';
    document.getElementById('modalSaleDate').value = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    pdvOverlay.classList.add('active');
  });
  document.getElementById('btnClosePdvModal')?.addEventListener('click', () => pdvOverlay.classList.remove('active'));
  document.getElementById('btnModalCancelSale')?.addEventListener('click', () => pdvOverlay.classList.remove('active'));
  document.getElementById('modalGeneralDiscount')?.addEventListener('input', renderModalCart);

  const prodSel = document.getElementById('modalProductSelect');
  prodSel?.addEventListener('change', () => {
    const opt = prodSel.options[prodSel.selectedIndex];
    document.getElementById('modalProductDisplayPrice').value = opt ? (opt.getAttribute('data-price') || '0') : '0';
  });

  document.getElementById('btnAddModalProduct')?.addEventListener('click', () => {
    const prod = products.find(p => p.id === prodSel.value);
    const qty = parseInt(document.getElementById('modalProductQty').value, 10) || 1;
    if (!prod || qty > prod.qty) return showToast('Estoque insuficiente!');
    const unitPrice = parseFloat(document.getElementById('modalProductDisplayPrice').value) || prod.price;
    const discount = parseFloat(document.getElementById('modalProductDiscount').value) || 0;
    modalCart.push({ prodId: prod.id, name: prod.name, qty, unitPrice, total: Math.max(0, unitPrice * qty - discount) });
    renderModalCart();
  });

  document.getElementById('btnModalConfirmSale')?.addEventListener('click', () => {
    if (modalCart.length === 0) return showToast('Carrinho vazio!');
    const clientObj = clients.find(c => c.cod === document.getElementById('modalClientSelect').value);
    const grossSale = modalCart.reduce((acc, i) => acc + i.total, 0);
    const generalDiscount = parseFloat(document.getElementById('modalGeneralDiscount').value) || 0;
    const totalSale = Math.max(0, grossSale - generalDiscount);
    const newId = String(9054500 + sales.length + 1);
    const shippingMethod = document.getElementById('modalShippingMethod').value;
    const shippingNotes = document.getElementById('modalShippingNotes').value.trim();
    const observation = document.getElementById('modalOrderObservation').value.trim();

    modalCart.forEach(item => {
      const prod = products.find(p => p.id === item.prodId);
      if (prod) { prod.qty = Math.max(0, prod.qty - item.qty); pushStockToNuvemshop(prod); }
    });

    const isStorePickup = shippingMethod === 'Retirada na Loja';
    const newSale = {
      id: newId,
      client: clientObj ? clientObj.name : 'CONSUMIDOR BALCÃO',
      phone: clientObj ? clientObj.phone : '',
      seller: document.getElementById('modalSellerSelect').value || (activeAccount?.displayName || activeAccount?.username || 'ADMIN'),
      date: document.getElementById('modalSaleDate').value,
      isoDate: new Date().toISOString().split('T')[0],
      type: 'Venda Presencial',
      shippingMethod,
      shippingNotes,
      trackingCode: '',
      orderStatus: isStorePickup ? 'Entregue' : 'Em Separação',
      observation,
      shippingPacked: isStorePickup,
      payment: document.getElementById('modalPayMethod').value,
      discount: generalDiscount,
      items: modalCart.map(i => `${i.name} (${i.qty}x)`).join(', '),
      total: totalSale,
      status: 'Concluído'
    };

    sales.unshift(newSale);
    saveAll();
    renderAll();
    pdvOverlay.classList.remove('active');
    showToast(`Venda #${newId} concluída!`);
    triggerNewShippingNotification(newSale);
  });

  const fastOverlay = document.getElementById('fastPdvModalOverlay');
  document.getElementById('btnOpenFastPdvModal')?.addEventListener('click', () => {
    document.getElementById('fastPdvShippingMethod').value = 'Retirada na Loja';
    document.getElementById('fastPdvShippingNotes').value = '';
    document.getElementById('fastPdvObservation').value = '';
    document.getElementById('fastPdvDiscount').value = '0';
    updateFastPdvTotal();
    fastOverlay.classList.add('active');
  });
  document.getElementById('btnCloseFastPdv')?.addEventListener('click', () => fastOverlay.classList.remove('active'));
  document.getElementById('btnCancelFastPdv')?.addEventListener('click', () => fastOverlay.classList.remove('active'));

  const fastSel = document.getElementById('fastPdvItemSelect');
  fastSel?.addEventListener('change', () => {
    const isCustom = fastSel.value === 'CUSTOM';
    document.getElementById('fastPdvCustomDescGroup').style.display = isCustom ? 'block' : 'none';
    const opt = fastSel.options[fastSel.selectedIndex];
    document.getElementById('fastPdvPrice').value = !isCustom && opt ? (opt.getAttribute('data-price') || '0') : '';
    updateFastPdvTotal();
  });

  ['fastPdvQty', 'fastPdvPrice', 'fastPdvDiscount'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateFastPdvTotal);
  });

  document.getElementById('formFastPdv')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const qty = parseInt(document.getElementById('fastPdvQty').value, 10) || 1;
    const price = parseFloat(document.getElementById('fastPdvPrice').value) || 0;
    const discount = parseFloat(document.getElementById('fastPdvDiscount').value) || 0;
    const newId = String(9054500 + sales.length + 1);
    const prod = products.find(p => p.id === fastSel.value);
    const shippingMethod = document.getElementById('fastPdvShippingMethod').value;
    const shippingNotes = document.getElementById('fastPdvShippingNotes').value.trim();
    const observation = document.getElementById('fastPdvObservation').value.trim();

    if (prod) { prod.qty = Math.max(0, prod.qty - qty); pushStockToNuvemshop(prod); }

    const isStorePickup = shippingMethod === 'Retirada na Loja';
    const newSale = {
      id: newId,
      client: 'CONSUMIDOR BALCÃO',
      seller: document.getElementById('fastPdvSeller').value,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isoDate: new Date().toISOString().split('T')[0],
      type: 'Venda Presencial',
      shippingMethod,
      shippingNotes,
      trackingCode: '',
      orderStatus: isStorePickup ? 'Entregue' : 'Em Separação',
      observation,
      shippingPacked: isStorePickup,
      payment: document.getElementById('fastPdvPayMethod').value,
      discount,
      items: prod ? `${prod.name} (${qty}x)` : `${document.getElementById('fastPdvCustomDesc').value} (${qty}x)`,
      total: Math.max(0, qty * price - discount),
      status: 'Concluído'
    };

    sales.unshift(newSale);
    saveAll();
    renderAll();
    fastOverlay.classList.remove('active');
    showToast(`Venda Express #${newId} registrada!`);
    triggerNewShippingNotification(newSale);
  });

  document.getElementById('btnToggleListModel')?.addEventListener('click', () => {
    salesViewMode = salesViewMode === 'table' ? 'cards' : 'table';
    document.getElementById('listModelLabel').textContent = `Modelo de lista: ${salesViewMode === 'table' ? 'Tabela' : 'Cards'}`;
    document.getElementById('salesTableView').style.display = salesViewMode === 'table' ? 'block' : 'none';
    document.getElementById('salesCardsView').style.display = salesViewMode === 'cards' ? 'block' : 'none';
  });

  document.getElementById('salesStatusFilter')?.addEventListener('change', renderSales);
  document.getElementById('salesChannelFilter')?.addEventListener('change', renderSales);
  document.getElementById('quickStockSearch')?.addEventListener('input', renderQuickStock);
  document.getElementById('quickStockCondition')?.addEventListener('change', renderQuickStock);
}

// ============================================================================
// EDIÇÃO DE VENDA LANÇADA
// ============================================================================
function initEditSaleModule() {
  const overlay = document.getElementById('editSaleModalOverlay');
  document.getElementById('btnCloseEditSaleModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelEditSaleModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  document.getElementById('formEditSale')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const saleId = document.getElementById('editSaleId').value;
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;

    sale.client = document.getElementById('editSaleClient').value.trim().toUpperCase() || sale.client;
    sale.seller = document.getElementById('editSaleSeller').value.trim().toUpperCase() || sale.seller;
    sale.date = document.getElementById('editSaleDate').value.trim() || sale.date;
    sale.payment = document.getElementById('editSalePayment').value;
    sale.items = document.getElementById('editSaleItems').value.trim() || sale.items;
    sale.shippingMethod = document.getElementById('editSaleShippingMethod').value;
    sale.trackingCode = document.getElementById('editSaleTrackingCode').value.trim().toUpperCase();
    sale.shippingNotes = document.getElementById('editSaleShippingNotes').value.trim();
    sale.observation = document.getElementById('editSaleObservation').value.trim();
    sale.discount = parseFloat(document.getElementById('editSaleDiscount').value) || 0;
    sale.total = Math.max(0, parseFloat(document.getElementById('editSaleTotal').value) || 0);
    sale.orderStatus = document.getElementById('editSaleOrderStatus').value;
    sale.shippingPacked = (sale.orderStatus !== 'Em Separação');

    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast(`Venda #${sale.id} atualizada com sucesso!`);
  });
}

window.openEditSaleModal = function (saleId) {
  const s = sales.find(item => String(item.id) === String(saleId));
  if (!s) return;

  document.getElementById('editSaleHeaderId').textContent = s.id;
  document.getElementById('editSaleId').value = s.id;
  document.getElementById('editSaleClient').value = s.client || '';
  document.getElementById('editSaleSeller').value = s.seller || '';
  document.getElementById('editSaleDate').value = s.date || '';
  document.getElementById('editSalePayment').value = s.payment || 'Pix';
  document.getElementById('editSaleItems').value = s.items || '';
  document.getElementById('editSaleShippingMethod').value = s.shippingMethod || 'Retirada na Loja';
  document.getElementById('editSaleTrackingCode').value = s.trackingCode || '';
  document.getElementById('editSaleShippingNotes').value = s.shippingNotes || '';
  document.getElementById('editSaleObservation').value = s.observation || '';
  document.getElementById('editSaleDiscount').value = Number(s.discount || 0);
  document.getElementById('editSaleTotal').value = Number(s.total || 0);
  document.getElementById('editSaleOrderStatus').value = s.orderStatus || 'Em Separação';

  document.getElementById('editSaleModalOverlay').classList.add('active');
};

function renderModalCart() {
  const tbody = document.getElementById('modalCartTable');
  const payVal = document.getElementById('modalPayValue');
  if (!tbody) return;
  if (modalCart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Carrinho vazio</td></tr>';
    if (payVal) payVal.value = 'R$ 0,00';
    return;
  }
  const gross = modalCart.reduce((acc, i) => acc + i.total, 0);
  const generalDisc = parseFloat(document.getElementById('modalGeneralDiscount')?.value) || 0;
  const finalTotal = Math.max(0, gross - generalDisc);
  tbody.innerHTML = modalCart.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtBRL(i.unitPrice)}</td><td><strong>${fmtBRL(i.total)}</strong></td></tr>`).join('');
  if (payVal) payVal.value = fmtBRL(finalTotal);
}

function renderSales() {
  const statusFilter = document.getElementById('salesStatusFilter')?.value || 'todos';
  const channelFilter = document.getElementById('salesChannelFilter')?.value || 'todos';

  const filteredSales = sales.filter(s => {
    const st = s.orderStatus || 'Em Separação';
    const matchStatus = statusFilter === 'todos' || st === statusFilter;
    const matchChannel = channelFilter === 'todos' || (channelFilter === 'Online / Nuvemshop' ? s.type === 'Online / Nuvemshop' : s.type !== 'Online / Nuvemshop');
    return matchStatus && matchChannel;
  });

  const tbody = document.getElementById('tableSalesHistory');
  const cards = document.getElementById('cardsSalesList');

  if (tbody) tbody.innerHTML = filteredSales.map(s => {
    const ship = s.shippingMethod || 'Retirada na Loja';
    const shipBadge = ship === 'Motoboy'
      ? `<span class="badge-tag badge-motoboy">Motoboy</span>`
      : ship === 'Correios'
      ? `<span class="badge-tag badge-correios">Correios</span>`
      : `<span class="badge-tag badge-info">Loja</span>`;
    const channelBadge = s.type === 'Online / Nuvemshop'
      ? `<span class="badge-tag badge-nuvem">Nuvemshop</span>`
      : `<span class="badge-tag badge-info">PDV</span>`;
    const st = s.orderStatus || 'Em Separação';
    const hasObs = Boolean(s.observation && s.observation.trim().length > 0);
    const hasTrack = Boolean(s.trackingCode && s.trackingCode.trim().length > 0);

    return `
      <tr>
        <td><strong>#${s.id}</strong></td>
        <td>${channelBadge}</td>
        <td>${s.date}</td>
        <td>${s.client}</td>
        <td>${s.items}</td>
        <td>${shipBadge}</td>
        <td>
          <button type="button" class="btn-sm ${hasTrack ? 'btn-green' : ''}" onclick="openOrderTrackingModal('${s.id}')" title="Informar ou alterar código de rastreio">
            <i class="ph ph-barcode"></i> ${hasTrack ? `<code>${s.trackingCode}</code>` : '+ Rastreio'}
          </button>
        </td>
        <td>
          <select class="status-inline-select ${getOrderStatusClass(st)}" onchange="updateSaleOrderStatus('${s.id}', this.value)">
            <option value="Em Separação" ${st === 'Em Separação' ? 'selected' : ''}>Em Separação</option>
            <option value="Separado" ${st === 'Separado' ? 'selected' : ''}>Separado</option>
            <option value="Enviado" ${st === 'Enviado' ? 'selected' : ''}>Enviado</option>
            <option value="Entregue" ${st === 'Entregue' ? 'selected' : ''}>Entregue</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn-sm ${hasObs ? 'btn-blue' : ''}" onclick="openOrderObsModal('${s.id}')" title="${hasObs ? s.observation : 'Adicionar observação'}">
            <i class="ph ph-note-pencil"></i> ${hasObs ? (s.observation.length > 18 ? s.observation.slice(0, 18) + '...' : s.observation) : '+ Obs.'}
          </button>
        </td>
        <td>${s.payment}</td>
        <td><strong>${fmtBRL(s.total)}</strong></td>
        <td style="display:flex; gap:0.35rem; flex-wrap:wrap;">
          <button type="button" class="btn-sm btn-blue" onclick="openEditSaleModal('${s.id}')" title="Editar venda"><i class="ph ph-pencil-simple"></i> Editar</button>
          <button type="button" class="btn-sm" onclick="openReceiptModal('${s.id}')"><i class="ph ph-printer"></i> Recibo</button>
        </td>
      </tr>
    `;
  }).join('');

  if (cards) cards.innerHTML = filteredSales.map(s => {
    const st = s.orderStatus || 'Em Separação';
    return `
      <div class="sale-card-item">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>#${s.id} ${s.type === 'Online / Nuvemshop' ? '(Nuvemshop)' : ''}</strong>
          <select class="status-inline-select ${getOrderStatusClass(st)}" onchange="updateSaleOrderStatus('${s.id}', this.value)">
            <option value="Em Separação" ${st === 'Em Separação' ? 'selected' : ''}>Em Separação</option>
            <option value="Separado" ${st === 'Separado' ? 'selected' : ''}>Separado</option>
            <option value="Enviado" ${st === 'Enviado' ? 'selected' : ''}>Enviado</option>
            <option value="Entregue" ${st === 'Entregue' ? 'selected' : ''}>Entregue</option>
          </select>
        </div>
        <strong>${s.client}</strong>
        <small style="color:var(--text-muted);">${s.items}</small>
        ${s.trackingCode ? `<small style="color:#34d399;"><i class="ph ph-barcode"></i> Rastreio: <strong>${s.trackingCode}</strong></small>` : ''}
        ${s.observation ? `<small style="color:#fbbf24;"><i class="ph ph-note"></i> ${s.observation}</small>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.35rem; margin-top:0.25rem;">
          <strong style="color:var(--success);">${fmtBRL(s.total)}</strong>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
            <button type="button" class="btn-sm" onclick="openOrderTrackingModal('${s.id}')">Rastreio</button>
            <button type="button" class="btn-sm" onclick="openOrderObsModal('${s.id}')">Obs.</button>
            <button type="button" class="btn-sm btn-blue" onclick="openEditSaleModal('${s.id}')">Editar</button>
            <button type="button" class="btn-sm" onclick="openReceiptModal('${s.id}')">Recibo</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderQuickStock() {
  const tbody = document.getElementById('tableQuickStock');
  if (!tbody) return;
  const term = (document.getElementById('quickStockSearch')?.value || '').toLowerCase();
  const cond = document.getElementById('quickStockCondition')?.value || 'todos';
  const filtered = products.filter(p => (p.name.toLowerCase().includes(term) || (p.imei || '').toLowerCase().includes(term)) && (cond === 'todos' || p.condition === cond));
  tbody.innerHTML = filtered.map(p => `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td><code>${p.imei || '-'}</code></td><td><span class="badge-tag badge-info">${p.condition}</span> <small>${p.battery || ''}</small></td><td><strong>${fmtBRL(p.price)}</strong></td><td>${p.qty > 0 ? `<span class="badge-tag badge-info">${p.qty} un.</span>` : `<span class="badge-tag badge-despesa">Esgotado</span>`}</td><td><button type="button" class="btn-sm btn-green" ${p.qty <= 0 ? 'disabled' : ''} onclick="quickAddToPdv('${p.id}')">Vender</button></td></tr>`).join('');
}

window.quickAddToPdv = function (prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod || prod.qty <= 0) return;
  modalCart = [{ prodId: prod.id, name: prod.name, qty: 1, unitPrice: prod.price, total: prod.price }];
  document.getElementById('modalGeneralDiscount').value = '0';
  renderModalCart();
  document.getElementById('modalShippingMethod').value = 'Retirada na Loja';
  document.getElementById('modalShippingNotes').value = '';
  document.getElementById('modalOrderObservation').value = '';
  document.getElementById('modalSaleDate').value = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('pdvModalOverlay').classList.add('active');
};

function initQuotesModule() {
  const overlay = document.getElementById('quoteModalOverlay');
  document.getElementById('btnOpenNewQuoteModal')?.addEventListener('click', () => { quoteCart = []; renderQuoteCart(); overlay.classList.add('active'); });
  document.getElementById('btnCloseQuoteModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelQuoteModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnAddQuoteItem')?.addEventListener('click', () => {
    const prod = products.find(p => p.id === document.getElementById('quoteProductSelect').value);
    const qty = parseInt(document.getElementById('quoteProductQty').value, 10) || 1;
    if (!prod) return;
    quoteCart.push({ prodId: prod.id, name: prod.name, qty, price: prod.price });
    renderQuoteCart();
  });
  document.getElementById('btnSaveQuote')?.addEventListener('click', () => {
    const clientName = document.getElementById('quoteClientName').value.trim().toUpperCase();
    if (!clientName || quoteCart.length === 0) return showToast('Preencha cliente e itens!');
    const gross = quoteCart.reduce((acc, i) => acc + i.price * i.qty, 0);
    const disc = parseFloat(document.getElementById('quoteTradeInVal').value) || 0;
    quotes.unshift({ cod: 'ORC-' + (501 + quotes.length), date: new Date().toLocaleDateString('pt-BR'), validUntil: '3 dias', clientName, clientPhone: document.getElementById('quoteClientPhone').value, seller: document.getElementById('quoteSellerSelect').value, items: [...quoteCart], tradeInVal: disc, netTotal: Math.max(0, gross - disc), status: 'Aberto' });
    saveAll(); renderQuotes(); overlay.classList.remove('active'); showToast('Orçamento salvo!');
  });
}

function renderQuoteCart() {
  const tbody = document.getElementById('quoteItemsTableBody');
  const totalEl = document.getElementById('quoteGrandTotalDisplay');
  const disc = parseFloat(document.getElementById('quoteTradeInVal')?.value) || 0;
  const gross = quoteCart.reduce((acc, i) => acc + i.price * i.qty, 0);
  if (tbody) tbody.innerHTML = quoteCart.map((i, idx) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtBRL(i.price)}</td><td>${fmtBRL(i.price * i.qty)}</td><td><button type="button" class="btn-sm" onclick="quoteCart.splice(${idx},1);renderQuoteCart()">&times;</button></td></tr>`).join('');
  if (totalEl) totalEl.textContent = fmtBRL(Math.max(0, gross - disc));
}

function renderQuotes() {
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('quoteMetricTotal', quotes.length);
  setTxt('quoteMetricOpen', quotes.filter(q => q.status === 'Aberto').length);
  setTxt('quoteMetricApproved', quotes.filter(q => q.status === 'Aprovado').length);
  setTxt('quoteMetricValue', fmtBRL(quotes.filter(q => q.status === 'Aberto').reduce((acc, q) => acc + q.netTotal, 0)));
  const tbody = document.getElementById('tableQuotesList');
  if (tbody) tbody.innerHTML = quotes.map(q => `<tr><td><strong>${q.cod}</strong></td><td>${q.date}</td><td>${q.clientName}</td><td>${q.items.map(i => `${i.name} (${i.qty}x)`).join('<br>')}</td><td>${fmtBRL(q.tradeInVal)}</td><td><strong>${fmtBRL(q.netTotal)}</strong></td><td><span class="badge-tag badge-warning">${q.status}</span></td><td>${q.status === 'Aberto' ? `<button type="button" class="btn-sm btn-green" onclick="convertQuoteToSale('${q.cod}')">Converter</button>` : '-'}</td></tr>`).join('');
}

window.convertQuoteToSale = function (cod) {
  const q = quotes.find(item => item.cod === cod);
  if (!q) return;
  q.status = 'Aprovado';
  sales.unshift({ id: String(9054500 + sales.length + 1), client: q.clientName, phone: q.clientPhone, seller: q.seller, date: new Date().toLocaleDateString('pt-BR'), isoDate: new Date().toISOString().split('T')[0], type: 'Venda Presencial', shippingMethod: 'Retirada na Loja', trackingCode: '', orderStatus: 'Em Separação', observation: `Convertido do orçamento ${q.cod}`, shippingPacked: false, payment: 'Pix', discount: q.tradeInVal || 0, items: q.items.map(i => `${i.name} (${i.qty}x)`).join(', '), total: q.netTotal, status: 'Concluído' });
  saveAll(); renderAll(); showToast(`Orçamento ${cod} convertido em venda!`);
};

// ============================================================================
// MÓDULO DE GARANTIAS & FISCAL
// ============================================================================
function initWarrantiesAndFiscalModule() {
  const overlay = document.getElementById('warrantyModalOverlay');
  const form = document.getElementById('formNewWarranty');
  const saleSel = document.getElementById('warSaleSelect');

  document.getElementById('btnOpenNewWarrantyModal')?.addEventListener('click', () => {
    form?.reset();
    document.getElementById('warStartDate').value = new Date().toISOString().split('T')[0];
    overlay.classList.add('active');
  });

  document.getElementById('btnCloseWarrantyModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelWarrantyModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  saleSel?.addEventListener('change', () => {
    const s = sales.find(item => String(item.id) === String(saleSel.value));
    if (s) {
      document.getElementById('warClientName').value = s.client || '';
      document.getElementById('warClientPhone').value = s.phone || '';
      document.getElementById('warProductModel').value = s.items || '';
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const termSel = document.getElementById('warTermSelect');
    const selectedOpt = termSel.options[termSel.selectedIndex];
    const days = parseInt(selectedOpt?.getAttribute('data-days'), 10) || 90;
    const saleId = saleSel.value || 'AVULSO';
    const linkedSale = sales.find(item => String(item.id) === String(saleId));

    const newWarranty = {
      cod: 'GAR-' + (1001 + warranties.length),
      saleId,
      clientName: document.getElementById('warClientName').value.trim().toUpperCase(),
      clientPhone: document.getElementById('warClientPhone').value.trim(),
      deviceModel: document.getElementById('warProductModel').value.trim(),
      imei: document.getElementById('warBatchCode').value.trim() || 'AUTENTICADO',
      term: termSel.value,
      startDate: document.getElementById('warStartDate').value,
      days,
      value: linkedSale ? linkedSale.total : 0,
      invoiceNumber: document.getElementById('warInvoiceNumber').value.trim() || 'Cupom Balcão'
    };

    warranties.unshift(newWarranty);
    saveAll();
    renderWarranties();
    overlay.classList.remove('active');
    showToast(`Certificado de garantia ${newWarranty.cod} emitido!`);
  });
}

function renderWarranties() {
  const tbody = document.getElementById('tableWarrantiesList');
  if (tbody) tbody.innerHTML = warranties.map(w => {
    const msg = `Olá *${w.clientName}*! Segue seu Certificado de Autenticidade *${w.cod}* da *GRUPO MISTER Perfumaria* referente a *${w.deviceModel}* (Lote: ${w.imei}) — Vigência: ${w.days} dias.`;
    const digits = (w.clientPhone || '').replace(/\D/g, '');
    const waHref = digits ? `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}` : '#';
    return `
      <tr>
        <td><strong>${w.cod}</strong></td>
        <td>${w.clientName}</td>
        <td>${w.deviceModel}</td>
        <td><code>${w.imei}</code></td>
        <td><span class="badge-tag badge-info">${w.term}</span></td>
        <td>${w.invoiceNumber || 'Pendente'}</td>
        <td>${w.startDate} (${w.days}d)</td>
        <td><span class="badge-tag badge-receita">Ativa</span></td>
        <td>
          <a href="${waHref}" target="_blank" class="btn-sm btn-green" style="text-decoration:none;" onclick="showToast('Abrindo certificado no WhatsApp...')">
            <i class="ph ph-whatsapp-logo"></i> Enviar
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function initSimulators() {
  document.getElementById('taxSimBaseValue')?.addEventListener('input', updateTaxSimulator);
  document.getElementById('taxSimMode')?.addEventListener('change', updateTaxSimulator);
  document.getElementById('btnSaveCustomRates')?.addEventListener('click', () => {
    document.querySelectorAll('.rate-input').forEach(inp => { cardRates[parseInt(inp.dataset.idx, 10)] = parseFloat(inp.value) || 0; });
    saveAll(); updateTaxSimulator(); showToast('Taxas salvas!');
  });
  document.getElementById('btnCopyTaxMsg')?.addEventListener('click', () => { navigator.clipboard?.writeText(document.getElementById('taxWhatsappPreview').textContent); showToast('Copiado!'); });

  document.getElementById('upgTargetStockSelect')?.addEventListener('change', (e) => {
    const prod = products.find(p => p.id === e.target.value);
    if (prod) { document.getElementById('upgTargetModel').value = prod.name; document.getElementById('upgTargetPrice').value = prod.price; updateUpgradeSimulator(); }
  });
  ['upgTargetModel', 'upgTargetPrice', 'upgTradeInModel', 'upgTradeInBase', 'upgCashDown'].forEach(id => document.getElementById(id)?.addEventListener('input', updateUpgradeSimulator));
  document.getElementById('btnCopyUpgradeMsg')?.addEventListener('click', () => { navigator.clipboard?.writeText(document.getElementById('upgWhatsappPreview').textContent); showToast('Proposta copiada!'); });
}

function updateTaxSimulator() {
  const base = parseFloat(document.getElementById('taxSimBaseValue')?.value) || 0;
  const mode = document.getElementById('taxSimMode')?.value || 'repasse';
  const tbody = document.getElementById('taxSimTableBody');
  const preview = document.getElementById('taxWhatsappPreview');
  if (!tbody) return;
  let html = '', lines = [`*SIMULAÇÃO GRUPO MISTER* — Pix: ${fmtBRL(base)}`];
  for (let i = 1; i <= 12; i++) {
    const rate = cardRates[i] ?? 0;
    const tot = mode === 'repasse' ? base / (1 - rate / 100) : base;
    const net = mode === 'repasse' ? base : base * (1 - rate / 100);
    html += `<tr><td>${i}x</td><td><input type="number" class="rate-input" data-idx="${i}" value="${rate}" step="0.01" style="width:60px;background:#0b0f17;border:1px solid var(--border);color:#fff;padding:2px;" />%</td><td><strong>${fmtBRL(tot / i)}</strong></td><td>${fmtBRL(tot)}</td><td style="color:var(--success);">${fmtBRL(net)}</td></tr>`;
    if ([1, 3, 6, 12].includes(i)) lines.push(`${i}x de ${fmtBRL(tot / i)}`);
  }
  tbody.innerHTML = html;
  if (preview) preview.textContent = lines.join('\n');
}

function updateUpgradeSimulator() {
  const m1 = document.getElementById('upgTargetModel')?.value || '';
  const p1 = parseFloat(document.getElementById('upgTargetPrice')?.value) || 0;
  const m2 = document.getElementById('upgTradeInModel')?.value || '';
  const p2 = parseFloat(document.getElementById('upgTradeInBase')?.value) || 0;
  const disc = parseFloat(document.getElementById('upgCashDown')?.value) || 0;
  const rem = Math.max(0, p1 + p2 - disc);
  const el = document.getElementById('upgRemainingDisplay');
  if (el) el.textContent = fmtBRL(rem);
  const prev = document.getElementById('upgWhatsappPreview');
  if (prev) prev.textContent = `*COMBO GRUPO MISTER*\n• ${m1} (${fmtBRL(p1)})\n• ${m2} (${fmtBRL(p2)})\n• Desconto Combo: -${fmtBRL(disc)}\n*Total no Pix: ${fmtBRL(rem)}*`;
}

function initClientsModule() {
  const overlay = document.getElementById('clientModalOverlay');
  document.getElementById('btnOpenClientModal')?.addEventListener('click', () => overlay.classList.add('active'));
  document.getElementById('btnCloseClientModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelClientModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('formNewClient')?.addEventListener('submit', (e) => {
    e.preventDefault();
    clients.unshift({ cod: 'CLI-' + String(clients.length + 1).padStart(3, '0'), name: document.getElementById('newClientName').value.trim().toUpperCase(), cpf: document.getElementById('newClientCpf').value.trim(), phone: document.getElementById('newClientPhone').value.trim(), category: document.getElementById('newClientCategory').value, notes: document.getElementById('newClientNotes').value.trim() });
    saveAll(); renderAll(); overlay.classList.remove('active'); showToast('Cliente cadastrado!');
  });
  document.getElementById('clientSearchInput')?.addEventListener('input', renderClients);
  document.getElementById('clientCategoryFilter')?.addEventListener('change', renderClients);
}

function renderClients() {
  const term = (document.getElementById('clientSearchInput')?.value || '').toLowerCase();
  const cat = document.getElementById('clientCategoryFilter')?.value || 'todos';
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('metricTotalPessoas', clients.length);
  setTxt('metricTotalClientes', clients.length);
  setTxt('metricClientesVip', clients.filter(c => c.category === 'VIP / Recorrente').length);
  const filtered = clients.filter(c => (c.name.toLowerCase().includes(term) || c.cpf.includes(term)) && (cat === 'todos' || c.category === cat));
  const tbody = document.getElementById('tableClientsDetailed');
  if (tbody) tbody.innerHTML = filtered.map(c => `<tr><td>${c.cod}</td><td><strong>${c.name}</strong></td><td>${c.cpf}</td><td>${c.phone}</td><td>${c.notes || '-'}</td><td><span class="badge-tag badge-info">${c.category}</span></td><td><button type="button" class="btn-sm btn-blue" onclick="selectClientForSale('${c.cod}')">Vender</button></td></tr>`).join('');
}

window.selectClientForSale = function (cod) {
  modalCart = [];
  document.getElementById('modalGeneralDiscount').value = '0';
  renderModalCart();
  const sel = document.getElementById('modalClientSelect'); if (sel) sel.value = cod;
  document.getElementById('modalSaleDate').value = new Date().toLocaleDateString('pt-BR');
  document.getElementById('pdvModalOverlay').classList.add('active');
};

// ============================================================================
// MÓDULO DE ESTOQUE
// ============================================================================
window.openNewProductModal = function () {
  const adminFlag = isCurrentUserAdmin();
  document.getElementById('editProdId').value = '';
  document.getElementById('productModalTitle').innerHTML = '<i class="ph ph-package"></i> Cadastrar Fragrância';
  document.getElementById('btnSubmitProductModal').textContent = 'Salvar no Estoque';
  document.getElementById('btnDeleteProductInModal').style.display = 'none';
  document.getElementById('prodCodeDisplay').value = 'PRD-' + String(products.length + 1).padStart(2, '0');
  document.getElementById('prodName').value = '';
  document.getElementById('prodImei').value = '';
  document.getElementById('prodExpiry').value = '';
  document.getElementById('prodCondition').value = 'Árabe';
  document.getElementById('prodBattery').value = '';
  document.getElementById('prodCost').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodQty').value = '1';
  document.getElementById('prodNuvemId').value = '';
  document.getElementById('prodNuvemVariantId').value = '';

  const costGroup = document.getElementById('prodCostFieldGroup');
  if (costGroup) costGroup.style.display = adminFlag ? '' : 'none';

  document.getElementById('productModalOverlay').classList.add('active');
};

window.openEditProductModal = function (prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  const adminFlag = isCurrentUserAdmin();

  document.getElementById('editProdId').value = prod.id;
  document.getElementById('productModalTitle').innerHTML = `<i class="ph ph-pencil-simple"></i> Editar Produto (${prod.id})`;
  document.getElementById('btnSubmitProductModal').textContent = 'Salvar Alterações';
  document.getElementById('btnDeleteProductInModal').style.display = adminFlag ? 'inline-flex' : 'none';

  document.getElementById('prodCodeDisplay').value = prod.id || '';
  document.getElementById('prodName').value = prod.name || '';
  document.getElementById('prodImei').value = prod.imei || '';
  document.getElementById('prodExpiry').value = prod.expiry || '';
  document.getElementById('prodCondition').value = prod.condition || 'Árabe';
  document.getElementById('prodBattery').value = prod.battery || '';
  document.getElementById('prodCost').value = prod.cost ?? 0;
  document.getElementById('prodPrice').value = prod.price ?? 0;
  document.getElementById('prodQty').value = prod.qty ?? 0;
  document.getElementById('prodNuvemId').value = prod.nuvemId || '';
  document.getElementById('prodNuvemVariantId').value = prod.nuvemVarId || '';

  const costGroup = document.getElementById('prodCostFieldGroup');
  if (costGroup) costGroup.style.display = adminFlag ? '' : 'none';

  document.getElementById('productModalOverlay').classList.add('active');
};

window.quickEditProductField = function (prodId, fieldKey) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  const adminFlag = isCurrentUserAdmin();
  if ((fieldKey === 'cost') && !adminFlag) return;

  const labels = {
    id: 'Código do Produto',
    name: 'Nome da Fragrância / Decant',
    imei: 'Batch / Lote',
    battery: 'Volume / Concentração',
    expiry: 'Validade (AAAA-MM-DD)',
    cost: 'Preço de Custo (R$)',
    price: 'Preço de Venda (R$)',
    qty: 'Quantidade em Estoque'
  };

  const currentVal = prod[fieldKey] ?? '';
  const newVal = prompt(`Editar ${labels[fieldKey] || fieldKey}:`, currentVal);
  if (newVal === null) return;

  if (fieldKey === 'price' || fieldKey === 'cost') {
    const parsed = parseFloat(String(newVal).replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) return showToast('Valor inválido.');
    prod[fieldKey] = parsed;
  } else if (fieldKey === 'qty') {
    const parsed = parseInt(newVal, 10);
    if (isNaN(parsed) || parsed < 0) return showToast('Quantidade inválida.');
    prod.qty = parsed;
  } else if (fieldKey === 'id') {
    const clean = newVal.trim();
    if (!clean) return showToast('Código não pode ficar vazio.');
    prod.id = clean;
  } else {
    prod[fieldKey] = newVal.trim();
  }

  pushStockToNuvemshop(prod);
  saveAll();
  renderAll();
  showToast(`${labels[fieldKey]} atualizado!`);
};

window.quickFilterStockChip = function (category) {
  const sel = document.getElementById('stockConditionFilter');
  if (sel) sel.value = category;
  renderStock();
};

function initStockModule() {
  const overlay = document.getElementById('productModalOverlay');
  document.getElementById('btnCloseProductModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelProductModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  document.getElementById('btnDeleteProductInModal')?.addEventListener('click', () => {
    const targetId = document.getElementById('editProdId').value;
    if (!targetId || !isCurrentUserAdmin()) return;
    if (!confirm('Deseja excluir permanentemente este produto do estoque?')) return;
    products = products.filter(p => p.id !== targetId);
    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast('Produto excluído do estoque.');
  });

  document.getElementById('formNewProduct')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const editingId = document.getElementById('editProdId').value;
    const customCode = document.getElementById('prodCodeDisplay').value.trim();

    if (editingId) {
      const prod = products.find(p => p.id === editingId);
      if (prod) {
        prod.id = customCode || prod.id;
        prod.name = document.getElementById('prodName').value.trim();
        prod.imei = document.getElementById('prodImei').value.trim();
        prod.expiry = document.getElementById('prodExpiry').value;
        prod.condition = document.getElementById('prodCondition').value;
        prod.battery = document.getElementById('prodBattery').value.trim();
        if (isCurrentUserAdmin()) {
          prod.cost = parseFloat(document.getElementById('prodCost').value) || 0;
        }
        prod.price = parseFloat(document.getElementById('prodPrice').value) || 0;
        prod.qty = parseInt(document.getElementById('prodQty').value, 10) || 0;
        prod.nuvemId = document.getElementById('prodNuvemId').value.trim();
        prod.nuvemVarId = document.getElementById('prodNuvemVariantId').value.trim();
        pushStockToNuvemshop(prod);
      }
      saveAll();
      renderAll();
      overlay.classList.remove('active');
      showToast('Todas as informações do produto foram atualizadas!');
    } else {
      const newProd = {
        id: customCode || ('PRD-' + String(products.length + 1).padStart(2, '0')),
        name: document.getElementById('prodName').value.trim(),
        imei: document.getElementById('prodImei').value.trim(),
        expiry: document.getElementById('prodExpiry').value,
        condition: document.getElementById('prodCondition').value,
        battery: document.getElementById('prodBattery').value.trim(),
        cost: parseFloat(document.getElementById('prodCost').value) || 0,
        price: parseFloat(document.getElementById('prodPrice').value) || 0,
        qty: parseInt(document.getElementById('prodQty').value, 10) || 0,
        nuvemId: document.getElementById('prodNuvemId').value.trim(),
        nuvemVarId: document.getElementById('prodNuvemVariantId').value.trim()
      };
      products.unshift(newProd);
      pushStockToNuvemshop(newProd);
      saveAll();
      renderAll();
      overlay.classList.remove('active');
      showToast('Fragrância cadastrada!');
    }
  });

  ['stockSearchInput', 'stockConditionFilter', 'stockAvailabilityFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderStock);
    document.getElementById(id)?.addEventListener('change', renderStock);
  });

  document.getElementById('btnClearStockFilters')?.addEventListener('click', () => {
    document.getElementById('stockSearchInput').value = '';
    document.getElementById('stockConditionFilter').value = 'todos';
    document.getElementById('stockAvailabilityFilter').value = 'todos';
    renderStock();
  });
}

function renderStock() {
  const adminFlag = isCurrentUserAdmin();

  const adminGrid = document.getElementById('stockAdminMetricsGrid');
  const sellerBanner = document.getElementById('stockSellerQuickFilterBanner');
  if (adminGrid) adminGrid.style.display = adminFlag ? 'grid' : 'none';
  if (sellerBanner) sellerBanner.style.display = adminFlag ? 'none' : 'block';

  document.querySelectorAll('#estoque .admin-only-col, #estoque .admin-only-metric').forEach(el => {
    el.style.display = adminFlag ? '' : 'none';
  });

  const term = (document.getElementById('stockSearchInput')?.value || '').toLowerCase();
  const cond = document.getElementById('stockConditionFilter')?.value || 'todos';
  const avail = document.getElementById('stockAvailabilityFilter')?.value || 'todos';

  if (adminFlag) {
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('stockMetricUnits', products.reduce((a, p) => a + p.qty, 0));
    setTxt('stockMetricCost', fmtBRL(products.reduce((a, p) => a + p.cost * p.qty, 0)));
    setTxt('stockMetricSale', fmtBRL(products.reduce((a, p) => a + p.price * p.qty, 0)));
    setTxt('stockMetricLow', products.filter(p => p.qty <= 2).length);
  }

  const filtered = products.filter(p =>
    (p.name.toLowerCase().includes(term) || (p.imei || '').toLowerCase().includes(term) || (p.id || '').toLowerCase().includes(term) || (p.battery || '').toLowerCase().includes(term))
    && (cond === 'todos' || p.condition === cond)
    && (avail === 'todos' || (avail === 'disponivel' && p.qty > 0) || (avail === 'esgotado' && p.qty === 0))
  );

  const tbody = document.getElementById('tableStockDetailed');
  if (tbody) tbody.innerHTML = filtered.map(p => {
    const margin = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '0.0';
    return `
      <tr>
        <td class="editable-cell" title="Clique para editar Código" onclick="quickEditProductField('${p.id}', 'id')">${p.id}</td>
        <td class="editable-cell" title="Clique para editar Nome" onclick="quickEditProductField('${p.id}', 'name')"><strong>${p.name}</strong></td>
        <td class="editable-cell" title="Clique para editar Batch/Lote" onclick="quickEditProductField('${p.id}', 'imei')"><code>${p.imei || '-'}</code></td>
        <td class="editable-cell" title="Clique para editar Volume" onclick="quickEditProductField('${p.id}', 'battery')">
          <span class="badge-tag badge-info">${p.condition}</span> <small style="color:var(--text-muted);">${p.battery || ''}</small>
        </td>
        <td class="editable-cell" title="Clique para editar Validade" onclick="quickEditProductField('${p.id}', 'expiry')">${p.expiry ? new Date(p.expiry + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
        ${adminFlag ? `<td class="editable-cell" title="Clique para editar Custo" onclick="quickEditProductField('${p.id}', 'cost')">${fmtBRL(p.cost)}</td>` : ''}
        <td class="editable-cell" title="Clique para editar Preço de Venda" onclick="quickEditProductField('${p.id}', 'price')"><strong>${fmtBRL(p.price)}</strong></td>
        ${adminFlag ? `<td><span class="badge-tag badge-receita">${margin}%</span></td>` : ''}
        <td class="editable-cell" title="Clique para editar Quantidade" onclick="quickEditProductField('${p.id}', 'qty')"><strong>${p.qty}</strong></td>
        <td style="display:flex; gap:0.3rem; flex-wrap:wrap;">
          <button type="button" class="btn-sm btn-blue" onclick="openEditProductModal('${p.id}')" title="Editar todos os campos do produto"><i class="ph ph-pencil-simple"></i> Editar</button>
          <button type="button" class="btn-sm" onclick="adjustStockQty('${p.id}', 1)">+1</button>
          <button type="button" class="btn-sm" onclick="adjustStockQty('${p.id}', -1)">-1</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.adjustStockQty = function (id, delta) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;
  prod.qty = Math.max(0, prod.qty + delta);
  pushStockToNuvemshop(prod); saveAll(); renderAll();
};

// ============================================================================
// MÓDULO DE TROCAS E DEVOLUÇÕES
// ============================================================================
function initRmaModule() {
  const overlay = document.getElementById('rmaModalOverlay');
  const form = document.getElementById('formNewRma');
  const saleSel = document.getElementById('rmaSaleSelect');

  document.getElementById('btnOpenNewRmaModal')?.addEventListener('click', () => {
    form?.reset();
    overlay.classList.add('active');
  });

  document.getElementById('btnCloseRmaModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelRmaModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  saleSel?.addEventListener('change', () => {
    const s = sales.find(item => String(item.id) === String(saleSel.value));
    if (s) {
      document.getElementById('rmaClientName').value = s.client || '';
      document.getElementById('rmaDeviceName').value = s.items || '';
      document.getElementById('rmaAmountInput').value = Number(s.total || 0);
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemName = document.getElementById('rmaDeviceName').value.trim();
    const stockAction = document.getElementById('rmaStockActionSelect').value;

    if (stockAction === 'retornar_estoque') {
      const matchedProd = products.find(p => itemName.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(itemName.toLowerCase()));
      if (matchedProd) {
        matchedProd.qty += 1;
        pushStockToNuvemshop(matchedProd);
      }
    }

    const newRma = {
      cod: 'RMA-' + (201 + rmaList.length),
      date: new Date().toLocaleDateString('pt-BR'),
      saleId: saleSel.value || 'AVULSO',
      clientName: document.getElementById('rmaClientName').value.trim().toUpperCase(),
      deviceName: itemName,
      type: document.getElementById('rmaTypeSelect').value,
      stockAction,
      amount: parseFloat(document.getElementById('rmaAmountInput').value) || 0,
      reason: document.getElementById('rmaReasonInput').value.trim() || 'Troca solicitada pelo cliente',
      status: 'Concluído'
    };

    rmaList.unshift(newRma);
    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast(`Troca / Devolução ${newRma.cod} registrada!`);
  });
}

function renderRma() {
  const tbody = document.getElementById('tableRmaList');
  if (tbody) tbody.innerHTML = rmaList.map(r => `
    <tr>
      <td><strong>${r.cod}</strong></td>
      <td>${r.date}</td>
      <td>${r.clientName}</td>
      <td>${r.deviceName}</td>
      <td>${r.type}</td>
      <td>${r.stockAction === 'retornar_estoque' ? '<span class="badge-tag badge-info">Retornou +1</span>' : '<span class="badge-tag badge-warning">Avaria</span>'}</td>
      <td>${fmtBRL(r.amount)}</td>
      <td><span class="badge-tag badge-receita">${r.status}</span></td>
      <td><small style="color:var(--text-muted);">${r.reason || '-'}</small></td>
    </tr>
  `).join('');
}

function initFinanceModule() {}
function renderFinance() {
  const vendas = sales.reduce((a, s) => a + s.total, 0);
  const desp = finEntries.filter(f => f.type === 'Despesa').reduce((a, f) => a + f.amount, 0);
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('finMetricGross', fmtBRL(vendas));
  setTxt('finMetricCmv', fmtBRL(vendas * 0.55));
  setTxt('finMetricExpenses', fmtBRL(desp));
  setTxt('finMetricNetProfit', fmtBRL(vendas - vendas * 0.55 - desp));
  const tbody = document.getElementById('tableFinEntries');
  if (tbody) tbody.innerHTML = finEntries.map(f => `<tr><td><strong>${f.cod}</strong></td><td>${f.date}</td><td>${f.desc}</td><td>${f.category}</td><td><span class="badge-tag badge-despesa">${f.type}</span></td><td><strong>${fmtBRL(f.amount)}</strong></td><td>${f.status}</td><td>-</td></tr>`).join('');
}

function initCashAndTools() {
  const toolOverlay = document.getElementById('cashToolModalOverlay');
  document.getElementById('btnCloseCashTool')?.addEventListener('click', () => toolOverlay.classList.remove('active'));
  document.getElementById('btnTogglePdvTools')?.addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('pdvToolsMenu').classList.toggle('open'); });
  document.addEventListener('click', () => document.getElementById('pdvToolsMenu')?.classList.remove('open'));
  document.getElementById('btnPrintLastReceipt')?.addEventListener('click', (e) => { e.preventDefault(); if (sales.length) openReceiptModal(sales[0].id); });
}

window.openCashMovementModal = function (type) {
  const toolOverlay = document.getElementById('cashToolModalOverlay');
  document.getElementById('cashToolModalTitle').textContent = `Lançar ${type}`;
  document.getElementById('cashToolModalBody').innerHTML = `<form id="fcm"><div class="form-group"><label>Valor (R$):</label><input type="number" id="cmv" step="0.01" required /></div><button type="submit" class="btn-primary">Confirmar</button></form>`;
  toolOverlay.classList.add('active');
  document.getElementById('fcm').addEventListener('submit', (e) => {
    e.preventDefault();
    cashMoves.unshift({ type, value: parseFloat(document.getElementById('cmv').value) || 0, date: new Date().toLocaleString('pt-BR') });
    saveAll(); toolOverlay.classList.remove('active'); showToast(`${type} registrado!`);
  });
};

window.openReceiptModal = function (saleId) {
  const s = sales.find(item => item.id === saleId);
  if (!s) return;
  const discLine = Number(s.discount || 0) > 0 ? `<br>Desconto Aplicado: -${fmtBRL(s.discount)}` : '';
  const trackLine = s.trackingCode ? `<br>Código de Rastreio: <strong>${s.trackingCode}</strong>` : '';
  const obsLine = s.observation ? `<br>Obs.: ${s.observation}` : '';
  const canalLine = s.type === 'Online / Nuvemshop' ? ' (Nuvemshop)' : '';
  document.getElementById('cashToolModalTitle').textContent = `Comprovante #${s.id}`;
  document.getElementById('cashToolModalBody').innerHTML = `
    <div style="background:#fff;color:#111;padding:0.9rem;border-radius:6px;font-family:monospace;font-size:0.78rem;">
      <strong>GRUPO MISTER PERFUMARIA${canalLine}</strong><br>
      Pedido #${s.id} | ${s.date}<br>
      Cliente: ${s.client}<br>
      Entrega: ${s.shippingMethod || 'Loja'} | Status: ${s.orderStatus || 'Em Separação'}${trackLine}<br>
      Itens: ${s.items}${discLine}${obsLine}<br>
      <strong>TOTAL: ${fmtBRL(s.total)}</strong>
    </div>
  `;
  document.getElementById('cashToolModalOverlay').classList.add('active');
};
