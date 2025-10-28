// Gravador de trilhas estilo Strava (cliente)
(function () {
  console.log('[recorder] init start');
  if (typeof L === 'undefined') { console.warn('[recorder] Leaflet L indefinido'); return; }
  if (typeof map === 'undefined') { console.warn('[recorder] mapa global "map" não encontrado'); return; }
  if (!navigator.geolocation) { console.warn('[recorder] geolocation não disponível no navegador'); return; }
  console.log('[recorder] ambiente OK (Leaflet/map/geolocation prontos)');

  var rec = {
    state: 'idle', // idle | recording | paused | stopped
    watchId: null,
    points: [], // {lat, lon, time, ele?, acc?}
    distance: 0, // metros
    startTime: null,
    pauseStart: null,
    pausedTimeMs: 0,
    poly: null,
    startMarker: null,
    currentMarker: null,
    follow: true,
    accuracyThreshold: 50, // metros
    minDistance: 5, // metros (filtro para ruído)
    lastPos: null,
    simulating: false,
    _simTimer: null,
    _baseTitle: document.title
  };

  // Estilos para indicador visual
  try {
    var css = document.createElement('style');
    css.textContent = `
      .rec-indicator { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2200; background: rgba(0,0,0,0.75); color: #fff; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
      .rec-dot { width: 10px; height: 10px; border-radius: 50%; background: #f44336; opacity: 0.9; }
      .rec-live .rec-dot { animation: rec-blink 1s infinite; }
      @keyframes rec-blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
    `;
    document.head.appendChild(css);
  } catch (e) {}

  var indicator = document.createElement('div');
  indicator.className = 'rec-indicator';
  indicator.innerHTML = '<span class="rec-dot"></span><span id="recIndicatorText">Pronto</span>';
  document.body.appendChild(indicator);

  function themedIcon(size) {
    var darkOn = false;
    try { darkOn = (typeof darkLayer !== 'undefined') && map.hasLayer(darkLayer); } catch (e) {}
    var url = darkOn ? 'img/iconescuro.png' : 'img/iconclaro.png';
    var s = size || 28;
    return L.icon({ iconUrl: url, iconSize: [s, s], iconAnchor: [s/2, s], popupAnchor: [0, -s+2] });
  }

  function currentIcon() {
    // Ícone para posição atual durante gravação
    try { return L.icon({ iconUrl: 'img/aventureiro.png', iconSize: [32, 32], iconAnchor: [16, 32] }); } catch (e) {}
    return themedIcon(32);
  }

  function fmtTime(ms) {
    var sec = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return (h > 0 ? (String(h).padStart(2, '0') + ':') : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtKm(m) { return (m / 1000).toFixed(2); }
  function fmtKmh(mps) { return (mps * 3.6).toFixed(1); }

  function elapsedMs() {
    if (!rec.startTime) return 0;
    var now = Date.now();
    if (rec.state === 'paused') return (rec.pauseStart - rec.startTime) - rec.pausedTimeMs;
    if (rec.state === 'stopped') return (rec._stopTime - rec.startTime) - rec.pausedTimeMs;
    return (now - rec.startTime) - rec.pausedTimeMs;
  }

  // HUD de status
  var hud = document.createElement('div');
  hud.id = 'recStatus';
  hud.style.position = 'fixed';
  hud.style.left = '12px';
  hud.style.bottom = '12px';
  hud.style.zIndex = 2000;
  hud.style.background = 'rgba(0,0,0,0.65)';
  hud.style.color = 'white';
  hud.style.padding = '8px 10px';
  hud.style.borderRadius = '8px';
  hud.style.fontSize = '13px';
  hud.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
  hud.innerHTML = 'Pronto para gravar';
  document.body.appendChild(hud);
  console.log('[recorder] HUD anexado ao DOM');

  function updateIndicator() {
    var txt = document.getElementById('recIndicatorText');
    indicator.classList.remove('rec-live');
    if (rec.state === 'recording') {
      indicator.classList.add('rec-live');
      if (txt) txt.textContent = 'GRAVANDO';
      document.title = '• Gravando – ' + rec._baseTitle;
    } else if (rec.state === 'paused') {
      if (txt) txt.textContent = 'PAUSADO';
      document.title = 'Pausado – ' + rec._baseTitle;
    } else if (rec.state === 'stopped') {
      if (txt) txt.textContent = 'FINALIZADO';
      document.title = rec._baseTitle;
    } else {
      if (txt) txt.textContent = 'Pronto';
      document.title = rec._baseTitle;
    }
  }

  function updateHud() {
    var dist = rec.distance;
    var time = elapsedMs();
    var speed = (time > 0) ? (dist / (time / 1000)) : 0; // m/s
    var st = rec.state;
    hud.innerHTML = 'Estado: ' + st
      + ' | Distância: ' + fmtKm(dist) + ' km'
      + ' | Tempo: ' + fmtTime(time)
      + ' | Vel: ' + fmtKmh(speed) + ' km/h';
    updateIndicator();
  }

  function ensureLayers() {
    if (!rec.poly) {
      rec.poly = L.polyline([], { color: '#ff9800', weight: 5, opacity: 0.95 }).addTo(map);
    }
  }

  function onPosition(pos) {
    var c = pos.coords;
    var lat = c.latitude, lon = c.longitude;
    var acc = c.accuracy;
    var ele = (typeof c.altitude === 'number') ? c.altitude : null;
    var t = new Date(pos.timestamp || Date.now());

    if (acc != null && acc > rec.accuracyThreshold) {
      // Muito impreciso — ignora
      return;
    }

    var point = { lat: lat, lon: lon, time: t, ele: ele, acc: acc };
    var ll = L.latLng(lat, lon);

    if (rec.points.length > 0) {
      var prev = rec.points[rec.points.length - 1];
      var d = map.distance([prev.lat, prev.lon], ll);
      if (d < rec.minDistance) {
        // ruído — atualiza marcador atual e follow, mas não acumula
        if (rec.currentMarker) rec.currentMarker.setLatLng(ll);
        if (rec.follow) try { map.setView(ll); } catch (e) {}
        return;
      }
      rec.distance += d;
    } else {
      // primeiro ponto: cria marcador de início
      if (rec.startMarker) { try { map.removeLayer(rec.startMarker); } catch (e) {} }
      rec.startMarker = L.marker(ll, { icon: themedIcon(28) }).addTo(map).bindTooltip('Início');
    }

    rec.points.push(point);
    ensureLayers();
    rec.poly.addLatLng(ll);

    if (!rec.currentMarker) {
      rec.currentMarker = L.marker(ll, { icon: currentIcon() }).addTo(map);
    } else {
      rec.currentMarker.setLatLng(ll);
    }

    if (rec.follow) {
      try { map.setView(ll); } catch (e) {}
    }

    updateHud();
  }

  function onError(err) {
    console.warn('[recorder] geolocation error', err);
  }

  function startRecording() {
    if (rec.state === 'recording') return;
    console.log('[recorder] startRecording acionado');
    // Se estiver simulando, cancela
    stopSimulation();
    // reset parcial somente se estava finalizado
    if (rec.state === 'stopped') resetRecording();
    rec.state = 'recording';
    rec.points = [];
    rec.distance = 0;
    rec.startTime = Date.now();
    rec.pausedTimeMs = 0;
    rec.pauseStart = null;
    if (rec.poly) { try { rec.poly.setLatLngs([]); } catch (e) {} }
    if (rec.currentMarker) { try { map.removeLayer(rec.currentMarker); } catch (e) {} rec.currentMarker = null; }
    if (rec.startMarker) { try { map.removeLayer(rec.startMarker); } catch (e) {} rec.startMarker = null; }
    
    var opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
    try {
      if (rec.watchId != null) navigator.geolocation.clearWatch(rec.watchId);
      rec.watchId = navigator.geolocation.watchPosition(function (pos) {
        if (rec.state !== 'recording') return; // ignora se pausado
        try {
          var c = pos && pos.coords ? pos.coords : null;
          if (c) console.log('[recorder] pos', { lat: c.latitude, lon: c.longitude, acc: c.accuracy });
        } catch (e) {}
        onPosition(pos);
      }, onError, opts);
      console.log('[recorder] watchPosition registrado, id =', rec.watchId);
    } catch (e) { console.warn('[recorder] watchPosition falhou', e); }

    updateHud();
    updateButtons();
  }

  function pauseRecording() {
    if (rec.state !== 'recording') return;
    console.log('[recorder] pauseRecording acionado');
    rec.state = 'paused';
    rec.pauseStart = Date.now();
    updateHud();
    updateButtons();
  }

  function resumeRecording() {
    if (rec.state !== 'paused') return;
    console.log('[recorder] resumeRecording acionado');
    var now = Date.now();
    if (rec.pauseStart) rec.pausedTimeMs += (now - rec.pauseStart);
    rec.pauseStart = null;
    rec.state = 'recording';
    updateHud();
    updateButtons();
  }

  function stopRecording() {
    if (rec.state !== 'recording' && rec.state !== 'paused') return;
    console.log('[recorder] stopRecording acionado');
    stopSimulation();
    rec.state = 'stopped';
    rec._stopTime = Date.now();
    try { if (rec.watchId != null) navigator.geolocation.clearWatch(rec.watchId); } catch (e) {}
    rec.watchId = null;
    // marcador de fim
    if (rec.points.length) {
      var last = rec.points[rec.points.length - 1];
      var ll = [last.lat, last.lon];
      L.circleMarker(ll, { radius: 5, color: '#b71c1c', weight: 2, fillColor: '#ef5350', fillOpacity: 0.9 }).addTo(map).bindTooltip('Fim');
      try { map.fitBounds(rec.poly.getBounds().pad(0.15)); } catch (e) {}
    }
    updateHud();
    updateButtons();
  }

  function resetRecording() {
    console.log('[recorder] resetRecording acionado');
    stopSimulation();
    try { if (rec.watchId != null) navigator.geolocation.clearWatch(rec.watchId); } catch (e) {}
    rec.watchId = null;
    rec.state = 'idle';
    rec.points = [];
    rec.distance = 0;
    rec.startTime = null;
    rec.pauseStart = null;
    rec.pausedTimeMs = 0;
    if (rec.poly) try { map.removeLayer(rec.poly); } catch (e) {}
    if (rec.currentMarker) try { map.removeLayer(rec.currentMarker); } catch (e) {}
    if (rec.startMarker) try { map.removeLayer(rec.startMarker); } catch (e) {}
    rec.poly = rec.currentMarker = rec.startMarker = null;
    updateHud();
    updateButtons();
  }

  function buildGpx() {
    if (!rec.points.length) return '';
    var metaName = 'Gravacao Mapa Trilhas';
    var t0 = new Date(rec.startTime || Date.now());
    function iso(d) { return new Date(d).toISOString(); }
    var parts = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push('<gpx version="1.1" creator="Mapa-Trilhas" xmlns="http://www.topografix.com/GPX/1/1">');
    parts.push('  <metadata>');
    parts.push('    <name>' + metaName + '</name>');
    parts.push('    <time>' + iso(t0) + '</time>');
    parts.push('  </metadata>');
    parts.push('  <trk>');
    parts.push('    <name>' + metaName + '</name>');
    parts.push('    <trkseg>');
    rec.points.forEach(function (p) {
      var line = '      <trkpt lat="' + p.lat + '" lon="' + p.lon + '">';
      if (typeof p.ele === 'number') line += '<ele>' + p.ele + '</ele>';
      line += '<time>' + iso(p.time || Date.now()) + '</time>';
      line += '</trkpt>';
      parts.push(line);
    });
    parts.push('    </trkseg>');
    parts.push('  </trk>');
    parts.push('</gpx>');
    return parts.join('\n');
  }

  function saveGpx() {
    console.log('[recorder] saveGpx acionado');
    var gpx = buildGpx();
    if (!gpx) { alert('Nada para salvar ainda.'); return; }
    var blob = new Blob([gpx], { type: 'application/gpx+xml' });
    var a = document.createElement('a');
    var ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    a.download = 'trilha-' + ts + '.gpx';
    a.href = URL.createObjectURL(blob);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 0);
  }

  // Controle UI
  var ctrl = L.control({ position: 'topleft' });
  ctrl.onAdd = function () {
    console.log('[recorder] construindo controle UI');
    var div = L.DomUtil.create('div', 'mapa-control');
    div.style.marginTop = '8px';
    if (L && L.DomEvent) {
      try { L.DomEvent.disableClickPropagation(div); } catch (e) {}
      try { L.DomEvent.disableScrollPropagation(div); } catch (e) {}
    }
    div.innerHTML = `
      <div style="display:flex; gap:6px; align-items:center;">
        <button id="recStart"  style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#4caf50; color:#fff; cursor:pointer;">Gravar</button>
        <button id="recPause"  style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Pausar</button>
        <button id="recResume" style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Continuar</button>
        <button id="recStop"   style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#f44336; color:#fff; cursor:pointer;">Parar</button>
        <button id="recSave"   style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Salvar GPX</button>
        <button id="recReset"  style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Resetar</button>
        <label style="display:flex; align-items:center; gap:6px; margin-left:8px; font-size:12px;">
          <input id="recFollow" type="checkbox" checked /> Seguir
        </label>
        <button id="recSimulate" style="margin-left:8px; padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Simular Canal</button>
      </div>
    `;

    setTimeout(function () {
      div.querySelector('#recStart').addEventListener('click', startRecording);
      div.querySelector('#recPause').addEventListener('click', pauseRecording);
      div.querySelector('#recResume').addEventListener('click', resumeRecording);
      div.querySelector('#recStop').addEventListener('click', stopRecording);
      div.querySelector('#recSave').addEventListener('click', saveGpx);
      div.querySelector('#recReset').addEventListener('click', resetRecording);
      var chk = div.querySelector('#recFollow');
      chk.addEventListener('change', function (e) { rec.follow = !!e.target.checked; });
      // se o usuário arrastar o mapa manualmente, desliga o seguir
      map.on('dragstart', function () { rec.follow = false; try { chk.checked = false; } catch (e) {} });
      var btnSim = div.querySelector('#recSimulate');
      btnSim.addEventListener('click', function () { simulateCanal(); });
      updateButtons();
      updateHud();
      console.log('[recorder] UI ligada aos eventos');
    }, 0);

    return div;
  };
  ctrl.addTo(map);
  console.log('[recorder] controle UI adicionado ao mapa');

  function updateButtons() {
    var s = rec.state;
    var start = document.getElementById('recStart');
    var pause = document.getElementById('recPause');
    var resume = document.getElementById('recResume');
    var stop = document.getElementById('recStop');
    var save = document.getElementById('recSave');
    var reset = document.getElementById('recReset');
    var sim = document.getElementById('recSimulate');
    if (!start) return;
    if (s === 'idle') {
      start.disabled = false; pause.disabled = true; resume.disabled = true; stop.disabled = true; save.disabled = true; reset.disabled = false;
      if (sim) sim.disabled = false;
    } else if (s === 'recording') {
      start.disabled = true; pause.disabled = false; resume.disabled = true; stop.disabled = false; save.disabled = true; reset.disabled = true;
      if (sim) sim.disabled = true;
    } else if (s === 'paused') {
      start.disabled = true; pause.disabled = true; resume.disabled = false; stop.disabled = false; save.disabled = (rec.points.length === 0); reset.disabled = false;
      if (sim) sim.disabled = true;
    } else if (s === 'stopped') {
      start.disabled = true; pause.disabled = true; resume.disabled = true; stop.disabled = true; save.disabled = (rec.points.length === 0); reset.disabled = false;
      if (sim) sim.disabled = false;
    }
  }

  function stopSimulation() {
    if (rec._simTimer) { try { clearInterval(rec._simTimer); } catch (e) {} rec._simTimer = null; }
    rec.simulating = false;
  }

  function simulateFromCoords(coords, opts) {
    if (!coords || !coords.length) { alert('Sem coordenadas para simular.'); return; }
    stopSimulation();
    resetRecording();
    rec.state = 'recording';
    rec.startTime = Date.now();
    rec.pausedTimeMs = 0;
    rec.follow = true;
    updateButtons(); updateHud();
    var i = 0;
    rec.simulating = true;
    rec._simTimer = setInterval(function () {
      if (!rec.simulating) { clearInterval(rec._simTimer); rec._simTimer = null; return; }
      if (i >= coords.length) {
        clearInterval(rec._simTimer); rec._simTimer = null; rec.simulating = false; stopRecording(); return; }
      var ll = coords[i++];
      var pos = { coords: { latitude: ll[0], longitude: ll[1], accuracy: 5 }, timestamp: Date.now() };
      onPosition(pos);
    }, (opts && opts.intervalMs) || 800);
  }

  function simulateFromGpxUrl(url) {
    if (!window.GpxLoader || typeof window.GpxLoader.loadFromUrl !== 'function') {
      alert('Simulação indisponível: GpxLoader não encontrado.'); return;
    }
    console.log('[recorder] iniciando simulação a partir de', url);
    window.GpxLoader.loadFromUrl(url, { label: 'Simulação' }).then(function (group) {
      // tenta extrair a polyline do grupo
      var coords = [];
      try {
        var polys = [];
        group.eachLayer(function (ly) {
          if (ly && typeof ly.getLatLngs === 'function') {
            polys.push(ly);
          }
        });
        if (polys.length) {
          var latlngs = polys[0].getLatLngs();
          // normaliza array possivelmente aninhado
          if (Array.isArray(latlngs) && latlngs.length && Array.isArray(latlngs[0])) {
            latlngs = latlngs[0];
          }
          coords = latlngs.map(function (ll) { return [ll.lat, ll.lng]; });
        }
        // remove o desenho original carregado para não duplicar
        try { map.removeLayer(group); } catch (e) {}
      } catch (e) { console.warn('Falha ao extrair coords para simulação', e); }
      if (!coords.length) { alert('Não consegui extrair coordenadas do GPX.'); return; }
      simulateFromCoords(coords, { intervalMs: 700 });
    }).catch(function (e) {
      console.error('Falha ao carregar GPX para simulação', e);
      alert('Falha ao carregar GPX para simulação.');
    });
  }

  function simulateCanal() {
    // tenta usar o caminho padrão do projeto
    var url = '/mapa-trilhas/gpx/canal_dos_ingleses.gpx';
    // se estiver em subcaminho, tente relativo também
    simulateFromGpxUrl(url);
  }

  // integração com tema (quando o usuário troca camada)
  window.GpxRecorder = {
    updateIconsForTheme: function () {
      try { if (rec.startMarker) rec.startMarker.setIcon(themedIcon(28)); } catch (e) {}
      try { if (rec.currentMarker) rec.currentMarker.setIcon(currentIcon()); } catch (e) {}
    },
    getState: function () { return rec.state; },
    simulateCanal: simulateCanal
  };
})();
