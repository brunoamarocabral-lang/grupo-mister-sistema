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
  COMMISSIONS: 'gm_perfume_commissions_v5',
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
      background: #1b2230;
      border: 1px solid #2a3344;
      border-left: 3px solid #60a5fa;
      border-radius: 8px;
      padding: 0.72rem 0.85rem;
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
      color: #cbd5e1;
      margin-bottom: 0.55rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .gm-edit-sale-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
      gap: 0.6rem;
    }

    .gm-sale-item-row {
      display: grid;
      grid-template-columns: minmax(140px, 1.8fr) 74px 105px 95px 34px;
      gap: 0.45rem;
      align-items: center;
      margin-bottom: 0.45rem;
      background: #141923;
      padding: 0.42rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #2a3344;
    }

    .gm-sale-item-row input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      font-size: 0.84rem;
      padding: 0.38rem 0.5rem;
    }

    .gm-edit-sale-card {
      max-width: 760px !important;
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
      background: #141923 !important;
      border: 1px solid #2d3545 !important;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.88) !important;
      opacity: 1 !important;
    }

    /* Opacidade / fundo sólido nos modais de visualização e edição */
    #editSaleModalOverlay.modal-overlay,
    #viewSaleModalOverlay.modal-overlay,
    #viewStockProductModalOverlay.modal-overlay,
    #finEntryModalOverlay.modal-overlay,
    #viewFinEntryModalOverlay.modal-overlay,
    #clientFormModalOverlay.modal-overlay,
    #viewClientModalOverlay.modal-overlay {
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

    .gm-fin-subgrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 0.85rem;
      margin-bottom: 1rem;
    }

    .gm-client-address-preview {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(96, 165, 250, 0.35);
      border-radius: 8px;
      padding: 0.6rem 0.75rem;
      font-size: 0.82rem;
      color: #dbeafe;
      margin-top: 0.5rem;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// 2. DADOS INICIAIS
// ============================================================================
const DEFAULT_PRODUCTS = [];

const DEFAULT_CLIENTS = [
  {
    cod: 'CLI-001',
    name: 'MARCELO SOUZA',
    cpf: '384.910.228-40',
    phone: '(11) 98765-4321',
    birthDate: '1995-11-24',
    cep: '13201-000',
    street: 'Rua do Rosário',
    number: '450',
    complement: 'Apto 42',
    neighborhood: 'Centro',
    city: 'Jundiaí',
    state: 'SP',
    category: 'VIP / Recorrente',
    notes: 'Colecionador de árabes e nichos'
  },
  {
    cod: 'CLI-002',
    name: 'JULIANA ALMEIDA',
    cpf: '291.445.882-19',
    phone: '(11) 99412-3308',
    birthDate: '1998-06-14',
    cep: '13208-050',
    street: 'Av. Nove de Julho',
    number: '1200',
    complement: '',
    neighborhood: 'Anhanguera',
    city: 'Jundiaí',
    state: 'SP',
    category: 'Cliente Final',
    notes: 'Ama decants 10ml e gourmands'
  },
  {
    cod: 'CLI-003',
    name: 'RODRIGO CASTRO',
    cpf: '412.889.104-55',
    phone: '(11) 99123-7744',
    birthDate: '1991-09-02',
    cep: '13214-000',
    street: 'Rua Barão de Jundiaí',
    number: '88',
    complement: 'Bloco B',
    neighborhood: 'Centro',
    city: 'Jundiaí',
    state: 'SP',
    category: 'VIP / Recorrente',
    notes: 'Comprador de Creed e Tom Ford'
  }
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
let sellerCommissionRates = loadJsonKey(STORAGE_KEYS.COMMISSIONS, {});

// Estado dos filtros do Financeiro
let finTypeFilter = 'todos';         // 'todos' | 'Receita' | 'Despesa'
let finStatusFilter = 'todos';       // 'todos' | 'Pago' | 'Pendente'
let finChannelFilter = 'todos';      // 'todos' | 'Venda Presencial' | 'Online / Nuvemshop'
let finChannelSort = 'revenue_desc'; // 'revenue_desc' | 'orders_desc'
let finSupplierFilter = 'todos';     // 'todos' ou nome do fornecedor
let finSellerFilter = 'todos';       // 'todos' ou nome do vendedor

// Estado dos filtros da aba de Clientes
let clientSearchScope = 'all';       // 'all' | 'name' | 'phone' | 'order'

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
let commercialCatalogMaxPrice = '';          // string numérica opcional
let commercialCatalogSortBy = 'default';     // 'default' | 'price_asc' | 'price_desc'

function isDecantProduct(prod) {
  if (!prod) return false;
  const cat = String(prod.condition || '').toLowerCase();
  const name = String(prod.name || '').toLowerCase();
  const vol = String(prod.battery || '').toLowerCase();
  if (cat.includes('decant') || name.includes('decant') || vol.includes('decant')) return true;
  if (/\b(2ml|5ml|10ml)\b/.test(name) || /\b(2ml|5ml|10ml)\b/.test(vol)) return true;
  return false;
}

function getDaysUntilExpiry(expiryStr) {
  if (!expiryStr) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(expiryStr).trim())
    ? `${String(expiryStr).trim()}T00:00:00`
    : String(expiryStr).trim();
  const expDate = new Date(iso);
  if (Number.isNaN(expDate.getTime())) return null;
  return Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
}

function isExpiringOrExpiredProduct(prod) {
  const daysLeft = getDaysUntilExpiry(prod?.expiry);
  if (daysLeft === null) return false;
  return daysLeft <= 60;
}

function renderCriticalExpiryBadge(expiryStr) {
  const daysLeft = getDaysUntilExpiry(expiryStr);
  if (daysLeft === null) return '';
  if (daysLeft < 0) {
    return `<span class="badge-tag badge-despesa" style="margin-left:0.35rem;">Vencido</span>`;
  }
  if (daysLeft <= 30) {
    return `<span class="badge-tag badge-warning" style="margin-left:0.35rem;">Vence em ${daysLeft}d</span>`;
  }
  return '';
}

window.copyCommercialItemSummary = async function (prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  const volParts = [prod.condition, prod.battery].filter(Boolean).join(' • ');
  const summary = volParts
    ? `${prod.name} (${volParts}) — ${fmtBRL(prod.price)}`
    : `${prod.name} — ${fmtBRL(prod.price)}`;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(summary);
    } else {
      const ta = document.createElement('textarea');
      ta.value = summary;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(`Copiado: ${summary}`);
  } catch (_) {
    showToast('Não foi possível copiar automaticamente.');
  }
};

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
    if (!s.seller) s.seller = 'ADMIN';
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
  localStorage.setItem(STORAGE_KEYS.COMMISSIONS, JSON.stringify(sellerCommissionRates));
}

const BRAND_LOGO_PATH = 'logo-grupo-mister.png';

function applyBrandLogoEverywhere() {
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = BRAND_LOGO_PATH;

  document.querySelectorAll('img.sidebar-brand-logo, img.topbar-brand-logo, #loginScreenOverlay img').forEach((img) => {
    img.src = BRAND_LOGO_PATH;
    img.style.display = 'block';
    img.style.objectFit = 'contain';
  });
}

function saveAll() {
  syncSalesToFinanceEntries();
  persistLocalOnly();
  CloudSyncEngine.pushState({ products, clients, sales, warranties, quotes, finEntries });
}

const fmtBRL = (val) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

let toastTimeoutId = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => toast.classList.remove('show'), 3400);
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
          syncSalesToFinanceEntries();
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
function initGlobalKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllGithubActionMenus();
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (modal.id !== 'loginScreenOverlay') {
          modal.classList.remove('active');
        }
      });
      setMobileSidebarOpen(false);
    }
  });
}

