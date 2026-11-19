// ============================================================================
// 1. PERSISTÊNCIA NUVEM / BACKEND API + FALLBACK OFFLINE LOCALSTORAGE
// ============================================================================
const API_URL = 'https://grupo-mister-backend.onrender.com';

const STORAGE_KEYS = {
  PRODUCTS: 'gm_perfume_products_v4',
  CLIENTS: 'gm_perfume_clients_v4',
  SALES: 'gm_perfume_sales_v4',
  QUOTES: 'gm_perfume_quotes_v4',
  WARRANTIES: 'gm_perfume_warranties_v4',
  CASH_MOVES: 'gm_perfume_cash_v4',
  RATES: 'gm_perfume_rates_v4',
  RMA: 'gm_perfume_rma_v4',
  FINANCE: 'gm_perfume_fin_v4',
  ACCOUNTS: 'gm_perfume_login_accounts_v4',
  SESSION: 'gm_perfume_active_login_session_v4'
};

const CloudSyncEngine = {
  async pushState(payload) {
    const pill = document.getElementById('cloudSyncPill');
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/state/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

// ============================================================================
// 2. DADOS INICIAIS (PERFUMES, DECANTS, VALIDADES & CONTAS DE LOGIN)
// ============================================================================
const DEFAULT_PRODUCTS = [
  { id: 'PRD-01', name: 'Lattafa Khamrah Eau de Parfum 100ml', imei: 'BATCH-KHM-26A', expiry: '2028-06-15', condition: 'Árabe', battery: 'EDP 100ml (Gourmand)', cost: 140.00, price: 249.90, qty: 12, nuvemId: '314890101', nuvemVarId: '994120101' },
  { id: 'PRD-02', name: 'Lattafa Asad Eau de Parfum 100ml', imei: 'BATCH-ASD-882C', expiry: '2028-04-10', condition: 'Árabe', battery: 'EDP 100ml (Ambarado)', cost: 120.00, price: 219.90, qty: 8, nuvemId: '314890102', nuvemVarId: '994120102' },
  { id: 'PRD-03', name: 'Baccarat Rouge 540 — MFK 70ml', imei: 'BATCH-BR540-LUX', expiry: '2027-12-20', condition: 'Nicho', battery: 'Extrait 70ml', cost: 1850.00, price: 2490.00, qty: 3, nuvemId: '314890103', nuvemVarId: '994120103' },
  { id: 'PRD-04', name: 'Creed Aventus Eau de Parfum 100ml', imei: 'BATCH-CRD-AV10', expiry: '2028-09-01', condition: 'Importado', battery: 'EDP 100ml', cost: 1600.00, price: 2190.00, qty: 4, nuvemId: '', nuvemVarId: '' },
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
  { id: '9054427', client: 'JULIANA ALMEIDA', phone: '(11) 99412-3308', seller: 'ADMIN', date: '15/10/2026 10:15', isoDate: '2026-10-15', type: 'Venda Presencial', payment: 'Pix', items: 'Decant 10ml — Parfums de Marly Layton (1x)', total: 99.90, status: 'Concluído' },
  { id: '9054490', client: 'MARCELO SOUZA', phone: '(11) 98765-4321', seller: 'ADMIN', date: '01/11/2026 16:40', isoDate: '2026-11-01', type: 'Venda Presencial', payment: 'Pix', items: 'Decant 5ml — Tom Ford Oud Wood (1x)', total: 69.90, status: 'Concluído' },
  { id: '9053818', client: 'RODRIGO CASTRO', phone: '(11) 99123-7744', seller: 'ADMIN', date: '18/11/2026 11:30', isoDate: '2026-11-18', type: 'Online / Nuvemshop', payment: 'Cartão de Crédito', items: 'Creed Aventus Eau de Parfum 100ml (1x)', total: 2190.00, status: 'Concluído' }
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

const DEFAULT_LOGIN_ACCOUNTS = [
  {
    id: 'ACC-01',
    username: 'admin',
    password: '123',
    displayName: 'Administrador',
    isAdmin: true,
    permissions: [
      'dashboard', 'pdv', 'clientes', 'historico_vendas', 'estoque',
      'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias',
      'trocas', 'financeiro', 'admin_only'
    ]
  }
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
let loginAccounts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) || DEFAULT_LOGIN_ACCOUNTS;
let activeAccount = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || null;

let modalCart = [];
let quoteCart = [];
let thermalLabelQueue = [];
let salesViewMode = 'table';

function saveAll() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  localStorage.setItem(STORAGE_KEYS.WARRANTIES, JSON.stringify(warranties));
  localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
  localStorage.setItem(STORAGE_KEYS.CASH_MOVES, JSON.stringify(cashMoves));
  localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(cardRates));
  localStorage.setItem(STORAGE_KEYS.RMA, JSON.stringify(rmaList));
  localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(finEntries));
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(loginAccounts));
  CloudSyncEngine.pushState({ products, clients, sales, warranties, quotes, finEntries, loginAccounts });
}

