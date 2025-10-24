  // === MAPA BASE ===
  // Centraliza em São João del Rei
  // DICA: escolha só 1 camada inicial via "layers: [...]" (evita duas camadas base ao mesmo tempo)

// Nota: não use require() no cliente — o Leaflet já é carregado via <script> no HTML

  // 1) Defina as camadas (normal, limpo e escuro) ANTES de criar o mapa
  var normalLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors',
    maxZoom: 19
  });

  var limpoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  });
  // Variável opcional para camadas futuras (garante que referências antigas não causem ReferenceError)
  var darkLayer;
  // 2) Crie o mapa já escolhendo a camada inicial (aqui: normal)
  var map = L.map('map', {
    center: [-21.137, -44.259],
    zoom: 13,
    zoomControl : false,
    layers: [normalLayer]
  });

// Painel de status (debug) para mostrar camada ativa e quantidade de marcadores
var statusDiv = document.createElement('div');
statusDiv.id = 'mapStatus';
statusDiv.style.position = 'fixed';
statusDiv.style.right = '12px';
statusDiv.style.bottom = '12px';
statusDiv.style.zIndex = 2000;
statusDiv.style.background = 'rgba(0,0,0,0.6)';
statusDiv.style.color = 'white';
statusDiv.style.padding = '8px 10px';
statusDiv.style.borderRadius = '8px';
statusDiv.style.fontSize = '13px';
statusDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
statusDiv.innerText = 'Camada: normal — Marcadores: 0';
document.body.appendChild(statusDiv);

 // === CONTROLES PERSONALIZADOS ===

// 1️⃣ Controle de zoom (posição inferior direita)
L.control.zoom({
  position: 'bottomright'
}).addTo(map);

// 2️⃣ Botão de localização do usuário
L.control.locate({
  position: 'bottomright',
  flyTo: true,
  showPopup: true,
  strings: { title: "Localizar minha posição" },
  iconElement: `<img src="img/localbtn.png" style="width:22px; height:22px;">`,
  locateOptions: { enableHighAccuracy: true }
}).addTo(map);

