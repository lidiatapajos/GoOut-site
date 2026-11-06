/* GoOut — interface demonstrativa, 100% JavaScript puro.
   Os dados de eventos em events.js são fictícios. */
(() => {
  'use strict';
  const EVENTS = window.GOOUT_EVENTS || [];
  const CATEGORIES = window.GOOUT_CATEGORIES || [];
  const STORAGE_KEYS = { favorites: 'goout:favorites:v1', profile: 'goout:profile:v1' };
  const el = (id) => document.getElementById(id);
  const defaultState = { search: '', category: 'todos', budget: 100, distance: 25, company: 'todos', day: 'todos', sort: 'relevancia', view: 'discover' };
  const state = {...defaultState};
  const formatMoney = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  let toastTimeout;

  function safeRead(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value === null ? fallback : value; }
    catch { return fallback; }
  }
  let favorites = new Set((safeRead(STORAGE_KEYS.favorites, []) || []).filter(id => Number.isInteger(id) && EVENTS.some(e => e.id === id)));
  let profile = {...{name:'',company:'todos'}, ...safeRead(STORAGE_KEYS.profile,{})};

  function persistFavorites() {
    try { localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify([...favorites])); } catch {/* modo privado */}
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
        <img class="event-photo" src="${e.image}" alt="Imagem ilustrativa do evento ${safeText(e.title)}" loading="lazy" onerror="this.style.display='none'">
        <div class="event-photo-overlay"></div>
        <div class="event-date"><strong>${date.getDate().toString().padStart(2,'0')}</strong><span>${months[date.getMonth()]}</span></div>
        <button class="favorite-button ${isFav?'is-favorite':''}" type="button" data-favorite="${e.id}" aria-label="${isFav?'Remover dos':'Adicionar aos'} favoritos: ${safeText(e.title)}" aria-pressed="${isFav}">${isFav?'♥':'♡'}</button>
        <div class="event-art-title">${safeText(e.title)}</div>
      </div>
      <div class="event-card-body"><div class="event-tags"><span class="tag ${e.accent==='green'?'green':e.accent==='blue'?'blue':''}">${safeText(catInfo(e.category).label)}</span>${e.price===0?'<span class="tag green">Grátis!</span>':''}</div>
        <p class="event-description">${safeText(e.subtitle)}. ${safeText(e.description)}</p>
        <div class="event-facts"><span>◷ ${safeText(shortTime(e))}</span><span>⌖ ${safeText(e.neighborhood)}</span><span>↗ ${e.distance.toLocaleString('pt-BR')} km*</span></div>
        <div class="event-footer"><div class="event-price ${e.price===0?'is-free':''}"><small>A PARTIR DE</small>${e.price===0?'GRÁTIS':formatMoney(e.price)}</div><button class="event-open" data-open="${e.id}" type="button" aria-label="Ver detalhes de ${safeText(e.title)}">↗</button></div>
      </div></article>`;
  }
  function updateFavoriteCount(){el('favoriteCount').textContent=favorites.size;}
  function setMobileNav() {
    document.querySelectorAll('[data-mobile-nav]').forEach(node => node.classList.toggle('selected',node.dataset.mobileNav===state.view));
    el('mobileFavorites').classList.toggle('selected',state.view==='favorites');
    el('navFavorites').classList.toggle('active',state.view==='favorites');
    document.querySelector('[data-nav="discover"]').classList.toggle('active',state.view==='discover');
  }
  function render() {
    renderChips();
    updateFavoriteCount();
    setMobileNav();
    el('budgetValue').textContent = state.budget===100?'Até R$ 100':state.budget===0?'Só grátis':`Até R$ ${state.budget}`;
    el('distanceValue').textContent = `Até ${state.distance} km`;
    const results = matching();
    const list = el('eventsGrid');
    const empty = el('emptyState');
    list.innerHTML = results.map(cardHTML).join('');
    empty.hidden = results.length !== 0;
    el('viewOverline').textContent = state.view === 'favorites' ? 'SEUS ROLÊS GUARDADOS' : 'SUA PRÓXIMA DESCOBERTA';
    el('resultsTitle').innerHTML = state.view === 'favorites' ? 'MEUS <em>FAVORITOS</em> <span aria-hidden="true">♥</span>' : 'ROLÊS QUE <em>COMBINAM</em> COM VOCÊ <span aria-hidden="true">↘</span>';
    el('resultCount').textContent = `${results.length} rolê${results.length===1?'':'s'} encontrado${results.length===1?'':'s'} · catálogo demonstrativo`;
    if (state.view==='favorites' && results.length===0) {
      empty.querySelector('h3').textContent = 'Ainda não tem favoritos por aqui!';
      empty.querySelector('p').textContent = 'Toque no coração de um evento para guardar suas ideias de rolê.';
    } else {
      empty.querySelector('h3').textContent = 'Esse rolê ainda não apareceu!';
      empty.querySelector('p').textContent = 'Tenta mudar os filtros. Tem muita coisa legal esperando por você.';
    }
  }
  function toggleFavorite(id) {
    if(!EVENTS.some(e=>e.id===id)) return;
    const wasFav = favorites.has(id);
    if(wasFav) favorites.delete(id); else favorites.add(id);
    persistFavorites();render();
    notify(wasFav?'Removido dos seus salvos ♡':'Rolê salvo! ♥');
    const currentEventId = Number(el('eventDialog').dataset.eventId);
    if(el('eventDialog').open && currentEventId===id) renderDetail(EVENTS.find(e=>e.id===id));
  }
  function renderDetail(e) {
    el('eventDialog').dataset.eventId=e.id;
    el('eventDialogContent').innerHTML=`<div class="detail-art" style="--art-start:${e.colors[0]};--art-end:${e.colors[1]}"><img src="${e.image}" alt="Imagem ilustrativa de ${safeText(e.title)}" onerror="this.style.display='none'"><h2 id="eventDialogTitle">${safeText(e.title)}</h2></div>
      <div class="detail-body"><div class="event-tags"><span class="tag">${safeText(catInfo(e.category).label)}</span><span class="tag green">EVENTO FICTÍCIO</span></div><p>${safeText(e.description)}</p>
      <div class="detail-facts"><div><small>QUANDO</small><strong>${safeText(longDate(e))}</strong></div><div><small>ONDE</small><strong>${safeText(e.location)} — ${safeText(e.neighborhood)}</strong></div><div><small>VALOR ILUSTRATIVO</small><strong>${e.price===0?'Grátis':formatMoney(e.price)}</strong></div><div><small>DISTÂNCIA ILUSTRATIVA</small><strong>${e.distance.toLocaleString('pt-BR')} km</strong></div><div><small>IDADE MÍNIMA</small><strong>${e.age===0?'Livre':`${e.age} anos`}</strong></div><div><small>COM QUEM?</small><strong>${e.company.map(companyLabel).join(' • ')}</strong></div></div>
      <p><strong>Atenção:</strong> isto é apenas um protótipo acadêmico. Não é possível comprar ingresso ou confirmar a realização deste evento.</p>
      <div class="detail-actions"><button class="btn-main btn-blue" data-favorite="${e.id}" type="button">${favorites.has(e.id)?'♥ Tirar dos salvos':'♡ Salvar rolê'}</button><button class="btn-main btn-yellow" data-share="${e.id}" type="button">Compartilhar ↗</button></div></div>`;
  }
  function openDetail(id) {
    const e = EVENTS.find(item => item.id===id);
    if(!e) return;
    renderDetail(e);
    el('eventDialog').showModal();
  }
  function switchView(view) {
    state.view=view;
    if(view==='favorites') {
      // Ao abrir salvos, mostramos todos os favoritos mesmo se os filtros anteriores eram restritivos.
      clearFilterValues(false);
    }
    render();
    el('descobrir').scrollIntoView({behavior:'smooth'});
  }
  function clearFilterValues(reRender=true) {
    Object.assign(state,{search:'',category:'todos',budget:100,distance:25,company:'todos',day:'todos',sort:'relevancia'});
    el('searchInput').value='';el('budgetRange').value='100';el('distanceRange').value='25';el('companySelect').value='todos';el('dateSelect').value='todos';el('sortSelect').value='relevancia';
    if(reRender) render();
  }
  function resetAll() { state.view='discover';clearFilterValues(); }
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
    const text=`Olha essa ideia de rolê fictício no GoOut: ${event.title} — ${event.location}. Catálogo de demonstração.`;
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
    el('eventsGrid').addEventListener('click',e=>{
      const fav=e.target.closest('[data-favorite]');if(fav){toggleFavorite(+fav.dataset.favorite);return;}
      const open=e.target.closest('[data-open]');if(open)openDetail(+open.dataset.open);
    });
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
      try{localStorage.setItem(STORAGE_KEYS.profile,JSON.stringify(profile));}catch{/* modo privado */}
      state.company=profile.company;el('companySelect').value=profile.company;
      state.view='discover';syncProfile();render();el('profileDialog').close();notify('Sua vibe está salva neste navegador ✳');
    });
    document.querySelectorAll('[data-view="favorites"]').forEach(b=>b.addEventListener('click',()=>switchView('favorites')));
    document.querySelectorAll('[data-mobile-nav="discover"]').forEach(a=>a.addEventListener('click',()=>{state.view='discover';render();}));
    el('clearFilters').addEventListener('click',resetAll);el('emptyReset').addEventListener('click',resetAll);
    el('surpriseHero').addEventListener('click',surprise);el('surpriseBottom').addEventListener('click',surprise);
    el('filterToggle').addEventListener('click',()=>{
      const panel=el('advancedFilters'),expanded=el('filterToggle').getAttribute('aria-expanded')==='true';
      panel.classList.toggle('is-hidden',expanded);el('filterToggle').setAttribute('aria-expanded',String(!expanded));
    });
  }
  function init() { if (!EVENTS.length) {el('resultCount').textContent='Não foi possível carregar os eventos.';return;} syncProfile();wireEvents();render(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