const fmtBRL = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ============================================================================
// 3. LOGIN POR USUÁRIO + SENHA & CRIAÇÃO DE LOGINS PELO ADMINISTRADOR
// ============================================================================
function getAllowedPermissionsForAccount(account) {
  if (!account) return ['dashboard'];
  if (account.isAdmin) {
    return [
      'dashboard', 'pdv', 'clientes', 'historico_vendas', 'estoque',
      'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias',
      'trocas', 'financeiro', 'admin_only'
    ];
  }
  return (account.permissions || ['dashboard']).filter(p => p !== 'admin_only');
}

function initLoginByCredentials() {
  const overlay = document.getElementById('loginScreenOverlay');
  const form = document.getElementById('formLoginSystem');
  const btnSwitch = document.getElementById('btnSwitchUser');

  if (activeAccount) {
    const found = loginAccounts.find(a => a.id === activeAccount.id);
    if (found) {
      activeAccount = found;
      overlay?.classList.remove('active');
      applyAccountVisibility(activeAccount);
    } else {
      activeAccount = null;
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      overlay?.classList.add('active');
    }
  } else {
    overlay?.classList.add('active');
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const typedUser = document.getElementById('loginUsernameInput').value.trim().toLowerCase();
    const typedPass = document.getElementById('loginPasswordInput').value;

    const match = loginAccounts.find(
      acc => acc.username.toLowerCase() === typedUser && acc.password === typedPass
    );

    if (!match) {
      return showToast('Usuário ou senha inválidos.');
    }

    activeAccount = match;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(activeAccount));
    document.getElementById('loginUsernameInput').value = '';
    document.getElementById('loginPasswordInput').value = '';
    overlay?.classList.remove('active');
    applyAccountVisibility(activeAccount);
    renderAccountsTable();
    showToast(`Sessão iniciada: ${activeAccount.username}`);
  });

  btnSwitch?.addEventListener('click', () => {
    activeAccount = null;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    document.getElementById('loginUsernameInput').value = '';
    document.getElementById('loginPasswordInput').value = '';
    overlay?.classList.add('active');
    document.getElementById('loginUsernameInput')?.focus();
  });

  document.getElementById('btnForceCloudSync')?.addEventListener('click', async () => {
    const ok = await CloudSyncEngine.pushState({ products, clients, sales, warranties, quotes, finEntries, loginAccounts });
    showToast(ok ? 'Dados sincronizados na nuvem!' : 'Backup local atualizado (servidor offline).');
  });

  initAdminAccountCreation();
}