function startApp() {
  injectLayoutAndActionStyles();
  applyBrandLogoEverywhere();
  initMobileSidebarToggle();
  initGlobalKeyboardShortcuts();
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
  syncSalesToFinanceEntries();
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
          <div class="form-group" style="flex:1 1 200px; margin:0;">
            <label for="comStockSearchInput">Buscar fragrância ou código:</label>
            <input type="text" id="comStockSearchInput" placeholder="Ex: Creed, 10ml, Árabe..." />
          </div>
          <div class="form-group" style="min-width:155px; margin:0;">
            <label for="comStockCategoryFilter">Categoria:</label>
            <select id="comStockCategoryFilter">
              <option value="todos">Todas as categorias</option>
              <option value="Decant">Decant</option>
              <option value="Árabe">Árabe</option>
              <option value="Nicho">Nicho</option>
              <option value="Importado">Importado</option>
            </select>
          </div>
          <div class="form-group" style="width:135px; margin:0;">
            <label for="comStockMaxPriceInput">Até R$ (Máx.):</label>
            <input type="number" id="comStockMaxPriceInput" min="0" step="1" placeholder="Ex: 250" />
          </div>
          <div class="form-group" style="min-width:160px; margin:0;">
            <label for="comStockSortSelect">Ordenar preço:</label>
            <select id="comStockSortSelect">
              <option value="default">Padrão</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
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
              <th>AÇÕES</th>
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
  document.getElementById('comStockMaxPriceInput')?.addEventListener('input', (e) => {
    commercialCatalogMaxPrice = e.target.value;
    renderCommercialStockCatalog();
  });
  document.getElementById('comStockSortSelect')?.addEventListener('change', (e) => {
    commercialCatalogSortBy = e.target.value || 'default';
    renderCommercialStockCatalog();
  });

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
    const pInp = document.getElementById('comStockMaxPriceInput');
    const sortSel = document.getElementById('comStockSortSelect');
    if (sInp) sInp.value = '';
    if (cSel) cSel.value = 'todos';
    if (pInp) pInp.value = '';
    if (sortSel) sortSel.value = 'default';
    commercialCatalogMaxPrice = '';
    commercialCatalogSortBy = 'default';
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
  const maxPriceRaw = String(commercialCatalogMaxPrice || '').replace(',', '.').trim();
  const maxPriceNum = maxPriceRaw !== '' ? parseFloat(maxPriceRaw) : null;
  const hasMaxPrice = maxPriceNum !== null && Number.isFinite(maxPriceNum) && maxPriceNum >= 0;

  const filtered = products.filter(p => {
    const qtyNum = Number(p.qty) || 0;
    const priceNum = Number(p.price) || 0;
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
    const matchMaxPrice = !hasMaxPrice || priceNum <= maxPriceNum;

    return matchTerm && matchCat && matchFormat && matchAvail && matchMaxPrice;
  });

  if (commercialCatalogSortBy === 'price_asc') {
    filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (commercialCatalogSortBy === 'price_desc') {
    filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:1.2rem;">Nenhuma fragrância disponível para o filtro selecionado.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const qtyNum = Number(p.qty) || 0;
    const isDecant = isDecantProduct(p);
    const formatBadge = isDecant
      ? `<span class="badge-tag badge-warning">Decant</span>`
      : `<span class="badge-tag badge-info">Frasco Completo</span>`;
    const qtyBadge = qtyNum > 0
      ? `<span class="badge-tag badge-receita">${qtyNum} un.</span>`
      : `<span class="badge-tag badge-despesa">Esgotado</span>`;
    const expiryBadge = renderCriticalExpiryBadge(p.expiry);

    return `
      <tr>
        <td><strong>${p.id}</strong></td>
        <td><strong>${p.name}</strong></td>
        <td>${formatBadge}</td>
        <td>
          <span>${p.condition || 'Produto'}</span>
          ${p.battery ? `<small style="color:var(--text-muted); margin-left:4px;">• ${p.battery}</small>` : ''}
        </td>
        <td style="white-space:nowrap;">${formatDateSafe(p.expiry)}${expiryBadge}</td>
        <td><strong style="color:#34d399;">${fmtBRL(p.price)}</strong></td>
        <td>${qtyBadge}</td>
        <td style="white-space:nowrap; display:flex; gap:0.35rem; align-items:center;">
          <button type="button" class="btn-sm" title="Copiar resumo para WhatsApp" onclick="copyCommercialItemSummary('${p.id}')">
            <i class="ph ph-copy"></i> Copiar
          </button>
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
  if (targetId === 'clientes') renderClients();
  if (targetId === 'financeiro') {
    syncSalesToFinanceEntries();
    renderFinance();
  }
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
  finEntries = finEntries.filter(f => String(f.autoSaleId || '') !== String(saleId));
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
  const clientOptions = `<option value="">Consumidor Balcão / Avulso</option>` + clients.map(c => `<option value="${c.cod}">${c.name} (${c.cpf || c.phone || c.cod})</option>`).join('');
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

function normalizePdvSearchText(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function selectPdvSearchedProduct(prod) {
  const searchInput = document.getElementById('modalProductSearch');
  const resultsList = document.getElementById('modalProductResults');
  const hiddenSelect = document.getElementById('modalProductSelect');
  const priceInput = document.getElementById('modalProductDisplayPrice');

  if (!prod) return;

  if (searchInput) searchInput.value = prod.name;
  if (priceInput) {
    priceInput.value = Number(prod.price || 0);
    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    priceInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (hiddenSelect) {
    let opt = Array.from(hiddenSelect.options).find(o => String(o.value) === String(prod.id));
    if (!opt) {
      opt = document.createElement('option');
      opt.value = prod.id;
      opt.textContent = prod.name;
      opt.setAttribute('data-price', String(prod.price || 0));
      hiddenSelect.appendChild(opt);
    }
    hiddenSelect.value = prod.id;
    hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (resultsList) {
    resultsList.style.display = 'none';
  }
}

function getPdvAvailableProductsList() {
  const source =
    Array.isArray(typeof products !== 'undefined' ? products : null)
      ? products
      : Array.isArray(window.products)
        ? window.products
        : [];
  return source.filter((p) => Number(p.qty ?? p.stock ?? 1) > 0);
}

function renderPdvProductSearchResults(query = '') {
  const resultsList = document.getElementById('modalProductResults');
  const searchInput = document.getElementById('modalProductSearch');
  const hiddenSelect = document.getElementById('modalProductSelect');
  if (!resultsList || !searchInput || !hiddenSelect) return;

  const group = document.getElementById('pdvProductSearchGroup');
  if (group && group.parentElement) {
    group.parentElement.style.overflow = 'visible';
  }

  const available = getPdvAvailableProductsList();
  const normQuery = normalizePdvSearchText(query);
  const terms = normQuery ? normQuery.split(/\s+/) : [];

  const matches =
    terms.length === 0
      ? available
      : available.filter((p) => {
          const hay = normalizePdvSearchText(
            `${p.name || ''} ${p.condition || ''} ${p.battery || ''} ${p.id || ''}`
          );
          return terms.every((t) => hay.includes(t));
        });

  resultsList.innerHTML = '';

  if (matches.length === 0) {
    resultsList.innerHTML = `<li style="padding:8px 10px; color:#9ca3af; font-size:0.84rem;">${
      available.length === 0
        ? 'Nenhum produto carregado no estoque'
        : 'Nenhuma fragrância encontrada'
    }</li>`;
    resultsList.style.setProperty('display', 'block', 'important');
    return;
  }

  matches.slice(0, 30).forEach((prod) => {
    const li = document.createElement('li');
    li.style.cssText =
      'padding:8px 10px; cursor:pointer; font-size:0.84rem; color:#f3f4f6; border-bottom:1px solid rgba(255,255,255,0.06);';
    const precoFormatado = typeof fmtBRL === 'function'
      ? fmtBRL(prod.price)
      : `R$ ${Number(prod.price || 0).toFixed(2).replace('.', ',')}`;
    const qtdDisp = prod.qty ?? prod.stock ?? '';
    li.textContent = qtdDisp !== ''
      ? `${prod.name} — ${precoFormatado} (${qtdDisp} un.)`
      : `${prod.name} — ${precoFormatado}`;

    li.addEventListener('mouseenter', () => {
      li.style.background = '#232a36';
    });
    li.addEventListener('mouseleave', () => {
      li.style.background = 'transparent';
    });
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectPdvSearchedProduct(prod);
    });
    resultsList.appendChild(li);
  });

  resultsList.style.setProperty('display', 'block', 'important');
}
function initSalesAndPdv() {
  if (typeof syncPdvLiveClockBadge === 'function') syncPdvLiveClockBadge();
  const pdvOverlay = document.getElementById('pdvModalOverlay');
  const searchInput = document.getElementById('modalProductSearch');
  const resultsList = document.getElementById('modalProductResults');
  const prodSel = document.getElementById('modalProductSelect');
  const priceInput = document.getElementById('modalProductDisplayPrice');
  const qtyInput = document.getElementById('modalProductQty');
  const discountInput = document.getElementById('modalProductDiscount');
  const addItemBtn = document.getElementById('btnAddModalProduct');
  const channelSelect = document.getElementById('modalContactChannel');
  const shippingNotesHidden = document.getElementById('modalShippingNotes');
  const confirmBtn = document.getElementById('btnModalConfirmSale');

  const syncChannelToNotes = () => {
    const canal = channelSelect?.value || 'Loja';
    if (shippingNotesHidden) {
      shippingNotesHidden.value = `Canal: ${canal}`;
    }
    return canal;
  };

  document.getElementById('btnOpenPdvModal')?.addEventListener('click', () => {
    if (typeof modalCart !== 'undefined') modalCart = [];
    const genDisc = document.getElementById('modalGeneralDiscount');
    if (genDisc) genDisc.value = '0';
    if (typeof renderModalCart === 'function') renderModalCart();
    const shipMethod = document.getElementById('modalShippingMethod');
    if (shipMethod) shipMethod.value = 'Retirada na Loja';
    if (channelSelect) channelSelect.value = 'Loja';
    syncChannelToNotes();
    const obs = document.getElementById('modalOrderObservation');
    if (obs) obs.value = '';
    const saleDate = document.getElementById('modalSaleDate');
    if (saleDate && typeof getNowBrDateTime === 'function') saleDate.value = getNowBrDateTime();
    if (searchInput) searchInput.value = '';
    if (prodSel) prodSel.value = '';
    if (priceInput) priceInput.value = '';
    if (qtyInput) qtyInput.value = '1';
    if (discountInput) discountInput.value = '0';
    if (resultsList) resultsList.style.setProperty('display', 'none', 'important');
    pdvOverlay?.classList.add('active');
  });

  document.getElementById('btnClosePdvModal')?.addEventListener('click', () => pdvOverlay?.classList.remove('active'));
  document.getElementById('btnModalCancelSale')?.addEventListener('click', () => pdvOverlay?.classList.remove('active'));
  document.getElementById('modalGeneralDiscount')?.addEventListener('input', () => {
    if (typeof renderModalCart === 'function') renderModalCart();
  });

  prodSel?.addEventListener('change', () => {
    const opt = prodSel.options[prodSel.selectedIndex];
    if (priceInput) {
      priceInput.value = opt ? (opt.getAttribute('data-price') || '0') : '0';
    }
  });

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('focus', () => {
      renderPdvProductSearchResults(searchInput.value);
    });
    searchInput.addEventListener('click', () => {
      renderPdvProductSearchResults(searchInput.value);
    });
    searchInput.addEventListener('input', () => {
      if (prodSel) prodSel.value = '';
      renderPdvProductSearchResults(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstItem = resultsList?.querySelector('li');
        if (firstItem && resultsList.style.display !== 'none') {
          e.preventDefault();
          firstItem.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        }
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#pdvProductSearchGroup') && resultsList) {
      resultsList.style.setProperty('display', 'none', 'important');
    }
  });

  if (addItemBtn && !addItemBtn.dataset.searchBound) {
    addItemBtn.dataset.searchBound = 'true';
    addItemBtn.addEventListener('click', () => {
      const list = getPdvAvailableProductsList();
      if (!prodSel?.value && searchInput?.value && list.length > 0) {
        const normTyped = normalizePdvSearchText(searchInput.value);
        const exactOrFirst =
          list.find((p) => normalizePdvSearchText(p.name) === normTyped) ||
          list.find((p) => normalizePdvSearchText(p.name).includes(normTyped));
        if (exactOrFirst) {
          selectPdvSearchedProduct(exactOrFirst);
        }
      }

      setTimeout(() => {
        if (searchInput) searchInput.value = '';
        if (prodSel) prodSel.value = '';
        if (priceInput) priceInput.value = '';
        if (qtyInput) qtyInput.value = '1';
        if (discountInput) discountInput.value = '0';
        if (resultsList) resultsList.style.setProperty('display', 'none', 'important');
      }, 0);
    }, true);
  }

  if (channelSelect && !channelSelect.dataset.bound) {
    channelSelect.dataset.bound = 'true';
    syncChannelToNotes();
    channelSelect.addEventListener('change', syncChannelToNotes);
  }

  if (confirmBtn && !confirmBtn.dataset.channelBound) {
    confirmBtn.dataset.channelBound = 'true';
    confirmBtn.addEventListener('click', () => {
      const canal = syncChannelToNotes();
      setTimeout(() => {
        if (typeof sales !== 'undefined' && Array.isArray(sales) && sales.length > 0) {
          const targetSale = sales[0];
          targetSale.contactChannel = canal;
          targetSale.shippingNotes = `Canal: ${canal}`;
          if (typeof persistLocalOnly === 'function') persistLocalOnly();
          if (typeof renderSales === 'function') renderSales();
        }
      }, 50);
    }, true);
  }
}

  document.getElementById('btnOpenPdvModal')?.addEventListener('click', () => {
    modalCart = [];
    document.getElementById('modalGeneralDiscount').value = '0';
    renderModalCart();
    document.getElementById('modalShippingMethod').value = 'Retirada na Loja';
    if (channelSelect) channelSelect.value = 'Loja';
    syncChannelToNotes();
    document.getElementById('modalOrderObservation').value = '';
    document.getElementById('modalSaleDate').value = getNowBrDateTime();
    if (searchInput) searchInput.value = '';
    if (prodSel) prodSel.value = '';
    if (priceInput) priceInput.value = '';
    if (qtyInput) qtyInput.value = '1';
    if (discountInput) discountInput.value = '0';
    if (resultsList) resultsList.style.display = 'none';
    pdvOverlay.classList.add('active');
  });

  document.getElementById('btnClosePdvModal')?.addEventListener('click', () => pdvOverlay.classList.remove('active'));
  document.getElementById('btnModalCancelSale')?.addEventListener('click', () => pdvOverlay.classList.remove('active'));
  document.getElementById('modalGeneralDiscount')?.addEventListener('input', renderModalCart);

  prodSel?.addEventListener('change', () => {
    const opt = prodSel.options[prodSel.selectedIndex];
    if (priceInput) {
      priceInput.value = opt ? (opt.getAttribute('data-price') || '0') : '0';
    }
  });

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('focus', () => {
      renderPdvProductSearchResults(searchInput.value);
    });
    searchInput.addEventListener('input', () => {
      if (prodSel) prodSel.value = '';
      renderPdvProductSearchResults(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstItem = resultsList?.querySelector('li');
        if (firstItem && resultsList.style.display !== 'none') {
          e.preventDefault();
          firstItem.click();
        }
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#pdvProductSearchGroup') && resultsList) {
      resultsList.style.display = 'none';
    }
  });

  if (addItemBtn && !addItemBtn.dataset.searchBound) {
    addItemBtn.dataset.searchBound = 'true';
    addItemBtn.addEventListener('click', () => {
      if (!prodSel?.value && searchInput?.value && Array.isArray(products)) {
        const normTyped = normalizePdvSearchText(searchInput.value);
        const exactOrFirst =
          products.find(p => normalizePdvSearchText(p.name) === normTyped) ||
          products.find(p => normalizePdvSearchText(p.name).includes(normTyped));
        if (exactOrFirst) {
          selectPdvSearchedProduct(exactOrFirst);
        }
      }

      setTimeout(() => {
        if (searchInput) searchInput.value = '';
        if (prodSel) prodSel.value = '';
        if (priceInput) priceInput.value = '';
        if (qtyInput) qtyInput.value = '1';
        if (discountInput) discountInput.value = '0';
        if (resultsList) resultsList.style.display = 'none';
      }, 0);
    }, true);
  }

  if (channelSelect && !channelSelect.dataset.bound) {
    channelSelect.dataset.bound = 'true';
    syncChannelToNotes();
    channelSelect.addEventListener('change', syncChannelToNotes);
  }

  if (confirmBtn && !confirmBtn.dataset.channelBound) {
    confirmBtn.dataset.channelBound = 'true';
    confirmBtn.addEventListener('click', () => {
      const canal = syncChannelToNotes();
      setTimeout(() => {
        if (Array.isArray(sales) && sales[0]) {
          sales[0].contactChannel = canal;
          sales[0].shippingNotes = `Canal: ${canal}`;
          persistLocalOnly();
          renderSales();
        }
      }, 0);
    }, true);
  }
}
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
// MENU SUSPENSO "AÇÕES ▾" (VENDAS, ESTOQUE, CLIENTES E FINANCEIRO)
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
        <h3><i class="ph ph-eye" style="color:#34d399;"></i> Detalhes do Produto <span id="viewStockProdHeaderId" style="color:#fbbf24;"></span></h3>
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
        <h3><i class="ph ph-eye" style="color:#34d399;"></i> Detalhes Completos da Venda <span id="viewSaleHeaderId" style="color:#fbbf24;"></span></h3>
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
              <div class="form-group" style="margin:0;">
                <label for="editSaleClient">Cliente:</label>
                <input type="text" id="editSaleClient" required />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="editSaleSeller">Vendedor:</label>
                <input type="text" id="editSaleSeller" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="editSaleDate">Data / Hora:</label>
                <input type="text" id="editSaleDate" />
              </div>
              <div class="form-group" style="margin:0;">
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
              <div class="form-group" style="margin:0;">
                <label for="editSaleShippingMethod">Modalidade de Envio:</label>
                <select id="editSaleShippingMethod">
                  <option value="Retirada na Loja">Retirada na Loja</option>
                  <option value="Motoboy">Motoboy</option>
                  <option value="Correios">Correios</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label for="editSaleOrderStatus">Status do Pedido:</label>
                <select id="editSaleOrderStatus">
                  <option value="Em Separação">Em Separação</option>
                  <option value="Separado">Separado</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Entregue">Entregue</option>
                </select>
              </div>
              <div class="form-group" style="margin:0;">
                <label for="editSaleTrackingCode">Código de Rastreio:</label>
                <input type="text" id="editSaleTrackingCode" placeholder="Ex: BR123456789BR" />
              </div>
              <div class="form-group" style="margin:0;">
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
              <div class="form-group" style="margin:0;">
                <label for="editSaleDiscount">Desconto (R$):</label>
                <input type="number" id="editSaleDiscount" step="0.01" min="0" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="editSaleTotal">Total da Venda (R$):</label>
                <input type="number" id="editSaleTotal" step="0.01" min="0" required />
              </div>
            </div>
            <div class="form-group" style="margin-top:0.55rem; margin-bottom:0;">
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
  if (!form) return;

  let block = document.getElementById('gmSaleItemsEditorBlock');
  if (!block) {
    const itemsInput = document.getElementById('editSaleItems');
    block = document.createElement('div');
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
  }

  const btnAdd = document.getElementById('gmBtnAddEditSaleItem');
  if (btnAdd && !btnAdd.dataset.bound) {
    btnAdd.dataset.bound = 'true';
    btnAdd.addEventListener('click', () => {
      editingSaleItemsDraft.push({ name: '', qty: 1, price: 0 });
      renderEditingSaleItemsRows(true);
    });
  }
}

function recalculateSaleTotalFromDraft(forceRecalcTotal = false) {
  const sumItems = editingSaleItemsDraft.reduce((acc, it) => {
    const q = Math.max(1, parseInt(it.qty, 10) || 1);
    const pr = Math.max(0, parseFloat(it.price) || 0);
    return acc + (q * pr);
  }, 0);

  const itemsInput = document.getElementById('editSaleItems');
  if (itemsInput) {
    itemsInput.value = formatSaleItemsArrayToString(editingSaleItemsDraft);
  }

  const totalInput = document.getElementById('editSaleTotal');
  const discInput = document.getElementById('editSaleDiscount');
  if (forceRecalcTotal && totalInput && sumItems > 0) {
    const disc = Math.max(0, parseFloat(discInput?.value) || 0);
    totalInput.value = Math.max(0, sumItems - disc).toFixed(2);
  }
}

function renderEditingSaleItemsRows(recalcTotal = false) {
  const container = document.getElementById('gmSaleItemsRowsContainer');
  if (!container) return;

  if (!Array.isArray(editingSaleItemsDraft) || editingSaleItemsDraft.length === 0) {
    container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding:0.35rem;">Nenhum item listado. Clique em "+ Adicionar Item".</div>`;
    recalculateSaleTotalFromDraft(recalcTotal);
    return;
  }

  container.innerHTML = editingSaleItemsDraft.map((it, idx) => {
    const q = Math.max(1, parseInt(it.qty, 10) || 1);
    const pr = Math.max(0, parseFloat(it.price) || 0);
    const sub = q * pr;
    return `
      <div class="gm-sale-item-row">
        <input type="text" value="${String(it.name || '').replace(/"/g, '&quot;')}" placeholder="Nome do item" oninput="updateDraftSaleItem(${idx}, 'name', this.value)" />
        <input type="number" min="1" step="1" value="${q}" oninput="updateDraftSaleItem(${idx}, 'qty', this.value)" />
        <input type="number" min="0" step="0.01" value="${pr}" oninput="updateDraftSaleItem(${idx}, 'price', this.value)" />
        <span style="font-size:0.8rem; font-weight:700; text-align:right; color:#34d399;">${sub > 0 ? fmtBRL(sub) : '-'}</span>
        <button type="button" class="btn-sm btn-danger" title="Remover item" onclick="removeDraftSaleItem(${idx})">&times;</button>
      </div>
    `;
  }).join('');

  recalculateSaleTotalFromDraft(recalcTotal);
}

window.updateDraftSaleItem = function (idx, field, val) {
  if (!editingSaleItemsDraft[idx]) return;
  if (field === 'qty') {
    editingSaleItemsDraft[idx].qty = Math.max(1, parseInt(val, 10) || 1);
  } else if (field === 'price') {
    editingSaleItemsDraft[idx].price = Math.max(0, parseFloat(val) || 0);
  } else {
    editingSaleItemsDraft[idx].name = val;
  }
  const hasAnyPrice = editingSaleItemsDraft.some(x => (parseFloat(x.price) || 0) > 0);
  recalculateSaleTotalFromDraft(hasAnyPrice);
  renderEditingSaleItemsRows(hasAnyPrice);
};

window.removeDraftSaleItem = function (idx) {
  editingSaleItemsDraft.splice(idx, 1);
  renderEditingSaleItemsRows(true);
};

function initEditSaleModule() {
  ensureEditSaleModalStructure();
  const overlay = document.getElementById('editSaleModalOverlay');
  document.getElementById('btnCloseEditSaleModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelEditSaleModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  document.getElementById('formEditSale')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const saleId = document.getElementById('editSaleId').value;
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) return;

    const cleanDraft = editingSaleItemsDraft
      .map(it => ({
        name: String(it.name || '').trim(),
        qty: Math.max(1, parseInt(it.qty, 10) || 1),
        price: Math.max(0, parseFloat(it.price) || 0)
      }))
      .filter(it => it.name);

    sale.rawItems = cleanDraft;
    const formattedDraftStr = formatSaleItemsArrayToString(cleanDraft);

    sale.client = document.getElementById('editSaleClient').value.trim().toUpperCase() || sale.client;
    sale.seller = document.getElementById('editSaleSeller').value.trim().toUpperCase() || sale.seller;
    sale.date = document.getElementById('editSaleDate').value.trim() || sale.date;
    sale.payment = document.getElementById('editSalePayment').value;
    sale.items = formattedDraftStr || document.getElementById('editSaleItems').value.trim() || sale.items;
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
    showToast(`Venda #${sale.id} e itens atualizados com sucesso!`);
  });
}