// 3️⃣ Escala de distância (em metros e km)
L.control.scale({
  position: 'bottomright',
  metric: true,
  imperial: false
}).addTo(map);

  // === CONTROLE PARA TROCAR DE ESTILO ===
  // Cria um seletor no canto da tela (HTML dinâmico)
  var controlDiv = L.control({ position: 'topright' });
  controlDiv.onAdd = function () {
    var div = L.DomUtil.create('div', 'mapa-control');
    div.innerHTML = `
      <select id="mapSelect" style="padding:4px; border-radius:6px; font-size:14px;">
        <option value="normal" selected>Allmaps</option>
        <option value="limpo">Clean maps</option>
      </select>
    `;
    return div;
  };
  controlDiv.addTo(map);

  // === ÍCONES PERSONALIZADOS ===
  // Ícone para o mapa normal (exemplo: montanha escura)
  var iconeNormal = L.icon({
    iconUrl: 'img/iconclaro.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Ícone para o mapa limpo (exemplo: verde mais leve)
  var iconeLimpo = L.icon({
    iconUrl: 'img/iconclaro.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

  // Guarda os marcadores ativos para limpar quando trocar de mapa
  var marcadores = [];

 // === CONTROLE DE POPUPS ===
var marcadorFixo = null; // guarda o marcador que está fixo (clicado)

// === FUNÇÃO PARA ADICIONAR MARCADORES COM POPUPS ===
function adicionarMarcador(lat, lon, nome, descricao, linkImg, tipo) {
  var popupContent = `
    <div style="text-align:center;">
      <h3 style="margin:4px 0;">${nome}</h3>
      <img src="${linkImg}" alt="${nome}" width="160" style="border-radius:8px; margin-bottom:6px;">
      <p style="font-size:13px;">${descricao}</p>
    </div>
  `;

  // Define o ícone conforme o tipo do mapa ou um ícone custom (parâmetro opcional)
  // O parâmetro `tipo` pode ser:
  // - a string 'normal' | 'limpo' (mantém comportamento antigo)
  // - uma string com URL (ex: 'img/meu-icone.png' ou 'https://...')
  // - um objeto { iconUrl, iconSize, iconAnchor, popupAnchor }
  var iconeUsado = iconeNormal;
  if (typeof tipo === 'string') {
    if (tipo === 'limpo') {
      iconeUsado = iconeLimpo;
    } else if (tipo.startsWith('http') || tipo.indexOf('/') === 0 || tipo.startsWith('img/')) {
      // tratamos como URL para ícone
      iconeUsado = L.icon({
        iconUrl: tipo,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });
    }
  } else if (typeof tipo === 'object' && tipo !== null) {
    // objeto com configurações do ícone
    iconeUsado = L.icon({
      iconUrl: tipo.iconUrl || 'img/iconclaro.png',
      iconSize: tipo.iconSize || [32, 32],
      iconAnchor: tipo.iconAnchor || [16, 32],
      popupAnchor: tipo.popupAnchor || [0, -32]
    });
  }

  // Cria o marcador
  var marker = L.marker([lat, lon], { icon: iconeUsado })
    .addTo(map)
    .bindPopup(popupContent, { autoClose: false, closeOnClick: false });

  // 🖱️ Passar o mouse → abre popup (se não for o fixo)
  marker.on("mouseover", function () {
    if (marcadorFixo !== this) {
      this.openPopup();
    }
  });

  // 🚫 Tirar o mouse → fecha popup (se não for o fixo)
  marker.on("mouseout", function () {
    if (marcadorFixo !== this) {
      this.closePopup();
    }
  });

  // 👆 Clicar → fixa este e desfaz o anterior
  marker.on("click", function () {
    // Fecha o anterior se houver
    if (marcadorFixo && marcadorFixo !== this) {
      marcadorFixo.closePopup();
    }

    // Define o atual como fixo (ou desfaz se clicar de novo)
    if (marcadorFixo === this) {
      this.closePopup();
      marcadorFixo = null;
    } else {
      marcadorFixo = this;
      this.openPopup();
    }
  });

  marcadores.push(marker);
}


  // === FUNÇÃO PARA RECARREGAR TODOS OS MARCADORES COM O ÍCONE CERTO ===
  function carregarMarcadores(tipo) {
    console.log('[carregarMarcadores] chamado com tipo =', tipo);
    try {
      // Remove os antigos
      marcadores.forEach(m => {
        try { map.removeLayer(m); } catch (e) { console.warn('Erro removendo marcador', e); }
      });
      marcadores = [];
    } catch (err) {
      console.error('Erro em carregarMarcadores ao limpar marcadores:', err);
      marcadores = [];
    }

    // Adiciona marcadores (o bloco abaixo já chama adicionarMarcador repetidas vezes)
    // Ao final atualizamos o painel de status com a contagem atual.

    // Adiciona novamente com ícones do tipo selecionado
      // === TRILHAS DE SÃO JOÃO DEL REI ===
  // Adiciona novamente com ícones do tipo selecionado

  adicionarMarcador(
    -21.1205, -44.2528,
    "Parque Municipal Serra do Lenheiro - Trilha Lenheiro",
    "Trilha fácil de 2,6 km (0.5–1 h). Passa por pinturas rupestres, cachoeiras e rica vegetação. Excelente para caminhada leve no parque ecológico.",
    "https://upload.wikimedia.org/wikipedia/commons/3/3b/Mountain_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1308, -44.2701,
    "Trilha Lenheiro",
    "Trilha moderada de 11,9 km (3–3,5 h) em torno da Serra do Lenheiro, com vales e formações rochosas. Proporciona belas vistas e contato com a natureza.",
    "https://upload.wikimedia.org/wikipedia/commons/e/e0/Waterfall_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1420, -44.2805,
    "São João del Rei - Trilha Lenheiro",
    "Trilha difícil de 15,9 km (5–5,5 h) com subidas íngremes e vistas panorâmicas das serras e vales da região. Ideal para hiking e aventura.",
    "https://upload.wikimedia.org/wikipedia/commons/a/a6/Hiking_trail_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1552, -44.2975,
    "Tejuco - Serra do Lenheiro",
    "Trilha moderada de 9,2 km (3–3,5 h) ligando Tejuco à Serra do Lenheiro, passando por áreas naturais preservadas e paisagens montanhosas.",
    "https://upload.wikimedia.org/wikipedia/commons/d/d3/Mountain_trail_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1609, -44.3123,
    "Torre do Tejuco",
    "Trilha moderada de 4,8 km (1,5–2 h) com trajeto tranquilo até a torre, oferecendo vista panorâmica da região de São João del Rei.",
    "https://upload.wikimedia.org/wikipedia/commons/f/f6/Viewpoint_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.0954, -44.2308,
    "Balneário Águas Santas - Coronel Xavier Chaves - Mirante Bela Vista",
    "Trilha moderada e longa (17,9 km / 5–5,5 h) que liga o Balneário Águas Santas ao Mirante Bela Vista, com belas paisagens e natureza abundante.",
    "https://upload.wikimedia.org/wikipedia/commons/c/c5/Nature_trail_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1242, -44.2450,
    "Cachoeira Serra do Lenheiro",
    "Trilha curta de 1,9 km (0.5–1 h) até a cachoeira da Serra do Lenheiro. Caminho fácil, ideal para banho e contemplação, com pedras escorregadias.",
    "https://upload.wikimedia.org/wikipedia/commons/8/8c/Waterfall_pool_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1098, -44.2552,
    "Senhor dos Montes - Cunha - Povoado do Fé",
    "Trilha moderada de 12,4 km (3,5–4 h) em circuito, passando pelo Parque Serra do Lenheiro e Povoado do Fé. Pode ser feita a pé ou de bicicleta.",
    "https://upload.wikimedia.org/wikipedia/commons/9/98/Trekking_example.jpg",
    tipo
  );

  adicionarMarcador(
    -21.1333, -44.2501,
    "Mensageiros de Cristo",
    "Trilha fácil de 1,9 km (0.5–1 h), ideal para passeio leve e caminhada em meio à natureza. Boa opção para iniciantes.",
    "https://upload.wikimedia.org/wikipedia/commons/f/f1/Forest_path_example.jpg",
    tipo
  );
  // Senac com ícone customizado (local em img/senac.png) - use URL alternativa se não existir
adicionarMarcador(
  -21.1348062,
  -44.2607754,
  "Senac Minas",
  "Melhor local para cursos de capacitação profissional na região.",
  "https://upload.wikimedia.org/wikipedia/commons/f/f1/Forest_path_example.jpg",
  {
    iconUrl: 'img/senac.jpg',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36]
  }
);
  
  
    // Atualiza painel de status com info de camada e contagem
    try {
      var active = (map.hasLayer(limpoLayer) ? 'limpo' : 'normal');
      statusDiv.innerText = 'Camada: ' + active + ' — Marcadores: ' + marcadores.length;
      console.log('[carregarMarcadores] camada ativa:', active, 'marcadores adicionados =', marcadores.length, 'map.has normal?', map.hasLayer(normalLayer), 'map.has limpo?', map.hasLayer(limpoLayer));
    } catch (e) {
      console.warn('Não foi possível atualizar painel de status:', e);
    }
  }
  

  // === INICIALIZA COM MARCADORES DO MAPA NORMAL ===
  carregarMarcadores("normal");

  // === EVENTO PARA TROCAR ESTILO DO MAPA ===
  // Attach the listener directly to the select to avoid catching unrelated change events
  var mapSelectEl = document.getElementById('mapSelect');
  if (mapSelectEl) {
    mapSelectEl.addEventListener('change', function (e) {
      var tipo = e.target.value;

      // Remove todas as bases e adiciona só a escolhida (garante 1 base ativa)
      if (map.hasLayer(normalLayer)) map.removeLayer(normalLayer);
      if (map.hasLayer(limpoLayer))  map.removeLayer(limpoLayer);
      // darkLayer may not exist in this project; guard to avoid ReferenceError
      if (typeof darkLayer !== 'undefined' && map.hasLayer(darkLayer)) map.removeLayer(darkLayer);

      if (tipo === 'limpo') {
        limpoLayer.addTo(map);
      } else {
        normalLayer.addTo(map);
      }

      console.log('[mapSelect.change] selecionado =', tipo);
      try {
        carregarMarcadores(tipo);
      } catch (err) {
        console.error('Erro ao recarregar marcadores após troca de mapa:', err);
        // mostrar alerta visual para o usuário
        alert('Erro ao recarregar marcadores. Veja o console para detalhes.');
      }
    });
  } else {
    console.warn('Elemento #mapSelect não encontrado — não será possível trocar o estilo do mapa dinamicamente.');
  }

 // === LOCALIZAÇÃO AUTOMÁTICA AO INICIAR ===

// Variáveis globais para armazenar o marcador e o círculo
let marcadorUsuario = null;
let circuloUsuario = null;

// Quando a localização for encontrada
map.on('locationfound', function (e) {
  var radius = e.accuracy / 2;

  // 👉 Remove marcador e círculo anteriores, se existirem
  if (marcadorUsuario) {
    map.removeLayer(marcadorUsuario);
    marcadorUsuario = null;
  }
  if (circuloUsuario) {
    map.removeLayer(circuloUsuario);
    circuloUsuario = null;
  }

  // Cria novo marcador
  marcadorUsuario = L.marker(e.latlng, {
    icon: L.icon({
      iconUrl: 'img/aventureiro.png', // seu ícone personalizado
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
  })
  .addTo(map)
  .bindPopup("Você está aqui!")
  .openPopup();

  // Cria novo círculo de precisão
  circuloUsuario = L.circle(e.latlng, {
    radius: radius,
    color: '#1eff8fff',
    weight: 1,
    fillColor: '#1effb0ff',
    fillOpacity: 0.2
  }).addTo(map);
});

// Se o usuário negar permissão ou der erro
map.on('locationerror', function () {
  alert("⚠️ Não foi possível acessar sua localização. Ative o GPS e recarregue a página.");
});

// Localiza automaticamente ao abrir
map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