function applyAccountVisibility(account) {
  if (!account) return;
  const nameEl = document.getElementById('loggedUserName');
  const roleEl = document.getElementById('loggedUserRole');
  if (nameEl) nameEl.textContent = account.displayName || account.username;
  if (roleEl) roleEl.textContent = account.isAdmin ? 'Administrador' : 'Usuário';

  const allowed = getAllowedPermissionsForAccount(account);

  document.querySelectorAll('#sidebarNavMenu [data-perm]').forEach(btn => {
    const reqPerm = btn.getAttribute('data-perm');
    btn.style.display = allowed.includes(reqPerm) ? 'flex' : 'none';
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

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeAccount || !activeAccount.isAdmin) {
      return showToast('Apenas o Administrador pode criar ou editar logins.');
    }

    const editId = document.getElementById('editAccountId').value;
    const username = document.getElementById('accUsernameInput').value.trim();
    const password = document.getElementById('accPasswordInput').value;
    const displayName = document.getElementById('accDisplayNameInput').value.trim() || username;
    const isAdmin = document.getElementById('accRoleTypeInput').value === 'admin';

    const checkedPerms = Array.from(document.querySelectorAll('.acc-perm-chk:checked')).map(c => c.value);
    const permissions = isAdmin
      ? ['dashboard', 'pdv', 'clientes', 'historico_vendas', 'estoque', 'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias', 'trocas', 'financeiro', 'admin_only']
      : checkedPerms.filter(p => p !== 'admin_only');

    const duplicate = loginAccounts.find(
      a => a.username.toLowerCase() === username.toLowerCase() && a.id !== editId
    );
    if (duplicate) {
      return showToast('Este nome de usuário já existe.');
    }

    if (editId) {
      const target = loginAccounts.find(a => a.id === editId);
      if (target) {
        target.username = username;
        target.password = password;
        target.displayName = displayName;
        target.isAdmin = isAdmin;
        target.permissions = permissions;
      }
      showToast('Login e visibilidade atualizados.');
    } else {
      loginAccounts.push({
        id: 'ACC-' + String(loginAccounts.length + 1).padStart(2, '0'),
        username,
        password,
        displayName,
        isAdmin,
        permissions
      });
      showToast('Novo login criado.');
    }

    saveAll();
    renderAccountsTable();
    if (activeAccount && editId === activeAccount.id) {
      activeAccount = loginAccounts.find(a => a.id === editId);
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(activeAccount));
      applyAccountVisibility(activeAccount);
    }
    form.reset();
    document.getElementById('editAccountId').value = '';
  });

  renderAccountsTable();
}

function renderAccountsTable() {
  const tbody = document.getElementById('tableAccountsList');
  if (!tbody) return;

  tbody.innerHTML = loginAccounts.map(acc => `
    <tr>
      <td><strong>${acc.username}</strong></td>
      <td>${acc.displayName}</td>
      <td>${acc.isAdmin ? '<span class="badge-tag badge-warning">Administrador</span>' : '<span class="badge-tag badge-info">Usuário</span>'}</td>
      <td>${acc.permissions.filter(p => p !== 'admin_only').map(p => `<span class="badge-tag badge-info">${p.toUpperCase()}</span>`).join(' ')}</td>
      <td style="display:flex; gap:0.35rem;">
        <button type="button" class="btn-sm btn-blue" onclick="editLoginAccount('${acc.id}')">Editar</button>
        ${acc.id !== 'ACC-01' ? `<button type="button" class="btn-sm btn-danger" onclick="removeLoginAccount('${acc.id}')">Excluir</button>` : ''}
      </td>
    </tr>
  `).join('');
}

window.editLoginAccount = function (id) {
  if (!activeAccount || !activeAccount.isAdmin) return;
  const acc = loginAccounts.find(a => a.id === id);
  if (!acc) return;
  document.getElementById('editAccountId').value = acc.id;
  document.getElementById('accUsernameInput').value = acc.username;
  document.getElementById('accPasswordInput').value = acc.password;
  document.getElementById('accDisplayNameInput').value = acc.displayName;
  document.getElementById('accRoleTypeInput').value = acc.isAdmin ? 'admin' : 'user';
  document.querySelectorAll('.acc-perm-chk').forEach(chk => {
    chk.checked = acc.permissions.includes(chk.value);
  });
};

window.removeLoginAccount = function (id) {
  if (!activeAccount || !activeAccount.isAdmin || id === 'ACC-01') return;
  loginAccounts = loginAccounts.filter(a => a.id !== id);
  saveAll();
  renderAccountsTable();
  showToast('Login removido.');
};

