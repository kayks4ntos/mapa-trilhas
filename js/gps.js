// Importador de arquivos GPX: cria marcadores (wpt) e rotas (trk)
(function () {
  if (typeof L === 'undefined' || typeof map === 'undefined') {
    console.warn('[gps.js] Leaflet ou map não encontrado. Certifique-se de carregar js/map.js antes.');
    return;
  }

  var gpxLayerGroup = L.featureGroup().addTo(map);
  var gpxMarkerGroup = L.featureGroup().addTo(map); // marcadores de trilhas pré-definidas

  function textOf(node, selector) {
    var el = node && node.querySelector ? node.querySelector(selector) : null;
    return el && el.textContent ? el.textContent.trim() : '';
  }

  function attrNum(node, name) {
    var v = node && node.getAttribute ? node.getAttribute(name) : null;
    var n = v != null ? Number(v) : NaN;
    return isNaN(n) ? null : n;
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function (e) { reject(e); };
      reader.readAsText(file);
    });
  }

  function makeThemeIcon() {
    var darkOn = false;
    try { darkOn = (typeof darkLayer !== 'undefined') && map.hasLayer(darkLayer); } catch (e) {}
    var url = darkOn ? 'img/iconescuro.png' : 'img/iconclaro.png';
    return L.icon({ iconUrl: url, iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] });
  }

  var defaultTrackStyle = {
    color: '#ff5722',
    weight: 4,
    opacity: 0.9
  };

  function parseGpx(xmlString) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(xmlString, 'application/xml');
    var parserError = xml.querySelector('parsererror');
    if (parserError) throw new Error('XML inválido: ' + parserError.textContent);

    var result = {
      metadata: { name: textOf(xml, 'metadata > name') || textOf(xml, 'trk > name') || '' },
      waypoints: [],
      tracks: []
    };

    var wpts = xml.getElementsByTagName('wpt');
    for (var i = 0; i < wpts.length; i++) {
      var w = wpts[i];
      var lat = attrNum(w, 'lat');
      var lon = attrNum(w, 'lon');
      if (lat == null || lon == null) continue;
      result.waypoints.push({
        lat: lat,
        lon: lon,
        ele: textOf(w, 'ele'),
        time: textOf(w, 'time'),
        name: textOf(w, 'name') || 'Waypoint',
        desc: textOf(w, 'desc') || textOf(w, 'cmt') || ''
      });
    }

    var trks = xml.getElementsByTagName('trk');
    for (var t = 0; t < trks.length; t++) {
      var trk = trks[t];
      var trkName = textOf(trk, 'name') || result.metadata.name || 'Rota';
      var segs = trk.getElementsByTagName('trkseg');
      for (var s = 0; s < segs.length; s++) {
        var seg = segs[s];
        var pts = seg.getElementsByTagName('trkpt');
        var coords = [];
        for (var p = 0; p < pts.length; p++) {
          var pt = pts[p];
          var plat = attrNum(pt, 'lat');
          var plon = attrNum(pt, 'lon');
          if (plat == null || plon == null) continue;
          coords.push([plat, plon]);
        }
        if (coords.length) result.tracks.push({ name: trkName, coords: coords });
      }
    }

    return result;
  }

  function addGpxToMap(parsed, fileLabel) {
    var group = L.featureGroup();

    parsed.waypoints.forEach(function (w) {
      var marker = L.marker([w.lat, w.lon], { icon: makeThemeIcon() });
      var title = w.name || 'Waypoint';
      var html = '<div style="min-width:180px">'
        + '<strong>' + title + '</strong>'
        + (w.desc ? '<br>' + w.desc : '')
        + (w.ele ? '<br>Elevação: ' + w.ele : '')
        + (w.time ? '<br>Tempo: ' + w.time : '')
        + '</div>';
      marker.bindPopup(html);
      marker.addTo(group);
    });

    parsed.tracks.forEach(function (trk) {
      var poly = L.polyline(trk.coords, defaultTrackStyle);
      var name = trk.name || (parsed.metadata.name || 'Rota');
      poly.bindPopup('<strong>' + name + '</strong>' + (fileLabel ? '<br><small>' + fileLabel + '</small>' : ''));
      poly.addTo(group);
      var start = trk.coords[0];
      var end = trk.coords[trk.coords.length - 1];
      if (start) L.circleMarker(start, { radius: 5, color: '#2e7d32', weight: 2, fillColor: '#66bb6a', fillOpacity: 0.9 }).addTo(group).bindTooltip('Início');
      if (end) L.circleMarker(end, { radius: 5, color: '#b71c1c', weight: 2, fillColor: '#ef5350', fillOpacity: 0.9 }).addTo(group).bindTooltip('Fim');
    });

    group.addTo(gpxLayerGroup);
    try {
      var b = group.getBounds();
      if (b && b.isValid()) map.fitBounds(b.pad(0.15));
    } catch (e) {}

    return group;
  }

  function loadGpxFromUrl(url, options) {
    options = options || {};
    var label = options.label || url.split('/').pop();
    var fetcher = (typeof fetch === 'function')
      ? fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      : new Promise(function (resolve, reject) {
          try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function () {
              if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
                else reject(new Error('HTTP ' + xhr.status));
              }
            };
            xhr.send();
          } catch (e) { reject(e); }
        });
    return fetcher.then(function (txt) {
      var parsed = parseGpx(txt);
      return addGpxToMap(parsed, label);
    });
  }

  function addMarkersForTrails(trails) {
    if (!Array.isArray(trails)) return;
    gpxMarkerGroup.clearLayers();
    trails.forEach(function (t) {
      var lat = (typeof t.lat === 'number') ? t.lat : parseFloat(t.lat);
      var lon = (typeof t.lon === 'number') ? t.lon : parseFloat(t.lon);
      if (!isFinite(lat) || !isFinite(lon)) return;
      var marker = L.marker([lat, lon], { icon: makeThemeIcon() });
      // Tenta usar ícone custom, mas só após confirmar que a imagem existe
      if (t.iconUrl) {
        try {
          var testImg = new Image();
          testImg.onload = function () {
            try {
              marker.setIcon(L.icon({ iconUrl: t.iconUrl, iconSize: [28,28], iconAnchor: [14,28], popupAnchor: [0,-26] }));
            } catch (e) {}
          };
          testImg.onerror = function () { /* mantém ícone por tema */ };
          testImg.src = t.iconUrl;
        } catch (e) {}
      }
      var title = t.nome || t.name || 'Trilha';
      var desc = t.descricao || t.desc || '';
      var html = '<div style="min-width:200px">'
        + '<strong>' + title + '</strong>'
        + (desc ? '<br>' + desc : '')
        + '</div>';
      marker.bindPopup(html);
      marker.on('click', function () {
        if (t.gpx_url) {
          var url = String(t.gpx_url);
          // normaliza alguns casos comuns de caminho relativo
          if (url.startsWith('./')) url = url.slice(1); // remove o ponto inicial -> '/mapa-trilhas/...'
          loadGpxFromUrl(url, { label: title }).catch(function (e) {
            console.error('Falha ao carregar GPX da trilha', t, e);
            alert('Não foi possível carregar a trilha GPX: ' + title);
          });
        }
      });
      marker.addTo(gpxMarkerGroup);
    });
    try {
      var b = gpxMarkerGroup.getBounds();
      if (b && b.isValid()) map.fitBounds(b.pad(0.2));
    } catch (e) {}
  }

  function handleFiles(files) {
    if (!files || !files.length) return;
    Array.prototype.forEach.call(files, function (file) {
      readFileAsText(file)
        .then(function (txt) {
          var parsed = parseGpx(txt);
          addGpxToMap(parsed, file.name);
          console.log('[gps.js] GPX importado:', file.name, parsed);
        })
        .catch(function (err) {
          console.error('Falha ao ler GPX', file && file.name, err);
          alert('Falha ao ler o arquivo GPX: ' + (file && file.name ? file.name : '') + '\n' + (err && err.message ? err.message : err));
        });
    });
  }

  function clearGpx() {
    try { gpxLayerGroup.clearLayers(); } catch (e) {}
  }

  var importControl = L.control({ position: 'topright' });
  importControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'mapa-control');
    div.style.marginTop = '8px';
    if (L && L.DomEvent) {
      try { L.DomEvent.disableClickPropagation(div); } catch (e) {}
      try { L.DomEvent.disableScrollPropagation(div); } catch (e) {}
    }

    var inputId = 'gpxFileInput_' + Math.random().toString(36).slice(2);
    div.innerHTML = `
      <div style="display:flex; gap:6px; align-items:center;">
        <button id="gpxImportBtn" style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Importar GPX</button>
        <button id="gpxClearBtn" style="padding:6px 10px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Limpar</button>
      </div>
      <input id="${inputId}" type="file" accept=".gpx,application/gpx+xml" multiple style="display:none" />
    `;

    setTimeout(function () {
      var fileInput = div.querySelector('#' + inputId);
      var importBtn = div.querySelector('#gpxImportBtn');
      var clearBtn = div.querySelector('#gpxClearBtn');
      if (importBtn && fileInput) {
        importBtn.addEventListener('click', function (e) {
          e.preventDefault();
          fileInput.click();
        });
        fileInput.addEventListener('change', function (e) {
          handleFiles(e.target.files);
          e.target.value = '';
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', function () { clearGpx(); });
      }
    }, 0);

    try {
      var mapContainer = map.getContainer();
      ['dragenter','dragover'].forEach(function (evt) {
        mapContainer.addEventListener(evt, function (e) {
          e.preventDefault(); e.stopPropagation();
        });
      });
      mapContainer.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation();
        var dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) { handleFiles(dt.files); }
      });
    } catch (e) {}

    return div;
  };
  importControl.addTo(map);
  // expõe utilidades para outros scripts
  window.GpxLoader = {
    loadFromUrl: loadGpxFromUrl,
    clear: function () { try { gpxLayerGroup.clearLayers(); } catch (e) {} },
    addMarkersForTrails: addMarkersForTrails,
    updateIconsForTheme: function () {
      var icon = makeThemeIcon();
      try {
        // Atualiza marcadores de lista (pré-definidos)
        gpxMarkerGroup.eachLayer(function (ly) {
          if (ly && typeof ly.setIcon === 'function') ly.setIcon(icon);
        });
      } catch (e) {}
      try {
        // Atualiza marcadores dentro de grupos de GPX (waypoints)
        gpxLayerGroup.eachLayer(function (grp) {
          if (grp && typeof grp.eachLayer === 'function') {
            grp.eachLayer(function (ly) {
              if (ly && typeof ly.setIcon === 'function') ly.setIcon(icon);
            });
          } else if (grp && typeof grp.setIcon === 'function') {
            grp.setIcon(icon);
          }
        });
      } catch (e) {}
    },
    _groups: { tracks: gpxLayerGroup, markers: gpxMarkerGroup }
  };
})();
