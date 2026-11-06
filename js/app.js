import { GOOUT_CATEGORIES } from './events.js';

/* GoOut — interface JavaScript conectada à API REST. */
(() => {
  'use strict';
  const EVENTS = [];
  const CATEGORIES = GOOUT_CATEGORIES;
  const STORAGE_KEYS = { favorites: 'goout:favorites:v1', profile: 'goout:profile:v1', clientId: 'goout:client-id:v1' };
  const el = (id) => document.getElementById(id);
  const defaultState = { search: '', category: 'todos', budget: 100, distance: 25, company: 'todos', day: 'todos', sort: 'relevancia', view: 'home' };
  const state = {...defaultState};
  const formatMoney = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  let toastTimeout;
  let eventsLoading = true;

  function safeRead(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value === null ? fallback : value; }
    catch { return fallback; }
  }
  let favorites = new Set();
  const savedProfile = safeRead(STORAGE_KEYS.profile, {});
  let profile = {
    name: typeof savedProfile?.name === 'string' ? savedProfile.name : '',
    company: ['todos', 'sozinho', 'amigos', 'casal'].includes(savedProfile?.company) ? savedProfile.company : 'todos'
  };
  let clientId = '';
  let storageAvailable = true;

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || `A API respondeu com erro (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  }
  function getClientId() {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.clientId);
      if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
      const generated = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEYS.clientId, generated);
      return generated;
    } catch (error) {
      storageAvailable = false;
      console.error('Não foi possível persistir o identificador deste navegador.', error);
      return crypto.randomUUID();
    }
  }
  function notify(message) {
    const toast = el('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }
  function safeText(v) {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  const catInfo = id => CATEGORIES.find(c => c.id === id) || { label: id, emoji: '✳' };
  const dateObj = e => new Date(e.date);
  const longDate = e => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour:'2-digit', minute:'2-digit'}).format(dateObj(e));
  const shortTime = e => new Intl.DateTimeFormat('pt-BR', {hour:'2-digit',minute:'2-digit'}).format(dateObj(e));
  const isWeekend = e => [0,6].includes(dateObj(e).getDay());
  const companyLabel = v => ({'sozinho':'Só eu','amigos':'Com amigos','casal':'A dois','todos':'Tanto faz'}[v] || v);

  function renderChips() {
    el('categoryChips').innerHTML = CATEGORIES.map(cat =>
      `<button type="button" class="category-chip ${state.category===cat.id?'is-active':''}" data-category="${safeText(cat.id)}" aria-pressed="${state.category===cat.id}"><span class="chip-emoji" aria-hidden="true">${cat.emoji}</span>${safeText(cat.label)}</button>`
    ).join('');
  }
  function matching() {
    const query = state.search.trim().toLocaleLowerCase('pt-BR');
    let results = EVENTS.filter(e => {
      if (state.view === 'favorites' && !favorites.has(e.id)) return false;
      if (state.category !== 'todos' && e.category !== state.category) return false;
      if (e.price > state.budget || e.distance > state.distance) return false;
      if (state.company !== 'todos' && !e.company.includes(state.company)) return false;
      if (state.day === 'fimdesemana' && !isWeekend(e)) return false;
      if (state.day === 'semana' && isWeekend(e)) return false;
      if (query && ![e.title,e.subtitle,e.description,e.location,e.neighborhood,catInfo(e.category).label].join(' ').toLocaleLowerCase('pt-BR').includes(query)) return false;
      return true;
    });
    if (state.sort === 'data') results.sort((a,b)=>dateObj(a)-dateObj(b));
    else if (state.sort === 'preco') results.sort((a,b)=>a.price-b.price || dateObj(a)-dateObj(b));
    else if (state.sort === 'distancia') results.sort((a,b)=>a.distance-b.distance);
    else results.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0) || dateObj(a)-dateObj(b));
    return results;
  }
  function cardHTML(e,index) {
    const date = dateObj(e), isFeatured = state.view==='discover' && state.sort==='relevancia' && index===0 && e.featured;
    const isFav = favorites.has(e.id);
    return `<article class="event-card ${isFeatured?'featured':''}" aria-label="${safeText(e.title)}">
      <div class="event-art" style="--art-start:${e.colors[0]};--art-end:${e.colors[1]}">
        <img class="event-photo" src="${safeText(e.image)}" alt="Imagem ilustrativa do evento ${safeText(e.title)}" loading="lazy" onerror="this.style.display='none'">
        <div class="event-photo-overlay"></div>
        <div class="event-date"><strong>${date.getDate().toString().padStart(2,'0')}</strong><span>${months[date.getMonth()]}</span></div>
        <button class="favorite-button ${isFav?'is-favorite':''}" type="button" data-favorite="${e.id}" aria-label="${isFav?'Remover dos':'Adicionar aos'} favoritos: ${safeText(e.title)}" aria-pressed="${isFav}">${isFav?'♥':'♡'}</button>
        <div class="event-art-title">${safeText(e.title)}</div>
      </div>
      <div class="event-card-body">      <div class="event-tags"><span class="tag ${e.accent==='green'?'green':e.accent==='blue'?'blue':''}">${safeText(catInfo(e.category).label)}</span>${e.is_demo?'<span class="tag green">FICTÍCIO</span>':''}${e.price===0?'<span class="tag green">Grátis!</span>':''}</div>
        <p class="event-description">${safeText(e.subtitle)}. ${safeText(e.description)}</p>
        <div class="event-facts"><span>◷ ${safeText(shortTime(e))}</span><span>⌖ ${safeText(e.neighborhood)}</span><span>↗ ${e.distance.toLocaleString('pt-BR')} km*</span></div>
        <div class="event-footer"><div class="event-price ${e.price===0?'is-free':''}"><small>A PARTIR DE</small>${e.price===0?'GRÁTIS':formatMoney(e.price)}</div><button class="event-open" data-open="${e.id}" type="button" aria-label="Ver detalhes de ${safeText(e.title)}">↗</button></div>
      </div></article>`;
  }
  function updateFavoriteCount(){el('favoriteCount').textContent=favorites.size;}
  function setMobileNav() {
    document.querySelectorAll('[data-mobile-nav]').forEach(node => node.classList.toggle('selected', node.dataset.mobileNav === state.view));
    el('mobileFavorites').classList.toggle('selected', state.view === 'favorites');
    el('navFavorites').classList.toggle('active', state.view === 'favorites');
    document.querySelectorAll('.desktop-nav [data-nav]').forEach(node => {
      node.classList.toggle('active', node.dataset.nav === state.view);
    });
  }
  function render() {
    el('homePage').hidden = state.view !== 'home';
    el('descobrir').hidden = state.view === 'home';
    el('filterPanel').hidden = state.view === 'favorites';
    renderChips();
    updateFavoriteCount();
    setMobileNav();
    el('budgetValue').textContent = state.budget===100?'Até R$ 100':state.budget===0?'Só grátis':`Até R$ ${state.budget}`;
    el('distanceValue').textContent = `Até ${state.distance} km`;
    const results = matching();
    const list = el('eventsGrid');
    const empty = el('emptyState');
    list.innerHTML = results.map(cardHTML).join('');
    empty.hidden = eventsLoading || results.length !== 0;
    const previews = EVENTS.slice().sort((a,b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || dateObj(a) - dateObj(b)).slice(0, 3);
    el('homeEventsGrid').innerHTML = previews.map((event, index) => cardHTML(event, index)).join('');
    el('homePreviewStatus').textContent = eventsLoading
      ? 'Carregando os eventos...'
      : previews.length ? `${previews.length} sugestões do catálogo GoOut para começar:` : 'Nenhum evento disponível no momento.';
    el('viewOverline').textContent = state.view === 'favorites' ? 'SEUS ROLÊS GUARDADOS' : 'SUA PRÓXIMA DESCOBERTA';
    el('resultsTitle').innerHTML = state.view === 'favorites' ? 'MEUS <em>FAVORITOS</em> <span aria-hidden="true">♥</span>' : 'ROLÊS QUE <em>COMBINAM</em> COM VOCÊ <span aria-hidden="true">↘</span>';
    el('resultCount').textContent = eventsLoading ? 'Carregando eventos...' : `${results.length} rolê${results.length===1?'':'s'} encontrado${results.length===1?'':'s'} · catálogo GoOut`;
    el('demoNote').hidden = EVENTS.length === 0;
    el('demoNoteText').textContent = EVENTS.some(event => event.is_demo)
      ? 'O catálogo ainda contém exemplos fictícios identificados nos cards. Remova-os e cadastre eventos conferidos antes de divulgar a agenda.'
      : 'Eventos cadastrados pela equipe GoOut. Confirme horários, valores e disponibilidade com a organização antes de sair.';
    if (state.view==='favorites' && results.length===0) {
      empty.querySelector('h3').textContent = 'Ainda não tem favoritos por aqui!';
      empty.querySelector('p').textContent = 'Toque no coração de um evento para guardar suas ideias de rolê.';
    } else {
      empty.querySelector('h3').textContent = 'Esse rolê ainda não apareceu!';
      empty.querySelector('p').textContent = 'Tenta mudar os filtros. Tem muita coisa legal esperando por você.';
    }
  }
  async function toggleFavorite(id) {
    if(!EVENTS.some(e=>e.id===id)) return;
    const wasFav = favorites.has(id);
    try {
      if (wasFav) {
        await apiRequest(`/api/favorites/${encodeURIComponent(clientId)}/${id}`, { method: 'DELETE' });
        favorites.delete(id);
      } else {
        await apiRequest('/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ clientId, eventId: id })
        });
        favorites.add(id);
      }
      render();
      notify(wasFav?'Removido dos seus salvos ♡':'Rolê salvo! ♥');
      const currentEventId = Number(el('eventDialog').dataset.eventId);
      if(el('eventDialog').open && currentEventId===id) renderDetail(EVENTS.find(e=>e.id===id));
    } catch (error) {
      console.error('Não foi possível atualizar os favoritos.', error);
      notify(`Não foi possível atualizar os favoritos: ${error.message}`);
    }
  }
  function renderDetail(e) {
    el('eventDialog').dataset.eventId=e.id;
    el('eventDialogContent').innerHTML=`<div class="detail-art" style="--art-start:${e.colors[0]};--art-end:${e.colors[1]}"><img src="${safeText(e.image)}" alt="Imagem ilustrativa de ${safeText(e.title)}" onerror="this.style.display='none'"><h2 id="eventDialogTitle">${safeText(e.title)}</h2></div>
      <div class="detail-body"><div class="event-tags"><span class="tag">${safeText(catInfo(e.category).label)}</span>${e.is_demo?'<span class="tag green">EVENTO FICTÍCIO</span>':''}</div><p>${safeText(e.description)}</p>
      <div class="detail-facts"><div><small>QUANDO</small><strong>${safeText(longDate(e))}</strong></div><div><small>ONDE</small><strong>${safeText(e.location)} — ${safeText(e.neighborhood)}</strong></div><div><small>${e.is_demo?'VALOR ILUSTRATIVO':'VALOR INFORMADO'}</small><strong>${e.price===0?'Grátis':formatMoney(e.price)}</strong></div><div><small>DISTÂNCIA ${e.is_demo?'ILUSTRATIVA':'APROXIMADA'}</small><strong>${e.distance.toLocaleString('pt-BR')} km</strong></div><div><small>IDADE MÍNIMA</small><strong>${e.age===0?'Livre':`${e.age} anos`}</strong></div><div><small>COM QUEM?</small><strong>${e.company.map(companyLabel).join(' • ')}</strong></div></div>
      <p><strong>Atenção:</strong> ${e.is_demo?'este evento é fictício e serve apenas para demonstração.':'confirme a realização, os horários e os valores com a organização. O GoOut não vende ingressos.'}</p>
      <div class="detail-actions"><button class="btn-main btn-blue" data-favorite="${e.id}" type="button">${favorites.has(e.id)?'♥ Tirar dos salvos':'♡ Salvar rolê'}</button><button class="btn-main btn-yellow" data-share="${e.id}" type="button">Compartilhar ↗</button></div></div>`;
  }
  function openDetail(id) {
    const e = EVENTS.find(item => item.id===id);
    if(!e) return;
    renderDetail(e);
    el('eventDialog').showModal();
  }
  function switchView(view, section = null) {
    state.view = view;
    if (view === 'favorites') clearFilterValues(false);
    const hash = section === 'como-funciona' ? '#como-funciona' : view === 'favorites' ? '#salvos' : view === 'home' ? '#inicio' : '#descobrir';
    if (window.location.hash !== hash) window.history.pushState({}, '', hash);
    render();
    requestAnimationFrame(() => {
      if (section === 'como-funciona') {
        el('como-funciona').scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  function restoreViewFromUrl() {
    const hash = window.location.hash;
    state.view = hash === '#salvos' ? 'favorites' : hash === '#descobrir' ? 'discover' : 'home';
    if (state.view === 'favorites') clearFilterValues(false);
    render();
    if (hash === '#como-funciona') requestAnimationFrame(() => el('como-funciona').scrollIntoView());
  }
  function clearFilterValues(reRender=true) {
    Object.assign(state,{search:'',category:'todos',budget:100,distance:25,company:'todos',day:'todos',sort:'relevancia'});
    el('searchInput').value='';el('budgetRange').value='100';el('distanceRange').value='25';el('companySelect').value='todos';el('dateSelect').value='todos';el('sortSelect').value='relevancia';
    if(reRender) render();
  }
  function resetAll() { clearFilterValues(false); switchView('discover'); }
  function surprise() {
    const options = matching();
    if(!options.length) { notify('Sem opções com esses filtros. Tenta limpar os filtros!');return; }
    const chosen = options[Math.floor(Math.random()*options.length)];
    openDetail(chosen.id);
    notify('A sorte escolheu seu próximo rolê ✳');
  }
  function syncProfile() {
    const name = String(profile.name||'').trim().slice(0,28);
    el('profileLabel').textContent = name||'Meu perfil';
    el('avatarInitial').textContent = name?name[0].toLocaleUpperCase('pt-BR'):'?';
    el('displayName').value=name;
    el('profileCompany').value=profile.company||'todos';
  }
  async function shareEvent(id) {
    const event = EVENTS.find(e=>e.id===id);
    if(!event) return;
    const text=`Olha essa ideia de rolê no GoOut: ${event.title} — ${event.location}.${event.is_demo?' Evento fictício de demonstração.':''}`;
    try {
      if(navigator.share) { await navigator.share({title:'GoOut — '+event.title,text});return; }
      if(navigator.clipboard && window.isSecureContext) {await navigator.clipboard.writeText(text);notify('Texto do rolê copiado!');return;}
    } catch(err) {if(err.name==='AbortError')return;}
    const field=document.createElement('textarea');field.value=text;document.body.appendChild(field);field.select();
    try {document.execCommand('copy');notify('Texto do rolê copiado!');} catch {notify(text);}
    field.remove();
  }
  function wireEvents() {
    el('searchInput').addEventListener('input',e=>{state.search=e.target.value;render();});
    el('budgetRange').addEventListener('input',e=>{state.budget=+e.target.value;render();});
    el('distanceRange').addEventListener('input',e=>{state.distance=+e.target.value;render();});
    el('companySelect').addEventListener('change',e=>{state.company=e.target.value;render();});
    el('dateSelect').addEventListener('change',e=>{state.day=e.target.value;render();});
    el('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;render();});
    el('categoryChips').addEventListener('click',e=>{
      const chip=e.target.closest('[data-category]');if(!chip)return;
      state.category=chip.dataset.category;render();
    });
    const onCardClick = e => {
      const fav=e.target.closest('[data-favorite]');if(fav){toggleFavorite(+fav.dataset.favorite);return;}
      const open=e.target.closest('[data-open]');if(open)openDetail(+open.dataset.open);
    };
    el('eventsGrid').addEventListener('click', onCardClick);
    el('homeEventsGrid').addEventListener('click', onCardClick);
    el('eventDialog').addEventListener('click',e=>{
      const fav=e.target.closest('[data-favorite]');if(fav){toggleFavorite(+fav.dataset.favorite);return;}
      const share=e.target.closest('[data-share]');if(share){shareEvent(+share.dataset.share);return;}
      if(e.target===el('eventDialog'))el('eventDialog').close();
    });
    el('profileDialog').addEventListener('click',e=>{if(e.target===el('profileDialog'))el('profileDialog').close();});
    document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>el(b.dataset.close).close()));
    const openProfile=()=>{syncProfile();el('profileDialog').showModal();};
    el('profileTrigger').addEventListener('click',openProfile);
    el('mobileProfile').addEventListener('click',openProfile);
    el('profileForm').addEventListener('submit',e=>{
      e.preventDefault();profile={name:el('displayName').value.trim().slice(0,28),company:el('profileCompany').value};
      let profileStored = true;
      try {
        localStorage.setItem(STORAGE_KEYS.profile,JSON.stringify(profile));
      } catch (error) {
        profileStored = false;
        console.error('Não foi possível salvar o perfil neste navegador.', error);
      }
      state.company=profile.company;el('companySelect').value=profile.company;
      syncProfile();switchView('discover');el('profileDialog').close();
      notify(profileStored?'Sua vibe está salva neste navegador ✳':'Perfil salvo apenas nesta sessão: o navegador bloqueou o armazenamento local.');
    });
    document.querySelectorAll('[data-view="favorites"]').forEach(b=>b.addEventListener('click',()=>switchView('favorites')));
    document.querySelectorAll('[data-nav], [data-mobile-nav]').forEach(node => node.addEventListener('click', event => {
      event.preventDefault();
      const destination = node.dataset.nav || node.dataset.mobileNav;
      if (destination === 'how') switchView('home', 'como-funciona');
      else if (destination === 'home' || destination === 'discover') switchView(destination);
    }));
    window.addEventListener('popstate', restoreViewFromUrl);
    window.addEventListener('hashchange', restoreViewFromUrl);
    el('clearFilters').addEventListener('click',resetAll);el('emptyReset').addEventListener('click',resetAll);
    el('surpriseHero').addEventListener('click',surprise);el('surpriseBottom').addEventListener('click',surprise);
    el('filterToggle').addEventListener('click',()=>{
      const panel=el('advancedFilters'),expanded=el('filterToggle').getAttribute('aria-expanded')==='true';
      panel.classList.toggle('is-hidden',expanded);el('filterToggle').setAttribute('aria-expanded',String(!expanded));
    });
  }
  async function loadEvents() {
    const { events } = await apiRequest('/api/events');
    if (!Array.isArray(events)) throw new Error('A resposta da API não contém uma lista de eventos.');
    EVENTS.splice(0, EVENTS.length, ...events);
    eventsLoading = false;
    render();
  }
  async function loadFavorites() {
    const saved = await apiRequest(`/api/favorites/${encodeURIComponent(clientId)}`);
    if (!Array.isArray(saved.eventIds)) throw new Error('A resposta da API não contém uma lista de favoritos.');
    const validServerIds = saved.eventIds.filter(id => Number.isSafeInteger(id) && EVENTS.some(event => event.id === id));
    const legacy = safeRead(STORAGE_KEYS.favorites, []);
    if (!validServerIds.length && Array.isArray(legacy)) {
      const legacyIds = [...new Set(legacy.filter(id => Number.isSafeInteger(id) && EVENTS.some(event => event.id === id)))];
      for (const eventId of legacyIds) {
        await apiRequest('/api/favorites', { method: 'POST', body: JSON.stringify({ clientId, eventId }) });
      }
      validServerIds.push(...legacyIds);
    }
    favorites = new Set(validServerIds);
    if (storageAvailable) localStorage.removeItem(STORAGE_KEYS.favorites);
    render();
  }
  async function init() {
    syncProfile();
    wireEvents();
    clientId = getClientId();
    restoreViewFromUrl();
    try {
      await loadEvents();
    } catch (error) {
      eventsLoading = false;
      render();
      console.error('Não foi possível carregar os eventos do GoOut.', error);
      el('resultCount').textContent = 'Falha ao carregar os eventos. Verifique a conexão com a API.';
      el('homePreviewStatus').textContent = 'Não foi possível carregar eventos. Confira se a API está disponível.';
      el('emptyState').hidden = false;
      el('emptyState').querySelector('h3').textContent = 'Não foi possível conectar à API';
      el('emptyState').querySelector('p').textContent = error.message;
      notify(`Falha ao carregar o GoOut: ${error.message}`);
      return;
    }
    try {
      await loadFavorites();
    } catch (error) {
      console.error('Os eventos carregaram, mas não foi possível sincronizar os favoritos.', error);
      notify('Eventos carregados. Seus favoritos estão temporariamente indisponíveis.');
    }
    if (!storageAvailable) notify('O armazenamento local está bloqueado; favoritos não serão lembrados após fechar esta página.');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