window.openEditSaleModal = function (saleId) {
  ensureEditSaleModalStructure();
  const s = sales.find(item => String(item.id) === String(saleId));
  if (!s) return;

  document.getElementById('editSaleHeaderId').textContent = `#${s.id}`;
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

  const existingItems = Array.isArray(s.rawItems) && s.rawItems.length > 0
    ? s.rawItems
    : parseSaleItemsStringToArray(s.items);
  editingSaleItemsDraft = existingItems.map(it => ({
    name: it.name || '',
    qty: Math.max(1, parseInt(it.qty, 10) || 1),
    price: Number(it.price || 0)
  }));
  renderEditingSaleItemsRows(false);

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
  tbody.innerHTML = modalCart.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtBRL(i.unitPrice)}</td><td><strong style="color:#34d399;">${fmtBRL(i.total)}</strong></td></tr>`).join('');
  if (payVal) payVal.value = fmtBRL(finalTotal);
}

function renderSales() {
  syncPdvLiveClockBadge();
  const statusFilter = document.getElementById('salesStatusFilter')?.value || 'todos';
  const channelFilter = document.getElementById('salesChannelFilter')?.value || 'todos';

  const tableViewEl = document.getElementById('salesTableView');
  const cardsViewEl = document.getElementById('salesCardsView');
  const toggleBtnEl = document.getElementById('btnToggleListModel');
  if (toggleBtnEl) toggleBtnEl.style.display = 'none';
  if (tableViewEl) tableViewEl.style.display = 'none';
  if (cardsViewEl) cardsViewEl.style.display = 'block';

  const filteredSales = sales.filter(s => {
    const st = s.orderStatus || 'Em Separação';
    const matchStatus = statusFilter === 'todos' || st === statusFilter;
    const matchChannel = channelFilter === 'todos' || (channelFilter === 'Online / Nuvemshop' ? s.type === 'Online / Nuvemshop' : s.type !== 'Online / Nuvemshop');
    return matchStatus && matchChannel;
  });

  const cards = document.getElementById('cardsSalesList');
  if (cards) cards.innerHTML = filteredSales.map(s => {
    const st = s.orderStatus || 'Em Separação';
    const ship = s.shippingMethod || 'Retirada na Loja';
    const shipBadge = ship === 'Motoboy'
      ? `<span class="badge-tag badge-motoboy">Motoboy</span>`
      : ship === 'Correios'
      ? `<span class="badge-tag badge-correios">Correios</span>`
      : `<span class="badge-tag badge-info">${ship}</span>`;

    return `
      <div class="sale-card-item">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <div style="display:inline-flex; align-items:center; gap:0.45rem; flex-wrap:wrap;">
            <strong>#${s.id} ${s.type === 'Online / Nuvemshop' ? '(Nuvemshop)' : ''}</strong>
            ${shipBadge}
          </div>
          ${renderStatusSelectControl(s.id, st)}
        </div>
        <div>
          <strong>${s.client}</strong>
          <small style="color:var(--text-muted); margin-left:0.35rem;">${s.date} • ${s.items}</small>
        </div>
        ${s.trackingCode ? `<small style="color:#34d399;"><i class="ph ph-barcode"></i> Rastreio: <strong>${s.trackingCode}</strong></small>` : ''}
        ${s.observation ? `<small style="color:#fbbf24;"><i class="ph ph-note"></i> ${s.observation}</small>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem; margin-top:0.25rem;">
          <strong style="color:#34d399; font-size:0.98rem;">${fmtBRL(s.total)}</strong>
          ${renderGithubPencilActionButton(s.id)}
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
  tbody.innerHTML = filtered.map(p => `<tr><td>${p.id}</td><td><strong>${p.name}</strong></td><td><code>${p.imei || '-'}</code></td><td><span class="badge-tag badge-info">${p.condition}</span> <small>${p.battery || ''}</small></td><td><strong style="color:#34d399;">${fmtBRL(p.price)}</strong></td><td>${p.qty > 0 ? `<span class="badge-tag badge-receita">${p.qty} un.</span>` : `<span class="badge-tag badge-despesa">Esgotado</span>`}</td><td><button type="button" class="btn-sm btn-green" ${p.qty <= 0 ? 'disabled' : ''} onclick="quickAddToPdv('${p.id}')">Vender</button></td></tr>`).join('');
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
  document.getElementById('modalSaleDate').value = getNowBrDateTime();
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
  if (tbody) tbody.innerHTML = quotes.map(q => `<tr><td><strong>${q.cod}</strong></td><td>${q.date}</td><td>${q.clientName}</td><td>${q.items.map(i => `${i.name} (${i.qty}x)`).join('<br>')}</td><td>${fmtBRL(q.tradeInVal)}</td><td><strong style="color:#34d399;">${fmtBRL(q.netTotal)}</strong></td><td><span class="badge-tag ${q.status === 'Aprovado' ? 'badge-receita' : 'badge-warning'}">${q.status}</span></td><td>${q.status === 'Aberto' ? `<button type="button" class="btn-sm btn-green" onclick="convertQuoteToSale('${q.cod}')">Converter</button>` : '-'}</td></tr>`).join('');
}

window.convertQuoteToSale = function (cod) {
  const q = quotes.find(item => item.cod === cod);
  if (!q) return;
  q.status = 'Aprovado';
  sales.unshift({ id: String(9054500 + sales.length + 1), client: q.clientName, phone: q.clientPhone, seller: q.seller, date: getNowBrDateTime(), isoDate: new Date().toISOString().split('T')[0], type: 'Venda Presencial', shippingMethod: 'Retirada na Loja', trackingCode: '', orderStatus: 'Em Separação', observation: `Convertido do orçamento ${q.cod}`, shippingPacked: false, payment: 'Pix', discount: q.tradeInVal || 0, items: q.items.map(i => `${i.name} (${i.qty}x)`).join(', '), rawItems: [...q.items], total: q.netTotal, status: 'Concluído' });
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
        <td>${formatDateSafe(w.startDate)} (${w.days}d)</td>
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
    html += `<tr><td>${i}x</td><td><input type="number" class="rate-input" data-idx="${i}" value="${rate}" step="0.01" style="width:60px;background:#0b0f17;border:1px solid var(--border);color:#fff;padding:2px;" />%</td><td><strong>${fmtBRL(tot / i)}</strong></td><td>${fmtBRL(tot)}</td><td style="color:#34d399;">${fmtBRL(net)}</td></tr>`;
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

// ============================================================================
// MÓDULO DE CLIENTES COMPLETO (BUSCA POR NOME/NÚMERO/PEDIDO, NASCIMENTO & CEP)
// ============================================================================
function normalizeDigits(val = '') {
  return String(val || '').replace(/\D/g, '');
}

function calculateAgeFromBirthDate(birthStr) {
  if (!birthStr) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(birthStr).trim())
    ? `${String(birthStr).trim()}T00:00:00`
    : String(birthStr).trim();
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const mDiff = now.getMonth() - dob.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function isBirthdayToday(birthStr) {
  if (!birthStr) return false;
  const parts = String(birthStr).trim().split('-');
  if (parts.length !== 3) return false;
  const now = new Date();
  return Number(parts[1]) === (now.getMonth() + 1) && Number(parts[2]) === now.getDate();
}

function formatFullClientAddress(client) {
  if (!client) return '';
  const streetLine = [client.street, client.number].filter(Boolean).join(', ');
  const compLine = client.complement ? ` (${client.complement})` : '';
  const cityState = [client.city, client.state].filter(Boolean).join('/');
  const mainParts = [
    streetLine ? `${streetLine}${compLine}` : '',
    client.neighborhood || '',
    cityState,
    client.cep ? `CEP ${client.cep}` : ''
  ].filter(Boolean);
  return mainParts.join(' • ');
}

function getClientSalesHistory(client) {
  if (!client) return [];
  const cName = String(client.name || '').toLowerCase().trim();
  const cPhoneDigits = normalizeDigits(client.phone);

  return sales.filter(s => {
    const sName = String(s.client || '').toLowerCase().trim();
    const sPhoneDigits = normalizeDigits(s.phone);
    const matchName = Boolean(cName && sName && sName === cName);
    const matchPhone = Boolean(cPhoneDigits && sPhoneDigits && sPhoneDigits.includes(cPhoneDigits));
    return matchName || matchPhone;
  });
}

function ensureClientSearchCustomBar() {
  const clientSec = document.getElementById('clientes');
  const searchInp = document.getElementById('clientSearchInput');
  if (!clientSec || !searchInp) return;

  searchInp.placeholder = 'Buscar por nome, telefone ou Nº do pedido (ex: 9054501)...';

  if (!document.getElementById('gmClientSearchScopeGroup')) {
    const scopeWrap = document.createElement('div');
    scopeWrap.id = 'gmClientSearchScopeGroup';
    scopeWrap.className = 'form-group';
    scopeWrap.style.cssText = 'min-width:175px; margin:0;';
    scopeWrap.innerHTML = `
      <label for="clientSearchScopeSelect">Filtrar busca por:</label>
      <select id="clientSearchScopeSelect">
        <option value="all">Nome, Telefone ou Pedido</option>
        <option value="name">Apenas Nome / CPF</option>
        <option value="phone">Apenas Número (Telefone)</option>
        <option value="order">Apenas Nº do Pedido</option>
      </select>
    `;
    searchInp.insertAdjacentElement('afterend', scopeWrap);

    document.getElementById('clientSearchScopeSelect')?.addEventListener('change', (e) => {
      clientSearchScope = e.target.value || 'all';
      renderClients();
    });
  }
}

function ensureClientFormAndViewModals() {
  if (!document.getElementById('clientFormModalOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'clientFormModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content gm-view-modal-card">
        <div class="modal-header">
          <h3><i class="ph ph-user-plus" style="color:#60a5fa;"></i> <span id="clientFormModalTitle">Cadastrar Cliente</span></h3>
          <button type="button" id="btnCloseClientFormModal" class="btn-close">&times;</button>
        </div>
        <form id="formClientFull" class="modal-body">
          <input type="hidden" id="clientEditCod" />

          <div class="gm-modal-section-card">
            <div class="gm-modal-section-title"><i class="ph ph-identification-card" style="color:#60a5fa;"></i> Dados Pessoais</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(185px, 1fr)); gap:0.6rem;">
              <div class="form-group" style="margin:0;">
                <label for="clientFormName">Nome Completo:</label>
                <input type="text" id="clientFormName" required placeholder="Ex: João Silva" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormPhone">Número / WhatsApp:</label>
                <input type="text" id="clientFormPhone" placeholder="(11) 99999-9999" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormCpf">CPF:</label>
                <input type="text" id="clientFormCpf" placeholder="000.000.000-00" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormBirthDate">Data de Nascimento:</label>
                <input type="date" id="clientFormBirthDate" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormCategory">Categoria:</label>
                <select id="clientFormCategory">
                  <option value="Cliente Final">Cliente Final</option>
                  <option value="VIP / Recorrente">VIP / Recorrente</option>
                </select>
              </div>
            </div>
            <div id="clientFormAgePreview" style="margin-top:0.45rem; font-size:0.78rem; color:#9ca3af;"></div>
          </div>

          <div class="gm-modal-section-card accent-amber">
            <div class="gm-modal-section-title"><i class="ph ph-map-pin" style="color:#fbbf24;"></i> Endereço & CEP Automático</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:0.6rem;">
              <div class="form-group" style="margin:0;">
                <label for="clientFormCep">CEP:</label>
                <div style="display:flex; gap:0.35rem;">
                  <input type="text" id="clientFormCep" placeholder="00000-000" maxlength="9" />
                  <button type="button" id="btnLookupClientCep" class="btn-sm btn-blue" title="Buscar CEP"><i class="ph ph-magnifying-glass"></i></button>
                </div>
              </div>
              <div class="form-group" style="grid-column:span 2; margin:0;">
                <label for="clientFormStreet">Rua / Logradouro:</label>
                <input type="text" id="clientFormStreet" placeholder="Rua / Avenida" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormNumber">Número:</label>
                <input type="text" id="clientFormNumber" placeholder="Nº" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormComplement">Complemento:</label>
                <input type="text" id="clientFormComplement" placeholder="Apto, Casa..." />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormNeighborhood">Bairro:</label>
                <input type="text" id="clientFormNeighborhood" placeholder="Bairro" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormCity">Cidade:</label>
                <input type="text" id="clientFormCity" placeholder="Cidade" />
              </div>
              <div class="form-group" style="margin:0;">
                <label for="clientFormState">UF:</label>
                <input type="text" id="clientFormState" placeholder="SP" maxlength="2" />
              </div>
            </div>
            <div id="clientFormAddressPreview" class="gm-client-address-preview">Sem endereço preenchido.</div>
          </div>

          <div class="gm-modal-section-card accent-emerald">
            <div class="gm-modal-section-title"><i class="ph ph-note" style="color:#34d399;"></i> Preferências / Observações</div>
            <div class="form-group" style="margin:0;">
              <textarea id="clientFormNotes" rows="2" placeholder="Preferências olfativas, notas favoritas, observações..."></textarea>
            </div>
          </div>

          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.85rem;">
            <button type="button" id="btnCancelClientFormModal" class="btn-sm">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="ph ph-check"></i> Salvar Cliente</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeFormModal = () => overlay.classList.remove('active');
    document.getElementById('btnCloseClientFormModal')?.addEventListener('click', closeFormModal);
    document.getElementById('btnCancelClientFormModal')?.addEventListener('click', closeFormModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeFormModal();
    });

    const updateFormPreviews = () => {
      const dobVal = document.getElementById('clientFormBirthDate')?.value || '';
      const ageEl = document.getElementById('clientFormAgePreview');
      if (ageEl) {
        if (!dobVal) {
          ageEl.textContent = 'Data de nascimento não informada.';
        } else {
          const age = calculateAgeFromBirthDate(dobVal);
          const bday = isBirthdayToday(dobVal);
          ageEl.innerHTML = `Nascimento: <strong>${formatDateSafe(dobVal)}</strong>${age !== null ? ` • <strong>${age} anos</strong>` : ''}${bday ? ' • <span class="badge-tag badge-warning">🎂 Aniversariante hoje!</span>' : ''}`;
        }
      }

      const addrPreview = document.getElementById('clientFormAddressPreview');
      if (addrPreview) {
        const draftObj = {
          cep: document.getElementById('clientFormCep')?.value.trim(),
          street: document.getElementById('clientFormStreet')?.value.trim(),
          number: document.getElementById('clientFormNumber')?.value.trim(),
          complement: document.getElementById('clientFormComplement')?.value.trim(),
          neighborhood: document.getElementById('clientFormNeighborhood')?.value.trim(),
          city: document.getElementById('clientFormCity')?.value.trim(),
          state: document.getElementById('clientFormState')?.value.trim().toUpperCase()
        };
        const formatted = formatFullClientAddress(draftObj);
        addrPreview.innerHTML = formatted
          ? `<strong>Prévia do Endereço:</strong> ${formatted}`
          : 'Sem endereço preenchido.';
      }
    };

    ['clientFormBirthDate', 'clientFormCep', 'clientFormStreet', 'clientFormNumber', 'clientFormComplement', 'clientFormNeighborhood', 'clientFormCity', 'clientFormState']
      .forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateFormPreviews);
        document.getElementById(id)?.addEventListener('change', updateFormPreviews);
      });

    const lookupCepFn = async (silent = false) => {
      const cepInp = document.getElementById('clientFormCep');
      const digits = normalizeDigits(cepInp?.value || '');
      if (digits.length !== 8) {
        if (!silent) showToast('Digite um CEP válido com 8 dígitos.');
        return;
      }
      if (cepInp) cepInp.value = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data && !data.erro) {
          if (data.logradouro && !document.getElementById('clientFormStreet').value) {
            document.getElementById('clientFormStreet').value = data.logradouro;
          }
          if (data.bairro && !document.getElementById('clientFormNeighborhood').value) {
            document.getElementById('clientFormNeighborhood').value = data.bairro;
          }
          if (data.localidade) {
            document.getElementById('clientFormCity').value = data.localidade;
          }
          if (data.uf) {
            document.getElementById('clientFormState').value = data.uf.toUpperCase();
          }
          updateFormPreviews();
          if (!silent) showToast('Endereço preenchido via CEP!');
        } else if (!silent) {
          showToast('CEP não encontrado. Preencha manualmente.');
        }
      } catch (_) {
        if (!silent) showToast('Não foi possível consultar o CEP agora.');
      }
    };

    document.getElementById('btnLookupClientCep')?.addEventListener('click', () => lookupCepFn(false));
    document.getElementById('clientFormCep')?.addEventListener('blur', () => {
      if (normalizeDigits(document.getElementById('clientFormCep')?.value || '').length === 8) {
        lookupCepFn(true);
      }
    });

    document.getElementById('formClientFull')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const editCod = document.getElementById('clientEditCod').value;
      const nameVal = document.getElementById('clientFormName').value.trim().toUpperCase();
      if (!nameVal) return showToast('Informe o nome do cliente.');

      const payload = {
        name: nameVal,
        phone: document.getElementById('clientFormPhone').value.trim(),
        cpf: document.getElementById('clientFormCpf').value.trim(),
        birthDate: document.getElementById('clientFormBirthDate').value || '',
        cep: document.getElementById('clientFormCep').value.trim(),
        street: document.getElementById('clientFormStreet').value.trim(),
        number: document.getElementById('clientFormNumber').value.trim(),
        complement: document.getElementById('clientFormComplement').value.trim(),
        neighborhood: document.getElementById('clientFormNeighborhood').value.trim(),
        city: document.getElementById('clientFormCity').value.trim(),
        state: document.getElementById('clientFormState').value.trim().toUpperCase(),
        category: document.getElementById('clientFormCategory').value,
        notes: document.getElementById('clientFormNotes').value.trim()
      };

      if (editCod) {
        const existing = clients.find(c => c.cod === editCod);
        if (existing) {
          Object.assign(existing, payload);
        }
        showToast(`Cliente "${nameVal}" atualizado!`);
      } else {
        clients.unshift({
          cod: 'CLI-' + String(clients.length + 1).padStart(3, '0'),
          ...payload
        });
        showToast(`Cliente "${nameVal}" cadastrado!`);
      }

      saveAll();
      renderAll();
      closeFormModal();
    });
  }

  if (!document.getElementById('viewClientModalOverlay')) {
    const viewOverlay = document.createElement('div');
    viewOverlay.id = 'viewClientModalOverlay';
    viewOverlay.className = 'modal-overlay';
    viewOverlay.innerHTML = `
      <div class="modal-content gm-view-modal-card">
        <div class="modal-header">
          <h3><i class="ph ph-eye" style="color:#34d399;"></i> Detalhes do Cliente <span id="viewClientHeaderCod" style="color:#fbbf24;"></span></h3>
          <button type="button" id="btnCloseViewClientModal" class="btn-close">&times;</button>
        </div>
        <div id="viewClientModalBody" class="modal-body"></div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.85rem; flex-wrap:wrap;">
          <button type="button" id="btnViewClientSell" class="btn-green"><i class="ph ph-shopping-cart"></i> Vender</button>
          <button type="button" id="btnViewClientEdit" class="btn-primary"><i class="ph ph-pencil-simple"></i> Editar</button>
          <button type="button" id="btnCloseViewClientModalFooter" class="btn-sm">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(viewOverlay);

    const closeView = () => viewOverlay.classList.remove('active');
    document.getElementById('btnCloseViewClientModal')?.addEventListener('click', closeView);
    document.getElementById('btnCloseViewClientModalFooter')?.addEventListener('click', closeView);
    viewOverlay.addEventListener('click', (e) => {
      if (e.target === viewOverlay) closeView();
    });
  }
}