// ============================================================================
// 4. INICIALIZAÇÃO GERAL
// ============================================================================
function startApp() {
  initLoginByCredentials();
  initNavigation();
  initSalesAndPdv();
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
// 5. NAVEGAÇÃO SPA COM BLOQUEIO DE PERMISSÃO
// ============================================================================
function navigateToSection(targetId, labelText) {
  if ((targetId === 'criarLogins' || targetId === 'perfisPermissoes') && (!activeAccount || !activeAccount.isAdmin)) {
    return showToast('Acesso restrito ao Administrador.');
  }

  document.querySelectorAll('.nav-item, .submenu-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

  const activeBtn = document.querySelector(`.nav-item[data-target="${targetId}"], .submenu-item[data-target="${targetId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const targetSection = document.getElementById(targetId);
  if (targetSection) targetSection.classList.add('active');

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle && labelText) pageTitle.textContent = labelText;
}

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

  document.getElementById('btnClearData')?.addEventListener('click', () => {
    if (!activeAccount || !activeAccount.isAdmin) {
      return showToast('Apenas o Administrador pode restaurar os dados.');
    }
    if (confirm('Deseja restaurar os dados de demonstração da perfumaria GRUPO MISTER?')) {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      location.reload();
    }
  });
}

// ============================================================================
// 6. GERADOR DE ETIQUETAS TÉRMICAS 50x30MM
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
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:2rem;">Fila vazia. Adicione fragrâncias ao lado.</div>`;
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
// 7. ALERTAS DE RECOMPRA DE DECANTS & VALIDADE DE LOTES
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
// 8. DASHBOARD, PDV, ESTOQUE, CLIENTES, SIMULADORES & FINANCEIRO
// ============================================================================
function renderDashboard() {
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
  setText('dashReceita', fmtBRL(totalVendas));
  setText('dashTotalQty', `${totalQty} pedido(s)`);
  setText('dashTicketMedio', fmtBRL(ticketMedio));
  setText('dashPresencialCount', `${vendasPresenciais.length} pedidos`);
  setText('dashPresencialVal', fmtBRL(totalPresencialVal));
  setText('dashOnlineCount', `${vendasOnline.length} pedidos`);
  setText('dashOnlineVal', fmtBRL(totalOnlineVal));

  const barPres = document.getElementById('chartBarPresencial');
  const barOnl = document.getElementById('chartBarOnline');
  if (barPres) barPres.style.width = `${sharePresencial}%`;
  if (barOnl) barOnl.style.width = `${shareOnline}%`;
  setText('chartBarPresencialLabel', `${fmtBRL(totalPresencialVal)} (${sharePresencial}%)`);
  setText('chartBarOnlineLabel', `${fmtBRL(totalOnlineVal)} (${shareOnline}%)`);

  const tbody = document.getElementById('dashTableSales');
  if (tbody) {
    tbody.innerHTML = sales.slice(0, 6).map(s => `
      <tr>
        <td>${s.date}</td><td><strong>#${s.id}</strong></td><td>${s.items || 'Venda PDV'}</td>
        <td><span class="badge-tag badge-info">${s.payment || 'Pix'}</span></td><td><strong>${fmtBRL(s.total)}</strong></td>
      </tr>
    `).join('');
  }
}

async function pushStockToNuvemshop(product) {
  if (!product || !product.nuvemId || !product.nuvemVarId) return false;
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/nuvemshop/sync-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.nuvemId, variantId: product.nuvemVarId, newQty: product.qty })
    });
    return res.ok;
  } catch (_) { return false; }
}

