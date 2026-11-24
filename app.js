// ============================================================================
// 1. PERSISTÊNCIA NUVEM / BACKEND POSTGRESQL + AUTENTICAÇÃO POR TOKEN + 2FA
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
let activeAccount = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_USER) || 'null');
let pendingTwoFactorToken = null;
let serverUsersList = [];

function isCurrentUserAdmin() {
  if (!activeAccount) return false;
  return Boolean(
    activeAccount.isAdmin === true ||
    activeAccount.is_admin === true ||
    String(activeAccount.role || '').toLowerCase() === 'admin' ||
    String(activeAccount.username || '').toLowerCase() === 'admin'
  );
}

function hasStockAccess() {
  if (!activeAccount) return false;
  if (isCurrentUserAdmin()) return true;
  const perms = Array.isArray(activeAccount.permissions) ? activeAccount.permissions : [];
  return perms.includes('estoque');
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

function formatDateSafe(dateStr, fallback = '-') {
  if (!dateStr) return fallback;
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())
    ? `${String(dateStr).trim()}T00:00:00`
    : String(dateStr).trim();
  const d = new Date(isoCandidate);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
}

// ============================================================================
// IDENTIDADE VISUAL GLOBAL DO SISTEMA (CORES SEMÂNTICAS, BOTÃO AÇÕES & CARDS)
// ============================================================================
function injectLayoutAndActionStyles() {
  if (document.getElementById('gmPdvCompactAndGithubMenuStyles')) return;
  const style = document.createElement('style');
  style.id = 'gmPdvCompactAndGithubMenuStyles';
  style.textContent = `
    .content-section,
    .content-section .table-responsive,
    .modal-overlay .modal-content {
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    .content-section .table-responsive {
      width: 100% !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
      border-radius: 10px;
    }

    .content-section table {
      width: 100% !important;
      border-collapse: collapse !important;
    }

    .content-section th,
    .content-section td {
      padding: 0.58rem 0.55rem !important;
      font-size: 0.82rem !important;
      vertical-align: middle !important;
      line-height: 1.38;
    }

    .content-section th {
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--border, #252a34);
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .content-section td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .content-section tbody tr:hover {
      background: rgba(255, 255, 255, 0.025);
    }

    .content-section .form-row,
    .content-section .grid-2,
    .content-section .grid-3,
    .content-section .pdv-layout,
    .modal-overlay .modal-content {
      flex-wrap: wrap !important;
      gap: 0.6rem !important;
    }

    .content-section input,
    .content-section select,
    .content-section textarea,
    .modal-overlay input,
    .modal-overlay select,
    .modal-overlay textarea {
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
      font-size: 0.86rem !important;
    }

    /* Escrita dos botões proporcional ao tamanho do campo */
    .btn-sm {
      font-size: 0.86rem !important;
      font-weight: 600 !important;
      padding: 0.42rem 0.78rem !important;
      line-height: 1.25 !important;
    }

    .btn-primary,
    .btn-danger,
    .btn-green,
    .btn-blue {
      font-size: 0.9rem !important;
      font-weight: 600 !important;
      line-height: 1.25 !important;
    }

    /* Histórico de vendas sempre apenas em cards */
    #btnToggleListModel,
    #salesTableView {
      display: none !important;
    }

    #salesCardsView {
      display: block !important;
    }

    #cardsSalesList {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }

    .sale-card-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border, #252a34);
      border-left: 3px solid #60a5fa;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    /* Badges semânticos globais para fácil identificação visual */
    .badge-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.24rem 0.6rem;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 700;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .badge-tag.badge-receita {
      background: rgba(16, 185, 129, 0.16) !important;
      color: #34d399 !important;
      border-color: rgba(16, 185, 129, 0.4) !important;
    }

    .badge-tag.badge-despesa {
      background: rgba(239, 68, 68, 0.16) !important;
      color: #f87171 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
    }

    .badge-tag.badge-warning {
      background: rgba(245, 158, 11, 0.16) !important;
      color: #fbbf24 !important;
      border-color: rgba(245, 158, 11, 0.4) !important;
    }

    .badge-tag.badge-info {
      background: rgba(59, 130, 246, 0.16) !important;
      color: #60a5fa !important;
      border-color: rgba(59, 130, 246, 0.38) !important;
    }

    .badge-tag.badge-motoboy {
      background: rgba(168, 85, 247, 0.18) !important;
      color: #c084fc !important;
      border-color: rgba(168, 85, 247, 0.42) !important;
    }

    .badge-tag.badge-correios {
      background: rgba(14, 165, 233, 0.18) !important;
      color: #38bdf8 !important;
      border-color: rgba(14, 165, 233, 0.42) !important;
    }

    .badge-tag.badge-nuvem {
      background: rgba(99, 102, 241, 0.2) !important;
      color: #a5b4fc !important;
      border-color: rgba(99, 102, 241, 0.45) !important;
    }

    /* Seletor de status sem corte + cores distintas */
    .gm-status-cell-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: nowrap;
      white-space: nowrap;
    }

    select.status-inline-select {
      min-width: 150px !important;
      width: auto !important;
      padding: 0.42rem 1.8rem 0.42rem 0.72rem !important;
      border-radius: 8px !important;
      font-size: 0.84rem !important;
      font-weight: 700 !important;
      line-height: 1.25 !important;
      white-space: nowrap !important;
      cursor: pointer;
      border: 1px solid transparent;
    }

    select.status-inline-select.st-separacao {
      background-color: rgba(245, 158, 11, 0.18) !important;
      color: #fbbf24 !important;
      border-color: rgba(245, 158, 11, 0.48) !important;
    }

    select.status-inline-select.st-separado {
      background-color: rgba(59, 130, 246, 0.2) !important;
      color: #60a5fa !important;
      border-color: rgba(59, 130, 246, 0.48) !important;
    }

    select.status-inline-select.st-enviado {
      background-color: rgba(168, 85, 247, 0.2) !important;
      color: #c084fc !important;
      border-color: rgba(168, 85, 247, 0.48) !important;
    }

    select.status-inline-select.st-entregue {
      background-color: rgba(16, 185, 129, 0.2) !important;
      color: #34d399 !important;
      border-color: rgba(16, 185, 129, 0.48) !important;
    }

    .gm-sep-tag {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Botão "Ações ▾" e caixa seletora proporcional alinhada à esquerda */
    .gm-gh-action-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .gm-gh-pencil-btn {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.45rem;
      height: 36px;
      padding: 0 0.85rem;
      border-radius: 8px;
      border: 1px solid #30363d;
      background: #181d26;
      color: #f3f4f6;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .gm-gh-pencil-btn:hover {
      background: #232a36;
      border-color: #60a5fa;
    }

    .gm-gh-dropdown {
      display: none;
      position: fixed;
      width: max-content;
      min-width: 158px;
      max-width: 220px;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 10px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.78);
      padding: 5px;
      z-index: 99999;
      text-align: left;
    }

    .gm-gh-dropdown.open {
      display: block;
    }

    .gm-gh-dropdown-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      padding: 8px 11px;
      border: none;
      background: transparent;
      color: #e6edf3;
      font-size: 0.88rem;
      font-weight: 600;
      text-align: left;
      border-radius: 7px;
      cursor: pointer;
    }

    .gm-gh-dropdown-item:hover {
      background: #21262d;
    }

    .gm-gh-dropdown-item.danger-item {
      color: #f87171;
    }

    .gm-gh-dropdown-item.danger-item:hover {
      background: rgba(239, 68, 68, 0.14);
    }

    .gm-gh-dropdown-divider {
      height: 1px;
      background: #262c36;
      margin: 4px 2px;
    }

    /* Segmented filter toggles (estilo referência sem IMEI) */
    .gm-seg-filters-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 1.25rem;
      align-items: flex-end;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .gm-seg-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .gm-seg-group label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #cbd5e1;
      margin: 0;
    }

    .gm-seg-pills {
      display: inline-flex;
      flex-wrap: wrap;
      background: #10151f;
      border: 1px solid #283142;
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    .gm-seg-btn {
      border: none;
      background: transparent;
      color: #9ca3af;
      font-size: 0.79rem;
      font-weight: 600;
      padding: 0.34rem 0.64rem;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.14s ease;
    }

    .gm-seg-btn:hover {
      color: #f3f4f6;
      background: rgba(255, 255, 255, 0.04);
    }

    .gm-seg-btn.active {
      background: #3b82f6;
      color: #ffffff;
    }

    /* Identidade unificada dos modais e blocos do modal de edição */
    .gm-modal-section-card {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid var(--border, #252a34);
      border-left: 3px solid #60a5fa;
      border-radius: 8px;
      padding: 0.7rem 0.8rem;
      margin-bottom: 0.75rem;
    }

    .gm-modal-section-card.accent-amber {
      border-left-color: #fbbf24;
    }

    .gm-modal-section-card.accent-emerald {
      border-left-color: #34d399;
    }

    .gm-modal-section-title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #9ca3af;
      margin-bottom: 0.55rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .gm-sale-item-row {
      display: grid;
      grid-template-columns: minmax(140px, 1.8fr) 74px 105px 95px 34px;
      gap: 0.45rem;
      align-items: center;
      margin-bottom: 0.45rem;
      background: rgba(15, 23, 42, 0.45);
      padding: 0.42rem 0.5rem;
      border-radius: 6px;
      border: 1px solid rgba(96, 165, 250, 0.22);
    }

    .gm-sale-item-row input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      font-size: 0.84rem;
      padding: 0.38rem 0.5rem;
    }

    .gm-edit-sale-card {
      max-width: 740px !important;
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
    }

    /* Opacidade / fundo sólido no modal Visualizar para máxima leitura */
    #viewSaleModalOverlay.modal-overlay,
    #viewStockProductModalOverlay.modal-overlay {
      background: rgba(7, 10, 16, 0.9) !important;
      backdrop-filter: blur(4px);
      z-index: 100000 !important;
    }

    .gm-view-modal-card {
      max-width: 780px !important;
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
      background: #141923 !important;
      border: 1px solid #2d3545 !important;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.88) !important;
      opacity: 1 !important;
    }

    .gm-view-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.65rem;
      margin-bottom: 0.85rem;
    }

    .gm-view-box {
      background: #1b2230 !important;
      border: 1px solid #2a3344 !important;
      border-left: 3px solid #60a5fa !important;
      border-radius: 8px;
      padding: 0.65rem 0.8rem;
      opacity: 1 !important;
    }

    .gm-view-box small {
      display: block;
      color: #9ca3af !important;
      font-size: 0.74rem;
      margin-bottom: 0.22rem;
    }

    .gm-view-box strong {
      font-size: 0.92rem;
      color: #f3f4f6 !important;
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// 2. DADOS INICIAIS
// ============================================================================
const DEFAULT_PRODUCTS = [];

const DEFAULT_CLIENTS = [
  { cod: 'CLI-001', name: 'MARCELO SOUZA', cpf: '384.910.228-40', phone: '(11) 98765-4321', category: 'VIP / Recorrente', notes: 'Colecionador de árabes e nichos' },
  { cod: 'CLI-002', name: 'JULIANA ALMEIDA', cpf: '291.445.882-19', phone: '(11) 99412-3308', category: 'Cliente Final', notes: 'Ama decants 10ml e gourmands' },
  { cod: 'CLI-003', name: 'RODRIGO CASTRO', cpf: '412.889.104-55', phone: '(11) 99123-7744', category: 'VIP / Recorrente', notes: 'Comprador de Creed e Tom Ford' }
];

const DEFAULT_SALES = [];
const DEFAULT_WARRANTIES = [];
const DEFAULT_QUOTES = [];
const DEFAULT_RMA = [];
const DEFAULT_FINANCE = [];
const DEFAULT_RATES = [0, 3.49, 4.99, 5.89, 6.79, 7.69, 8.59, 9.49, 10.39, 11.29, 12.19, 12.99, 13.89];

function loadJsonKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

let products = loadJsonKey(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
let clients = loadJsonKey(STORAGE_KEYS.CLIENTS, DEFAULT_CLIENTS);
let sales = loadJsonKey(STORAGE_KEYS.SALES, DEFAULT_SALES);
let warranties = loadJsonKey(STORAGE_KEYS.WARRANTIES, DEFAULT_WARRANTIES);
let quotes = loadJsonKey(STORAGE_KEYS.QUOTES, DEFAULT_QUOTES);
let cashMoves = loadJsonKey(STORAGE_KEYS.CASH_MOVES, []);
let cardRates = loadJsonKey(STORAGE_KEYS.RATES, DEFAULT_RATES);
let rmaList = loadJsonKey(STORAGE_KEYS.RMA, DEFAULT_RMA);
let finEntries = loadJsonKey(STORAGE_KEYS.FINANCE, DEFAULT_FINANCE);

// Estado dos filtros segmentados do Estoque (estilo referência sem IMEI)
let stockOnlyInStockFilter = 'no';      // 'no' | 'yes'
let stockSupplierFilter = 'all';        // 'all' | 'yes' | 'no'
let stockLowStockFilter = 'no';         // 'no' | 'yes'
let stockFormatFilter = 'all';          // 'all' | 'decant' | 'bottle'
let stockExpiryAlertFilter = 'all';     // 'all' | 'expiring'
let stockHasCostFilter = 'all';         // 'all' | 'yes' | 'no'

// Estado da subaba "Consulta de Estoque" dentro de "Comercial" (somente leitura, sem custo/margem)
let commercialCatalogFormatFilter = 'all';   // 'all' | 'decant' | 'bottle'
let commercialCatalogOnlyAvailable = true;   // true | false

function isDecantProduct(prod) {
  if (!prod) return false;
  const cat = String(prod.condition || '').toLowerCase();
  const name = String(prod.name || '').toLowerCase();
  const vol = String(prod.battery || '').toLowerCase();
  if (cat.includes('decant') || name.includes('decant') || vol.includes('decant')) return true;
  if (/\b(2ml|5ml|10ml)\b/.test(name) || /\b(2ml|5ml|10ml)\b/.test(vol)) return true;
  return false;
}

function isExpiringOrExpiredProduct(prod) {
  if (!prod || !prod.expiry) return false;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(prod.expiry).trim())
    ? `${String(prod.expiry).trim()}T00:00:00`
    : String(prod.expiry).trim();
  const expDate = new Date(iso);
  if (Number.isNaN(expDate.getTime())) return false;
  const diffDays = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays <= 60;
}

function parseSaleItemsStringToArray(itemsStr = '') {
  const clean = String(itemsStr || '').trim();
  if (!clean) return [];
  return clean.split(',').map(part => {
    const seg = part.trim();
    const match = seg.match(/^(.*?)\s*\((\d+)x\)$/i);
    if (match) {
      return {
        name: match[1].trim(),
        qty: Math.max(1, parseInt(match[2], 10) || 1),
        price: 0
      };
    }
    return { name: seg, qty: 1, price: 0 };
  }).filter(it => it.name);
}

function formatSaleItemsArrayToString(rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return '';
  return rawItems
    .filter(it => it && String(it.name || '').trim())
    .map(it => `${String(it.name).trim()} (${Math.max(1, parseInt(it.qty, 10) || 1)}x)`)
    .join(', ');
}

function normalizeSalesArray() {
  if (!Array.isArray(sales)) sales = [];
  sales.forEach(s => {
    if (!s.orderStatus) s.orderStatus = s.shippingPacked ? 'Entregue' : 'Em Separação';
    if (typeof s.observation !== 'string') s.observation = '';
    if (typeof s.trackingCode !== 'string') s.trackingCode = '';
    if (!s.type) s.type = 'Venda Presencial';
    if (!Array.isArray(s.rawItems) || s.rawItems.length === 0) {
      s.rawItems = parseSaleItemsStringToArray(s.items);
    }
    if (!s.items && Array.isArray(s.rawItems) && s.rawItems.length > 0) {
      s.items = formatSaleItemsArrayToString(s.rawItems);
    }
  });
}
normalizeSalesArray();

const seenShippingOrderIds = new Set(
  sales
    .filter(s => (s.orderStatus || 'Em Separação') === 'Em Separação' && s.shippingMethod && s.shippingMethod !== 'Retirada na Loja')
    .map(s => String(s.id))
);

let modalCart = [];
let quoteCart = [];
let thermalLabelQueue = [];
let parsedNuvemItems = [];
let salesViewMode = 'cards';
let editingSaleItemsDraft = [];

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
// BOTÃO DE MENU MOBILE / SIDEBAR RESPONSIVA
// ============================================================================
function setMobileSidebarOpen(open) {
  const sidebar = document.getElementById('appSidebar') || document.querySelector('aside, .sidebar, .sidenav, .app-sidebar');
  const overlay = document.getElementById('mobileSidebarOverlay');
  if (!sidebar) return;

  if (open && window.innerWidth <= 900) {
    sidebar.classList.add('open');
    if (overlay) {
      overlay.classList.add('active');
      overlay.style.display = 'block';
    }
  } else {
    sidebar.classList.remove('open');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.display = 'none';
    }
  }
}

function initMobileSidebarToggle() {
  const btnOpen = document.getElementById('btnMobileMenuToggle');
  const btnClose = document.getElementById('btnCloseMobileSidebar');
  const overlay = document.getElementById('mobileSidebarOverlay');

  btnOpen?.addEventListener('click', (e) => {
    e.stopPropagation();
    const sidebar = document.getElementById('appSidebar') || document.querySelector('aside, .sidebar, .sidenav, .app-sidebar');
    const isOpen = sidebar?.classList.contains('open');
    setMobileSidebarOpen(!isOpen);
  });

  btnClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    setMobileSidebarOpen(false);
  });

  overlay?.addEventListener('click', () => {
    setMobileSidebarOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      setMobileSidebarOpen(false);
    }
  });
}

// ============================================================================
// SINCRONIZAÇÃO COM POSTGRESQL / NUVEMSHOP
// ============================================================================
const CloudSyncEngine = {
  async pullState(notifyNewNuvem = true) {
    if (!authToken) return false;
    const pill = document.getElementById('cloudSyncPill');
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/state`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        logoutCurrentSession(false);
        return false;
      }
      if (res.ok) {
        const data = await res.json();
        const p = data ? (data.state || data.payload) : null;
        if (p && typeof p === 'object') {
          if (Array.isArray(p.products)) products = p.products;
          if (Array.isArray(p.clients)) clients = p.clients;
          else if (Array.isArray(p.customers)) clients = p.customers;
          if (Array.isArray(p.sales)) sales = p.sales;
          if (Array.isArray(p.warranties)) warranties = p.warranties;
          if (Array.isArray(p.quotes)) quotes = p.quotes;
          if (Array.isArray(p.finEntries)) finEntries = p.finEntries;

          normalizeSalesArray();
          persistLocalOnly();
          renderAll();

          const pendingShippingSales = sales.filter(
            s => (s.orderStatus || 'Em Separação') === 'Em Separação' && s.shippingMethod && s.shippingMethod !== 'Retirada na Loja'
          );

          if (notifyNewNuvem) {
            const brandNewOrders = pendingShippingSales.filter(s => !seenShippingOrderIds.has(String(s.id)));
            brandNewOrders.forEach(order => {
              seenShippingOrderIds.add(String(order.id));
              triggerNewShippingNotification(order);
            });
          } else {
            pendingShippingSales.forEach(order => seenShippingOrderIds.add(String(order.id)));
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
    if (!authToken) return false;
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/state`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ state: payload })
      });
      if (res.status === 401) {
        logoutCurrentSession(false);
        return false;
      }
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

setInterval(() => {
  if (authToken) {
    CloudSyncEngine.pullState(true);
  }
}, 15000);

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
  seenShippingOrderIds.add(String(sale.id));
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
// 3. AUTENTICAÇÃO (2FA POR E-MAIL + RECUPERAÇÃO DE SENHA + OLHINHO DE SENHA)
// ============================================================================
function getAllowedPermissionsForAccount(account) {
  if (!account) return ['dashboard'];
  if (isCurrentUserAdmin()) {
    return [
      'dashboard', 'pdv', 'consulta_estoque', 'envios', 'clientes', 'historico_vendas', 'estoque',
      'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias',
      'trocas', 'financeiro', 'admin_only'
    ];
  }
  const base = (Array.isArray(account.permissions) ? account.permissions : ['dashboard']).filter(p => p !== 'admin_only');
  if ((base.includes('pdv') || base.includes('clientes') || base.includes('historico_vendas')) && !base.includes('consulta_estoque')) {
    base.push('consulta_estoque');
  }
  return base;
}

function setLoginOverlayVisible(visible) {
  const overlay = document.getElementById('loginScreenOverlay');
  if (!overlay) return;
  if (visible) {
    overlay.classList.add('active');
    overlay.style.display = 'flex';
  } else {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
}

function showLoginStep(step) {
  const formLogin = document.getElementById('formLoginSystem');
  const form2fa = document.getElementById('formVerifyTwoFactor');
  const forgotBox = document.getElementById('forgotPasswordBox');
  const confirmResetForm = document.getElementById('formConfirmPasswordReset');

  if (formLogin) formLogin.style.display = step === 'login' ? 'block' : 'none';
  if (form2fa) form2fa.style.display = step === '2fa' ? 'block' : 'none';
  if (forgotBox) forgotBox.style.display = step === 'forgot' ? 'block' : 'none';

  if (step === 'forgot' && confirmResetForm) {
    confirmResetForm.style.display = 'none';
  }
}

function injectPasswordEyeAnd2faBox() {
  const passInput = document.getElementById('loginPasswordInput');
  if (passInput && !document.getElementById('gmTogglePasswordEye')) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative; display:flex; align-items:center; width:100%;';
    passInput.parentNode.insertBefore(wrap, passInput);
    wrap.appendChild(passInput);
    passInput.style.paddingRight = '40px';
    passInput.style.width = '100%';

    const eyeBtn = document.createElement('button');
    eyeBtn.id = 'gmTogglePasswordEye';
    eyeBtn.type = 'button';
    eyeBtn.title = 'Mostrar ou ocultar senha';
    eyeBtn.innerHTML = '👁️';
    eyeBtn.style.cssText = `
      position:absolute; right:8px; background:transparent; border:none;
      color:#9ca3af; cursor:pointer; font-size:15px; padding:4px;
    `;
    eyeBtn.addEventListener('click', () => {
      const isPwd = passInput.type === 'password';
      passInput.type = isPwd ? 'text' : 'password';
      eyeBtn.textContent = isPwd ? '🙈' : '👁️';
    });
    wrap.appendChild(eyeBtn);
  }

  const form2fa = document.getElementById('formVerifyTwoFactor');
  const code2faInput = document.getElementById('twoFactorCodeInput');
  form2fa?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = (code2faInput?.value || '').trim();
    const btnConfirm = document.getElementById('btnConfirmTwoFactor');
    if (!pendingTwoFactorToken || code.length < 4) {
      return showToast('Digite o código enviado para o seu e-mail.');
    }
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = '<i class="ph ph-spinner"></i> Verificando código...';
    }
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: pendingTwoFactorToken, code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token || !data.user) {
        return showToast(data.error || 'Código 2FA inválido ou expirado.');
      }
      pendingTwoFactorToken = null;
      showLoginStep('login');
      await completeLoginSession(data.token, data.user);
    } catch (_) {
      showToast('Erro ao validar código 2FA.');
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar Código e Entrar';
      }
    }
  });

  document.getElementById('btnBackToLoginFrom2fa')?.addEventListener('click', (e) => {
    e.preventDefault();
    pendingTwoFactorToken = null;
    if (code2faInput) code2faInput.value = '';
    showLoginStep('login');
  });

  document.getElementById('btnOpenForgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    const currentUserVal = document.getElementById('loginUsernameInput')?.value.trim() || '';
    const forgotInp = document.getElementById('forgotUserOrEmailInput');
    if (forgotInp && currentUserVal) forgotInp.value = currentUserVal;
    showLoginStep('forgot');
  });

  document.getElementById('btnBackToLoginFromForgot')?.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginStep('login');
  });

  document.getElementById('formRequestPasswordReset')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = (document.getElementById('forgotUserOrEmailInput')?.value || '').trim();
    const btnSend = document.getElementById('btnSendResetCode');
    if (!identifier) return showToast('Informe seu usuário ou e-mail.');

    if (btnSend) {
      btnSend.disabled = true;
      btnSend.innerHTML = '<i class="ph ph-spinner"></i> Enviando código...';
    }
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, username: identifier, email: identifier })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return showToast(data.error || 'Não foi possível enviar o código de recuperação.');
      }
      const confirmForm = document.getElementById('formConfirmPasswordReset');
      const hintEl = document.getElementById('resetCodeSentHint');
      if (confirmForm) confirmForm.style.display = 'block';
      if (hintEl) hintEl.textContent = data.message || 'Código enviado para o e-mail cadastrado. Preencha abaixo para redefinir.';
      document.getElementById('resetCodeInput')?.focus();
      showToast('Código de recuperação enviado!');
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    } finally {
      if (btnSend) {
        btnSend.disabled = false;
        btnSend.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar Código por E-mail';
      }
    }
  });

  document.getElementById('formConfirmPasswordReset')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = (document.getElementById('forgotUserOrEmailInput')?.value || '').trim();
    const code = (document.getElementById('resetCodeInput')?.value || '').trim();
    const newPassword = document.getElementById('resetNewPasswordInput')?.value || '';
    const btnReset = document.getElementById('btnConfirmPasswordReset');

    if (newPassword.length < 4) {
      return showToast('A nova senha deve ter pelo menos 4 caracteres.');
    }
    if (btnReset) {
      btnReset.disabled = true;
      btnReset.innerHTML = '<i class="ph ph-spinner"></i> Redefinindo...';
    }
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, username: identifier, email: identifier, code, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return showToast(data.error || 'Código inválido ou expirado.');
      }
      e.target.reset();
      document.getElementById('formRequestPasswordReset')?.reset();
      showLoginStep('login');
      const loginUserInp = document.getElementById('loginUsernameInput');
      if (loginUserInp && identifier && !identifier.includes('@')) {
        loginUserInp.value = identifier;
      }
      document.getElementById('loginPasswordInput')?.focus();
      showToast('Senha redefinida com sucesso! Faça login com a nova senha.');
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    } finally {
      if (btnReset) {
        btnReset.disabled = false;
        btnReset.innerHTML = '<i class="ph ph-lock-key-open"></i> Redefinir Senha';
      }
    }
  });
}

async function completeLoginSession(token, user) {
  authToken = token;
  activeAccount = user;
  localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, authToken);
  localStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(activeAccount));

  const uInp = document.getElementById('loginUsernameInput');
  const pInp = document.getElementById('loginPasswordInput');
  const cInp = document.getElementById('twoFactorCodeInput');
  if (uInp) uInp.value = '';
  if (pInp) pInp.value = '';
  if (cInp) cInp.value = '';

  showLoginStep('login');
  setLoginOverlayVisible(false);
  applyAccountVisibility(activeAccount);
  await CloudSyncEngine.pullState(false);
  if (isCurrentUserAdmin()) await fetchServerUsers();
  renderAll();
  showToast(`Bem-vindo(a), ${activeAccount.displayName || activeAccount.username}!`);
}

function logoutCurrentSession(showMsg = true) {
  activeAccount = null;
  authToken = null;
  pendingTwoFactorToken = null;
  serverUsersList = [];
  localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
  localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  setMobileSidebarOpen(false);

  const userInput = document.getElementById('loginUsernameInput');
  const passInput = document.getElementById('loginPasswordInput');
  const codeInput = document.getElementById('twoFactorCodeInput');
  if (userInput) userInput.value = '';
  if (passInput) passInput.value = '';
  if (codeInput) codeInput.value = '';

  showLoginStep('login');
  setLoginOverlayVisible(true);
  userInput?.focus();
  if (showMsg) showToast('Logout realizado com sucesso.');
}

async function fetchServerUsers() {
  if (!authToken || !isCurrentUserAdmin()) return;
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/users`, { headers: getAuthHeaders() });
    if (res.status === 401) {
      logoutCurrentSession(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      serverUsersList = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
      renderAccountsTable();
    }
  } catch (_) {}
}

function initLoginByCredentials() {
  injectPasswordEyeAnd2faBox();
  showLoginStep('login');

  const form = document.getElementById('formLoginSystem');
  const btnSwitch = document.getElementById('btnSwitchUser');
  const btnLogout = document.getElementById('btnLogoutSystem');

  if (activeAccount && authToken) {
    setLoginOverlayVisible(false);
    applyAccountVisibility(activeAccount);
    CloudSyncEngine.pullState(false).then(async () => {
      if (isCurrentUserAdmin()) await fetchServerUsers();
      renderAll();
    });
  } else {
    setLoginOverlayVisible(true);
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
      const res = await fetch(`${BACKEND_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || 'Usuário ou senha inválidos.');
      } else if (data.requires2FA && data.tempToken) {
        pendingTwoFactorToken = data.tempToken;
        const hint = document.getElementById('twoFactorDestinationHint');
        const codeInp = document.getElementById('twoFactorCodeInput');
        if (hint) {
          hint.textContent = data.message || `Enviamos um código de 6 dígitos para ${data.maskedEmail || 'o seu e-mail cadastrado'}.`;
        }
        if (codeInp) codeInp.value = '';
        showLoginStep('2fa');
        codeInp?.focus();
        showToast('Código 2FA enviado para seu e-mail!');
      } else if (data.token && data.user) {
        await completeLoginSession(data.token, data.user);
      } else {
        showToast('Resposta inesperada do servidor.');
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
      const res = await fetch(`${BACKEND_API_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json().catch(() => ({}));
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
  const stockFlag = hasStockAccess();
  const nameEl = document.getElementById('loggedUserName');
  const roleEl = document.getElementById('loggedUserRole');
  if (nameEl) nameEl.textContent = account.displayName || account.username;
  if (roleEl) roleEl.textContent = adminFlag ? 'Administrador' : (stockFlag ? 'Gerente / Estoque' : 'Vendedor');

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

  if (form && !document.getElementById('accEmailInput')) {
    const nameInput = document.getElementById('accDisplayNameInput');
    const emailGroup = document.createElement('div');
    emailGroup.className = 'form-group';
    emailGroup.innerHTML = `<label for="accEmailInput">E-mail do Usuário (para 2FA e recuperação):</label><input type="email" id="accEmailInput" placeholder="usuario@gmail.com" />`;
    if (nameInput?.parentElement) {
      nameInput.parentElement.insertAdjacentElement('afterend', emailGroup);
    }
  }

  btnClear?.addEventListener('click', () => {
    form?.reset();
    const editIdEl = document.getElementById('editAccountId');
    if (editIdEl) editIdEl.value = '';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode criar ou editar logins.');

    const editId = document.getElementById('editAccountId')?.value || '';
    const username = document.getElementById('accUsernameInput').value.trim();
    const password = document.getElementById('accPasswordInput').value;
    const displayName = document.getElementById('accDisplayNameInput').value.trim() || username;
    const email = (document.getElementById('accEmailInput')?.value || '').trim();
    const isAdmin = document.getElementById('accRoleTypeInput').value === 'admin';

    if (!editId && !password) return showToast('Defina uma senha para o novo usuário.');

    const checkedPerms = Array.from(document.querySelectorAll('.acc-perm-chk:checked')).map(c => c.value);
    const permissions = isAdmin
      ? ['dashboard', 'pdv', 'consulta_estoque', 'envios', 'clientes', 'historico_vendas', 'estoque', 'ferramentas', 'etiquetas', 'recompra', 'orcamentos', 'garantias', 'trocas', 'financeiro', 'admin_only']
      : checkedPerms.filter(p => p !== 'admin_only');

    try {
      const url = editId
        ? `${BACKEND_API_URL}/api/users/${editId}/permissions`
        : `${BACKEND_API_URL}/api/users`;
      const method = editId ? 'PUT' : 'POST';
      const bodyPayload = editId
        ? { displayName, email, permissions }
        : { username, password, displayName, email, isAdmin, permissions };

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(data.error || 'Erro ao salvar usuário.');

      showToast(editId ? 'Usuário atualizado no PostgreSQL!' : 'Novo login criado com segurança no PostgreSQL!');
      form.reset();
      const editIdEl = document.getElementById('editAccountId');
      if (editIdEl) editIdEl.value = '';
      await fetchServerUsers();
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    }
  });
}

function renderAccountsTable() {
  const tbody = document.getElementById('tableAccountsList');
  if (!tbody) return;
  if (!Array.isArray(serverUsersList) || serverUsersList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum usuário adicional cadastrado no PostgreSQL.</td></tr>';
    return;
  }
  tbody.innerHTML = serverUsersList.map(acc => `
    <tr>
      <td><strong>${acc.username}</strong><br><small style="color:var(--text-muted);">${acc.email || 'Sem e-mail 2FA'}</small></td>
      <td>${acc.displayName}</td>
      <td>${acc.isAdmin ? '<span class="badge-tag badge-warning">Administrador</span>' : '<span class="badge-tag badge-info">Usuário</span>'}</td>
      <td>${(acc.permissions || []).filter(p => p !== 'admin_only').map(p => `<span class="badge-tag badge-info">${p.toUpperCase()}</span>`).join(' ')}</td>
      <td style="display:flex; gap:0.35rem;">
        <button type="button" class="btn-sm btn-blue" onclick="editLoginAccount(${acc.id})">Editar</button>
        ${String(acc.username || '').toLowerCase() !== 'admin' ? `<button type="button" class="btn-sm btn-danger" onclick="removeLoginAccount(${acc.id})">Excluir</button>` : ''}
      </td>
    </tr>
  `).join('');
}

window.editLoginAccount = function (id) {
  if (!isCurrentUserAdmin()) return;
  const acc = serverUsersList.find(a => Number(a.id) === Number(id));
  if (!acc) return;
  const editIdEl = document.getElementById('editAccountId');
  if (editIdEl) editIdEl.value = acc.id;
  document.getElementById('accUsernameInput').value = acc.username;
  document.getElementById('accPasswordInput').value = '';
  document.getElementById('accDisplayNameInput').value = acc.displayName;
  const emailInp = document.getElementById('accEmailInput');
  if (emailInp) emailInp.value = acc.email || '';
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
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || 'Não foi possível excluir o usuário.');
    }
  } catch (_) {
    showToast('Erro de conexão com o servidor.');
  }
};

// ============================================================================
// 4. INICIALIZAÇÃO GERAL
// ============================================================================
function startApp() {
  injectLayoutAndActionStyles();
  initMobileSidebarToggle();
  initLoginByCredentials();
  ensureCommercialStockSubtabInMenuAndSection();
  initNavigation();
  initSalesAndPdv();
  initEditSaleModule();
  initViewSaleModule();
  initViewStockProductModule();
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
  initCommercialStockCatalogModule();
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
  renderCommercialStockCatalog();
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
// SUBABA "CONSULTA DE ESTOQUE" DENTRO DA ABA "COMERCIAL" (SEM EDIÇÃO / CUSTO / MARGEM)
// ============================================================================
function ensureCommercialStockSubtabInMenuAndSection() {
  const submenu = document.querySelector('.nav-dropdown .submenu');
  if (submenu && !submenu.querySelector('[data-target="consulta_estoque"]')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'submenu-item';
    btn.setAttribute('data-target', 'consulta_estoque');
    btn.setAttribute('data-perm', 'consulta_estoque');
    btn.innerHTML = `<i class="ph ph-magnifying-glass"></i><span>Consulta de Estoque</span>`;

    const pdvBtn = submenu.querySelector('[data-target="pdv"]');
    if (pdvBtn) {
      pdvBtn.insertAdjacentElement('afterend', btn);
    } else {
      submenu.prepend(btn);
    }
  }

  const mainContainer = document.getElementById('pdv')?.parentElement
    || document.querySelector('.content-section')?.parentElement
    || document.querySelector('main');

  if (mainContainer && !document.getElementById('consulta_estoque')) {
    const sec = document.createElement('section');
    sec.id = 'consulta_estoque';
    sec.className = 'content-section';
    sec.innerHTML = `
      <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; margin-bottom:0.85rem;">
        <div>
          <h3 style="margin:0; font-size:1.05rem;">Consulta de Estoque (Visão Comercial)</h3>
          <small style="color:var(--text-muted);">Consulta somente leitura de itens disponíveis, categorias, volumes e validades.</small>
        </div>
        <span class="badge-tag badge-info"><i class="ph ph-eye"></i> Somente Consulta</span>
      </div>

      <div class="grid-3" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.7rem; margin-bottom:0.85rem;">
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #34d399; border-radius:10px; padding:0.75rem 0.9rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.75rem;">Itens Disponíveis</small>
          <strong id="comStockAvailSkus" style="font-size:1.25rem; color:#34d399;">0</strong>
        </div>
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #60a5fa; border-radius:10px; padding:0.75rem 0.9rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.75rem;">Unidades em Estoque</small>
          <strong id="comStockAvailUnits" style="font-size:1.25rem; color:#f3f4f6;">0</strong>
        </div>
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #fbbf24; border-radius:10px; padding:0.75rem 0.9rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.75rem;">Decantes Disponíveis</small>
          <strong id="comStockDecantsCount" style="font-size:1.25rem; color:#fbbf24;">0</strong>
        </div>
      </div>

      <div class="card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-radius:10px; padding:0.85rem; margin-bottom:0.85rem;">
        <div class="form-row" style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:flex-end;">
          <div class="form-group" style="flex:1 1 220px; margin:0;">
            <label for="comStockSearchInput">Buscar fragrância ou código:</label>
            <input type="text" id="comStockSearchInput" placeholder="Ex: Creed, 10ml, Árabe..." />
          </div>
          <div class="form-group" style="min-width:170px; margin:0;">
            <label for="comStockCategoryFilter">Categoria:</label>
            <select id="comStockCategoryFilter">
              <option value="todos">Todas as categorias</option>
              <option value="Decant">Decant</option>
              <option value="Árabe">Árabe</option>
              <option value="Nicho">Nicho</option>
              <option value="Importado">Importado</option>
            </select>
          </div>
          <button type="button" id="btnClearComStockFilters" class="btn-sm">Limpar</button>
        </div>

        <div class="gm-seg-filters-row">
          <div class="gm-seg-group">
            <label>Tipo de Produto</label>
            <div class="gm-seg-pills" id="comCatalogFormatPills">
              <button type="button" class="gm-seg-btn ${commercialCatalogFormatFilter === 'all' ? 'active' : ''}" data-val="all">Todos</button>
              <button type="button" class="gm-seg-btn ${commercialCatalogFormatFilter === 'decant' ? 'active' : ''}" data-val="decant">Decantes</button>
              <button type="button" class="gm-seg-btn ${commercialCatalogFormatFilter === 'bottle' ? 'active' : ''}" data-val="bottle">Frascos Completos</button>
            </div>
          </div>

          <div class="gm-seg-group">
            <label>Disponibilidade</label>
            <div class="gm-seg-pills" id="comCatalogAvailPills">
              <button type="button" class="gm-seg-btn ${commercialCatalogOnlyAvailable ? 'active' : ''}" data-val="yes">Apenas Disponíveis (&gt; 0)</button>
              <button type="button" class="gm-seg-btn ${!commercialCatalogOnlyAvailable ? 'active' : ''}" data-val="all">Mostrar Esgotados</button>
            </div>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>CÓD.</th>
              <th>FRAGRÂNCIA / DECANT</th>
              <th>FORMATO</th>
              <th>CATEGORIA / VOL.</th>
              <th>VALIDADE</th>
              <th>PREÇO VENDA</th>
              <th>DISPONÍVEL</th>
              <th>AÇÃO</th>
            </tr>
          </thead>
          <tbody id="tableCommercialStockCatalog"></tbody>
        </table>
      </div>
    `;
    mainContainer.appendChild(sec);
  }
}

function initCommercialStockCatalogModule() {
  ensureCommercialStockSubtabInMenuAndSection();

  document.getElementById('comStockSearchInput')?.addEventListener('input', renderCommercialStockCatalog);
  document.getElementById('comStockCategoryFilter')?.addEventListener('change', renderCommercialStockCatalog);

  document.querySelectorAll('#comCatalogFormatPills .gm-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      commercialCatalogFormatFilter = btn.getAttribute('data-val') || 'all';
      document.querySelectorAll('#comCatalogFormatPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderCommercialStockCatalog();
    });
  });

  document.querySelectorAll('#comCatalogAvailPills .gm-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      commercialCatalogOnlyAvailable = (btn.getAttribute('data-val') || 'yes') === 'yes';
      document.querySelectorAll('#comCatalogAvailPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderCommercialStockCatalog();
    });
  });

  document.getElementById('btnClearComStockFilters')?.addEventListener('click', () => {
    const sInp = document.getElementById('comStockSearchInput');
    const cSel = document.getElementById('comStockCategoryFilter');
    if (sInp) sInp.value = '';
    if (cSel) cSel.value = 'todos';
    commercialCatalogFormatFilter = 'all';
    commercialCatalogOnlyAvailable = true;
    document.querySelectorAll('#comCatalogFormatPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-val') === 'all'));
    document.querySelectorAll('#comCatalogAvailPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-val') === 'yes'));
    renderCommercialStockCatalog();
  });
}