window.openNewClientModal = function () {
  ensureClientFormAndViewModals();
  document.getElementById('clientEditCod').value = '';
  document.getElementById('clientFormModalTitle').textContent = 'Cadastrar Cliente';
  document.getElementById('formClientFull')?.reset();
  document.getElementById('clientFormAgePreview').textContent = 'Data de nascimento não informada.';
  document.getElementById('clientFormAddressPreview').innerHTML = 'Sem endereço preenchido.';
  document.getElementById('clientFormModalOverlay')?.classList.add('active');
};

window.openEditClientModal = function (cod) {
  ensureClientFormAndViewModals();
  const c = clients.find(item => item.cod === cod);
  if (!c) return;

  document.getElementById('clientEditCod').value = c.cod;
  document.getElementById('clientFormModalTitle').textContent = `Editar Cliente (${c.cod})`;
  document.getElementById('clientFormName').value = c.name || '';
  document.getElementById('clientFormPhone').value = c.phone || '';
  document.getElementById('clientFormCpf').value = c.cpf || '';
  document.getElementById('clientFormBirthDate').value = c.birthDate || '';
  document.getElementById('clientFormCategory').value = c.category || 'Cliente Final';
  document.getElementById('clientFormCep').value = c.cep || '';
  document.getElementById('clientFormStreet').value = c.street || '';
  document.getElementById('clientFormNumber').value = c.number || '';
  document.getElementById('clientFormComplement').value = c.complement || '';
  document.getElementById('clientFormNeighborhood').value = c.neighborhood || '';
  document.getElementById('clientFormCity').value = c.city || '';
  document.getElementById('clientFormState').value = c.state || '';
  document.getElementById('clientFormNotes').value = c.notes || '';

  document.getElementById('clientFormBirthDate')?.dispatchEvent(new Event('change'));
  document.getElementById('clientFormCep')?.dispatchEvent(new Event('input'));
  document.getElementById('clientFormModalOverlay')?.classList.add('active');
};

window.openViewClientModal = function (cod) {
  ensureClientFormAndViewModals();
  const c = clients.find(item => item.cod === cod);
  if (!c) return;

  const clientSales = getClientSalesHistory(c);
  const totalSpent = clientSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  const age = calculateAgeFromBirthDate(c.birthDate);
  const bdayBadge = isBirthdayToday(c.birthDate)
    ? `<span class="badge-tag badge-warning" style="margin-left:0.35rem;">🎂 Hoje!</span>`
    : '';
  const birthDisplay = c.birthDate
    ? `${formatDateSafe(c.birthDate)}${age !== null ? ` (${age} anos)` : ''}${bdayBadge}`
    : 'Não informado';
  const fullAddr = formatFullClientAddress(c) || 'Endereço não cadastrado';

  const recentOrdersHtml = clientSales.length > 0
    ? clientSales.slice(0, 6).map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; padding:0.42rem 0.55rem; border-radius:6px; background:#141923; border:1px solid #2a3344; margin-bottom:0.35rem;">
          <div>
            <strong>Pedido #${s.id}</strong>
            <small style="color:#9ca3af; margin-left:0.35rem;">${s.date} • ${s.items}</small>
          </div>
          <strong style="color:#34d399;">${fmtBRL(s.total)}</strong>
        </div>
      `).join('')
    : `<div style="font-size:0.82rem; color:#9ca3af;">Nenhuma compra vinculada até o momento.</div>`;

  document.getElementById('viewClientHeaderCod').textContent = `(${c.cod})`;
  document.getElementById('viewClientModalBody').innerHTML = `
    <div class="gm-view-grid">
      <div class="gm-view-box"><small>Nome</small><strong>${c.name}</strong></div>
      <div class="gm-view-box"><small>Número / WhatsApp</small><strong>${c.phone || '-'}</strong></div>
      <div class="gm-view-box"><small>CPF</small><strong>${c.cpf || '-'}</strong></div>
      <div class="gm-view-box"><small>Nascimento / Idade</small><strong>${birthDisplay}</strong></div>
      <div class="gm-view-box"><small>Categoria</small><strong>${c.category || 'Cliente Final'}</strong></div>
      <div class="gm-view-box"><small>Compras (${clientSales.length})</small><strong style="color:#34d399 !important;">${fmtBRL(totalSpent)}</strong></div>
    </div>
    <div class="gm-view-box" style="margin-bottom:0.75rem;">
      <small>Endereço</small>
      <strong>${fullAddr}</strong>
    </div>
    <div class="gm-view-box" style="margin-bottom:0.75rem;">
      <small>Observações</small>
      <strong>${c.notes || 'Nenhuma observação.'}</strong>
    </div>
    <div class="gm-view-box">
      <small>Histórico de Pedidos do Cliente</small>
      <div style="margin-top:0.35rem;">${recentOrdersHtml}</div>
    </div>
  `;

  const btnEdit = document.getElementById('btnViewClientEdit');
  if (btnEdit) {
    btnEdit.onclick = () => {
      document.getElementById('viewClientModalOverlay')?.classList.remove('active');
      openEditClientModal(c.cod);
    };
  }

  const btnSell = document.getElementById('btnViewClientSell');
  if (btnSell) {
    btnSell.onclick = () => {
      document.getElementById('viewClientModalOverlay')?.classList.remove('active');
      selectClientForSale(c.cod);
    };
  }

  document.getElementById('viewClientModalOverlay')?.classList.add('active');
};

window.deleteClientRecord = function (cod) {
  const c = clients.find(item => item.cod === cod);
  if (!c) return;
  if (!confirm(`Deseja realmente excluir o cliente "${c.name}" (${c.cod})?`)) return;
  clients = clients.filter(item => item.cod !== cod);
  saveAll();
  renderAll();
  showToast(`Cliente "${c.name}" removido.`);
};

window.toggleClientActionMenu = function (event, cod) {
  event.stopPropagation();
  const menuId = `gmClientMenu_${String(cod).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let menu = document.getElementById(menuId);
  const wasOpen = menu?.classList.contains('open');
  closeAllGithubActionMenus();

  if (!menu) {
    menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'gm-gh-dropdown';
    menu.innerHTML = `
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openViewClientModal('${cod}')">
        <i class="ph ph-eye" style="color:#34d399; font-size:15px;"></i>
        <span>Visualizar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openEditClientModal('${cod}')">
        <i class="ph ph-pencil-simple" style="color:#60a5fa; font-size:15px;"></i>
        <span>Editar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); selectClientForSale('${cod}')">
        <i class="ph ph-shopping-cart" style="color:#fbbf24; font-size:15px;"></i>
        <span>Vender</span>
      </button>
      <div class="gm-gh-dropdown-divider"></div>
      <button type="button" class="gm-gh-dropdown-item danger-item" onclick="closeAllGithubActionMenus(); deleteClientRecord('${cod}')">
        <i class="ph ph-trash" style="font-size:15px;"></i>
        <span>Excluir</span>
      </button>
    `;
    document.body.appendChild(menu);
  }

  if (!wasOpen) {
    positionGithubMenu(menu, event.currentTarget);
  }
};

function initClientsModule() {
  ensureClientSearchCustomBar();
  ensureClientFormAndViewModals();

  const legacyOverlay = document.getElementById('clientModalOverlay');
  const openBtn = document.getElementById('btnOpenClientModal');

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openNewClientModal();
    }, true);
  }

  document.getElementById('btnCloseClientModal')?.addEventListener('click', () => legacyOverlay?.classList.remove('active'));
  document.getElementById('btnCancelClientModal')?.addEventListener('click', () => legacyOverlay?.classList.remove('active'));
  document.getElementById('formNewClient')?.addEventListener('submit', (e) => {
    e.preventDefault();
    clients.unshift({
      cod: 'CLI-' + String(clients.length + 1).padStart(3, '0'),
      name: document.getElementById('newClientName').value.trim().toUpperCase(),
      cpf: document.getElementById('newClientCpf').value.trim(),
      phone: document.getElementById('newClientPhone').value.trim(),
      category: document.getElementById('newClientCategory').value,
      notes: document.getElementById('newClientNotes').value.trim()
    });
    saveAll();
    renderAll();
    legacyOverlay?.classList.remove('active');
    showToast('Cliente cadastrado!');
  });

  document.getElementById('clientSearchInput')?.addEventListener('input', renderClients);
  document.getElementById('clientCategoryFilter')?.addEventListener('change', renderClients);
}