function populateSelectDropdowns() {
  const clientOptions = `<option value="">Consumidor Balcão / Avulso</option>` + clients.map(c => `<option value="${c.cod}">${c.name} (${c.cpf})</option>`).join('');
  const modalClientSel = document.getElementById('modalClientSelect');
  const quoteClientSel = document.getElementById('quoteClientSelect');
  if (modalClientSel) modalClientSel.innerHTML = clientOptions;
  if (quoteClientSel) quoteClientSel.innerHTML = `<option value="">Cliente Avulso...</option>` + clients.map(c => `<option value="${c.cod}">${c.name}</option>`).join('');

  const availableProducts = products.filter(p => p.qty > 0);
  const prodOptions = `<option value="">Selecionar fragrância...</option>` + availableProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} — ${fmtBRL(p.price)} (${p.qty} un.)</option>`).join('');
  ['modalProductSelect', 'quoteProductSelect', 'upgTargetStockSelect'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = prodOptions; });

  const labelSel = document.getElementById('labelProductSelect');
  if (labelSel) labelSel.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (${p.imei || p.id})</option>`).join('');

  const fastSel = document.getElementById('fastPdvItemSelect');
  if (fastSel) fastSel.innerHTML = `<option value="">Selecionar item...</option>` + availableProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (${fmtBRL(p.price)})</option>`).join('') + `<option value="CUSTOM">+ Item Avulso</option>`;
}

function initSalesAndPdv() {
  const pdvOverlay = document.getElementById('pdvModalOverlay');
  document.getElementById('btnOpenPdvModal')?.addEventListener('click', () => {
    modalCart = []; renderModalCart();
    document.getElementById('modalSaleDate').value = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    pdvOverlay.classList.add('active');
  });
  document.getElementById('btnClosePdvModal')?.addEventListener('click', () => pdvOverlay.classList.remove('active'));
  document.getElementById('btnModalCancelSale')?.addEventListener('click', () => pdvOverlay.classList.remove('active'));

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
    const totalSale = modalCart.reduce((acc, i) => acc + i.total, 0);
    const newId = String(9054500 + sales.length + 1);

    modalCart.forEach(item => {
      const prod = products.find(p => p.id === item.prodId);
      if (prod) { prod.qty = Math.max(0, prod.qty - item.qty); pushStockToNuvemshop(prod); }
    });

    sales.unshift({
      id: newId,
      client: clientObj ? clientObj.name : 'CONSUMIDOR BALCÃO',
      phone: clientObj ? clientObj.phone : '',
      seller: document.getElementById('modalSellerSelect').value || (activeAccount?.displayName || activeAccount?.username || 'ADMIN'),
      date: document.getElementById('modalSaleDate').value,
      isoDate: new Date().toISOString().split('T')[0],
      type: 'Venda Presencial',
      payment: document.getElementById('modalPayMethod').value,
      items: modalCart.map(i => `${i.name} (${i.qty}x)`).join(', '),
      total: totalSale,
      status: 'Concluído'
    });
    saveAll(); renderAll(); pdvOverlay.classList.remove('active'); showToast(`Venda #${newId} concluída!`);
  });

  const fastOverlay = document.getElementById('fastPdvModalOverlay');
  document.getElementById('btnOpenFastPdvModal')?.addEventListener('click', () => fastOverlay.classList.add('active'));
  document.getElementById('btnCloseFastPdv')?.addEventListener('click', () => fastOverlay.classList.remove('active'));
  document.getElementById('btnCancelFastPdv')?.addEventListener('click', () => fastOverlay.classList.remove('active'));

  const fastSel = document.getElementById('fastPdvItemSelect');
  fastSel?.addEventListener('change', () => {
    const isCustom = fastSel.value === 'CUSTOM';
    document.getElementById('fastPdvCustomDescGroup').style.display = isCustom ? 'block' : 'none';
    const opt = fastSel.options[fastSel.selectedIndex];
    document.getElementById('fastPdvPrice').value = !isCustom && opt ? (opt.getAttribute('data-price') || '0') : '';
    const tot = (parseInt(document.getElementById('fastPdvQty').value, 10) || 1) * (parseFloat(document.getElementById('fastPdvPrice').value) || 0);
    document.getElementById('fastPdvTotalDisplay').textContent = fmtBRL(tot);
  });

  document.getElementById('formFastPdv')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const qty = parseInt(document.getElementById('fastPdvQty').value, 10) || 1;
    const price = parseFloat(document.getElementById('fastPdvPrice').value) || 0;
    const newId = String(9054500 + sales.length + 1);
    const prod = products.find(p => p.id === fastSel.value);
    if (prod) { prod.qty = Math.max(0, prod.qty - qty); pushStockToNuvemshop(prod); }

    sales.unshift({
      id: newId,
      client: 'CONSUMIDOR BALCÃO',
      seller: document.getElementById('fastPdvSeller').value,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isoDate: new Date().toISOString().split('T')[0],
      type: 'PDV Express',
      payment: document.getElementById('fastPdvPayMethod').value,
      items: prod ? `${prod.name} (${qty}x)` : `${document.getElementById('fastPdvCustomDesc').value} (${qty}x)`,
      total: qty * price,
      status: 'Concluído'
    });
    saveAll(); renderAll(); fastOverlay.classList.remove('active'); showToast(`Venda Express #${newId} registrada!`);
  });

  document.getElementById('btnToggleListModel')?.addEventListener('click', () => {
    salesViewMode = salesViewMode === 'table' ? 'cards' : 'table';
    document.getElementById('listModelLabel').textContent = `Modelo de lista: ${salesViewMode === 'table' ? 'Tabela' : 'Cards'}`;
    document.getElementById('salesTableView').style.display = salesViewMode === 'table' ? 'block' : 'none';
    document.getElementById('salesCardsView').style.display = salesViewMode === 'cards' ? 'block' : 'none';
  });

  document.getElementById('quickStockSearch')?.addEventListener('input', renderQuickStock);
  document.getElementById('quickStockCondition')?.addEventListener('change', renderQuickStock);
}

