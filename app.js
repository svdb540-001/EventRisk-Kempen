(() => {
  const state = {
    publicConfig: null,
    user: null,
    page: 'dashboard',
    events: [],
    stats: null,
    riskConfig: null,
    selectedEvent: null,
    integrations: null,
    audit: [],
    loading: false
  };

  const pageInfo = {
    dashboard: ['Dashboard', 'Zonale opvolging van evenementendossiers'],
    events: ['Evenementendossiers', 'Gegevens uit EagleBe, Flowlab en manuele hulpdienstendossiers'],
    calendar: ['Evenementenkalender', 'Chronologisch overzicht voor de hulpdiensten'],
    event: ['Dossier', 'Risicoanalyse, adviezen en documenten'],
    integrations: ['Integraties', 'Synchronisatie met EagleBe en Flowlab'],
    audit: ['Auditlog', 'Traceerbare acties en wijzigingen'],
    protocol: ['Protocol', 'Risicomatrix en minimale maatregelen']
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const formatDate = (value, includeTime = false) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return new Intl.DateTimeFormat('nl-BE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    }).format(date);
  };

  const roleLabel = (role) => ({
    'EventRisk.Admin': 'Zonaal beheerder',
    'EventRisk.Coordinator': 'Multidisciplinair coördinator',
    'EventRisk.D1': 'D1 · Brandweer',
    'EventRisk.D2': 'D2 · Medische discipline',
    'EventRisk.D3': 'D3 · Politie',
    'EventRisk.GroupMember': 'Hulpdienstmedewerker'
  })[role] || role;

  const sourceLabel = (source) => source === 'eaglebe' ? 'EagleBe' : source === 'flowlab' ? 'Flowlab' : 'Manueel';
  const sourceBadge = (source) => `<span class="source-badge source-${escapeHtml(source)}">${sourceLabel(source)}</span>`;
  const rnBadge = (rn) => `<span class="rn rn${Number(rn)}">${Number(rn)}</span>`;
  const hasRole = (...roles) => roles.some((role) => state.user?.roles?.includes(role));
  const isAdmin = () => hasRole('EventRisk.Admin');
  const canEditShared = () => hasRole('EventRisk.Admin', 'EventRisk.Coordinator');
  const canEditAdvice = (discipline) => hasRole('EventRisk.Admin', 'EventRisk.Coordinator', `EventRisk.${discipline.toUpperCase()}`);

  function toast(message, type = 'ok') {
    const element = document.createElement('div');
    element.className = `toast ${type === 'error' ? 'error' : ''}`;
    element.textContent = message;
    document.getElementById('toastRoot').appendChild(element);
    setTimeout(() => element.remove(), 4500);
  }

  function setLoading(value) {
    state.loading = value;
    document.querySelectorAll('button').forEach((button) => {
      if (button.dataset.keepEnabled !== 'true') button.disabled = value;
    });
  }

  async function api(path, options = {}) {
    const headers = await window.EventRiskAuth.headers(options.headers || {});
    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.json);
    }
    const response = await fetch(path, { ...options, headers, cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();
    if (typeof body === 'string' && /^\s*(<!doctype|<html)/i.test(body)) {
      throw new Error('De EventRisk-API gaf een HTML-pagina terug. Controleer of je de Azure App Service-URL gebruikt en niet GitHub Pages.');
    }
    if (!response.ok) throw new Error(body?.error || body || `HTTP ${response.status}`);
    return body;
  }

  function showLoginError(error) {
    const box = document.getElementById('loginError');
    box.textContent = error.message || String(error);
    box.classList.remove('hidden');
  }

  async function enterApplication() {
    setLoading(true);
    try {
      const [{ user }, riskConfig] = await Promise.all([api('/api/me'), api('/api/risk-config')]);
      state.user = user;
      state.riskConfig = riskConfig;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('appShell').classList.remove('hidden');
      document.getElementById('userName').textContent = user.name;
      document.getElementById('userRole').textContent = user.roles.map(roleLabel).join(' · ');
      document.getElementById('userAvatar').textContent = user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
      document.getElementById('environmentBadge').textContent = state.publicConfig.authMode === 'development' ? 'Lokale testmodus' : 'Microsoft Entra ID';
      renderNavigation();
      await refreshData();
      await navigate('dashboard');
    } finally {
      setLoading(false);
    }
  }

  function renderNavigation() {
    const items = [
      ['Overzicht', null, null],
      ['Dashboard', 'dashboard', '⌂'],
      ['Evenementendossiers', 'events', '▤'],
      ['Evenementenkalender', 'calendar', '▦'],
      ['Risicomodel', 'protocol', 'RN']
    ];
    if (isAdmin()) {
      items.push(['Beheer', null, null], ['Integraties', 'integrations', '⇄'], ['Auditlog', 'audit', '◎']);
    }
    document.getElementById('navigation').innerHTML = items.map(([label, page, icon]) => page
      ? `<button class="nav-btn ${state.page === page ? 'active' : ''}" data-page="${page}" type="button"><span class="nav-ico">${icon}</span>${label}</button>`
      : `<div class="nav-label">${label}</div>`
    ).join('');
  }

  async function refreshData() {
    const [{ events }, stats] = await Promise.all([api('/api/events'), api('/api/stats')]);
    state.events = events;
    state.stats = stats;
  }

  async function navigate(page, options = {}) {
    state.page = page;
    renderNavigation();
    const [title, subtitle] = pageInfo[page] || pageInfo.dashboard;
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;
    document.getElementById('sidebar').classList.remove('open');
    if (page === 'event' && options.eventId) {
      const { event } = await api(`/api/events/${encodeURIComponent(options.eventId)}`);
      state.selectedEvent = event;
    }
    if (page === 'integrations') state.integrations = await api('/api/integrations');
    if (page === 'audit') state.audit = (await api('/api/audit')).logs;
    renderPage();
    document.getElementById('main').focus();
  }

  function renderPage() {
    const renderer = {
      dashboard: renderDashboard,
      events: renderEvents,
      calendar: renderCalendar,
      event: renderEvent,
      integrations: renderIntegrations,
      audit: renderAudit,
      protocol: renderProtocol
    }[state.page] || renderDashboard;
    renderer();
  }

  function renderDashboard() {
    const upcoming = state.events.filter((event) => new Date(event.startAt) >= new Date()).slice(0, 8);
    document.getElementById('main').innerHTML = `
      <div class="page-head">
        <div><h2>Goedemorgen, ${escapeHtml(state.user.name.split(' ')[0])}</h2><p>Hier zie je wat aandacht nodig heeft binnen EventRisk Kempen.</p></div>
        <div class="head-actions">${canEditShared() ? '<button class="btn btn-primary" data-action="new-event">＋ Manueel dossier</button>' : ''}</div>
      </div>
      <div class="grid grid-4">
        ${kpi('Dossiers', state.stats.total, 'Alle bronnen', '▤', '')}
        ${kpi('Toekomstige evenementen', state.stats.upcoming, 'Vanaf vandaag', '▦', 'blue')}
        ${kpi('RN 4–5', state.stats.highRisk, 'Actieve multidisciplinaire aanpak', '!', 'amber')}
        ${kpi('Terugkoppeling open', state.stats.pendingFeedback, 'Naar gemeentelijke loketten', '⇄', 'green')}
      </div>
      <div style="height:17px"></div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><div><h3>Eerstvolgende evenementen</h3><p>Open een dossier voor risicoanalyse en advies.</p></div><button class="btn btn-light btn-sm" data-page="events">Alles bekijken</button></div>
          <div class="table-wrap"><table><thead><tr><th>Evenement</th><th>Gemeente</th><th>Datum</th><th>RN</th><th>Bron</th></tr></thead><tbody>
            ${upcoming.length ? upcoming.map(eventRowCompact).join('') : '<tr><td colspan="5" class="empty-state">Geen toekomstige evenementen.</td></tr>'}
          </tbody></table></div>
        </div>
        <div class="card card-pad">
          <div class="card-head" style="padding:0 0 14px;border:0"><div><h3>Bronverdeling</h3><p>Gemeenten blijven eigenaar van hun loket; EventRisk is het hulpdienstenportaal.</p></div></div>
          <div class="grid grid-3">
            <div class="info"><span>EagleBe</span><b>${state.stats.bySource.eaglebe}</b></div>
            <div class="info"><span>Flowlab</span><b>${state.stats.bySource.flowlab}</b></div>
            <div class="info"><span>Manueel</span><b>${state.stats.bySource.manual}</b></div>
          </div>
          <div class="alert alert-info" style="margin-top:16px"><b>Toegangsmodel:</b> er bestaat geen gemeente- of organisatorrol in deze app. Alleen de toegewezen Microsoft App Roles worden door de API aanvaard.</div>
        </div>
      </div>`;
  }

  function kpi(label, value, trend, icon, iconClass) {
    return `<div class="card kpi"><div><div class="label">${label}</div><div class="value">${value}</div><div class="trend">${trend}</div></div><div class="kpi-icon ${iconClass}">${icon}</div></div>`;
  }

  function eventRowCompact(event) {
    return `<tr><td><button class="row-button" data-open-event="${escapeHtml(event.id)}">${escapeHtml(event.name)}</button></td><td>${escapeHtml(event.municipality)}</td><td>${formatDate(event.startAt)}</td><td>${rnBadge(event.risk.finalRn)}</td><td>${sourceBadge(event.source)}</td></tr>`;
  }

  function renderEvents() {
    document.getElementById('main').innerHTML = `
      <div class="page-head"><div><h2>Evenementendossiers</h2><p>Zoek en filter de dossiers die de hulpdiensten moeten opvolgen.</p></div><div class="head-actions">${canEditShared() ? '<button class="btn btn-primary" data-action="new-event">＋ Manueel dossier</button>' : ''}</div></div>
      <div class="card card-pad">
        <div class="searchbar">
          <input id="eventSearch" placeholder="Zoek op evenement, gemeente of organisator">
          <select id="sourceFilter"><option value="">Alle bronnen</option><option value="eaglebe">EagleBe</option><option value="flowlab">Flowlab</option><option value="manual">Manueel</option></select>
          <select id="rnFilter"><option value="">Alle RN</option>${[0,1,2,3,4,5].map(rn => `<option>${rn}</option>`).join('')}</select>
          <button class="btn btn-light" data-action="apply-filters">Filter</button>
        </div>
        <div id="eventsTable">${eventsTable(state.events)}</div>
      </div>`;
  }

  function eventsTable(events) {
    return `<div class="table-wrap"><table><thead><tr><th>Referentie</th><th>Evenement</th><th>Gemeente</th><th>Start</th><th>RN</th><th>Bron</th><th>Sync</th></tr></thead><tbody>${events.length ? events.map((event) => `
      <tr><td>${escapeHtml(event.externalReference || event.id)}</td><td><button class="row-button" data-open-event="${escapeHtml(event.id)}">${escapeHtml(event.name)}</button></td><td>${escapeHtml(event.municipality)}</td><td>${formatDate(event.startAt, true)}</td><td>${rnBadge(event.risk.finalRn)}</td><td>${sourceBadge(event.source)}</td><td>${event.feedbackPending ? '<span class="badge badge-amber">Te verzenden</span>' : '<span class="badge badge-green">Bijgewerkt</span>'}</td></tr>`).join('') : '<tr><td colspan="7" class="empty-state">Geen dossiers gevonden.</td></tr>'}</tbody></table></div>`;
  }

  async function applyFilters() {
    const params = new URLSearchParams();
    const search = document.getElementById('eventSearch')?.value;
    const source = document.getElementById('sourceFilter')?.value;
    const rn = document.getElementById('rnFilter')?.value;
    if (search) params.set('search', search);
    if (source) params.set('source', source);
    if (rn !== '') params.set('rn', rn);
    const { events } = await api(`/api/events?${params}`);
    document.getElementById('eventsTable').innerHTML = eventsTable(events);
  }

  function renderCalendar() {
    const groups = new Map();
    state.events.slice().sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).forEach((event) => {
      const key = new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric' }).format(new Date(event.startAt));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    document.getElementById('main').innerHTML = `<div class="page-head"><div><h2>Evenementenkalender</h2><p>De kalender wordt automatisch gevoed door de gekoppelde gemeenteportalen.</p></div></div><div class="grid">${[...groups.entries()].map(([month, events]) => `
      <div class="card"><div class="card-head"><div><h3>${escapeHtml(month)}</h3><p>${events.length} evenement(en)</p></div></div><div class="table-wrap"><table><thead><tr><th>Datum</th><th>Evenement</th><th>Gemeente</th><th>RN</th><th>Bron</th></tr></thead><tbody>${events.map((event) => `<tr><td>${formatDate(event.startAt, true)}</td><td><button class="row-button" data-open-event="${event.id}">${escapeHtml(event.name)}</button></td><td>${escapeHtml(event.municipality)}</td><td>${rnBadge(event.risk.finalRn)}</td><td>${sourceBadge(event.source)}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>`;
  }

  function renderEvent() {
    const event = state.selectedEvent;
    if (!event) return navigate('events');
    const risk = event.risk;
    const readOnly = !canEditShared();
    document.getElementById('main').innerHTML = `
      <div class="page-head"><div><button class="btn btn-light btn-sm" data-page="events">← Terug</button></div><div class="head-actions">${event.feedbackPending && isAdmin() && event.source !== 'manual' ? `<button class="btn btn-primary" data-push-event="${event.id}">⇄ Terugkoppelen</button>` : ''}</div></div>
      <div class="detail-top">
        <div class="card detail-hero"><div style="display:flex;gap:8px;flex-wrap:wrap">${sourceBadge(event.source)} <span class="badge badge-soft">${escapeHtml(event.status)}</span>${event.feedbackPending ? '<span class="badge badge-amber">Terugkoppeling open</span>' : ''}</div><h2>${escapeHtml(event.name)}</h2><p>${escapeHtml(event.externalReference || event.id)} · ${escapeHtml(event.municipality)}</p><div class="info-grid"><div class="info"><span>Start</span><b>${formatDate(event.startAt, true)}</b></div><div class="info"><span>Locatie</span><b>${escapeHtml(event.address || '—')}</b></div><div class="info"><span>Verwacht aantal</span><b>${event.attendance ?? '—'}</b></div></div></div>
        <div class="risk-hero"><small>Algemeen risiconiveau</small><div class="rn-big">RN ${risk.finalRn}</div><p>${risk.complete ? 'Risicoanalyse volledig' : `Nog ${risk.missing.length} parameter(s) ontbrekend`}</p><div class="risk-score"><span>D1</span><b>${risk.disciplines.d1.score} → RN ${risk.disciplines.d1.rn}</b></div><div class="risk-score"><span>D2</span><b>${risk.disciplines.d2.score} → RN ${risk.disciplines.d2.rn}</b></div><div class="risk-score"><span>D3</span><b>${risk.disciplines.d3.score} → RN ${risk.disciplines.d3.rn}</b></div></div>
      </div>
      <div style="height:17px"></div>
      <div class="card">
        <div class="tabs"><button class="tab-btn active" data-tab="risk">Risicoanalyse</button><button class="tab-btn" data-tab="advice">Adviezen</button><button class="tab-btn" data-tab="documents">Documenten</button><button class="tab-btn" data-tab="measures">Maatregelen</button></div>
        <div id="eventTabContent" class="tab-pane">${riskTab(event, readOnly)}</div>
      </div>`;
  }

  function riskTab(event, readOnly) {
    return `<form id="riskForm">
      <div class="form-grid">
        <label class="field">Naam evenement<input name="name" value="${escapeHtml(event.name)}" ${readOnly ? 'disabled' : ''}></label>
        <label class="field">Gemeente<input name="municipality" value="${escapeHtml(event.municipality)}" ${readOnly ? 'disabled' : ''}></label>
        <label class="field">Start<input name="startAt" type="datetime-local" value="${toLocalInput(event.startAt)}" ${readOnly ? 'disabled' : ''}></label>
        <label class="field">Einde<input name="endAt" type="datetime-local" value="${toLocalInput(event.endAt)}" ${readOnly ? 'disabled' : ''}></label>
        <label class="field span-2">Adres<input name="address" value="${escapeHtml(event.address || '')}" ${readOnly ? 'disabled' : ''}></label>
        <label class="field">Verwacht aantal<input name="attendance" type="number" min="0" value="${event.attendance ?? ''}" ${readOnly ? 'disabled' : ''}></label>
        <label class="field">Status<select name="status" ${readOnly ? 'disabled' : ''}>${['imported','review','approved','closed'].map(status => `<option ${event.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
      </div>
      <h3>Parameters D1 · D2 · D3</h3>
      <div class="grid grid-2">${state.riskConfig.parameters.map((parameter) => riskQuestion(parameter, event, readOnly)).join('')}</div>
      <h3>Bijkomende risicofactoren</h3>
      <div class="grid grid-3">${state.riskConfig.additionalFactors.map((factor) => `<label class="info" style="display:flex;gap:8px;align-items:center"><input style="width:auto" type="checkbox" name="factor_${factor.id}" ${event.factors?.[factor.id] ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><b>${escapeHtml(factor.label)}</b></label>`).join('')}</div>
      <div class="form-grid" style="margin-top:15px"><label class="field span-2">Aandachtspunten<textarea name="notes" ${readOnly ? 'disabled' : ''}>${escapeHtml(event.notes || '')}</textarea></label><label class="field">Manuele opschaling<select name="manualRn" ${readOnly ? 'disabled' : ''}><option value="">Geen</option>${[0,1,2,3,4,5].map(rn => `<option value="${rn}" ${event.manualRn === rn ? 'selected' : ''}>RN ${rn}</option>`).join('')}</select></label><label class="field">Motivering<textarea name="manualRnReason" ${readOnly ? 'disabled' : ''}>${escapeHtml(event.manualRnReason || '')}</textarea></label></div>
      ${event.risk.warnings.length ? `<div class="alert alert-warning"><b>Te valideren protocolwaarden:</b><br>${event.risk.warnings.map(escapeHtml).join('<br>')}</div>` : ''}
      ${!readOnly ? '<div style="display:flex;justify-content:flex-end;margin-top:15px"><button class="btn btn-primary" type="submit">Dossier en risicoanalyse bewaren</button></div>' : '<div class="alert alert-info">Uw rol kan het gemeenschappelijke dossier lezen. Alleen een beheerder of multidisciplinair coördinator kan de gedeelde risicoanalyse wijzigen.</div>'}
    </form>`;
  }

  function riskQuestion(parameter, event, readOnly) {
    const selected = event.riskAnswers?.[parameter.id] || '';
    return `<label class="risk-question"><h4>${escapeHtml(parameter.title)}</h4><select name="risk_${parameter.id}" ${readOnly ? 'disabled' : ''}><option value="">— Kies —</option>${parameter.options.map((option) => `<option value="${option.id}" ${selected === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select><div class="score-hint">De weging wordt server-side berekend en kan niet vanuit de browser worden gemanipuleerd.</div></label>`;
  }

  function adviceTab(event) {
    return `<div class="grid grid-3">${['d1','d2','d3'].map((discipline) => {
      const advice = event.advice?.[discipline] || {};
      const editable = canEditAdvice(discipline);
      return `<div class="advice-card"><h3>${discipline.toUpperCase()} · ${discipline === 'd1' ? 'Brandweer' : discipline === 'd2' ? 'Medisch' : 'Politie'}</h3><p class="small muted">${advice.updatedAt ? `Laatst aangepast ${formatDate(advice.updatedAt, true)} door ${escapeHtml(advice.authorName || '')}` : 'Nog geen specifiek advies.'}</p><textarea id="advice-${discipline}" ${editable ? '' : 'disabled'}>${escapeHtml(advice.text || '')}</textarea>${editable ? `<button class="btn btn-primary btn-sm" style="margin-top:8px" data-save-advice="${discipline}">Advies bewaren</button>` : '<div class="alert alert-info">Alleen de betreffende discipline, coördinator of beheerder kan dit advies wijzigen.</div>'}</div>`;
    }).join('')}</div>`;
  }

  function documentsTab(event) {
    const docs = event.documents || [];
    return `<div class="grid grid-2"><div><h3>Dossierstukken</h3>${docs.length ? docs.map((document) => `<div class="doc-item"><div><b>${escapeHtml(document.name)}</b><small>${escapeHtml(document.type || 'Bijlage')} · ${document.size ? Math.round(document.size / 1024) + ' KB' : 'externe bijlage'}</small></div>${document.id && document.storedName ? `<a class="btn btn-light btn-sm" href="/api/events/${encodeURIComponent(event.id)}/documents/${encodeURIComponent(document.id)}" data-download-document="true">Download</a>` : '<span class="badge badge-soft">Via bronportaal</span>'}</div>`).join('') : '<div class="empty-state">Geen documenten geregistreerd.</div>'}</div><div><h3>Vereisten bij RN ${event.risk.finalRn}</h3><ul class="measures">${event.risk.requiredDocuments.length ? event.risk.requiredDocuments.map((name) => `<li>${escapeHtml(name)}</li>`).join('') : '<li>Geen specifiek verplicht dossierstuk.</li>'}</ul>${canEditShared() ? `<div class="card card-pad" style="margin-top:14px"><label class="field">Documenttype<select id="documentType"><option>Bijlage</option><option>Inplantingsplan</option><option>Veiligheidsplan</option><option>Veiligheidsdossier</option><option>CP-OPS-plan</option></select></label><label class="field">Bestand<input id="documentFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></label><button class="btn btn-primary btn-sm" data-action="upload-document">Bestand uploaden</button></div>` : ''}</div></div>`;
  }

  function measuresTab(event) {
    return `<div class="grid grid-2"><div><h3>Minimale multidisciplinaire maatregelen</h3><ul class="measures">${event.risk.measures.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div><h3>Berekeningssamenvatting</h3><div class="payload">${escapeHtml(JSON.stringify({ finalRn:event.risk.finalRn, disciplines:event.risk.disciplines, warnings:event.risk.warnings }, null, 2))}</div></div></div>`;
  }

  function toLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  async function saveRiskForm(form) {
    const event = state.selectedEvent;
    const data = new FormData(form);
    const riskAnswers = {};
    state.riskConfig.parameters.forEach((parameter) => riskAnswers[parameter.id] = data.get(`risk_${parameter.id}`) || '');
    const factors = {};
    state.riskConfig.additionalFactors.forEach((factor) => factors[factor.id] = data.get(`factor_${factor.id}`) === 'on');
    const payload = {
      version: event.version,
      name: data.get('name'), municipality: data.get('municipality'),
      startAt: data.get('startAt') ? new Date(data.get('startAt')).toISOString() : event.startAt,
      endAt: data.get('endAt') ? new Date(data.get('endAt')).toISOString() : null,
      address: data.get('address'), attendance: data.get('attendance'), status: data.get('status'),
      riskAnswers, factors, notes: data.get('notes'), manualRn: data.get('manualRn'), manualRnReason: data.get('manualRnReason')
    };
    const { event: saved } = await api(`/api/events/${encodeURIComponent(event.id)}`, { method: 'PUT', json: payload });
    state.selectedEvent = saved;
    await refreshData();
    renderEvent();
    toast('Dossier en risicoanalyse bewaard.');
  }

  function renderIntegrations() {
    const data = state.integrations;
    const stateMap = Object.fromEntries((data.states || []).map((item) => [item.platform, item]));
    document.getElementById('main').innerHTML = `
      <div class="page-head"><div><h2>Integraties en synchronisatie</h2><p>Importeer gemeentelijke dossiers en stuur hulpdienstenresultaten terug.</p></div></div>
      <div class="alert alert-info"><b>Belangrijk:</b> de connectorarchitectuur is werkend. Livegebruik vereist door EagleBe en Flowlab bevestigde endpoints, credentials en veldmapping per gemeente.</div>
      <div class="connector-grid">${['eaglebe','flowlab'].map((platform) => connectorCard(platform, data.connectors[platform], stateMap[platform])).join('')}</div>
      <div style="height:17px"></div>
      <div class="card"><div class="card-head"><div><h3>Terugkoppelwachtrij</h3><p>Gewijzigde EventRisk-resultaten die nog naar het bronportaal moeten.</p></div></div><div class="table-wrap"><table><thead><tr><th>Evenement</th><th>Platform</th><th>RN</th><th>Actie</th></tr></thead><tbody>${data.pending.length ? data.pending.map((event) => `<tr><td><button class="row-button" data-open-event="${event.id}">${escapeHtml(event.name)}</button></td><td>${sourceBadge(event.source)}</td><td>${rnBadge(event.risk.finalRn)}</td><td><button class="btn btn-primary btn-sm" data-push-event="${event.id}">Verstuur</button></td></tr>`).join('') : '<tr><td colspan="4" class="empty-state">Geen openstaande terugkoppelingen.</td></tr>'}</tbody></table></div></div>
      <div style="height:17px"></div>
      <div class="card"><div class="card-head"><div><h3>Synchronisatielog</h3><p>Technische geschiedenis van inkomende en uitgaande berichten.</p></div></div><div class="table-wrap"><table><thead><tr><th>Tijdstip</th><th>Richting</th><th>Platform</th><th>Status</th><th>Bericht</th></tr></thead><tbody>${data.logs.map((log) => `<tr><td>${formatDate(log.createdAt,true)}</td><td>${log.direction === 'in' ? '→ EventRisk' : 'EventRisk →'}</td><td>${sourceBadge(log.platform)}</td><td><span class="badge ${log.status === 'success' ? 'badge-green' : log.status === 'error' ? 'badge-red' : 'badge-soft'}">${escapeHtml(log.status)}</span></td><td>${escapeHtml(log.message)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function connectorCard(platform, connector, syncState = {}) {
    const label = platform === 'eaglebe' ? 'EagleBe' : 'Flowlab';
    return `<div class="card"><div class="connector-head"><div class="connector-brand"><div class="connector-logo ${platform}">${platform === 'eaglebe' ? 'EB' : 'FL'}</div><div><h3>${label}</h3><p>${platform === 'eaglebe' ? 'Publieke API met OAuth2 client credentials' : 'Gemeentelijk digitaal loket'}</p></div></div><span class="badge ${connector.configured ? 'badge-green' : 'badge-amber'}">${connector.mode} · ${connector.configured ? 'geconfigureerd' : 'onvolledig'}</span></div><div class="connector-body"><div class="info-grid"><div class="info"><span>Authenticatie</span><b>${escapeHtml(connector.authentication)}</b></div><div class="info"><span>Laatste import</span><b>${formatDate(syncState.lastPullAt,true)}</b></div><div class="info"><span>Laatste export</span><b>${formatDate(syncState.lastPushAt,true)}</b></div></div>${syncState.lastError ? `<div class="alert alert-danger">${escapeHtml(syncState.lastError)}</div>` : ''}<div class="sync-actions"><button class="btn btn-light btn-sm" data-test-platform="${platform}">Verbinding testen</button><button class="btn btn-primary btn-sm" data-pull-platform="${platform}">Importeer nu</button><button class="btn btn-light btn-sm" data-push-pending="${platform}">Verstuur wachtrij</button></div></div></div>`;
  }

  function renderAudit() {
    document.getElementById('main').innerHTML = `<div class="page-head"><div><h2>Auditlog</h2><p>Elke relevante wijziging wordt met gebruiker, rol en tijdstip vastgelegd.</p></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Tijdstip</th><th>Gebruiker</th><th>Actie</th><th>Entiteit</th><th>Details</th></tr></thead><tbody>${state.audit.map((log) => `<tr><td>${formatDate(log.createdAt,true)}</td><td>${escapeHtml(log.actorName || 'Systeem')}<br><small>${escapeHtml(log.actorEmail || '')}</small></td><td>${escapeHtml(log.action)}</td><td>${escapeHtml(log.entityType)} ${escapeHtml(log.entityId || '')}</td><td><code>${escapeHtml(JSON.stringify(log.details))}</code></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function renderProtocol() {
    document.getElementById('main').innerHTML = `<div class="page-head"><div><h2>Risicomodel</h2><p>${escapeHtml(state.riskConfig.protocolVersion)}</p></div></div><div class="alert alert-warning">Enkele waarden in het werkdocument zijn onvolledig of met vraagtekens aangeduid. Deze worden in de app zichtbaar gemarkeerd en moeten vóór productie formeel gevalideerd worden.</div><div class="grid">${state.riskConfig.parameters.map((parameter) => `<div class="card"><div class="card-head"><div><h3>${escapeHtml(parameter.title)}</h3></div></div><div class="table-wrap"><table><thead><tr><th>Keuze</th><th>D1</th><th>D2</th><th>D3</th><th>Validatie</th></tr></thead><tbody>${parameter.options.map((option) => `<tr><td>${escapeHtml(option.label)}</td><td>${option.d1}</td><td>${option.d2}</td><td>${option.d3}</td><td>${option.needsApproval ? '<span class="badge badge-amber">Bevestigen</span>' : '<span class="badge badge-green">Overgenomen</span>'}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>`;
  }

  function showNewEventModal() {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = 'Nieuw manueel hulpdienstendossier';
    document.getElementById('modalBody').innerHTML = `<form id="newEventForm"><div class="form-grid"><label class="field">Naam *<input name="name" required></label><label class="field">Gemeente *<input name="municipality" required></label><label class="field">Start *<input name="startAt" type="datetime-local" required></label><label class="field">Einde<input name="endAt" type="datetime-local"></label><label class="field span-2">Adres<input name="address"></label><label class="field">Verwacht aantal<input name="attendance" type="number" min="0"></label><label class="field">Organisatie<input name="organizerName"></label></div><div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Dossier aanmaken</button></div></form>`;
    modal.showModal();
  }

  async function createEvent(form) {
    const data = new FormData(form);
    const payload = {
      source: 'manual', name: data.get('name'), municipality: data.get('municipality'),
      startAt: new Date(data.get('startAt')).toISOString(),
      endAt: data.get('endAt') ? new Date(data.get('endAt')).toISOString() : null,
      address: data.get('address'), attendance: data.get('attendance'),
      organizer: { name: data.get('organizerName') }, status: 'review', riskAnswers: {}, factors: {}
    };
    const { event } = await api('/api/events', { method: 'POST', json: payload });
    document.getElementById('modal').close();
    await refreshData();
    await navigate('event', { eventId: event.id });
    toast('Manueel dossier aangemaakt.');
  }

  async function saveAdvice(discipline) {
    const text = document.getElementById(`advice-${discipline}`).value;
    const { event } = await api(`/api/events/${encodeURIComponent(state.selectedEvent.id)}/advice/${discipline}`, { method: 'PUT', json: { text } });
    state.selectedEvent = event;
    await refreshData();
    document.getElementById('eventTabContent').innerHTML = adviceTab(event);
    toast(`${discipline.toUpperCase()}-advies bewaard.`);
  }

  async function uploadDocument() {
    const input = document.getElementById('documentFile');
    const file = input.files[0];
    if (!file) throw new Error('Kies eerst een bestand.');
    const type = document.getElementById('documentType').value;
    const headers = await window.EventRiskAuth.headers({
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-Document-Type': encodeURIComponent(type)
    });
    const response = await fetch(`/api/events/${encodeURIComponent(state.selectedEvent.id)}/documents`, { method: 'POST', headers, body: file });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Upload mislukt.');
    state.selectedEvent = body.event;
    document.getElementById('eventTabContent').innerHTML = documentsTab(body.event);
    toast('Document geüpload.');
  }

  async function performIntegration(action, platform, eventId = null) {
    const route = action === 'test' ? `/api/integrations/${platform}/test`
      : action === 'pull' ? `/api/integrations/${platform}/pull`
      : action === 'push-pending' ? `/api/integrations/${platform}/push-pending`
      : `/api/integrations/${platform}/push/${encodeURIComponent(eventId)}`;
    await api(route, { method: 'POST' });
    toast(action === 'pull' ? `${sourceLabel(platform)}-import voltooid.` : 'Synchronisatie uitgevoerd.');
    await refreshData();
    if (state.page === 'integrations') {
      state.integrations = await api('/api/integrations');
      renderIntegrations();
    } else if (state.page === 'event' && state.selectedEvent) {
      const { event } = await api(`/api/events/${state.selectedEvent.id}`);
      state.selectedEvent = event;
      renderEvent();
    }
  }

  function switchEventTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    const event = state.selectedEvent;
    document.getElementById('eventTabContent').innerHTML = tab === 'risk' ? riskTab(event, !canEditShared()) : tab === 'advice' ? adviceTab(event) : tab === 'documents' ? documentsTab(event) : measuresTab(event);
  }

  async function handleClick(event) {
    const button = event.target.closest('button,a');
    if (!button) return;
    try {
      if (button.dataset.downloadDocument) {
        event.preventDefault();
        const response = await fetch(button.href, { headers: await window.EventRiskAuth.headers(), cache: 'no-store' });
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Download mislukt.'); }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = decodeURIComponent((response.headers.get('content-disposition') || '').match(/filename\*=UTF-8''([^;]+)/)?.[1] || 'document');
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (button.dataset.page) return navigate(button.dataset.page);
      if (button.dataset.openEvent) return navigate('event', { eventId: button.dataset.openEvent });
      if (button.dataset.action === 'new-event') return showNewEventModal();
      if (button.dataset.action === 'apply-filters') return applyFilters();
      if (button.dataset.action === 'upload-document') return uploadDocument();
      if (button.dataset.tab) return switchEventTab(button.dataset.tab);
      if (button.dataset.saveAdvice) return saveAdvice(button.dataset.saveAdvice);
      if (button.dataset.testPlatform) return performIntegration('test', button.dataset.testPlatform);
      if (button.dataset.pullPlatform) return performIntegration('pull', button.dataset.pullPlatform);
      if (button.dataset.pushPending) return performIntegration('push-pending', button.dataset.pushPending);
      if (button.dataset.pushEvent) {
        const selected = state.events.find((item) => item.id === button.dataset.pushEvent) || state.selectedEvent;
        return performIntegration('push', selected.source, button.dataset.pushEvent);
      }
    } catch (error) { toast(error.message, 'error'); }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (event.target.id === 'riskForm') await saveRiskForm(event.target);
      if (event.target.id === 'newEventForm') await createEvent(event.target);
    } catch (error) { toast(error.message, 'error'); }
  }

  async function initialize() {
    try {
      state.publicConfig = await window.EventRiskAuth.initialize();
      document.getElementById('developmentLogin').classList.toggle('hidden', !state.publicConfig.development);
      document.getElementById('microsoftLoginButton').classList.toggle('hidden', state.publicConfig.development);
      if (!state.publicConfig.development && window.EventRiskAuth.isAuthenticated()) await enterApplication();
    } catch (error) { showLoginError(error); }

    document.getElementById('microsoftLoginButton').addEventListener('click', async () => {
      try { await window.EventRiskAuth.login(); await enterApplication(); } catch (error) { showLoginError(error); }
    });
    document.getElementById('developmentLoginButton').addEventListener('click', async () => {
      window.EventRiskAuth.setDevelopmentRole(document.getElementById('devRole').value);
      try { await enterApplication(); } catch (error) { showLoginError(error); }
    });
    document.getElementById('logoutButton').addEventListener('click', () => window.EventRiskAuth.logout());
    document.getElementById('refreshButton').addEventListener('click', async () => {
      try { await refreshData(); if (state.page === 'integrations') state.integrations = await api('/api/integrations'); renderPage(); toast('Gegevens vernieuwd.'); } catch (error) { toast(error.message, 'error'); }
    });
    document.getElementById('mobileMenuButton').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('modalClose').addEventListener('click', () => document.getElementById('modal').close());
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
  }

  initialize();
})();