function renderClients() {
  ensureClientSearchCustomBar();
  ensureClientFormAndViewModals();

  const rawTerm = (document.getElementById('clientSearchInput')?.value || '').trim();
  const term = rawTerm.toLowerCase();
  const termDigits = normalizeDigits(rawTerm);
  const cat = document.getElementById('clientCategoryFilter')?.value || 'todos';

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('metricTotalPessoas', clients.length);
  setTxt('metricTotalClientes', clients.length);
  setTxt('metricClientesVip', clients.filter(c => c.category === 'VIP / Recorrente').length);

  const matchingOrdersBySearch = rawTerm
    ? sales.filter(s => {
        const orderIdStr = String(s.id || '').toLowerCase();
        const cleanTerm = term.replace(/^#/, '');
        return Boolean(cleanTerm && orderIdStr.includes(cleanTerm));
      })
    : [];

  const filtered = clients.filter(c => {
    const matchCat = cat === 'todos' || c.category === cat;
    if (!matchCat) return false;
    if (!rawTerm) return true;

    const cName = String(c.name || '').toLowerCase();
    const cCpf = String(c.cpf || '').toLowerCase();
    const cCod = String(c.cod || '').toLowerCase();
    const cPhoneDigits = normalizeDigits(c.phone);
    const clientOrders = getClientSalesHistory(c);
    const matchedOrderForClient = clientOrders.some(s =>
      matchingOrdersBySearch.some(m => String(m.id) === String(s.id))
    );

    const matchName = cName.includes(term) || cCpf.includes(term) || cCod.includes(term);
    const matchPhone = Boolean(termDigits && cPhoneDigits.includes(termDigits));
    const matchOrder = matchedOrderForClient;

    if (clientSearchScope === 'name') return matchName;
    if (clientSearchScope === 'phone') return matchPhone;
    if (clientSearchScope === 'order') return matchOrder;
    return matchName || matchPhone || matchOrder;
  });

  const tbody = document.getElementById('tableClientsDetailed');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.25rem;">Nenhum cliente encontrado para "${rawTerm}".</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const clientOrders = getClientSalesHistory(c);
    const totalSpent = clientOrders.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const age = calculateAgeFromBirthDate(c.birthDate);
    const bdayToday = isBirthdayToday(c.birthDate);
    const addrSummary = formatFullClientAddress(c);

    const matchedOrderIds = rawTerm
      ? clientOrders
          .filter(s => matchingOrdersBySearch.some(m => String(m.id) === String(s.id)))
          .map(s => `#${s.id}`)
      : [];

    const orderBadge = matchedOrderIds.length > 0
      ? `<div style="margin-top:3px;"><span class="badge-tag badge-info">Pedido ${matchedOrderIds.join(', ')}</span></div>`
      : '';

    const bdayTag = bdayToday
      ? `<span class="badge-tag badge-warning" style="margin-left:0.35rem;">🎂 Hoje!</span>`
      : '';

    const birthSub = c.birthDate
      ? `<div style="font-size:0.73rem; color:#9ca3af; margin-top:2px;">Nasc.: ${formatDateSafe(c.birthDate)}${age !== null ? ` • ${age} anos` : ''}${bdayTag}</div>`
      : '';

    const addrSub = addrSummary
      ? `<div style="font-size:0.73rem; color:#9ca3af; margin-top:2px;">${addrSummary}</div>`
      : '';

    const ordersSub = clientOrders.length > 0
      ? `<div style="font-size:0.73rem; color:#34d399; margin-top:2px;">${clientOrders.length} pedido(s) • ${fmtBRL(totalSpent)}</div>`
      : '';

    return `
      <tr>
        <td><strong>${c.cod}</strong></td>
        <td>
          <strong>${c.name}</strong>
          ${orderBadge}
          ${birthSub}
          ${addrSub}
        </td>
        <td>${c.cpf || '-'}</td>
        <td>${c.phone || '-'}</td>
        <td>
          <div>${c.notes || '-'}</div>
          ${ordersSub}
        </td>
        <td>
          <span class="badge-tag ${c.category === 'VIP / Recorrente' ? 'badge-warning' : 'badge-info'}">${c.category}</span>
        </td>
        <td style="white-space:nowrap;">
          <div class="gm-gh-action-wrap">
            <button type="button" class="gm-gh-pencil-btn" onclick="toggleClientActionMenu(event, '${c.cod}')">
              <span>Ações</span>
              <i class="ph ph-caret-down" style="font-size:13px; color:#9ca3af;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.selectClientForSale = function (cod) {
  modalCart = [];
  document.getElementById('modalGeneralDiscount').value = '0';
  renderModalCart();
  const sel = document.getElementById('modalClientSelect'); if (sel) sel.value = cod;
  document.getElementById('modalSaleDate').value = getNowBrDateTime();
  document.getElementById('pdvModalOverlay').classList.add('active');
};

// ============================================================================
// MÓDULO DE ESTOQUE (REPAGINADO: MÉTRICAS OPERACIONAIS + FILTROS SEM IMEI + AÇÕES)
// ============================================================================
function ensureSupplierFieldInProductModal() {
  const modalForm = document.getElementById('formNewProduct');
  if (!modalForm || document.getElementById('prodSupplier')) return;

  const nameInput = document.getElementById('prodName');
  const supGroup = document.createElement('div');
  supGroup.className = 'form-group';
  supGroup.id = 'prodSupplierFieldGroup';
  supGroup.innerHTML = `<label for="prodSupplier">Fornecedor:</label><input type="text" id="prodSupplier" placeholder="Ex: Importadora Dubai, Fornecedor Local..." />`;

  if (nameInput?.parentElement) {
    nameInput.parentElement.insertAdjacentElement('afterend', supGroup);
  } else {
    modalForm.prepend(supGroup);
  }
}

function ensureStockOperationalMetricsCards() {
  const stockSection = document.getElementById('estoque');
  if (!stockSection || document.getElementById('gmStockOperationalGrid')) return;

  const grid = document.createElement('div');
  grid.id = 'gmStockOperationalGrid';
  grid.className = 'grid-4';
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:0.75rem; margin-bottom:0.9rem;';
  grid.innerHTML = `
    <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #60a5fa; border-radius:10px; padding:0.8rem 0.95rem;">
      <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Unidades Totais</small>
      <strong id="gmStockOpTotalUnits" style="font-size:1.35rem; color:#f3f4f6;">0</strong>
    </div>
    <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #34d399; border-radius:10px; padding:0.8rem 0.95rem;">
      <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Itens / SKUs Cadastrados</small>
      <strong id="gmStockOpSkus" style="font-size:1.35rem; color:#34d399;">0</strong>
    </div>
    <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #fbbf24; border-radius:10px; padding:0.8rem 0.95rem;">
      <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Estoque Baixo (≤ 2)</small>
      <strong id="gmStockOpLow" style="font-size:1.35rem; color:#fbbf24;">0</strong>
    </div>
    <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #f87171; border-radius:10px; padding:0.8rem 0.95rem;">
      <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Esgotados (0 un.)</small>
      <strong id="gmStockOpOut" style="font-size:1.35rem; color:#f87171;">0</strong>
    </div>
  `;

  const bar = document.getElementById('gmStockManagerBar');
  if (bar) {
    bar.insertAdjacentElement('afterend', grid);
  } else {
    stockSection.prepend(grid);
  }
}

function ensureStockSegmentedFilterControls() {
  const searchInput = document.getElementById('stockSearchInput');
  if (!searchInput || document.getElementById('gmStockSegmentedBar')) return;

  const parentBox = searchInput.closest('.filters-bar, .filter-row, .card, .section-card') || searchInput.parentElement;
  if (!parentBox) return;

  const segBar = document.createElement('div');
  segBar.id = 'gmStockSegmentedBar';
  segBar.className = 'gm-seg-filters-row';
  segBar.innerHTML = `
    <div class="gm-seg-group">
      <label>Tipo de Produto</label>
      <div class="gm-seg-pills" data-filter-key="format">
        <button type="button" class="gm-seg-btn ${stockFormatFilter === 'all' ? 'active' : ''}" data-val="all">Todos</button>
        <button type="button" class="gm-seg-btn ${stockFormatFilter === 'decant' ? 'active' : ''}" data-val="decant">Decantes</button>
        <button type="button" class="gm-seg-btn ${stockFormatFilter === 'bottle' ? 'active' : ''}" data-val="bottle">Frascos Completos</button>
      </div>
    </div>

    <div class="gm-seg-group">
      <label>Apenas estoque atual (&gt; 0)?</label>
      <div class="gm-seg-pills" data-filter-key="onlyInStock">
        <button type="button" class="gm-seg-btn ${stockOnlyInStockFilter === 'no' ? 'active' : ''}" data-val="no">Não</button>
        <button type="button" class="gm-seg-btn ${stockOnlyInStockFilter === 'yes' ? 'active' : ''}" data-val="yes">Sim</button>
      </div>
    </div>

    <div class="gm-seg-group">
      <label>Com fornecedor informado?</label>
      <div class="gm-seg-pills" data-filter-key="supplier">
        <button type="button" class="gm-seg-btn ${stockSupplierFilter === 'all' ? 'active' : ''}" data-val="all">Todos</button>
        <button type="button" class="gm-seg-btn ${stockSupplierFilter === 'no' ? 'active' : ''}" data-val="no">Não</button>
        <button type="button" class="gm-seg-btn ${stockSupplierFilter === 'yes' ? 'active' : ''}" data-val="yes">Sim</button>
      </div>
    </div>

    <div class="gm-seg-group">
      <label>Apenas estoque baixo (≤ 2)?</label>
      <div class="gm-seg-pills" data-filter-key="lowStock">
        <button type="button" class="gm-seg-btn ${stockLowStockFilter === 'no' ? 'active' : ''}" data-val="no">Não</button>
        <button type="button" class="gm-seg-btn ${stockLowStockFilter === 'yes' ? 'active' : ''}" data-val="yes">Sim</button>
      </div>
    </div>

    <div class="gm-seg-group">
      <label>Validade próxima (≤ 60d / vencidos)?</label>
      <div class="gm-seg-pills" data-filter-key="expiry">
        <button type="button" class="gm-seg-btn ${stockExpiryAlertFilter === 'all' ? 'active' : ''}" data-val="all">Todos</button>
        <button type="button" class="gm-seg-btn ${stockExpiryAlertFilter === 'expiring' ? 'active' : ''}" data-val="expiring">Alerta / Vencidos</button>
      </div>
    </div>

    <div class="gm-seg-group">
      <label>Custo cadastrado?</label>
      <div class="gm-seg-pills" data-filter-key="hasCost">
        <button type="button" class="gm-seg-btn ${stockHasCostFilter === 'all' ? 'active' : ''}" data-val="all">Todos</button>
        <button type="button" class="gm-seg-btn ${stockHasCostFilter === 'yes' ? 'active' : ''}" data-val="yes">Sim</button>
        <button type="button" class="gm-seg-btn ${stockHasCostFilter === 'no' ? 'active' : ''}" data-val="no">Não</button>
      </div>
    </div>
  `;

  parentBox.appendChild(segBar);

  segBar.querySelectorAll('.gm-seg-pills').forEach(pillGroup => {
    const key = pillGroup.getAttribute('data-filter-key');
    pillGroup.querySelectorAll('.gm-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (key === 'onlyInStock') stockOnlyInStockFilter = val;
        if (key === 'supplier') stockSupplierFilter = val;
        if (key === 'lowStock') stockLowStockFilter = val;
        if (key === 'format') stockFormatFilter = val;
        if (key === 'expiry') stockExpiryAlertFilter = val;
        if (key === 'hasCost') stockHasCostFilter = val;
        syncStockSegmentedButtonsUI();
        renderStock();
      });
    });
  });
}

function syncStockSegmentedButtonsUI() {
  const segBar = document.getElementById('gmStockSegmentedBar');
  if (!segBar) return;
  segBar.querySelectorAll('.gm-seg-pills').forEach(pillGroup => {
    const key = pillGroup.getAttribute('data-filter-key');
    const map = {
      onlyInStock: stockOnlyInStockFilter,
      supplier: stockSupplierFilter,
      lowStock: stockLowStockFilter,
      format: stockFormatFilter,
      expiry: stockExpiryAlertFilter,
      hasCost: stockHasCostFilter
    };
    const current = map[key];
    pillGroup.querySelectorAll('.gm-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === current);
    });
  });
}

function ensureStockTableHeaderWithoutBatch() {
  const tbody = document.getElementById('tableStockDetailed');
  const table = tbody?.closest('table');
  if (!table) return;

  const thead = table.querySelector('thead tr');
  if (!thead) return;

  const canManageStock = hasStockAccess();
  thead.innerHTML = `
    <th>CÓD.</th>
    <th>FRAGRÂNCIA / DECANT</th>
    <th>CATEGORIA / VOL.</th>
    <th>VALIDADE</th>
    ${canManageStock ? '<th class="admin-only-col">CUSTO</th>' : ''}
    <th>VENDA</th>
    ${canManageStock ? '<th class="admin-only-col">MARGEM</th>' : ''}
    <th>QTD</th>
    <th>AÇÕES</th>
  `;
}

function ensureStockToolbarActions() {
  ensureSupplierFieldInProductModal();
  const stockSection = document.getElementById('estoque');
  if (!stockSection || document.getElementById('gmStockManagerBar')) return;

  const bar = document.createElement('div');
  bar.id = 'gmStockManagerBar';
  bar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;';
  bar.innerHTML = `
    <button type="button" id="gmBtnImportNuvemApi" class="btn-primary"><i class="ph ph-cloud-arrow-down"></i> Importar Catálogo Nuvemshop</button>
    <button type="button" id="gmBtnClearAllStock" class="btn-danger"><i class="ph ph-trash"></i> Zerar Estoque</button>
  `;
  stockSection.prepend(bar);

  document.getElementById('gmBtnImportNuvemApi')?.addEventListener('click', async () => {
    if (!hasStockAccess()) return showToast('Sem permissão de estoque.');
    if (!confirm('Importar/atualizar produtos da Nuvemshop mantendo os custos e fornecedores já editados?')) return;
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/nuvemshop/import-products`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(data.error || 'Erro ao importar da Nuvemshop.');
      await CloudSyncEngine.pullState(false);
      showToast(`${data.importedCount || 0} item(ns) importados da Nuvemshop!`);
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    }
  });

  document.getElementById('gmBtnClearAllStock')?.addEventListener('click', async () => {
    if (!hasStockAccess()) return showToast('Sem permissão de estoque.');
    if (!confirm('Tem certeza que deseja APAGAR TODOS os itens do estoque?')) return;
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/products/clear`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(data.error || 'Erro ao zerar estoque.');
      products = [];
      persistLocalOnly();
      renderAll();
      showToast('Estoque zerado com sucesso!');
    } catch (_) {
      showToast('Erro de conexão com o servidor.');
    }
  });
}

window.openNewProductModal = function () {
  if (!hasStockAccess()) return showToast('Você não tem permissão para cadastrar no estoque.');
  ensureSupplierFieldInProductModal();
  const canEditCost = hasStockAccess();
  document.getElementById('editProdId').value = '';
  document.getElementById('productModalTitle').innerHTML = '<i class="ph ph-package"></i> Cadastrar Fragrância';
  document.getElementById('btnSubmitProductModal').textContent = 'Salvar no Estoque';
  document.getElementById('btnDeleteProductInModal').style.display = 'none';
  document.getElementById('prodCodeDisplay').value = 'PRD-' + String(products.length + 1).padStart(2, '0');
  document.getElementById('prodName').value = '';
  const supInp = document.getElementById('prodSupplier');
  if (supInp) supInp.value = '';
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
  if (costGroup) costGroup.style.display = canEditCost ? '' : 'none';

  document.getElementById('productModalOverlay').classList.add('active');
};

window.openEditProductModal = function (prodId) {
  if (!hasStockAccess()) return showToast('Você não tem permissão para editar o estoque.');
  ensureSupplierFieldInProductModal();
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;
  const canEditCost = hasStockAccess();

  document.getElementById('editProdId').value = prod.id;
  document.getElementById('productModalTitle').innerHTML = `<i class="ph ph-pencil-simple"></i> Editar Produto (${prod.id})`;
  document.getElementById('btnSubmitProductModal').textContent = 'Salvar Alterações';
  document.getElementById('btnDeleteProductInModal').style.display = canEditCost ? 'inline-flex' : 'none';

  document.getElementById('prodCodeDisplay').value = prod.id || '';
  document.getElementById('prodName').value = prod.name || '';
  const supInp = document.getElementById('prodSupplier');
  if (supInp) supInp.value = prod.supplier || '';
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
  if (costGroup) costGroup.style.display = canEditCost ? '' : 'none';

  document.getElementById('productModalOverlay').classList.add('active');
};

window.quickEditProductField = function (prodId, fieldKey) {
  if (!hasStockAccess()) return showToast('Você não tem permissão para editar o estoque.');
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const labels = {
    id: 'Código do Produto',
    name: 'Nome da Fragrância / Decant',
    supplier: 'Fornecedor',
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
  ensureStockToolbarActions();
  ensureStockOperationalMetricsCards();
  ensureStockSegmentedFilterControls();
  ensureStockTableHeaderWithoutBatch();

  const overlay = document.getElementById('productModalOverlay');
  document.getElementById('btnCloseProductModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelProductModal')?.addEventListener('click', () => overlay.classList.remove('active'));

  document.getElementById('btnDeleteProductInModal')?.addEventListener('click', () => {
    if (!hasStockAccess()) return showToast('Você não tem permissão para apagar itens do estoque.');
    const editId = document.getElementById('editProdId').value;
    if (!editId) return;
    if (!confirm('Deseja realmente apagar este item do estoque?')) return;
    products = products.filter(p => p.id !== editId);
    saveAll();
    renderAll();
    overlay.classList.remove('active');
    showToast('Item removido do estoque!');
  });

  document.getElementById('formNewProduct')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!hasStockAccess()) return showToast('Você não tem permissão para alterar o estoque.');
    const canEditCost = hasStockAccess();
    const editId = document.getElementById('editProdId').value;
    const codeInput = document.getElementById('prodCodeDisplay').value.trim();
    const nameVal = document.getElementById('prodName').value.trim();
    const supVal = (document.getElementById('prodSupplier')?.value || '').trim();
    const imeiVal = document.getElementById('prodImei').value.trim();
    const expiryVal = document.getElementById('prodExpiry').value;
    const condVal = document.getElementById('prodCondition').value;
    const batVal = document.getElementById('prodBattery').value.trim();
    const costVal = parseFloat(document.getElementById('prodCost').value) || 0;
    const priceVal = parseFloat(document.getElementById('prodPrice').value) || 0;
    const qtyVal = parseInt(document.getElementById('prodQty').value, 10) || 0;
    const nuvemIdVal = document.getElementById('prodNuvemId').value.trim();
    const nuvemVarIdVal = document.getElementById('prodNuvemVariantId').value.trim();

    if (editId) {
      const prod = products.find(p => p.id === editId);
      if (prod) {
        prod.id = codeInput || prod.id;
        prod.name = nameVal;
        prod.supplier = supVal;
        prod.imei = imeiVal;
        prod.expiry = expiryVal;
        prod.condition = condVal;
        prod.battery = batVal;
        if (canEditCost) prod.cost = costVal;
        prod.price = priceVal;
        prod.qty = qtyVal;
        prod.nuvemId = nuvemIdVal;
        prod.nuvemVarId = nuvemVarIdVal;
        pushStockToNuvemshop(prod);
      }
      showToast('Produto atualizado com sucesso!');
    } else {
      const newProd = {
        id: codeInput || ('PRD-' + String(products.length + 1).padStart(2, '0')),
        name: nameVal,
        supplier: supVal,
        imei: imeiVal || ('LT-' + Math.floor(1000 + Math.random() * 9000)),
        expiry: expiryVal,
        condition: condVal,
        battery: batVal,
        cost: canEditCost ? costVal : 0,
        price: priceVal,
        qty: qtyVal,
        nuvemId: nuvemIdVal,
        nuvemVarId: nuvemVarIdVal
      };
      products.unshift(newProd);
      pushStockToNuvemshop(newProd);
      showToast('Fragrância adicionada ao estoque!');
    }

    saveAll();
    renderAll();
    overlay.classList.remove('active');
  });

  document.getElementById('stockSearchInput')?.addEventListener('input', renderStock);
  document.getElementById('stockConditionFilter')?.addEventListener('change', renderStock);
}

function renderStock() {
  ensureStockToolbarActions();
  ensureStockOperationalMetricsCards();
  ensureStockSegmentedFilterControls();
  ensureStockTableHeaderWithoutBatch();

  const canManageStock = hasStockAccess();
  const tbody = document.getElementById('tableStockDetailed');
  if (!tbody) return;

  const totalUnits = products.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);
  const lowStockCount = products.filter(p => (Number(p.qty) || 0) > 0 && (Number(p.qty) || 0) <= 2).length;
  const outOfStockCount = products.filter(p => (Number(p.qty) || 0) === 0).length;

  const setOpTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setOpTxt('gmStockOpTotalUnits', totalUnits);
  setOpTxt('gmStockOpSkus', products.length);
  setOpTxt('gmStockOpLow', lowStockCount);
  setOpTxt('gmStockOpOut', outOfStockCount);

  const term = (document.getElementById('stockSearchInput')?.value || '').toLowerCase().trim();
  const cond = document.getElementById('stockConditionFilter')?.value || 'todos';

  const filtered = products.filter(p => {
    const qtyNum = Number(p.qty) || 0;
    const costNum = Number(p.cost) || 0;
    const hasSupplier = Boolean(String(p.supplier || '').trim());
    const isDecant = isDecantProduct(p);
    const isExpAlert = isExpiringOrExpiredProduct(p);

    const matchTerm = !term
      || p.name.toLowerCase().includes(term)
      || p.id.toLowerCase().includes(term)
      || (p.supplier || '').toLowerCase().includes(term)
      || (p.battery || '').toLowerCase().includes(term);

    const matchCond = cond === 'todos' || p.condition === cond;
    const matchInStock = stockOnlyInStockFilter !== 'yes' || qtyNum > 0;
    const matchSupplier = stockSupplierFilter === 'all'
      || (stockSupplierFilter === 'yes' && hasSupplier)
      || (stockSupplierFilter === 'no' && !hasSupplier);
    const matchLowStock = stockLowStockFilter !== 'yes' || (qtyNum > 0 && qtyNum <= 2);
    const matchFormat = stockFormatFilter === 'all'
      || (stockFormatFilter === 'decant' && isDecant)
      || (stockFormatFilter === 'bottle' && !isDecant);
    const matchExpiry = stockExpiryAlertFilter !== 'expiring' || isExpAlert;
    const matchHasCost = stockHasCostFilter === 'all'
      || (stockHasCostFilter === 'yes' && costNum > 0)
      || (stockHasCostFilter === 'no' && costNum <= 0);

    return matchTerm && matchCond && matchInStock && matchSupplier && matchLowStock && matchFormat && matchExpiry && matchHasCost;
  });

  if (filtered.length === 0) {
    const colSpan = canManageStock ? 9 : 7;
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:var(--text-muted); padding:1.25rem;">Nenhum item encontrado para os filtros selecionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const margin = (p.price && p.price > 0) ? (((p.price - (p.cost || 0)) / p.price) * 100).toFixed(1) : '0.0';
    const qtyNum = Number(p.qty) || 0;
    const isDecant = isDecantProduct(p);
    const expiryBadge = renderCriticalExpiryBadge(p.expiry);
    const formatBadge = isDecant
      ? `<span class="badge-tag badge-warning" style="margin-left:4px;">Decant</span>`
      : `<span class="badge-tag badge-info" style="margin-left:4px;">Frasco</span>`;

    const qtyBadgeClass = qtyNum === 0
      ? 'badge-despesa'
      : (qtyNum <= 2 ? 'badge-warning' : 'badge-receita');

    return `
      <tr>
        <td style="white-space:nowrap;"><strong>${p.id}</strong></td>
        <td>
          <strong>${p.name}</strong>
          <div style="font-size:0.73rem; color:var(--text-muted); margin-top:2px;">
            Fornecedor: ${p.supplier ? `<span style="color:#cbd5e1;">${p.supplier}</span>` : `<span style="color:#fbbf24;">Sem fornecedor</span>`}
          </div>
        </td>
        <td>
          <span class="badge-tag badge-info">${p.condition}</span>
          ${formatBadge}
          ${p.battery ? `<div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">${p.battery}</div>` : ''}
        </td>
        <td style="white-space:nowrap;">${formatDateSafe(p.expiry)}${expiryBadge}</td>
        ${canManageStock ? `<td class="admin-only-col" style="white-space:nowrap; color:#fbbf24;">${fmtBRL(p.cost || 0)}</td>` : ''}
        <td style="white-space:nowrap;"><strong style="color:#34d399;">${fmtBRL(p.price || 0)}</strong></td>
        ${canManageStock ? `<td class="admin-only-col" style="white-space:nowrap;"><span class="badge-tag badge-receita">${margin}%</span></td>` : ''}
        <td style="white-space:nowrap;"><span class="badge-tag ${qtyBadgeClass}">${qtyNum} un.</span></td>
        <td style="white-space:nowrap;">${renderStockActionButton(p.id)}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// MÓDULO DE TROCAS E DEVOLUÇÕES (RMA)
// ============================================================================
function initRmaModule() {
  const overlay = document.getElementById('rmaModalOverlay');
  document.getElementById('btnOpenRmaModal')?.addEventListener('click', () => overlay.classList.add('active'));
  document.getElementById('btnCloseRmaModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('btnCancelRmaModal')?.addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('formNewRma')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const sale = sales.find(s => String(s.id) === String(document.getElementById('rmaSaleSelect').value));
    rmaList.unshift({ cod: 'RMA-' + (301 + rmaList.length), date: new Date().toLocaleDateString('pt-BR'), saleId: sale ? sale.id : 'AVULSO', client: sale ? sale.client : 'CLIENTE BALCÃO', item: sale ? sale.items : 'Fragrância', type: document.getElementById('rmaType').value, reason: document.getElementById('rmaReason').value, refundVal: parseFloat(document.getElementById('rmaRefundValue').value) || 0, status: 'Aberto' });
    saveAll(); renderRma(); overlay.classList.remove('active'); showToast('Ocorrência registrada!');
  });
}

function renderRma() {
  const tbody = document.getElementById('tableRmaList');
  if (tbody) tbody.innerHTML = rmaList.map(r => `<tr><td><strong>${r.cod}</strong></td><td>${r.date}</td><td>#${r.saleId}</td><td>${r.client}</td><td>${r.item}</td><td><span class="badge-tag badge-warning">${r.type}</span></td><td>${r.reason}</td><td><strong style="color:#f87171;">${fmtBRL(r.refundVal)}</strong></td><td><span class="badge-tag ${r.status === 'Concluído' ? 'badge-receita' : 'badge-info'}">${r.status}</span></td><td>${r.status !== 'Concluído' ? `<button type="button" class="btn-sm btn-green" onclick="concludeRma('${r.cod}')">Concluir</button>` : '-'}</td></tr>`).join('');
}

window.concludeRma = function (cod) {
  const r = rmaList.find(item => item.cod === cod);
  if (!r) return;
  r.status = 'Concluído';
  saveAll(); renderRma(); showToast(`${cod} concluído!`);
};

// ============================================================================
// MÓDULO FINANCEIRO COMPLETO (RECEITAS/DESPESAS + CANAIS + FORNECEDOR/VENDEDOR)
// ============================================================================
function isSaleCancelledOrRefunded(sale) {
  const st = String(sale?.status || '').toLowerCase();
  return st.includes('cancel') || st.includes('estorn') || st.includes('devolv');
}

function getSaleChannelLabel(sale) {
  return sale?.type === 'Online / Nuvemshop' ? 'Online / Nuvemshop' : 'Venda Presencial';
}

function getSalePaymentStatus(sale) {
  const st = String(sale?.paymentStatus || sale?.status || '').toLowerCase();
  if (st.includes('pend') || st.includes('aguard')) return 'Pendente';
  return 'Pago';
}

function syncSalesToFinanceEntries() {
  if (!Array.isArray(finEntries)) finEntries = [];

  sales.forEach(s => {
    if (isSaleCancelledOrRefunded(s)) return;
    const autoId = `FIN-SALE-${s.id}`;
    const channel = getSaleChannelLabel(s);
    const payStatus = getSalePaymentStatus(s);
    const existingIdx = finEntries.findIndex(f => String(f.autoSaleId) === String(s.id) || f.id === autoId);

    const entryData = {
      id: existingIdx >= 0 ? finEntries[existingIdx].id : autoId,
      autoSaleId: String(s.id),
      isAutoSale: true,
      date: s.isoDate || new Date().toISOString().split('T')[0],
      type: 'Receita',
      channel,
      category: channel === 'Online / Nuvemshop' ? 'Venda Online (Nuvemshop)' : 'Venda Presencial (PDV)',
      description: `Pedido #${s.id} — ${s.client || 'CONSUMIDOR BALCÃO'} (${s.items || 'Itens'})`,
      clientOrSupplier: s.client || 'CONSUMIDOR BALCÃO',
      seller: s.seller || 'ADMIN',
      supplier: '',
      paymentMethod: s.payment || 'Pix',
      status: payStatus,
      amount: Number(s.total || 0),
      notes: s.observation || ''
    };

    if (existingIdx >= 0) {
      finEntries[existingIdx] = { ...finEntries[existingIdx], ...entryData };
    } else {
      finEntries.unshift(entryData);
    }
  });

  const activeSaleIds = new Set(sales.filter(s => !isSaleCancelledOrRefunded(s)).map(s => String(s.id)));
  finEntries = finEntries.filter(f => !f.isAutoSale || activeSaleIds.has(String(f.autoSaleId)));
}

function getDistinctFinanceSuppliers() {
  const set = new Set();
  finEntries.forEach(f => {
    if (f.type === 'Despesa') {
      const sup = String(f.supplier || f.clientOrSupplier || '').trim();
      if (sup) set.add(sup);
    }
  });
  products.forEach(p => {
    const sup = String(p.supplier || '').trim();
    if (sup) set.add(sup);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function getDistinctFinanceSellers() {
  const set = new Set();
  sales.forEach(s => {
    const sel = String(s.seller || '').trim();
    if (sel) set.add(sel.toUpperCase());
  });
  finEntries.forEach(f => {
    const sel = String(f.seller || '').trim();
    if (sel) set.add(sel.toUpperCase());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function ensureFinanceModals() {
  if (!document.getElementById('finEntryModalOverlay')) {
    const modal = document.createElement('div');
    modal.id = 'finEntryModalOverlay';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content gm-view-modal-card">
        <div class="modal-header">
          <h3><i class="ph ph-currency-circle-dollar" style="color:#34d399;"></i> <span id="finEntryModalTitle">Novo Lançamento Financeiro</span></h3>
          <button type="button" id="btnCloseFinEntryModal" class="btn-close">&times;</button>
        </div>
        <form id="formFinEntry" class="modal-body">
          <input type="hidden" id="finEditId" />
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:0.65rem;">
            <div class="form-group">
              <label for="finTypeInput">Tipo:</label>
              <select id="finTypeInput">
                <option value="Receita">Receita (+)</option>
                <option value="Despesa">Despesa (-)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="finChannelInput">Canal de Origem:</label>
              <select id="finChannelInput">
                <option value="Venda Presencial">Venda Presencial</option>
                <option value="Online / Nuvemshop">Online / Nuvemshop</option>
              </select>
            </div>
            <div class="form-group">
              <label for="finDateInput">Data:</label>
              <input type="date" id="finDateInput" required />
            </div>
            <div class="form-group">
              <label for="finAmountInput">Valor (R$):</label>
              <input type="number" id="finAmountInput" step="0.01" min="0.01" required />
            </div>
            <div class="form-group">
              <label for="finCategoryInput">Categoria:</label>
              <input type="text" id="finCategoryInput" placeholder="Ex: Fornecedor, Frete, Embalagens, Comissão..." required />
            </div>
            <div class="form-group">
              <label for="finPartyInput">Cliente / Fornecedor:</label>
              <input type="text" id="finPartyInput" placeholder="Nome do cliente ou fornecedor" />
            </div>
            <div class="form-group">
              <label for="finSellerInput">Vendedor / Responsável:</label>
              <input type="text" id="finSellerInput" placeholder="Ex: ADMIN, VENDEDOR 1" />
            </div>
            <div class="form-group">
              <label for="finPaymentInput">Forma de Pagamento:</label>
              <select id="finPaymentInput">
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Crédito">Crédito</option>
                <option value="Débito">Débito</option>
                <option value="Boleto / Transferência">Boleto / Transferência</option>
              </select>
            </div>
            <div class="form-group">
              <label for="finStatusInput">Status:</label>
              <select id="finStatusInput">
                <option value="Pago">Pago</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top:0.5rem;">
            <label for="finDescInput">Descrição:</label>
            <input type="text" id="finDescInput" placeholder="Descreva o lançamento financeiro..." required />
          </div>
          <div class="form-group">
            <label for="finNotesInput">Observações:</label>
            <input type="text" id="finNotesInput" placeholder="Detalhes adicionais..." />
          </div>
          <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
            <button type="button" id="btnCancelFinEntryModal" class="btn-sm">Cancelar</button>
            <button type="submit" class="btn-primary"><i class="ph ph-check"></i> Salvar Lançamento</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const closeFn = () => modal.classList.remove('active');
    document.getElementById('btnCloseFinEntryModal')?.addEventListener('click', closeFn);
    document.getElementById('btnCancelFinEntryModal')?.addEventListener('click', closeFn);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeFn();
    });

    document.getElementById('formFinEntry')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode alterar o financeiro.');

      const editId = document.getElementById('finEditId').value;
      const typeVal = document.getElementById('finTypeInput').value;
      const partyVal = document.getElementById('finPartyInput').value.trim();
      const sellerVal = (document.getElementById('finSellerInput').value.trim() || (activeAccount?.displayName || activeAccount?.username || 'ADMIN')).toUpperCase();

      const payload = {
        date: document.getElementById('finDateInput').value,
        type: typeVal,
        channel: document.getElementById('finChannelInput').value,
        category: document.getElementById('finCategoryInput').value.trim() || (typeVal === 'Receita' ? 'Receita Avulsa' : 'Despesa Operacional'),
        description: document.getElementById('finDescInput').value.trim(),
        clientOrSupplier: partyVal || (typeVal === 'Despesa' ? 'Fornecedor Geral' : 'Cliente Avulso'),
        supplier: typeVal === 'Despesa' ? (partyVal || 'Fornecedor Geral') : '',
        seller: sellerVal,
        paymentMethod: document.getElementById('finPaymentInput').value,
        status: document.getElementById('finStatusInput').value,
        amount: Math.max(0, parseFloat(document.getElementById('finAmountInput').value) || 0),
        notes: document.getElementById('finNotesInput').value.trim()
      };

      if (editId) {
        const idx = finEntries.findIndex(f => String(f.id) === String(editId));
        if (idx >= 0) {
          const prev = finEntries[idx];
          finEntries[idx] = { ...prev, ...payload };
          if (prev.isAutoSale && prev.autoSaleId) {
            const linkedSale = sales.find(s => String(s.id) === String(prev.autoSaleId));
            if (linkedSale) {
              linkedSale.total = payload.amount;
              linkedSale.payment = payload.paymentMethod;
              linkedSale.seller = payload.seller;
              linkedSale.type = payload.channel;
            }
          }
        }
        showToast('Lançamento financeiro atualizado!');
      } else {
        finEntries.unshift({
          id: 'FIN-' + String(Date.now()).slice(-6),
          isAutoSale: false,
          ...payload
        });
        showToast('Lançamento financeiro registrado!');
      }

      saveAll();
      renderAll();
      closeFn();
    });
  }

  if (!document.getElementById('viewFinEntryModalOverlay')) {
    const viewModal = document.createElement('div');
    viewModal.id = 'viewFinEntryModalOverlay';
    viewModal.className = 'modal-overlay';
    viewModal.innerHTML = `
      <div class="modal-content gm-view-modal-card">
        <div class="modal-header">
          <h3><i class="ph ph-eye" style="color:#34d399;"></i> Detalhes do Lançamento <span id="viewFinHeaderId" style="color:#fbbf24;"></span></h3>
          <button type="button" id="btnCloseViewFinModal" class="btn-close">&times;</button>
        </div>
        <div id="viewFinModalBody" class="modal-body"></div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
          <button type="button" id="btnViewFinSwitchToEdit" class="btn-primary"><i class="ph ph-pencil-simple"></i> Editar</button>
          <button type="button" id="btnCloseViewFinModalFooter" class="btn-sm">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(viewModal);

    const closeViewFn = () => viewModal.classList.remove('active');
    document.getElementById('btnCloseViewFinModal')?.addEventListener('click', closeViewFn);
    document.getElementById('btnCloseViewFinModalFooter')?.addEventListener('click', closeViewFn);
    viewModal.addEventListener('click', (e) => {
      if (e.target === viewModal) closeViewFn();
    });
  }
}

window.openNewFinanceModal = function (presetType = 'Receita') {
  if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode lançar movimentações financeiras.');
  ensureFinanceModals();
  document.getElementById('finEditId').value = '';
  document.getElementById('finEntryModalTitle').textContent = presetType === 'Despesa' ? 'Nova Despesa' : 'Nova Receita';
  document.getElementById('formFinEntry')?.reset();
  document.getElementById('finTypeInput').value = presetType;
  document.getElementById('finChannelInput').value = 'Venda Presencial';
  document.getElementById('finDateInput').value = new Date().toISOString().split('T')[0];
  document.getElementById('finSellerInput').value = (activeAccount?.displayName || activeAccount?.username || 'ADMIN').toUpperCase();
  document.getElementById('finStatusInput').value = 'Pago';
  document.getElementById('finEntryModalOverlay')?.classList.add('active');
};

window.openEditFinanceEntryModal = function (finId) {
  if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode editar o financeiro.');
  ensureFinanceModals();
  const entry = finEntries.find(f => String(f.id) === String(finId));
  if (!entry) return;

  document.getElementById('finEditId').value = entry.id;
  document.getElementById('finEntryModalTitle').textContent = `Editar Lançamento (${entry.id})`;
  document.getElementById('finTypeInput').value = entry.type || 'Receita';
  document.getElementById('finChannelInput').value = entry.channel || 'Venda Presencial';
  document.getElementById('finDateInput').value = entry.date || new Date().toISOString().split('T')[0];
  document.getElementById('finAmountInput').value = Number(entry.amount || 0);
  document.getElementById('finCategoryInput').value = entry.category || '';
  document.getElementById('finPartyInput').value = entry.supplier || entry.clientOrSupplier || '';
  document.getElementById('finSellerInput').value = entry.seller || 'ADMIN';
  document.getElementById('finPaymentInput').value = entry.paymentMethod || 'Pix';
  document.getElementById('finStatusInput').value = entry.status || 'Pago';
  document.getElementById('finDescInput').value = entry.description || '';
  document.getElementById('finNotesInput').value = entry.notes || '';

  document.getElementById('finEntryModalOverlay')?.classList.add('active');
};

window.openViewFinanceEntryModal = function (finId) {
  ensureFinanceModals();
  const entry = finEntries.find(f => String(f.id) === String(finId));
  if (!entry) return;

  const isRev = entry.type === 'Receita';
  document.getElementById('viewFinHeaderId').textContent = `(${entry.id})`;
  document.getElementById('viewFinModalBody').innerHTML = `
    <div class="gm-view-grid">
      <div class="gm-view-box"><small>Tipo</small><strong><span class="badge-tag ${isRev ? 'badge-receita' : 'badge-despesa'}">${entry.type}</span></strong></div>
      <div class="gm-view-box"><small>Canal de Origem</small><strong>${entry.channel || 'Venda Presencial'}</strong></div>
      <div class="gm-view-box"><small>Data</small><strong>${formatDateSafe(entry.date)}</strong></div>
      <div class="gm-view-box"><small>Status</small><strong><span class="badge-tag ${entry.status === 'Pago' ? 'badge-receita' : 'badge-warning'}">${entry.status || 'Pago'}</span></strong></div>
      <div class="gm-view-box"><small>Categoria</small><strong>${entry.category || '-'}</strong></div>
      <div class="gm-view-box"><small>Cliente / Fornecedor</small><strong>${entry.supplier || entry.clientOrSupplier || '-'}</strong></div>
      <div class="gm-view-box"><small>Vendedor / Responsável</small><strong>${entry.seller || 'ADMIN'}</strong></div>
      <div class="gm-view-box"><small>Forma de Pagamento</small><strong>${entry.paymentMethod || '-'}</strong></div>
      <div class="gm-view-box"><small>Valor</small><strong style="color:${isRev ? '#34d399' : '#f87171'} !important; font-size:1.05rem;">${isRev ? '+' : '-'} ${fmtBRL(entry.amount)}</strong></div>
    </div>
    <div class="gm-view-box" style="margin-bottom:0.75rem;">
      <small>Descrição</small>
      <strong>${entry.description || '-'}</strong>
    </div>
    <div class="gm-view-box">
      <small>Observações</small>
      <strong>${entry.notes || 'Nenhuma observação.'}</strong>
    </div>
  `;

  const btnEdit = document.getElementById('btnViewFinSwitchToEdit');
  if (btnEdit) {
    btnEdit.style.display = isCurrentUserAdmin() ? 'inline-flex' : 'none';
    btnEdit.onclick = () => {
      document.getElementById('viewFinEntryModalOverlay')?.classList.remove('active');
      openEditFinanceEntryModal(entry.id);
    };
  }

  document.getElementById('viewFinEntryModalOverlay')?.classList.add('active');
};

window.deleteFinanceEntryRecord = function (finId) {
  if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode excluir lançamentos.');
  const entry = finEntries.find(f => String(f.id) === String(finId));
  if (!entry) return;

  if (entry.isAutoSale && entry.autoSaleId) {
    if (!confirm(`Este lançamento vem da venda #${entry.autoSaleId}. Deseja também apagar a venda #${entry.autoSaleId}?`)) return;
    sales = sales.filter(s => String(s.id) !== String(entry.autoSaleId));
  } else {
    if (!confirm(`Deseja realmente apagar o lançamento "${entry.description}"?`)) return;
  }

  finEntries = finEntries.filter(f => String(f.id) !== String(finId));
  persistLocalOnly();
  renderAll();
  showToast('Lançamento removido.');
};

window.toggleFinanceActionMenu = function (event, finId) {
  event.stopPropagation();
  const menuId = `gmFinMenu_${String(finId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  let menu = document.getElementById(menuId);
  const wasOpen = menu?.classList.contains('open');
  closeAllGithubActionMenus();

  if (!menu) {
    menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'gm-gh-dropdown';
    menu.innerHTML = `
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openViewFinanceEntryModal('${finId}')">
        <i class="ph ph-eye" style="color:#34d399; font-size:15px;"></i>
        <span>Visualizar</span>
      </button>
      <button type="button" class="gm-gh-dropdown-item" onclick="closeAllGithubActionMenus(); openEditFinanceEntryModal('${finId}')">
        <i class="ph ph-pencil-simple" style="color:#60a5fa; font-size:15px;"></i>
        <span>Editar</span>
      </button>
      <div class="gm-gh-dropdown-divider"></div>
      <button type="button" class="gm-gh-dropdown-item danger-item" onclick="closeAllGithubActionMenus(); deleteFinanceEntryRecord('${finId}')">
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

function ensureFinanceEnhancedLayout() {
  ensureFinanceModals();
  const finSection = document.getElementById('financeiro');
  if (!finSection) return;

  if (!document.getElementById('gmFinanceEnhancedContainer')) {
    const container = document.createElement('div');
    container.id = 'gmFinanceEnhancedContainer';
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; margin-bottom:0.85rem;">
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button type="button" id="gmBtnNewReceita" class="btn-green"><i class="ph ph-plus-circle"></i> Nova Receita</button>
          <button type="button" id="gmBtnNewDespesa" class="btn-danger"><i class="ph ph-minus-circle"></i> Nova Despesa</button>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input type="date" id="finStartDateFilter" title="Data inicial" />
          <input type="date" id="finEndDateFilter" title="Data final" />
          <input type="text" id="finSearchInput" placeholder="Buscar lançamento, cliente, fornecedor ou vendedor..." style="min-width:230px;" />
          <button type="button" id="gmBtnClearFinFilters" class="btn-sm">Limpar Filtros</button>
        </div>
      </div>

      <div class="grid-4" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(185px, 1fr)); gap:0.75rem; margin-bottom:0.9rem;">
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #34d399; border-radius:10px; padding:0.8rem 0.95rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Receitas</small>
          <strong id="finMetricReceitas" style="font-size:1.3rem; color:#34d399;">R$ 0,00</strong>
        </div>
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #f87171; border-radius:10px; padding:0.8rem 0.95rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Despesas</small>
          <strong id="finMetricDespesas" style="font-size:1.3rem; color:#f87171;">R$ 0,00</strong>
        </div>
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #60a5fa; border-radius:10px; padding:0.8rem 0.95rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.76rem;">Saldo Líquido</small>
          <strong id="finMetricSaldo" style="font-size:1.3rem; color:#f3f4f6;">R$ 0,00</strong>
        </div>
        <div class="stat-card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-left:3px solid #fbbf24; border-radius:10px; padding:0.8rem 0.95rem;">
          <small style="color:var(--text-muted); display:block; font-size:0.76rem;">A Receber / Pendente</small>
          <strong id="finMetricPendente" style="font-size:1.3rem; color:#fbbf24;">R$ 0,00</strong>
        </div>
      </div>

      <div class="card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-radius:10px; padding:0.8rem 0.9rem; margin-bottom:0.9rem;">
        <div class="gm-seg-filters-row" style="margin-top:0; padding-top:0; border-top:none;">
          <div class="gm-seg-group">
            <label>Tipo</label>
            <div class="gm-seg-pills" id="finTypePills">
              <button type="button" class="gm-seg-btn active" data-val="todos">Todos</button>
              <button type="button" class="gm-seg-btn" data-val="Receita">Receitas</button>
              <button type="button" class="gm-seg-btn" data-val="Despesa">Despesas</button>
            </div>
          </div>

          <div class="gm-seg-group">
            <label>Status</label>
            <div class="gm-seg-pills" id="finStatusPills">
              <button type="button" class="gm-seg-btn active" data-val="todos">Todos</button>
              <button type="button" class="gm-seg-btn" data-val="Pago">Pago</button>
              <button type="button" class="gm-seg-btn" data-val="Pendente">Pendente</button>
            </div>
          </div>

          <div class="gm-seg-group">
            <label>Canal de Venda</label>
            <div class="gm-seg-pills" id="finChannelPills">
              <button type="button" class="gm-seg-btn active" data-val="todos">Todos os Canais</button>
              <button type="button" class="gm-seg-btn" data-val="Venda Presencial">Presencial</button>
              <button type="button" class="gm-seg-btn" data-val="Online / Nuvemshop">Nuvemshop</button>
            </div>
          </div>

          <div class="gm-seg-group">
            <label for="finSupplierFilterSelect">Fornecedor</label>
            <select id="finSupplierFilterSelect" style="min-width:165px;">
              <option value="todos">Todos os Fornecedores</option>
            </select>
          </div>

          <div class="gm-seg-group">
            <label for="finSellerFilterSelect">Vendedor</label>
            <select id="finSellerFilterSelect" style="min-width:155px;">
              <option value="todos">Todos os Vendedores</option>
            </select>
          </div>
        </div>
      </div>

      <div class="gm-fin-subgrid">
        <div class="card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-radius:10px; padding:0.85rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.65rem;">
            <h4 style="margin:0; font-size:0.95rem;"><i class="ph ph-storefront" style="color:#60a5fa;"></i> Desempenho por Canal (Presencial vs. Nuvemshop)</h4>
            <div style="display:flex; gap:0.35rem;" id="finChannelSortPills">
              <button type="button" class="gm-seg-btn active" data-sort="revenue_desc">Maior Faturamento</button>
              <button type="button" class="gm-seg-btn" data-sort="orders_desc">Mais Pedidos</button>
            </div>
          </div>
          <div id="finChannelsComparisonBody"></div>
        </div>

        <div class="card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-radius:10px; padding:0.85rem;">
          <h4 style="margin:0 0 0.65rem 0; font-size:0.95rem;"><i class="ph ph-users-three" style="color:#fbbf24;"></i> Vendas e Comissões por Vendedor</h4>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>VENDEDOR</th>
                  <th>PEDIDOS</th>
                  <th>FATURADO</th>
                  <th>% COM.</th>
                  <th>COMISSÃO</th>
                </tr>
              </thead>
              <tbody id="finSellersBreakdownBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-radius:10px; padding:0.85rem;">
        <h4 style="margin:0 0 0.65rem 0; font-size:0.95rem;"><i class="ph ph-list-bullets" style="color:#34d399;"></i> Extrato Financeiro de Receitas e Despesas</h4>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>DATA</th>
                <th>TIPO / CANAL</th>
                <th>CATEGORIA / DESCRIÇÃO</th>
                <th>CLIENTE / FORNECEDOR</th>
                <th>VENDEDOR</th>
                <th>PAGAMENTO</th>
                <th>STATUS</th>
                <th>VALOR</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody id="tableFinanceEntriesList"></tbody>
          </table>
        </div>
      </div>
    `;
    finSection.prepend(container);

    document.getElementById('gmBtnNewReceita')?.addEventListener('click', () => openNewFinanceModal('Receita'));
    document.getElementById('gmBtnNewDespesa')?.addEventListener('click', () => openNewFinanceModal('Despesa'));

    ['finStartDateFilter', 'finEndDateFilter', 'finSearchInput'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderFinance);
      document.getElementById(id)?.addEventListener('change', renderFinance);
    });

    document.querySelectorAll('#finTypePills .gm-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finTypeFilter = btn.getAttribute('data-val') || 'todos';
        document.querySelectorAll('#finTypePills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderFinance();
      });
    });

    document.querySelectorAll('#finStatusPills .gm-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finStatusFilter = btn.getAttribute('data-val') || 'todos';
        document.querySelectorAll('#finStatusPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderFinance();
      });
    });

    document.querySelectorAll('#finChannelPills .gm-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finChannelFilter = btn.getAttribute('data-val') || 'todos';
        document.querySelectorAll('#finChannelPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderFinance();
      });
    });

    document.getElementById('finSupplierFilterSelect')?.addEventListener('change', (e) => {
      finSupplierFilter = e.target.value || 'todos';
      renderFinance();
    });

    document.getElementById('finSellerFilterSelect')?.addEventListener('change', (e) => {
      finSellerFilter = e.target.value || 'todos';
      renderFinance();
    });

    document.querySelectorAll('#finChannelSortPills .gm-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finChannelSort = btn.getAttribute('data-sort') || 'revenue_desc';
        document.querySelectorAll('#finChannelSortPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderFinance();
      });
    });

    document.getElementById('gmBtnClearFinFilters')?.addEventListener('click', () => {
      finTypeFilter = 'todos';
      finStatusFilter = 'todos';
      finChannelFilter = 'todos';
      finSupplierFilter = 'todos';
      finSellerFilter = 'todos';

      const dStart = document.getElementById('finStartDateFilter');
      const dEnd = document.getElementById('finEndDateFilter');
      const sInp = document.getElementById('finSearchInput');
      if (dStart) dStart.value = '';
      if (dEnd) dEnd.value = '';
      if (sInp) sInp.value = '';

      document.querySelectorAll('#finTypePills .gm-seg-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-val') === 'todos'));
      document.querySelectorAll('#finStatusPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-val') === 'todos'));
      document.querySelectorAll('#finChannelPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-val') === 'todos'));

      renderFinance();
    });
  }
}

function refreshFinanceDropdownFilters() {
  const supSel = document.getElementById('finSupplierFilterSelect');
  if (supSel) {
    const suppliers = getDistinctFinanceSuppliers();
    if (finSupplierFilter !== 'todos' && !suppliers.includes(finSupplierFilter)) {
      finSupplierFilter = 'todos';
    }
    supSel.innerHTML = `<option value="todos">Todos os Fornecedores</option>` +
      suppliers.map(sup => `<option value="${sup.replace(/"/g, '&quot;')}" ${finSupplierFilter === sup ? 'selected' : ''}>${sup}</option>`).join('');
  }

  const selSel = document.getElementById('finSellerFilterSelect');
  if (selSel) {
    const sellers = getDistinctFinanceSellers();
    if (finSellerFilter !== 'todos' && !sellers.includes(finSellerFilter)) {
      finSellerFilter = 'todos';
    }
    selSel.innerHTML = `<option value="todos">Todos os Vendedores</option>` +
      sellers.map(s => `<option value="${s.replace(/"/g, '&quot;')}" ${finSellerFilter === s ? 'selected' : ''}>${s}</option>`).join('');
  }
}

window.updateSellerCommissionRate = function (sellerName, rateVal) {
  if (!isCurrentUserAdmin()) return showToast('Apenas o Administrador pode alterar comissões.');
  const rate = Math.max(0, Math.min(100, parseFloat(String(rateVal).replace(',', '.')) || 0));
  sellerCommissionRates[sellerName] = rate;
  persistLocalOnly();
  renderFinance();
  showToast(`Comissão de ${sellerName} definida em ${rate}%.`);
};

function initFinanceModule() {
  ensureFinanceEnhancedLayout();
  syncSalesToFinanceEntries();
}

function renderFinance() {
  ensureFinanceEnhancedLayout();
  syncSalesToFinanceEntries();
  refreshFinanceDropdownFilters();

  const canManageFin = isCurrentUserAdmin();
  const startDate = document.getElementById('finStartDateFilter')?.value || '';
  const endDate = document.getElementById('finEndDateFilter')?.value || '';
  const term = (document.getElementById('finSearchInput')?.value || '').toLowerCase().trim();

  const filtered = finEntries.filter(f => {
    const fDate = String(f.date || '');
    const fType = f.type || 'Receita';
    const fStatus = f.status || 'Pago';
    const fChannel = f.channel || 'Venda Presencial';
    const fSupplier = String(f.supplier || (fType === 'Despesa' ? f.clientOrSupplier : '') || '').trim();
    const fSeller = String(f.seller || 'ADMIN').trim().toUpperCase();

    if (finTypeFilter !== 'todos' && fType !== finTypeFilter) return false;
    if (finStatusFilter !== 'todos' && fStatus !== finStatusFilter) return false;
    if (finChannelFilter !== 'todos' && fChannel !== finChannelFilter) return false;
    if (finSupplierFilter !== 'todos' && fSupplier !== finSupplierFilter) return false;
    if (finSellerFilter !== 'todos' && fSeller !== finSellerFilter) return false;

    if (startDate && fDate && fDate < startDate) return false;
    if (endDate && fDate && fDate > endDate) return false;

    if (term) {
      const hay = [
        f.id, f.description, f.category, f.clientOrSupplier,
        f.supplier, f.seller, f.paymentMethod, f.channel, f.notes
      ].join(' ').toLowerCase();
      if (!hay.includes(term)) return false;
    }

    return true;
  });

  const receitasTotal = filtered
    .filter(f => f.type === 'Receita')
    .reduce((acc, f) => acc + Number(f.amount || 0), 0);
  const despesasTotal = filtered
    .filter(f => f.type === 'Despesa')
    .reduce((acc, f) => acc + Number(f.amount || 0), 0);
  const saldoLiquido = receitasTotal - despesasTotal;
  const pendenteTotal = filtered
    .filter(f => f.status === 'Pendente')
    .reduce((acc, f) => acc + Number(f.amount || 0), 0);

  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('finMetricReceitas', canManageFin ? fmtBRL(receitasTotal) : 'Restrito');
  setTxt('finMetricDespesas', canManageFin ? fmtBRL(despesasTotal) : 'Restrito');
  setTxt('finMetricSaldo', canManageFin ? fmtBRL(saldoLiquido) : 'Restrito');
  setTxt('finMetricPendente', canManageFin ? fmtBRL(pendenteTotal) : 'Restrito');

  const saldoEl = document.getElementById('finMetricSaldo');
  if (saldoEl && canManageFin) {
    saldoEl.style.color = saldoLiquido >= 0 ? '#34d399' : '#f87171';
  }

  const chBox = document.getElementById('finChannelsComparisonBody');
  if (chBox) {
    const validSales = sales.filter(s => {
      if (isSaleCancelledOrRefunded(s)) return false;
      const ch = getSaleChannelLabel(s);
      const sel = String(s.seller || 'ADMIN').trim().toUpperCase();
      if (finChannelFilter !== 'todos' && ch !== finChannelFilter) return false;
      if (finSellerFilter !== 'todos' && sel !== finSellerFilter) return false;
      if (startDate && s.isoDate && s.isoDate < startDate) return false;
      if (endDate && s.isoDate && s.isoDate > endDate) return false;
      return true;
    });

    const presSales = validSales.filter(s => getSaleChannelLabel(s) === 'Venda Presencial');
    const onlSales = validSales.filter(s => getSaleChannelLabel(s) === 'Online / Nuvemshop');

    const channelsArr = [
      {
        name: 'Venda Presencial',
        badgeClass: 'badge-info',
        orders: presSales.length,
        revenue: presSales.reduce((acc, s) => acc + Number(s.total || 0), 0)
      },
      {
        name: 'Online / Nuvemshop',
        badgeClass: 'badge-nuvem',
        orders: onlSales.length,
        revenue: onlSales.reduce((acc, s) => acc + Number(s.total || 0), 0)
      }
    ];

    if (finChannelSort === 'orders_desc') {
      channelsArr.sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
    } else {
      channelsArr.sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
    }

    const totalChannelRev = channelsArr.reduce((acc, c) => acc + c.revenue, 0);

    chBox.innerHTML = channelsArr.map(ch => {
      const share = totalChannelRev > 0 ? ((ch.revenue / totalChannelRev) * 100).toFixed(1) : '0.0';
      const ticket = ch.orders > 0 ? ch.revenue / ch.orders : 0;
      return `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border, #252a34); border-radius:8px; padding:0.65rem 0.75rem; margin-bottom:0.55rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
            <span class="badge-tag ${ch.badgeClass}">${ch.name}</span>
            <strong style="color:#34d399;">${canManageFin ? fmtBRL(ch.revenue) : 'Restrito'} (${share}%)</strong>
          </div>
          <div style="width:100%; height:7px; background:rgba(255,255,255,0.07); border-radius:999px; overflow:hidden; margin-bottom:0.35rem;">
            <div style="width:${share}%; height:100%; background:${ch.name === 'Venda Presencial' ? '#60a5fa' : '#a5b4fc'};"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.76rem; color:var(--text-muted);">
            <span><strong>${ch.orders}</strong> pedido(s)</span>
            <span>Ticket médio: <strong>${canManageFin ? fmtBRL(ticket) : 'Restrito'}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  const sellersTbody = document.getElementById('finSellersBreakdownBody');
  if (sellersTbody) {
    const validSales = sales.filter(s => {
      if (isSaleCancelledOrRefunded(s)) return false;
      const ch = getSaleChannelLabel(s);
      const sel = String(s.seller || 'ADMIN').trim().toUpperCase();
      if (finChannelFilter !== 'todos' && ch !== finChannelFilter) return false;
      if (finSellerFilter !== 'todos' && sel !== finSellerFilter) return false;
      if (startDate && s.isoDate && s.isoDate < startDate) return false;
      if (endDate && s.isoDate && s.isoDate > endDate) return false;
      return true;
    });

    const sellerMap = new Map();
    validSales.forEach(s => {
      const sel = String(s.seller || 'ADMIN').trim().toUpperCase();
      const current = sellerMap.get(sel) || { seller: sel, orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += Number(s.total || 0);
      sellerMap.set(sel, current);
    });

    const sellerRows = Array.from(sellerMap.values()).sort((a, b) => b.revenue - a.revenue);
    if (sellerRows.length === 0) {
      sellersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhuma venda no filtro atual.</td></tr>`;
    } else {
      sellersTbody.innerHTML = sellerRows.map(row => {
        const rate = Number(sellerCommissionRates[row.seller] ?? 0);
        const commVal = (row.revenue * rate) / 100;
        return `
          <tr>
            <td><strong>${row.seller}</strong></td>
            <td>${row.orders}</td>
            <td><strong style="color:#34d399;">${canManageFin ? fmtBRL(row.revenue) : 'Restrito'}</strong></td>
            <td>
              <input type="number" min="0" max="100" step="0.5" value="${rate}"
                ${canManageFin ? '' : 'disabled'}
                style="width:64px; padding:0.25rem 0.4rem; font-size:0.8rem;"
                onchange="updateSellerCommissionRate('${row.seller.replace(/'/g, "\\'")}', this.value)" />%
            </td>
            <td><strong style="color:#fbbf24;">${canManageFin ? fmtBRL(commVal) : 'Restrito'}</strong></td>
          </tr>
        `;
      }).join('');
    }
  }

  const listTbody = document.getElementById('tableFinanceEntriesList');
  if (!listTbody) return;

  if (filtered.length === 0) {
    listTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:1.25rem;">Nenhum lançamento financeiro encontrado para os filtros selecionados.</td></tr>`;
    return;
  }

  listTbody.innerHTML = filtered.map(f => {
    const isRev = f.type === 'Receita';
    const chBadge = f.channel === 'Online / Nuvemshop'
      ? `<span class="badge-tag badge-nuvem" style="margin-left:4px;">Nuvemshop</span>`
      : `<span class="badge-tag badge-info" style="margin-left:4px;">Presencial</span>`;
    const partyDisplay = f.supplier || f.clientOrSupplier || '-';

    return `
      <tr>
        <td style="white-space:nowrap;">${formatDateSafe(f.date)}</td>
        <td style="white-space:nowrap;">
          <span class="badge-tag ${isRev ? 'badge-receita' : 'badge-despesa'}">${f.type}</span>
          ${chBadge}
        </td>
        <td>
          <strong>${f.category || '-'}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${f.description || '-'}</div>
        </td>
        <td>${partyDisplay}</td>
        <td style="white-space:nowrap;"><strong>${f.seller || 'ADMIN'}</strong></td>
        <td style="white-space:nowrap;">${f.paymentMethod || '-'}</td>
        <td style="white-space:nowrap;">
          <span class="badge-tag ${f.status === 'Pago' ? 'badge-receita' : 'badge-warning'}">${f.status || 'Pago'}</span>
        </td>
        <td style="white-space:nowrap;">
          <strong style="color:${isRev ? '#34d399' : '#f87171'};">
            ${canManageFin ? `${isRev ? '+' : '-'} ${fmtBRL(f.amount)}` : 'Restrito'}
          </strong>
        </td>
        <td style="white-space:nowrap;">
          <div class="gm-gh-action-wrap">
            <button type="button" class="gm-gh-pencil-btn" onclick="toggleFinanceActionMenu(event, '${f.id}')">
              <span>Ações</span>
              <i class="ph ph-caret-down" style="font-size:13px; color:#9ca3af;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initCashAndTools() {
  const recOverlay = document.getElementById('receiptModalOverlay');
  document.getElementById('btnCloseReceiptModal')?.addEventListener('click', () => recOverlay.classList.remove('active'));
  document.getElementById('btnPrintReceipt')?.addEventListener('click', () => window.print());
}

window.openReceiptModal = function (saleId) {
  const s = sales.find(item => String(item.id) === String(saleId));
  if (!s) return;
  document.getElementById('receiptBodyContent').innerHTML = `<div style="text-align:center;border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px;"><strong>GRUPO MISTER PERFUMARIA</strong><br><small>Pedido #${s.id} • ${s.date}</small></div><p><strong>Cliente:</strong> ${s.client}</p><p><strong>Itens:</strong> ${s.items}</p><p><strong>Entrega:</strong> ${s.shippingMethod || 'Retirada na Loja'}</p>${s.trackingCode ? `<p><strong>Rastreio:</strong> ${s.trackingCode}</p>` : ''}${s.observation ? `<p><strong>Obs.:</strong> ${s.observation}</p>` : ''}<p><strong>Pagamento:</strong> ${s.payment}</p><hr style="margin:8px 0;"><p style="font-size:1.1rem;"><strong>TOTAL: ${fmtBRL(s.total)}</strong></p>`;
  document.getElementById('receiptModalOverlay').classList.add('active');
};