function renderModalCart() {
  const tbody = document.getElementById('modalCartTable');
  const payVal = document.getElementById('modalPayValue');
  if (!tbody) return;
  if (modalCart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Carrinho vazio</td></tr>';
    if (payVal) payVal.value = 'R$ 0,00';
    return;
  }
  const total = modalCart.reduce((acc, i) => acc + i.total, 0);
  tbody.innerHTML = modalCart.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtBRL(i.unitPrice)}</td><td><strong>${fmtBRL(i.total)}</strong></td></tr>`).join('');
  if (payVal) payVal.value = fmtBRL(total);
}

function renderSales() {
  const tbody = document.getElementById('tableSalesHistory');
  const cards = document.getElementById('cardsSalesList');
  if (tbody) tbody.innerHTML = sales.map(s => `<tr><td><strong>#${s.id}</strong></td><td>${s.date}</td><td>${s.client}</td><td>${s.seller}</td><td>${s.items}</td><td>${s.payment}</td><td><strong>${fmtBRL(s.total)}</strong></td><td><button type="button" class="btn-sm" onclick="openReceiptModal('${s.id}')"><i class="ph ph-printer"></i> Recibo</button></td></tr>`).join('');
  if (cards) cards.innerHTML = sales.map(s => `<div class="sale-card-item"><div style="display:flex; justify-content:space-between;"><strong>#${s.id}</strong><span class="badge-tag badge-receita">${s.status}</span></div><strong>${s.client}</strong><small style="color:var(--text-muted);">${s.items}</small><div style="display:flex; justify-content:space-between; align-items:center;"><strong style="color:var(--success);">${fmtBRL(s.total)}</strong><button type="button" class="btn-sm" onclick="openReceiptModal('${s.id}')">Recibo</button></div></div>`).join('');
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
  renderModalCart();
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
  sales.unshift({ id: String(9054500 + sales.length + 1), client: q.clientName, phone: q.clientPhone, seller: q.seller, date: new Date().toLocaleDateString('pt-BR'), isoDate: new Date().toISOString().split('T')[0], type: 'Orçamento Convertido', payment: 'Pix', items: q.items.map(i => `${i.name} (${i.qty}x)`).join(', '), total: q.netTotal, status: 'Concluído' });
  saveAll(); renderAll(); showToast(`Orçamento ${cod} convertido em venda!`);
};

function initWarrantiesAndFiscalModule() {}
function renderWarranties() {
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('warMetricActive', warranties.length);
  setTxt('warMetricExpiring', 0);
  setTxt('warMetricExpired', 0);
  setTxt('warMetricTotal', warranties.length);
  const tbody = document.getElementById('tableWarrantiesList');
  if (tbody) tbody.innerHTML = warranties.map(w => `<tr><td><strong>${w.cod}</strong></td><td>${w.clientName}</td><td>${w.deviceModel}</td><td><code>${w.imei}</code></td><td><span class="badge-tag badge-info">${w.term}</span></td><td>${w.invoiceNumber || 'Pendente'}</td><td>${w.startDate} (${w.days}d)</td><td><span class="badge-tag badge-receita">Ativa</span></td><td><button type="button" class="btn-sm btn-green" onclick="showToast('Certificado enviado!')"><i class="ph ph-whatsapp-logo"></i></button></td></tr>`).join('');
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
    html += `<tr><td>${i}x</td><td><input type="number" class="rate-input" data-idx="${i}" value="${rate}" step="0.01" style="width:65px;background:#0b0f17;border:1px solid var(--border);color:#fff;padding:2px;" />%</td><td><strong>${fmtBRL(tot / i)}</strong></td><td>${fmtBRL(tot)}</td><td style="color:var(--success);">${fmtBRL(net)}</td></tr>`;
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
  modalCart = []; renderModalCart();
  const sel = document.getElementById('modalClientSelect'); if (sel) sel.value = cod;
  document.getElementById('modalSaleDate').value = new Date().toLocaleDateString('pt-BR');
  document.getElementById('pdvModalOverlay').classList.add('active');
};

window.openNewProductModal = function () { document.getElementById('productModalOverlay').classList.add('active'); };

