// ============================================================================
// AJUSTE VISUAL DA BARRA DE CLIENTES (FILTROS ALINHADOS + BOTÃO COMPACTO)
// ============================================================================
function injectClientsToolbarPolishStyles() {
  if (document.getElementById('gmClientsToolbarPolishStyles')) return;
  const style = document.createElement('style');
  style.id = 'gmClientsToolbarPolishStyles';
  style.textContent = `
    #gmClientQualificationFilters.gm-seg-filters-row {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 0.75rem 1rem !important;
      margin-top: 0.75rem !important;
      padding-top: 0.75rem !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
    }

    #gmClientQualificationFilters .gm-seg-left-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.85rem 1.25rem;
      flex: 1 1 auto;
    }

    #gmClientQualificationFilters .gm-seg-group {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 0.5rem !important;
      margin: 0 !important;
    }

    #gmClientQualificationFilters .gm-seg-group label {
      font-size: 0.78rem !important;
      font-weight: 600 !important;
      color: #9ca3af !important;
      white-space: nowrap !important;
      margin: 0 !important;
    }

    #gmClientQualificationFilters .gm-seg-pills {
      display: inline-flex !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      background: #0d121b !important;
      border: 1px solid #263042 !important;
      border-radius: 8px !important;
      padding: 2px !important;
      gap: 2px !important;
      height: 36px !important;
      box-sizing: border-box !important;
    }

    #gmClientQualificationFilters .gm-seg-btn {
      height: 30px !important;
      padding: 0 0.7rem !important;
      font-size: 0.78rem !important;
      font-weight: 600 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.3rem !important;
      white-space: nowrap !important;
      border-radius: 6px !important;
    }

    #gmClientQualificationFilters #clientAgeRangeFilter {
      height: 36px !important;
      min-width: 155px !important;
      padding: 0 0.7rem !important;
      font-size: 0.82rem !important;
      border-radius: 8px !important;
      background: #0d121b !important;
      border: 1px solid #263042 !important;
      color: #f3f4f6 !important;
    }

    /* Padroniza altura e alinhamento do input de busca, select de perfil e botão Novo Cliente */
    #clientes .filters-bar,
    #clientes .filter-row,
    #clientes .clients-toolbar,
    #clientes .search-filter-bar {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 0.65rem !important;
    }

    #clientSearchInput {
      height: 38px !important;
      min-height: 38px !important;
      max-height: 38px !important;
      padding: 0 0.8rem !important;
      font-size: 0.84rem !important;
      border-radius: 8px !important;
      flex: 1 1 220px !important;
      align-self: center !important;
    }

    #clientCategoryFilter {
      height: 38px !important;
      min-height: 38px !important;
      max-height: 38px !important;
      padding: 0 0.8rem !important;
      font-size: 0.84rem !important;
      border-radius: 8px !important;
      min-width: 175px !important;
      flex: 0 1 210px !important;
      align-self: center !important;
    }

    #btnOpenClientModal,
    #clientes [data-open-client-modal],
    #clientes .btn-new-client {
      height: 38px !important;
      min-height: 38px !important;
      max-height: 38px !important;
      padding: 0 1rem !important;
      font-size: 0.84rem !important;
      font-weight: 600 !important;
      border-radius: 8px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.45rem !important;
      white-space: nowrap !important;
      width: auto !important;
      flex: 0 0 auto !important;
      align-self: center !important;
    }
  `;
  document.head.appendChild(style);
}

function ensureClientsQualificationFiltersBar() {
  injectClientsToolbarPolishStyles();

  const searchInput = document.getElementById('clientSearchInput');
  if (!searchInput || document.getElementById('gmClientQualificationFilters')) return;

  const parentBox = searchInput.closest('.filters-bar, .filter-row, .card, .section-card') || searchInput.parentElement;
  if (!parentBox) return;

  const bar = document.createElement('div');
  bar.id = 'gmClientQualificationFilters';
  bar.className = 'gm-seg-filters-row';
  bar.innerHTML = `
    <div class="gm-seg-left-group">
      <div class="gm-seg-group">
        <label>Aniversariantes:</label>
        <div class="gm-seg-pills" id="clientBirthdayPills">
          <button type="button" class="gm-seg-btn ${clientBirthdayFilter === 'all' ? 'active' : ''}" data-val="all">Todos</button>
          <button type="button" class="gm-seg-btn ${clientBirthdayFilter === 'today' ? 'active' : ''}" data-val="today">🎂 Hoje</button>
          <button type="button" class="gm-seg-btn ${clientBirthdayFilter === 'month' ? 'active' : ''}" data-val="month">📅 Deste Mês</button>
        </div>
      </div>

      <div class="gm-seg-group">
        <label for="clientAgeRangeFilter">Faixa Etária:</label>
        <select id="clientAgeRangeFilter">
          <option value="all" ${clientAgeRangeFilter === 'all' ? 'selected' : ''}>Todas as idades</option>
          <option value="18_24" ${clientAgeRangeFilter === '18_24' ? 'selected' : ''}>18 a 24 anos</option>
          <option value="25_34" ${clientAgeRangeFilter === '25_34' ? 'selected' : ''}>25 a 34 anos</option>
          <option value="35_44" ${clientAgeRangeFilter === '35_44' ? 'selected' : ''}>35 a 44 anos</option>
          <option value="45_plus" ${clientAgeRangeFilter === '45_plus' ? 'selected' : ''}>45+ anos</option>
        </select>
      </div>
    </div>
  `;
  parentBox.appendChild(bar);

  bar.querySelectorAll('#clientBirthdayPills .gm-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      clientBirthdayFilter = btn.getAttribute('data-val') || 'all';
      bar.querySelectorAll('#clientBirthdayPills .gm-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderClients();
    });
  });

  document.getElementById('clientAgeRangeFilter')?.addEventListener('change', (e) => {
    clientAgeRangeFilter = e.target.value || 'all';
    renderClients();
  });
}
