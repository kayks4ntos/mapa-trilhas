// UI do site: navegação, busca e resultados integrados com o mapa
(function(){
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // Toggle do menu mobile
  var nav = qs('#siteNav');
  var toggle = qs('#navToggle');
  if (toggle && nav) {
    toggle.addEventListener('click', function(){ nav.classList.toggle('open'); });
    qsa('.nav-link').forEach(function(a){ a.addEventListener('click', function(){ nav.classList.remove('open'); }); });
  }

  // Painel de resultados
  var panel = qs('#resultsPanel');
  var panelClose = qs('#panelClose');
  if (panelClose && panel) panelClose.addEventListener('click', function(){ panel.classList.remove('open'); });

  var input = qs('#trailSearch');
  var btn = qs('#searchBtn');
  var list = qs('#trailResults');

  function renderResults(items) {
    if (!list) return;
    list.innerHTML = '';
    if (!items || !items.length) {
      list.innerHTML = '<li>Nenhum resultado</li>';
      return;
    }
    items.forEach(function(t){
      var li = document.createElement('li');
      li.innerHTML = '<div class="result-title">' + (t.nome || t.name || 'Trilha') + '</div>' +
                     '<div class="result-desc">' + (t.descricao || t.desc || '') + '</div>';
      li.addEventListener('click', function(){
        try {
          if (window.GpxLoader && typeof window.GpxLoader.focusTrail === 'function') {
            var id = t.id != null ? t.id : (t.nome || t.name);
            window.GpxLoader.focusTrail(id, { loadGpx: true });
            panel.classList.remove('open');
            var section = document.getElementById('mapSection');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (e) {}
      });
      list.appendChild(li);
    });
  }

  function filterTrails(query) {
    var data = window.TrailsData || [];
    if (!query) return data.slice(0, 20);
    var q = String(query).toLowerCase();
    return data.filter(function(t){
      return (t.nome && t.nome.toLowerCase().includes(q)) ||
             (t.name && t.name.toLowerCase().includes(q)) ||
             (t.descricao && t.descricao.toLowerCase().includes(q)) ||
             (t.desc && t.desc.toLowerCase().includes(q));
    }).slice(0, 50);
  }

  function doSearch() {
    var term = input ? input.value : '';
    var items = filterTrails(term);
    renderResults(items);
    if (panel) panel.classList.add('open');
  }

  if (btn) btn.addEventListener('click', doSearch);
  if (input) input.addEventListener('keydown', function(e){ if (e.key === 'Enter') doSearch(); });

  // popula lista automaticamente quando as trilhas carregarem
  window.addEventListener('trails:loaded', function(){
    try { renderResults((window.TrailsData || []).slice(0, 20)); } catch (e) {}
  });
})();

