:root {
  --bg-main: #0f131a;
  --bg-card: #161b24;
  --bg-sidebar: #12161f;
  --border: #262e3d;
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  --accent: #f59e0b;
  --blue: #3b82f6;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  font-size: 0.85rem;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* SIDEBAR */
.sidebar {
  width: 245px;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 0.9rem;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}

.sidebar-brand small { display: block; color: var(--text-muted); font-size: 0.7rem; }

.sidebar-search input {
  width: 100%;
  background: var(--bg-main);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  font-size: 0.78rem;
  margin-bottom: 0.75rem;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  overflow-y: auto;
}

.nav-item, .submenu-item {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover, .submenu-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-main);
}

.nav-item.active, .submenu-item.active {
  background: rgba(245, 158, 11, 0.14);
  color: var(--accent);
  font-weight: 600;
}

.nav-dropdown { display: flex; flex-direction: column; }
.submenu { display: none; padding-left: 1rem; flex-direction: column; gap: 0.18rem; margin-top: 0.15rem; }
.nav-dropdown.open .submenu { display: flex; }

.sidebar-footer {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* MAIN */
.main-content {
  flex: 1;
  padding: 1.1rem 1.35rem;
  overflow-x: hidden;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.shipping-banner {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  padding: 0.7rem 1rem;
  margin-bottom: 1rem;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.content-section { display: none; }
.content-section.active { display: block; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-label { font-size: 0.74rem; color: var(--text-muted); }
.metric-value { font-size: 1.25rem; color: var(--text-main); }
.metric-card small { font-size: 0.72rem; color: var(--text-muted); }

.card-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--bg-main);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill { height: 100%; border-radius: 99px; transition: width 0.35s ease; }

/* TABLES & INPUTS */
.table-responsive { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.data-table th, .data-table td {
  padding: 0.58rem 0.65rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.15);
}

.editable-cell { cursor: pointer; }
.editable-cell:hover { background: rgba(59, 130, 246, 0.08); }

.form-input {
  background: var(--bg-main);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.42rem 0.65rem;
  border-radius: 6px;
  font-size: 0.78rem;
}

/* STATUS INLINE SELECT */
.status-inline-select {
  padding: 0.24rem 0.45rem;
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid var(--border);
  cursor: pointer;
}
.st-separacao { background: rgba(245, 158, 11, 0.16); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); }
.st-separado { background: rgba(59, 130, 246, 0.16); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4); }
.st-enviado { background: rgba(168, 85, 247, 0.16); color: #c084fc; border-color: rgba(168, 85, 247, 0.4); }
.st-entregue { background: rgba(16, 185, 129, 0.16); color: #34d399; border-color: rgba(16, 185, 129, 0.4); }

/* THERMAL LABELS */
.thermal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
  gap: 0.75rem;
}

.thermal-label-card {
  background: #fff;
  color: #111;
  border-radius: 4px;
  padding: 0.5rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.thermal-label-header { display: flex; justify-content: space-between; font-size: 0.62rem; font-weight: 700; }
.thermal-label-title { font-size: 0.74rem; font-weight: 700; line-height: 1.2; }
.thermal-label-sub { font-size: 0.62rem; color: #444; }
.thermal-barcode { font-family: monospace; font-size: 0.72rem; letter-spacing: 1px; text-align: center; background: #f3f4f6; padding: 2px; }
.thermal-label-footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.62rem; font-weight: 700; }

/* BUTTONS & BADGES */
.btn-sm {
  background-color: transparent;
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.34rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-sm:hover { background-color: rgba(255, 255, 255, 0.05); }
.btn-blue { background-color: var(--blue); border-color: var(--blue); color: #fff; }
.btn-green { background-color: var(--success); border-color: var(--success); color: #fff; }
.btn-danger { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); }

.btn-primary {
  background-color: var(--accent);
  border: none;
  color: #111;
  padding: 0.42rem 0.85rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.badge-tag {
  display: inline-block;
  padding: 0.16rem 0.45rem;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
}

.badge-receita { background-color: rgba(16, 185, 129, 0.15); color: var(--success); }
.badge-despesa { background-color: rgba(239, 68, 68, 0.15); color: var(--danger); }
.badge-warning { background-color: rgba(245, 158, 11, 0.15); color: var(--warning); }
.badge-info { background-color: rgba(59, 130, 246, 0.15); color: var(--blue); }
.badge-motoboy { background-color: rgba(168, 85, 247, 0.18); color: #c084fc; }
.badge-correios { background-color: rgba(245, 158, 11, 0.18); color: #fbbf24; }
.badge-nuvem { background-color: rgba(14, 165, 233, 0.18); color: #38bdf8; }

/* MODALS */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.72);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-overlay.active { display: flex; }

.modal-container {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 100%;
  max-width: 630px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-container.modal-sm { max-width: 470px; }

.modal-header {
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-tab { font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; }
.btn-close-modal { background: none; border: none; color: var(--text-muted); font-size: 1.35rem; cursor: pointer; }
.modal-body { padding: 1rem 1.1rem; overflow-y: auto; flex: 1; }
.modal-footer { padding: 0.85rem 1.1rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }

.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; margin-bottom: 0.25rem; font-size: 0.74rem; color: var(--text-muted); font-weight: 500; }
.form-group input, .form-group select {
  width: 100%;
  background-color: var(--bg-main);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.42rem 0.65rem;
  border-radius: 6px;
  font-size: 0.8rem;
}

.dropdown-menu {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.25rem;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 205px;
  z-index: 200;
}
.dropdown-menu.open { display: block; }
.dropdown-menu a { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.85rem; color: var(--text-main); text-decoration: none; font-size: 0.78rem; }

.toast {
  position: fixed;
  bottom: 18px;
  right: 18px;
  background-color: var(--success);
  color: #fff;
  padding: 0.65rem 1.05rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s;
  z-index: 9999;
}
.toast.show { transform: translateY(0); opacity: 1; }

.sales-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
  gap: 0.85rem;
}
.sale-card-item {
  background-color: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

@media print {
  body * { visibility: hidden; }
  #thermalLabelsPreviewArea, #thermalLabelsPreviewArea * { visibility: visible; }
  #thermalLabelsPreviewArea {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    background: #fff;
  }
}