function renderCommercialStockCatalog() {
  ensureCommercialStockSubtabInMenuAndSection();
  const tbody = document.getElementById('tableCommercialStockCatalog');
  if (!tbody) return;

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const availItems = products.filter(p => (Number(p.qty) || 0) > 0);
  const availUnits = availItems.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);
  const availDecants = availItems.filter(p => isDecantProduct(p)).length;

  setTxt('comStockAvailSkus', availItems.length);
  setTxt('comStockAvailUnits', availUnits);
  setTxt('comStockDecantsCount', availDecants);

  const term = (document.getElementById('comStockSearchInput')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('comStockCategoryFilter')?.value || 'todos';

  const filtered = products.filter(p => {
    const qtyNum = Number(p.qty) || 0;
    const isDecant = isDecantProduct(p);

    const matchTerm = !term
      || String(p.name || '').toLowerCase().includes(term)
      || String(p.id || '').toLowerCase().includes(term)
      || String(p.condition || '').toLowerCase().includes(term)
      || String(p.battery || '').toLowerCase().includes(term);

    const matchCat = cat === 'todos' || p.condition === cat;
    const matchFormat = commercialCatalogFormatFilter === 'all'
      || (commercialCatalogFormatFilter === 'decant' && isDecant)
      || (commercialCatalogFormatFilter === 'bottle' && !isDecant);
    const matchAvail = !commercialCatalogOnlyAvailable || qtyNum > 0;

    return matchTerm && matchCat && matchFormat && matchAvail;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:1.2rem;">Nenhuma fragrância disponível para o filtro selecionado.</td></tr>`;
    return;
  }

  // Sem colunas/valores de custo ou margem e sem edição inline
  tbody.innerHTML = filtered.map(p => {
    const qtyNum = Number(p.qty) || 0;
    const isDecant = isDecantProduct(p);
    const formatBadge = isDecant
      ? `<span class="badge-tag badge-warning">Decant</span>`
      : `<span class="badge-tag badge-info">Frasco Completo</span>`;
    const qtyBadge = qtyNum > 0
      ? `<span class="badge-tag badge-receita">${qtyNum} un.</span>`
      : `<span class="badge-tag badge-despesa">Esgotado</span>`;

    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td><strong>${p.name}</strong></td>
        <td>${formatBadge}</td>
        <td>
          <span>${p.condition || 'Produto'}</span>
          ${p.battery ? `<small style="color:var(--text-muted); margin-left:4px;">• ${p.battery}</small>` : ''}
        </td>
        <td>${formatDateSafe(p.expiry)}</td>
        <td><strong style="color:#34d399;">${fmtBRL(p.price)}</strong></td>
        <td>${qtyBadge}</td>
        <td style="white-space:nowrap;">
          <button type="button" class="btn-sm btn-green" ${qtyNum <= 0 ? 'disabled' : ''} onclick="quickAddToPdv('${p.id}')">
            <i class="ph ph-shopping-cart"></i> Vender
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// 5. NAVEGAÇÃO SPA
// ============================================================================
window.navigateToSection = function (targetId, labelText) {
  document.querySelectorAll('.nav-item, .submenu-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

  const activeBtn = document.querySelector(`.nav-item[data-target="${targetId}"], .submenu-item[data-target="${targetId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    const parentDropdown = activeBtn.closest('.nav-dropdown');
    if (parentDropdown) parentDropdown.classList.add('open');
  }

  const targetSection = document.getElementById(targetId);
  if (targetSection) targetSection.classList.add('active');

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle && labelText) pageTitle.textContent = labelText;

  setMobileSidebarOpen(false);

  if (targetId === 'estoque') renderStock();
  if (targetId === 'consulta_estoque') renderCommercialStockCatalog();
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
      btn.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
    });
  });
}

// ============================================================================
// STATUS, OBSERVAÇÃO, RASTREIO & EXCLUSÃO DE VENDA
// ============================================================================
function getOrderStatusClass(status) {
  switch (status) {
    case 'Separado': return 'st-separado';
    case 'Enviado': return 'st-enviado';
    case 'Entregue': return 'st-entregue';
    default: return 'st-separacao';
  }
}

function getOrderStatusBadgeClass(status) {
  switch (status) {
    case 'Separado': return 'badge-info';
    case 'Enviado': return 'badge-motoboy';
    case 'Entregue': return 'badge-receita';
    default: return 'badge-warning';
  }
}

function renderStatusSelectControl(saleId, status) {
  const st = status || 'Em Separação';
  return `
    <select class="status-inline-select ${getOrderStatusClass(st)}" onchange="updateSaleOrderStatus('${saleId}', this.value)">
      <option value="Em Separação" ${st === 'Em Separação' ? 'selected' : ''}>Em Separação</option>
      <option value="Separado" ${st === 'Separado' ? 'selected' : ''}>Separado</option>
      <option value="Enviado" ${st === 'Enviado' ? 'selected' : ''}>Enviado</option>
      <option value="Entregue" ${st === 'Entregue' ? 'selected' : ''}>Entregue</option>
    </select>
  `;
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

window.deleteSaleRecord = async function (saleId) {
  if (!confirm(`Deseja realmente apagar a compra/venda #${saleId}?`)) return;
  const restore = confirm('Deseja devolver os itens dessa compra para o estoque?');
  sales = sales.filter(s => String(s.id) !== String(saleId));
  persistLocalOnly();

  if (authToken) {
    try {
      await fetch(`${BACKEND_API_URL}/api/sales/${encodeURIComponent(saleId)}?restoreStock=${restore ? 'true' : 'false'}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      await CloudSyncEngine.pullState(false);
    } catch (_) {}
  }

  renderAll();
  showToast(`Venda #${saleId} removida.`);
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
// MÓDULO DE ENVIOS & SEPARAÇÃO
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
  const statusFilter = document.getElementById('shippingStatusFilter')?.value || 'todos';

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

  const toSeparateRows = filtered.filter(s => (s.orderStatus || 'Em Separação') === 'Em Separação');
  const alreadySeparatedRows = filtered.filter(s => (s.orderStatus || 'Em Separação') !== 'Em Separação');

  const renderShipmentRow = (s) => {
    const st = s.orderStatus || 'Em Separação';
    const methodBadge = s.shippingMethod === 'Motoboy'
      ? `<span class="badge-tag badge-motoboy"><i class="ph ph-moped"></i> Motoboy</span>`
      : `<span class="badge-tag badge-correios"><i class="ph ph-package"></i> Correios</span>`;
    const channelBadge = s.type === 'Online / Nuvemshop'
      ? `<span class="badge-tag badge-nuvem">Nuvemshop</span>`
      : `<span class="badge-tag badge-info">Loja Física</span>`;
    const hasTrack = Boolean(s.trackingCode && s.trackingCode.trim().length > 0);
    const sepTag = st === 'Em Separação'
      ? `<span class="badge-tag badge-warning gm-sep-tag">A Separar</span>`
      : `<span class="badge-tag badge-receita gm-sep-tag">Separado</span>`;

    return `
      <tr>
        <td>
          <div class="gm-status-cell-wrap">
            ${renderStatusSelectControl(s.id, st)}
            ${sepTag}
          </div>
        </td>
        <td style="white-space:nowrap;"><strong>#${s.id}</strong></td>
        <td style="white-space:nowrap;">${channelBadge}</td>
        <td style="white-space:nowrap;">${s.date}</td>
        <td style="white-space:nowrap;">${methodBadge}</td>
        <td>
          <strong>${s.client}</strong>
          ${s.shippingNotes ? `<div style="font-size:0.74rem; color:var(--text-muted);">${s.shippingNotes}</div>` : ''}
          ${s.observation ? `<div style="font-size:0.72rem; color:#fbbf24; margin-top:2px;"><i class="ph ph-note"></i> ${s.observation}</div>` : ''}
        </td>
        <td style="white-space:nowrap;">
          <button type="button" class="btn-sm ${hasTrack ? 'btn-green' : ''}" onclick="openOrderTrackingModal('${s.id}')">
            <i class="ph ph-barcode"></i> ${hasTrack ? `<code>${s.trackingCode}</code>` : '+ Rastreio'}
          </button>
        </td>
        <td><strong>${s.items}</strong></td>
      </tr>
    `;
  };

  let html = '';
  if (toSeparateRows.length > 0) {
    html += `<tr><td colspan="8" style="background:rgba(245,158,11,0.14); color:#fbbf24; font-weight:700;">⏳ PARA SEPARAR (${toSeparateRows.length})</td></tr>`;
    html += toSeparateRows.map(renderShipmentRow).join('');
  }
  if (alreadySeparatedRows.length > 0) {
    html += `<tr><td colspan="8" style="background:rgba(16,185,129,0.14); color:#34d399; font-weight:700;">✅ JÁ SEPARADO / EM ANDAMENTO (${alreadySeparatedRows.length})</td></tr>`;
    html += alreadySeparatedRows.map(renderShipmentRow).join('');
  }

  tbody.innerHTML = html;
}

// ============================================================================
// IMPORTADOR NUVEMSHOP (API + CSV / PDF)
// ============================================================================
function extractVolumeAndExpiryFromText(rawText = '') {
  const clean = String(rawText || '');
  const volMatch = clean.match(/\b(\d+(?:[.,]\d+)?\s*(?:ml|mL|ML))\b/);
  const concMatch = clean.match(/\b(extrait|elixir|parfum|edp|edt|eau de parfum|eau de toilette)\b/i);

  let battery = '';
  if (volMatch && concMatch) {
    battery = `${concMatch[1].toUpperCase()} ${volMatch[1].replace(/\s+/g, '').toLowerCase()}`;
  } else if (volMatch) {
    battery = volMatch[1].replace(/\s+/g, '').toLowerCase();
  } else if (concMatch) {
    battery = concMatch[1].toUpperCase();
  }

  let expiry = '';
  const brDateMatch = clean.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const isoDateMatch = clean.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (brDateMatch) {
    expiry = `${brDateMatch[3]}-${brDateMatch[2]}-${brDateMatch[1]}`;
  } else if (isoDateMatch) {
    expiry = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
  }

  return { battery, expiry };
}

function parseMoneyValueSmart(rawVal) {
  if (rawVal === null || rawVal === undefined) return 0;
  let s = String(rawVal).replace(/R\$/gi, '').trim();
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : 0;
}

function detectCategoryFromNuvemData(rawCategory = '', productName = '', volumeText = '') {
  const c = String(rawCategory || '').toLowerCase();
  const n = String(productName || '').toLowerCase();
  const v = String(volumeText || '').toLowerCase();

  if (c.includes('decant') || n.includes('decant') || /\b(2ml|5ml|10ml)\b/.test(v)) {
    return 'Decant';
  }
  if (c.includes('nicho') || n.includes('nicho')) {
    return 'Nicho';
  }
  if (c.includes('arabe') || c.includes('árabe') || n.includes('arabe') || n.includes('árabe')) {
    return 'Árabe';
  }
  return 'Importado';
}

function isDescriptionNoiseText(txt = '') {
  const s = String(txt || '').trim();
  if (!s) return true;
  if (/<[a-z][\s\S]*>/i.test(s)) return true;
  if (s.includes(';;;;')) return true;
  if (s.length > 110) return true;
  const lower = s.toLowerCase();
  const noisePhrases = [
    'a escolha perfeita para',
    'que desejam transmitir',
    'que nunca sai de moda',
    'fragrância marcante',
    'ideal para ocasiões',
    'notas de topo',
    'notas de coração',
    'notas de fundo',
    'familia olfativa',
    'família olfativa'
  ];
  return noisePhrases.some(p => lower.includes(p));
}

function sanitizeVariationValue(rawVar = '') {
  const v = String(rawVar || '').trim();
  if (!v) return '';
  if (v.includes(';') || /<[^>]+>/.test(v) || v.length > 28) return '';
  return v;
}

function parseCsvMatrixRfc4180(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  let inQuotes = false;
  let semiCount = 0;
  let commaCount = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && ch === ';') semiCount++;
    else if (!inQuotes && ch === ',') commaCount++;
  }
  const delimiter = semiCount >= commaCount ? ';' : ',';

  const rows = [];
  let row = [];
  let cell = '';
  inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuotes) {
      if (ch === '\r') i++;
      row.push(cell.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) rows.push(row);
  }
  return rows;
}

function normalizeHeaderKey(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function readCsvFileWithEncoding(file) {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder('windows-1252').decode(buffer);
  } catch (_) {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function initNuvemshopImportModule() {
  const overlay = document.getElementById('nuvemImportModalOverlay');
  const fileInput = document.getElementById('nuvemImportFileInput');
  const btnConfirm = document.getElementById('btnConfirmNuvemImport');
  const openBtn = document.getElementById('btnOpenNuvemImportModal')
    || document.querySelector('[data-open-nuvem-import], #btnImportNuvemshop, #btnNuvemImport');

  openBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!hasStockAccess()) return showToast('Você não tem permissão para importar estoque.');
    parsedNuvemItems = [];
    if (fileInput) fileInput.value = '';
    const previewBox = document.getElementById('nuvemImportPreviewBox');
    if (previewBox) previewBox.style.display = 'none';
    if (btnConfirm) btnConfirm.disabled = true;
    overlay?.classList.add('active');
  });

  document.getElementById('btnCloseNuvemImport')?.addEventListener('click', () => overlay?.classList.remove('active'));
  document.getElementById('btnCancelNuvemImport')?.addEventListener('click', () => overlay?.classList.remove('active'));

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await readCsvFileWithEncoding(file);
      parsedNuvemItems = parseNuvemshopCsv(text);
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      parsedNuvemItems = await parseNuvemshopPdf(file);
    } else {
      return showToast('Formato não suportado. Use .CSV ou .PDF.');
    }

    const previewBox = document.getElementById('nuvemImportPreviewBox');
    const previewTbody = document.getElementById('nuvemImportPreviewTable');
    const countLabel = document.getElementById('nuvemImportCountLabel');

    if (previewBox) previewBox.style.display = 'block';
    if (countLabel) countLabel.textContent = `${parsedNuvemItems.length} item(ns) identificado(s) automaticamente`;
    if (btnConfirm) btnConfirm.disabled = parsedNuvemItems.length === 0;

    if (previewTbody) {
      previewTbody.innerHTML = parsedNuvemItems.slice(0, 80).map(item => {
        const meta = extractVolumeAndExpiryFromText(`${item.name} ${item.imei || ''} ${item.expiry || ''}`);
        const volLabel = item.battery || meta.battery || '-';
        return `
          <tr>
            <td>
              <strong>${item.name}</strong>
              <div style="font-size:0.74rem; color:var(--text-muted);">Vol/Conc: ${volLabel}</div>
            </td>
            <td><span class="badge-tag badge-info">${item.category || 'Importado'}</span></td>
            <td><code>${item.imei || '-'}</code></td>
            <td><strong>${fmtBRL(item.price)}</strong></td>
            <td>${item.qty} un.</td>
          </tr>
        `;
      }).join('');
    }
  });

  btnConfirm?.addEventListener('click', () => {
    if (parsedNuvemItems.length === 0) return;

    parsedNuvemItems.forEach(item => {
      const meta = extractVolumeAndExpiryFromText(`${item.name} ${item.imei || ''} ${item.expiry || ''}`);
      const category = item.category || detectCategoryFromNuvemData('', item.name, item.battery || meta.battery);
      const isDecant = category === 'Decant';
      const detectedBattery = item.battery || meta.battery || (isDecant ? 'Decant Vidro' : 'Frasco');
      const detectedExpiry = item.expiry || meta.expiry || '';

      const existing = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        existing.qty = item.qty;
        existing.price = item.price || existing.price;
        if (category) existing.condition = category;
        if (item.cost !== undefined && item.cost !== null && Number(item.cost) > 0) {
          existing.cost = item.cost;
        }
        if (item.supplier && !existing.supplier) {
          existing.supplier = item.supplier;
        }
        if (detectedBattery && (!existing.battery || existing.battery === 'Frasco' || existing.battery === 'Decant')) {
          existing.battery = detectedBattery;
        }
        if (detectedExpiry && !existing.expiry) {
          existing.expiry = detectedExpiry;
        }
      } else {
        products.unshift({
          id: 'PRD-' + String(products.length + 1).padStart(3, '0'),
          name: item.name,
          supplier: item.supplier || 'Nuvemshop',
          imei: item.imei || ('NUV-' + Math.floor(1000 + Math.random() * 9000)),
          expiry: detectedExpiry,
          condition: category,
          battery: detectedBattery,
          cost: item.cost || 0,
          price: item.price || 0,
          qty: item.qty || 0,
          nuvemId: '',
          nuvemVarId: ''
        });
      }
    });

    saveAll();
    renderAll();
    overlay?.classList.remove('active');
    showToast(`${parsedNuvemItems.length} produto(s) importados com categorias automáticas!`);
  });
}

function parseNuvemshopCsv(csvText) {
  const rows = parseCsvMatrixRfc4180(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeaderKey);

  const findCol = (exactList, partialList = []) => {
    for (const name of exactList) {
      const idx = headers.indexOf(normalizeHeaderKey(name));
      if (idx >= 0) return idx;
    }
    for (const part of partialList) {
      const idx = headers.findIndex(h => h.includes(normalizeHeaderKey(part)));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxUrl = findCol(['identificador url', 'handle', 'url'], ['identificador']);
  const idxName = findCol(['nome', 'name', 'produto'], ['nome']);
  const idxCat = findCol(['categorias', 'categoria', 'category'], ['categor']);
  const idxVarVal = findCol(['valor da variacao 1', 'variacao 1', 'option1 value'], ['valor da variacao']);
  const idxPrice = findCol(['preco', 'price'], ['preco']);
  const idxPromoPrice = findCol(['preco promocional', 'promotional price'], ['promocional']);
  const idxCost = findCol(['custo', 'cost'], ['custo']);
  const idxStock = findCol(['estoque', 'stock', 'quantidade'], ['estoque']);
  const idxSku = findCol(['sku', 'codigo'], ['sku']);
  const idxSupplier = findCol(['marca', 'fornecedor', 'supplier', 'brand'], ['fornecedor', 'marca']);

  let lastUrl = '';
  let lastName = '';
  let lastCategory = '';
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.every(c => !c)) continue;

    const urlId = idxUrl >= 0 ? String(cols[idxUrl] || '').trim() : '';
    const rawCellName = idxName >= 0 ? String(cols[idxName] || '').trim() : '';
    const cellName = isDescriptionNoiseText(rawCellName) ? '' : rawCellName;
    const rawCellCat = idxCat >= 0 ? String(cols[idxCat] || '').trim() : '';
    const cellCat = isDescriptionNoiseText(rawCellCat) ? '' : rawCellCat;
    const varVal = sanitizeVariationValue(idxVarVal >= 0 ? cols[idxVarVal] : '');

    if (!urlId && !cellName && !varVal) continue;

    if (urlId && urlId !== lastUrl) {
      lastUrl = urlId;
      lastName = cellName || '';
      lastCategory = cellCat || '';
    } else {
      if (cellName) lastName = cellName;
      if (cellCat) lastCategory = cellCat;
    }

    const baseName = (cellName || lastName || '').trim();
    if (!baseName || isDescriptionNoiseText(baseName)) continue;
    if (baseName.toLowerCase().includes('frete')) continue;

    const fullName = varVal ? `${baseName} (${varVal})` : baseName;
    const category = detectCategoryFromNuvemData(lastCategory, fullName, varVal);

    let price = parseMoneyValueSmart(idxPrice >= 0 ? cols[idxPrice] : 0);
    if (price <= 0 && idxPromoPrice >= 0) {
      price = parseMoneyValueSmart(cols[idxPromoPrice]);
    }
    if (price > 50000) price = 0;

    const cost = parseMoneyValueSmart(idxCost >= 0 ? cols[idxCost] : 0);
    const qtyRaw = idxStock >= 0 ? String(cols[idxStock] || '').trim() : '';
    const qtyNum = parseMoneyValueSmart(qtyRaw);
    const qty = qtyRaw === '' ? 0 : Math.max(0, Math.min(5000, parseInt(qtyNum, 10) || 0));
    const sku = idxSku >= 0 ? String(cols[idxSku] || '').trim() : '';
    const cleanSku = sku.length > 40 ? '' : sku;
    const supRaw = idxSupplier >= 0 ? String(cols[idxSupplier] || '').trim() : '';
    const supplier = (supRaw && !isDescriptionNoiseText(supRaw) && supRaw.length <= 50) ? supRaw : 'Nuvemshop';

    items.push({
      name: fullName,
      supplier,
      category,
      battery: varVal || '',
      price,
      cost: cost > 50000 ? 0 : cost,
      qty,
      imei: cleanSku
    });
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
      const price = parseMoneyValueSmart(match[2]);
      const qty = parseInt(match[3], 10) || 1;
      if (name.length > 3 && price > 0) {
        items.push({
          name,
          supplier: 'Catálogo PDF',
          category: detectCategoryFromNuvemData('', name, name),
          price,
          cost: 0,
          qty,
          imei: ''
        });
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
function addProductToLabelQueue(prod, qty = 1) {
  if (!prod) return;
  const expInput = document.getElementById('labelExpiryDate');
  const expiryVal = prod.expiry || expInput?.value || '';
  const vol = prod.battery || (prod.condition === 'Decant' ? 'Decant 10ml' : 'Frasco Original');
  const note = prod.condition || 'Perfumaria';
  const count = Math.min(100, Math.max(1, parseInt(qty, 10) || 1));

  for (let i = 0; i < count; i++) {
    thermalLabelQueue.push({
      code: prod.imei || prod.id,
      name: prod.name,
      volume: vol,
      note,
      expiry: expiryVal ? formatDateSafe(expiryVal, '12 meses') : '12 meses',
      price: fmtBRL(prod.price)
    });
  }
  renderThermalLabelQueue();
}

window.generateLabelForStockProduct = function (prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  addProductToLabelQueue(prod, 1);
  navigateToSection('etiquetas', 'Etiquetas 50×30mm');
  showToast(`Etiqueta 50×30mm gerada na fila para "${prod.name}"!`);
};

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
        expiry: expiry ? formatDateSafe(expiry, '12 meses') : '12 meses',
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
        expiry: d.expiry ? formatDateSafe(d.expiry, '12 meses') : '12 meses',
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
function itemsToSearchText(items) {
  if (!items) return '';
  if (typeof items === 'string') return items;
  if (Array.isArray(items)) {
    return items
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return [item.name, item.title, item.nome, item.sku].filter(Boolean).join(' ');
        }
        return '';
      })
      .join(' ');
  }
  if (typeof items === 'object') {
    return JSON.stringify(items);
  }
  return String(items);
}

function computeRecompraAlerts() {
  const today = new Date();
  const alerts = [];
  sales.forEach(s => {
    const itemsStr = itemsToSearchText(s.items).toLowerCase();
    let estDays = 90;
    let suggestion = 'Oferecer segundo frasco ou decant de viagem';
    if (itemsStr.includes('5ml')) { estDays = 18; suggestion = 'Upgrade p/ Decant 10ml ou Frasco Lacrado'; }
    else if (itemsStr.includes('10ml') || itemsStr.includes('decant')) { estDays = 30; suggestion = 'Reposição Decant 10ml ou Frasco 100ml c/ 10% OFF'; }
    const saleDate = s.isoDate ? new Date(`${s.isoDate}T00:00:00`) : today;
    const validSaleDate = Number.isNaN(saleDate.getTime()) ? today : saleDate;
    const elapsed = Math.floor((today - validSaleDate) / (1000 * 60 * 60 * 24));
    const remaining = estDays - elapsed;

    if (remaining <= 7 && s.client !== 'CONSUMIDOR BALCÃO') {
      alerts.push({
        client: s.client,
        phone: s.phone || clients.find(c => c.name === s.client)?.phone || '',
        items: s.items,
        date: String(s.date || '').split(' ')[0] || '-',
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
      const expDate = p.expiry ? new Date(`${p.expiry}T00:00:00`) : null;
      const validExp = expDate && !Number.isNaN(expDate.getTime());
      const daysLeft = validExp ? Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)) : 365;
      if (daysLeft <= 60) expiringLots++;
      const badge = daysLeft < 0 ? `<span class="badge-tag badge-despesa">Vencido</span>` : daysLeft <= 60 ? `<span class="badge-tag badge-warning">Vence em ${daysLeft}d</span>` : `<span class="badge-tag badge-receita">Válido (${daysLeft}d)</span>`;
      return `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td><code>${p.imei || '-'}</code></td><td>${validExp ? expDate.toLocaleDateString('pt-BR') : '-'}</td><td>${badge}</td><td><strong>${p.qty} un.</strong></td></tr>`;
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
// 8. DASHBOARD, PDV, BOTÃO AÇÕES ▾, EDIÇÃO ITEM POR ITEM & VISUALIZAÇÃO
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
          <td><span class="badge-tag ${getOrderStatusBadgeClass(st)}">${st}</span></td>
          <td><span class="badge-tag badge-info">${s.payment || 'Pix'}</span></td>
          ${adminFlag ? `<td><strong style="color:#34d399;">${fmtBRL(s.total)}</strong></td>` : ''}
        </tr>
      `;
    }).join('');
  }
}

async function pushStockToNuvemshop(product) {
  if (!product || !product.nuvemId || !product.nuvemVarId || !authToken) return false;
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

function getNowBrDateTime() {
  const now = new Date();
  return now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function syncPdvLiveClockBadge() {
  const pdvSection = document.getElementById('pdv');
  if (pdvSection && !document.getElementById('gmPdvDateTimeBanner')) {
    const banner = document.createElement('div');
    banner.id = 'gmPdvDateTimeBanner';
    banner.style.cssText = 'margin-bottom:10px; padding:7px 10px; border-radius:8px; background:#181c24; border:1px solid #252a34; border-left:3px solid #fbbf24; font-size:12px; color:#fbbf24; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;';
    banner.innerHTML = `<span><strong>Data/Hora:</strong> <span id="gmPdvLiveDateTime">${getNowBrDateTime()}</span></span><span style="color:#9ca3af;">PDV GRUPO MISTER</span>`;
    pdvSection.prepend(banner);
  }
  const liveEl = document.getElementById('gmPdvLiveDateTime');
  if (liveEl) liveEl.textContent = getNowBrDateTime();
}

setInterval(syncPdvLiveClockBadge, 30000);

function updateFastPdvTotal() {
  const qty = parseInt(document.getElementById('fastPdvQty')?.value, 10) || 1;
  const price = parseFloat(document.getElementById('fastPdvPrice')?.value) || 0;
  const discount = parseFloat(document.getElementById('fastPdvDiscount')?.value) || 0;
  const total = Math.max(0, qty * price - discount);
  const el = document.getElementById('fastPdvTotalDisplay');
  if (el) el.textContent = fmtBRL(total);
}

function initSalesAndPdv() {
  syncPdvLiveClockBadge();
  const pdvOverlay = document.getElementById('pdvModalOverlay');
  document.getElementById('btnOpenPdvModal')?.addEventListener('click', () => {
    modalCart = [];
    document.getElementById('modalGeneralDiscount').value = '0';
    renderModalCart();
    document.getElementById('modalShippingMethod').value = 'Retirada na Loja';
    document.getElementById('modalShippingNotes').value = '';
    document.getElementById('modalOrderObservation').value = '';
    document.getElementById('modalSaleDate').value = getNowBrDateTime();
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
    const saleDateStr = document.getElementById('modalSaleDate').value || getNowBrDateTime();

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
      date: saleDateStr,
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
      rawItems: modalCart.map(i => ({ productId: i.prodId, name: i.name, qty: i.qty, price: i.unitPrice })),
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
    const itemDesc = prod ? `${prod.name} (${qty}x)` : `${document.getElementById('fastPdvCustomDesc').value} (${qty}x)`;

    if (prod) { prod.qty = Math.max(0, prod.qty - qty); pushStockToNuvemshop(prod); }

    const isStorePickup = shippingMethod === 'Retirada na Loja';
    const newSale = {
      id: newId,
      client: 'CONSUMIDOR BALCÃO',
      seller: document.getElementById('fastPdvSeller').value,
      date: getNowBrDateTime(),
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
      items: itemDesc,
      rawItems: prod ? [{ productId: prod.id, name: prod.name, qty, price }] : [{ name: document.getElementById('fastPdvCustomDesc').value || 'Item Avulso', qty, price }],
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

  salesViewMode = 'cards';
  const tableViewEl = document.getElementById('salesTableView');
  const cardsViewEl = document.getElementById('salesCardsView');
  if (tableViewEl) tableViewEl.style.display = 'none';
  if (cardsViewEl) cardsViewEl.style.display = 'block';

  document.getElementById('salesStatusFilter')?.addEventListener('change', renderSales);
  document.getElementById('salesChannelFilter')?.addEventListener('change', renderSales);
  document.getElementById('quickStockSearch')?.addEventListener('input', renderQuickStock);
  document.getElementById('quickStockCondition')?.addEventListener('change', renderQuickStock);
}

// ============================================================================
// MENU SUSPENSO "AÇÕES ▾" (VENDAS E ESTOQUE)
// ============================================================================
function closeAllGithubActionMenus() {
  document.querySelectorAll('.gm-gh-dropdown.open').forEach(el => el.classList.remove('open'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.gm-gh-action-wrap') && !e.target.closest('.gm-gh-dropdown')) {
    closeAllGithubActionMenus();
  }
});

function positionGithubMenu(menu, triggerEl) {
  menu.classList.add('open');
  const rect = triggerEl.getBoundingClientRect();
  const menuWidth = menu.offsetWidth || 168;
  const menuHeight = menu.offsetHeight || 200;
  const leftPos = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.left));
  const topPos = (rect.bottom + menuHeight + 8 > window.innerHeight)
    ? Math.max(8, rect.top - menuHeight - 4)
    : rect.bottom + 4;
  menu.style.left = `${leftPos}px`;
  menu.style.top = `${topPos}px`;
}

window.toggleSaleGithubMenu = function (event, saleId) {
  event.stopPropagation();
  const menuId = `gmSaleMenu_${String(saleId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let menu = document.getElementById(menuId);
  const wasOpen = menu?.classList.contains('open');
  closeAllGithubActionMenus();

  if (!menu) {
    menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'gm-gh-dropdown';
    menu.innerHTML = `
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openEditSaleModal('${saleId}')">
        <i class="ph ph-pencil-simple" style="color:#60a5fa; font-size:15px;"></i>
        <span>Editar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openViewSaleModal('${saleId}')">
        <i class="ph ph-eye" style="color:#34d399; font-size:15px;"></i>
        <span>Visualizar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openOrderTrackingModal('${saleId}')">
        <i class="ph ph-barcode" style="color:#38bdf8; font-size:15px;"></i>
        <span>Rastreio</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openOrderObsModal('${saleId}')">
        <i class="ph ph-note-pencil" style="color:#fbbf24; font-size:15px;"></i>
        <span>Obs.</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openReceiptModal('${saleId}')">
        <i class="ph ph-printer" style="color:#c084fc; font-size:15px;"></i>
        <span>Recibo</span>
      </button>
      <div class="gm-gh-dropdown-divider"></div>
      <button type="button" class="gm-gh-dropdown-item danger-item" onclick="closeAllGithubActionMenus(); deleteSaleRecord('${saleId}')">
        <i class="ph ph-trash" style="font-size:15px;"></i>
        <span>Apagar</span>
      </button>
    `;
    document.body.appendChild(menu);
  }

  if (!wasOpen) {
    positionGithubMenu(menu, event.currentTarget);
  }
};

function renderGithubPencilActionButton(saleId) {
  return `
    <div class="gm-gh-action-wrap">
      <button type="button"
        class="gm-gh-pencil-btn"
        title="Ações da venda"
        aria-label="Ações da venda"
        onclick="toggleSaleGithubMenu(event, '${saleId}')">
        <span>Ações</span>
        <i class="ph ph-caret-down" style="font-size:13px; color:#9ca3af;"></i>
      </button>
    </div>
  `;
}

// Menu "Ações ▾" específico do Estoque: Visualizar, Editar, Gerar Etiqueta e Apagar
window.toggleStockProductMenu = function (event, prodId) {
  event.stopPropagation();
  const menuId = `gmStockMenu_${String(prodId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let menu = document.getElementById(menuId);
  const wasOpen = menu?.classList.contains('open');
  closeAllGithubActionMenus();

  if (!menu) {
    menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'gm-gh-dropdown';
    menu.innerHTML = `
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openViewStockProductModal('${prodId}')">
        <i class="ph ph-eye" style="color:#34d399; font-size:15px;"></i>
        <span>Visualizar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openEditProductModal('${prodId}')">
        <i class="ph ph-pencil-simple" style="color:#60a5fa; font-size:15px;"></i>
        <span>Editar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); generateLabelForStockProduct('${prodId}')">
        <i class="ph ph-barcode" style="color:#fbbf24; font-size:15px;"></i>
        <span>Gerar Etiqueta</span>
      </button>
      <div class="gm-gh-dropdown-divider"></div>
      <button type="button" class="gm-gh-dropdown-item danger-item" onclick="closeAllGithubActionMenus(); deleteStockProductDirect('${prodId}')">
        <i class="ph ph-trash" style="font-size:15px;"></i>
        <span>Apagar</span>
      </button>
    `;
    document.body.appendChild(menu);
  }

  if (!wasOpen) {
    positionGithubMenu(menu, event.currentTarget);
  }
};

function renderStockActionButton(prodId) {
  return `
    <div class="gm-gh-action-wrap">
      <button type="button"
        class="gm-gh-pencil-btn"
        title="Ações do item"
        aria-label="Ações do item"
        onclick="toggleStockProductMenu(event, '${prodId}')">
        <span>Ações</span>
        <i class="ph ph-caret-down" style="font-size:13px; color:#9ca3af;"></i>
      </button>
    </div>
  `;
}

window.deleteStockProductDirect = function (prodId) {
  if (!hasStockAccess()) return showToast('Você não tem permissão para apagar itens do estoque.');
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  if (!confirm(`Deseja realmente apagar "${prod.name}" (${prod.id}) do estoque?`)) return;
  products = products.filter(p => p.id !== prodId);
  saveAll();
  renderAll();
  showToast(`Item "${prod.name}" removido do estoque.`);
};

// ============================================================================
// MODAL DE VISUALIZAÇÃO DO ITEM DE ESTOQUE
// ============================================================================
function ensureViewStockProductModal() {
  if (document.getElementById('viewStockProductModalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'viewStockProductModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content gm-view-modal-card">
      <div class="modal-header">
        <h3><i class="ph ph-eye"></i> Detalhes do Produto <span id="viewStockProdHeaderId"></span></h3>
        <button type="button" id="btnCloseViewStockProdModal" class="btn-close">&times;</button>
      </div>
      <div id="viewStockProdModalBody" class="modal-body"></div>
      <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;">
        <button type="button" id="btnViewStockProdLabel" class="btn-sm"><i class="ph ph-barcode"></i> Gerar Etiqueta</button>
        <button type="button" id="btnViewStockProdEdit" class="btn-primary"><i class="ph ph-pencil-simple"></i> Editar</button>
        <button type="button" id="btnCloseViewStockProdModalFooter" class="btn-sm">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeFn = () => overlay.classList.remove('active');
  document.getElementById('btnCloseViewStockProdModal')?.addEventListener('click', closeFn);
  document.getElementById('btnCloseViewStockProdModalFooter')?.addEventListener('click', closeFn);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFn();
  });
}

function initViewStockProductModule() {
  ensureViewStockProductModal();
}

window.openViewStockProductModal = function (prodId) {
  ensureViewStockProductModal();
  const p = products.find(item => item.id === prodId);
  if (!p) return;
  const canManage = hasStockAccess();

  document.getElementById('viewStockProdHeaderId').textContent = `(${p.id})`;
  document.getElementById('viewStockProdModalBody').innerHTML = `
    <div class="gm-view-grid">
      <div class="gm-view-box"><small>Código</small><strong>${p.id}</strong></div>
      <div class="gm-view-box"><small>Fragrância / Decant</small><strong>${p.name}</strong></div>
      <div class="gm-view-box"><small>Fornecedor</small><strong>${p.supplier || 'Sem fornecedor'}</strong></div>
      <div class="gm-view-box"><small>Formato</small><strong>${isDecantProduct(p) ? 'Decant' : 'Frasco Completo'}</strong></div>
      <div class="gm-view-box"><small>Categoria / Volume</small><strong>${p.condition || '-'} ${p.battery ? '• ' + p.battery : ''}</strong></div>
      <div class="gm-view-box"><small>Validade</small><strong>${formatDateSafe(p.expiry)}</strong></div>
      <div class="gm-view-box"><small>Quantidade em Estoque</small><strong>${p.qty} un.</strong></div>
      ${canManage ? `<div class="gm-view-box"><small>Custo Unitário</small><strong style="color:#fbbf24 !important;">${fmtBRL(p.cost || 0)}</strong></div>` : ''}
      <div class="gm-view-box"><small>Preço de Venda</small><strong style="color:#34d399 !important;">${fmtBRL(p.price || 0)}</strong></div>
    </div>
  `;

  const btnEdit = document.getElementById('btnViewStockProdEdit');
  if (btnEdit) {
    btnEdit.style.display = canManage ? 'inline-flex' : 'none';
    btnEdit.onclick = () => {
      document.getElementById('viewStockProductModalOverlay')?.classList.remove('active');
      openEditProductModal(p.id);
    };
  }

  const btnLbl = document.getElementById('btnViewStockProdLabel');
  if (btnLbl) {
    btnLbl.onclick = () => {
      document.getElementById('viewStockProductModalOverlay')?.classList.remove('active');
      generateLabelForStockProduct(p.id);
    };
  }

  document.getElementById('viewStockProductModalOverlay')?.classList.add('active');
};

// ============================================================================
// MODAL DE VISUALIZAÇÃO AMPLA DA VENDA (COM FUNDO OPACO PARA ALTA LEITURA)
// ============================================================================
function ensureViewSaleModal() {
  if (document.getElementById('viewSaleModalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'viewSaleModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content gm-view-modal-card">
      <div class="modal-header">
        <h3><i class="ph ph-eye"></i> Detalhes Completos da Venda <span id="viewSaleHeaderId"></span></h3>
        <button type="button" id="btnCloseViewSaleModal" class="btn-close">&times;</button>
      </div>
      <div id="viewSaleModalBody" class="modal-body"></div>
      <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
        <button type="button" id="btnViewSaleSwitchToEdit" class="btn-primary"><i class="ph ph-pencil-simple"></i> Editar Venda</button>
        <button type="button" id="btnCloseViewSaleModalFooter" class="btn-sm">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeFn = () => overlay.classList.remove('active');
  document.getElementById('btnCloseViewSaleModal')?.addEventListener('click', closeFn);
  document.getElementById('btnCloseViewSaleModalFooter')?.addEventListener('click', closeFn);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFn();
  });
}

window.openViewSaleModal = function (saleId) {
  ensureViewSaleModal();
  const s = sales.find(item => String(item.id) === String(saleId));
  if (!s) return;

  const itemsList = Array.isArray(s.rawItems) && s.rawItems.length > 0
    ? s.rawItems
    : parseSaleItemsStringToArray(s.items);

  const itemsHtml = itemsList.length > 0
    ? `
      <table style="width:100%; border-collapse:collapse; margin-top:0.4rem; background:#141923; border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="background:#10141c;">
            <th style="text-align:left; padding:0.45rem 0.5rem; border-bottom:1px solid #2a3344; color:#cbd5e1;">Item / Fragrância</th>
            <th style="text-align:center; padding:0.45rem 0.5rem; border-bottom:1px solid #2a3344; color:#cbd5e1;">Qtd</th>
            <th style="text-align:right; padding:0.45rem 0.5rem; border-bottom:1px solid #2a3344; color:#cbd5e1;">Unitário</th>
            <th style="text-align:right; padding:0.45rem 0.5rem; border-bottom:1px solid #2a3344; color:#cbd5e1;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList.map(it => {
            const q = Math.max(1, parseInt(it.qty, 10) || 1);
            const pr = Number(it.price || 0);
            return `
              <tr>
                <td style="padding:0.45rem 0.5rem; border-bottom:1px solid rgba(255,255,255,0.06); color:#f3f4f6;"><strong>${it.name}</strong></td>
                <td style="text-align:center; padding:0.45rem 0.5rem; border-bottom:1px solid rgba(255,255,255,0.06); color:#e5e7eb;">${q}x</td>
                <td style="text-align:right; padding:0.45rem 0.5rem; border-bottom:1px solid rgba(255,255,255,0.06); color:#e5e7eb;">${pr > 0 ? fmtBRL(pr) : '-'}</td>
                <td style="text-align:right; padding:0.45rem 0.5rem; border-bottom:1px solid rgba(255,255,255,0.06); color:#34d399;"><strong>${pr > 0 ? fmtBRL(q * pr) : '-'}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `
    : `<p style="margin:0.35rem 0 0; color:#f3f4f6;">${s.items || '-'}</p>`;

  document.getElementById('viewSaleHeaderId').textContent = `#${s.id}`;
  document.getElementById('viewSaleModalBody').innerHTML = `
    <div class="gm-view-grid">
      <div class="gm-view-box"><small>Cliente</small><strong>${s.client || 'CONSUMIDOR BALCÃO'}</strong></div>
      <div class="gm-view-box"><small>Data / Hora</small><strong>${s.date || '-'}</strong></div>
      <div class="gm-view-box"><small>Canal / Vendedor</small><strong>${s.type || 'Venda Presencial'} • ${s.seller || '-'}</strong></div>
      <div class="gm-view-box"><small>Pagamento</small><strong>${s.payment || '-'}</strong></div>
      <div class="gm-view-box"><small>Entrega / Status</small><strong>${s.shippingMethod || 'Retirada na Loja'} • <span class="badge-tag ${getOrderStatusBadgeClass(s.orderStatus)}">${s.orderStatus || 'Em Separação'}</span></strong></div>
      <div class="gm-view-box"><small>Código de Rastreio</small><strong>${s.trackingCode || 'Não informado'}</strong></div>
      <div class="gm-view-box"><small>Desconto</small><strong style="color:#fbbf24 !important;">${fmtBRL(s.discount || 0)}</strong></div>
      <div class="gm-view-box"><small>Total da Venda</small><strong style="color:#34d399 !important; font-size:1.05rem;">${fmtBRL(s.total || 0)}</strong></div>
    </div>
    <div class="gm-view-box" style="margin-bottom:0.75rem;">
      <small>Itens da Venda</small>
      ${itemsHtml}
    </div>
    <div class="gm-view-grid">
      <div class="gm-view-box"><small>Detalhes de Envio</small><strong>${s.shippingNotes || 'Nenhum'}</strong></div>
      <div class="gm-view-box"><small>Observação</small><strong>${s.observation || 'Nenhuma'}</strong></div>
    </div>
  `;

  const btnEdit = document.getElementById('btnViewSaleSwitchToEdit');
  if (btnEdit) {
    btnEdit.onclick = () => {
      document.getElementById('viewSaleModalOverlay')?.classList.remove('active');
      openEditSaleModal(s.id);
    };
  }

  document.getElementById('viewSaleModalOverlay')?.classList.add('active');
};

function initViewSaleModule() {
  ensureViewSaleModal();
}

// ============================================================================
// MODAL DE EDIÇÃO DE VENDA LANÇADA (PADRÃO DOS DEMAIS MODAIS + CORES POR BLOCO)
// ============================================================================
function ensureEditSaleModalStructure() {
  let overlay = document.getElementById('editSaleModalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'editSaleModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content gm-edit-sale-card">
        <div class="modal-header">
          <h3><i class="ph ph-pencil-simple" style="color:#60a5fa;"></i> Editar Venda <span id="editSaleHeaderId" style="color:#fbbf24;"></span></h3>
          <button type="button" id="btnCloseEditSaleModal" class="btn-close">&times;</button>
        </div>
        <form id="formEditSale" class="modal-body">
          <input type="hidden" id="editSaleId" />

          <div class="gm-modal-section-card">
            <div class="gm-modal-section-title"><i class="ph ph-user-list" style="color:#60a5fa;"></i> Dados do Pedido e Cliente</div>
            <div class="gm-edit-sale-grid">
              <div class="form-group">
                <label for="editSaleClient">Cliente:</label>
                <input type="text" id="editSaleClient" required />
              </div>
              <div class="form-group">
                <label for="editSaleSeller">Vendedor:</label>
                <input type="text" id="editSaleSeller" />
              </div>
              <div class="form-group">
                <label for="editSaleDate">Data / Hora:</label>
                <input type="text" id="editSaleDate" />
              </div>
              <div class="form-group">
                <label for="editSalePayment">Pagamento:</label>
                <select id="editSalePayment">
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Débito">Débito</option>
                  <option value="Link / Online">Link / Online</option>
                </select>
              </div>
            </div>
          </div>

          <div class="gm-modal-section-card accent-amber">
            <div class="gm-modal-section-title"><i class="ph ph-truck" style="color:#fbbf24;"></i> Envio, Status e Rastreio</div>
            <div class="gm-edit-sale-grid">
              <div class="form-group">
                <label for="editSaleShippingMethod">Modalidade de Envio:</label>
                <select id="editSaleShippingMethod">
                  <option value="Retirada na Loja">Retirada na Loja</option>
                  <option value="Motoboy">Motoboy</option>
                  <option value="Correios">Correios</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editSaleOrderStatus">Status do Pedido:</label>
                <select id="editSaleOrderStatus">
                  <option value="Em Separação">Em Separação</option>
                  <option value="Separado">Separado</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Entregue">Entregue</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editSaleTrackingCode">Código de Rastreio:</label>
                <input type="text" id="editSaleTrackingCode" placeholder="Ex: BR123456789BR" />
              </div>
              <div class="form-group">
                <label for="editSaleShippingNotes">Endereço / Detalhes de Envio:</label>
                <input type="text" id="editSaleShippingNotes" />
              </div>
            </div>
          </div>

          <div class="form-group" style="display:none;">
            <label for="editSaleItems">Resumo dos Itens:</label>
            <input type="text" id="editSaleItems" />
          </div>

          <div class="gm-modal-section-card accent-emerald">
            <div class="gm-modal-section-title"><i class="ph ph-currency-circle-dollar" style="color:#34d399;"></i> Valores e Observações</div>
            <div class="gm-edit-sale-grid">
              <div class="form-group">
                <label for="editSaleDiscount">Desconto (R$):</label>
                <input type="number" id="editSaleDiscount" step="0.01" min="0" />
              </div>
              <div class="form-group">
                <label for="editSaleTotal">Total da Venda (R$):</label>
                <input type="number" id="editSaleTotal" step="0.01" min="0" required />
              </div>
            </div>
            <div class="form-group" style="margin-top:0.5rem;">
              <label for="editSaleObservation">Observação Interna:</label>
              <input type="text" id="editSaleObservation" placeholder="Observações da venda ou entrega..." />
            </div>
          </div>

          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
            <button type="button" id="btnCancelEditSaleModal" class="btn-sm">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="ph ph-check"></i> Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  ensureSaleItemsEditorInsideModal();
}

function ensureSaleItemsEditorInsideModal() {
  const form = document.getElementById('formEditSale');
  if (!form || document.getElementById('gmSaleItemsEditorBlock')) return;

  const itemsInput = document.getElementById('editSaleItems');
  const block = document.createElement('div');
  block.id = 'gmSaleItemsEditorBlock';
  block.className = 'gm-modal-section-card';
  block.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem; gap:0.5rem; flex-wrap:wrap;">
      <div class="gm-modal-section-title" style="margin:0;"><i class="ph ph-list-checks" style="color:#60a5fa;"></i> Itens Unitários (Item por Item)</div>
      <button type="button" id="gmBtnAddEditSaleItem" class="btn-sm btn-blue"><i class="ph ph-plus"></i> Adicionar Item</button>
    </div>
    <div style="display:grid; grid-template-columns:minmax(140px,1.8fr) 74px 105px 95px 34px; gap:0.45rem; font-size:0.74rem; color:var(--text-muted); padding:0 0.5rem 0.25rem;">
      <span>Item / Fragrância</span>
      <span>Qtd</span>
      <span>Unit. (R$)</span>
      <span>Subtotal</span>
      <span></span>
    </div>
    <div id="gmSaleItemsRowsContainer"></div>
  `;

  if (itemsInput?.parentElement) {
    itemsInput.parentElement.insertAdjacentElement('afterend', block);
  } else {
    form.prepend(block);
  }

  document.getElementById('gmBtnAddEditSaleItem')?.addEventListener('click', () => {
    editingSaleItemsDraft.push({ name: '', qty: 1, price: 0 });
    renderEditingSaleItemsRows(true);
  });
}

function recalculateSaleTotalFromDraft(forceRecalcTotal = false) {
  const sumItems = editingSaleItemsDraft.reduce((acc, it) => {
    const q = Math.max(1, parseInt(it.qty, 10) || 1);
    const pr = Math.max(0, parseFloat(it.price) || 0);
    return acc + (q * pr);
  }, 0);

  const itemsInput = document.getElementById('editSaleItems');