function initStockModule() {
  const overlay = document.getElementById('productModalOverlay');
  document.getElementById('btnCloseProductModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelProductModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('formNewProduct')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newProd = { id: 'PRD-' + String(products.length + 1).padStart(2, '0'), name: document.getElementById('prodName').value.trim(), imei: document.getElementById('prodImei').value.trim(), expiry: document.getElementById('prodExpiry').value, condition: document.getElementById('prodCondition').value, battery: document.getElementById('prodBattery').value.trim(), cost: parseFloat(document.getElementById('prodCost').value) || 0, price: parseFloat(document.getElementById('prodPrice').value) || 0, qty: parseInt(document.getElementById('prodQty').value, 10) || 0, nuvemId: document.getElementById('prodNuvemId').value.trim(), nuvemVarId: document.getElementById('prodNuvemVariantId').value.trim() };
    products.unshift(newProd); pushStockToNuvemshop(newProd); saveAll(); renderAll(); overlay.classList.remove('active'); showToast('Fragrância cadastrada!');
  });
  ['stockSearchInput', 'stockConditionFilter', 'stockAvailabilityFilter'].forEach(id => document.getElementById(id)?.addEventListener('input', renderStock));
}

function renderStock() {
  const term = (document.getElementById('stockSearchInput')?.value || '').toLowerCase();
  const cond = document.getElementById('stockConditionFilter')?.value || 'todos';
  const avail = document.getElementById('stockAvailabilityFilter')?.value || 'todos';
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('stockMetricUnits', products.reduce((a, p) => a + p.qty, 0));
  setTxt('stockMetricCost', fmtBRL(products.reduce((a, p) => a + p.cost * p.qty, 0)));
  setTxt('stockMetricSale', fmtBRL(products.reduce((a, p) => a + p.price * p.qty, 0)));
  setTxt('stockMetricLow', products.filter(p => p.qty <= 2).length);

  const filtered = products.filter(p => (p.name.toLowerCase().includes(term) || (p.imei || '').toLowerCase().includes(term)) && (cond === 'todos' || p.condition === cond) && (avail === 'todos' || (avail === 'disponivel' && p.qty > 0) || (avail === 'esgotado' && p.qty === 0)));
  const tbody = document.getElementById('tableStockDetailed');
  if (tbody) tbody.innerHTML = filtered.map(p => {
    const margin = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '0.0';
    return `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td><code>${p.imei || '-'}</code></td><td><span class="badge-tag badge-info">${p.condition}</span></td><td>${p.expiry ? new Date(p.expiry + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td><td>${fmtBRL(p.cost)}</td><td><strong>${fmtBRL(p.price)}</strong></td><td><span class="badge-tag badge-receita">${margin}%</span></td><td><strong>${p.qty}</strong></td><td><button type="button" class="btn-sm" onclick="adjustStockQty('${p.id}', 1)">+1</button> <button type="button" class="btn-sm" onclick="adjustStockQty('${p.id}', -1)">-1</button></td></tr>`;
  }).join('');
}

window.adjustStockQty = function (id, delta) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;
  prod.qty = Math.max(0, prod.qty + delta);
  pushStockToNuvemshop(prod); saveAll(); renderAll();
};

function initRmaModule() {}
function renderRma() {
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('rmaMetricTotal', rmaList.length);
  setTxt('rmaMetricPending', rmaList.filter(r => r.status === 'Em Análise').length);
  setTxt('rmaMetricDone', rmaList.filter(r => r.status === 'Concluído').length);
  setTxt('rmaMetricRefunded', fmtBRL(rmaList.filter(r => r.type === 'Devolução / Estorno').reduce((a, r) => a + r.amount, 0)));
  const tbody = document.getElementById('tableRmaList');
  if (tbody) tbody.innerHTML = rmaList.map(r => `<tr><td><strong>${r.cod}</strong></td><td>${r.date}</td><td>${r.clientName}</td><td>${r.deviceName}</td><td>${r.type}</td><td>${fmtBRL(r.amount)}</td><td><span class="badge-tag badge-receita">${r.status}</span></td><td>-</td></tr>`).join('');
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
  document.getElementById('cashToolModalTitle').textContent = `Comprovante #${s.id}`;
  document.getElementById('cashToolModalBody').innerHTML = `<div style="background:#fff;color:#111;padding:1rem;border-radius:6px;font-family:monospace;"><strong>GRUPO MISTER PERFUMARIA</strong><br>Pedido #${s.id} | ${s.date}<br>Cliente: ${s.client}<br>Itens: ${s.items}<br><strong>TOTAL: ${fmtBRL(s.total)}</strong></div>`;
  document.getElementById('cashToolModalOverlay').classList.add('active');
};
