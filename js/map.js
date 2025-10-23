  // === MAPA BASE ===
  // Centraliza em São João del Rei
  // DICA: escolha só 1 camada inicial via "layers: [...]" (evita duas camadas base ao mesmo tempo)

  // 1) Defina as camadas (normal, limpo e escuro) ANTES de criar o mapa
  var normalLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors'
  });

  var limpoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  });

  var darkLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'a,b,c,d',
      maxZoom: 19
    }
  );

  // 2) Crie o mapa já escolhendo a camada inicial (aqui: normal)
  var map = L.map('map', {
    center: [-21.137, -44.259],
    zoom: 13,
    layers: [normalLayer]
  });

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
        <option value="normal" selected>🗺️ Mapa Normal</option>
        <option value="limpo">🌞 Mapa Limpo</option>
        <option value="escuro">🌙 Mapa Escuro</option>
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

  // Ícone para o mapa escuro (ex: versão branca para contraste)
  var iconeEscuro = L.icon({
    iconUrl: 'img/iconescuro.png', // troque para o seu arquivo (recomendado branco/clarinho)
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
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

  // Define o ícone conforme o tipo do mapa
  var iconeUsado = iconeNormal;
  if (tipo === "limpo") iconeUsado = iconeLimpo;
  if (tipo === "escuro") iconeUsado = iconeEscuro;

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
    // Remove os antigos
    marcadores.forEach(m => map.removeLayer(m));
    marcadores = [];

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
  }

  // === INICIALIZA COM MARCADORES DO MAPA NORMAL ===
  carregarMarcadores("normal");

  // === EVENTO PARA TROCAR ESTILO DO MAPA ===
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'mapSelect') {
      var tipo = e.target.value;

      // Remove todas as bases e adiciona só a escolhida (garante 1 base ativa)
      if (map.hasLayer(normalLayer)) map.removeLayer(normalLayer);
      if (map.hasLayer(limpoLayer))  map.removeLayer(limpoLayer);
      if (map.hasLayer(darkLayer))   map.removeLayer(darkLayer);

      if (tipo === 'limpo') {
        limpoLayer.addTo(map);
      } else if (tipo === 'escuro') {
        darkLayer.addTo(map);
      } else {
        normalLayer.addTo(map);
      }

      carregarMarcadores(tipo);
    }
  });

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
      iconUrl: 'img/localização.png', // seu ícone personalizado
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
  })
  .addTo(map)
  .bindPopup("📍 Você está aqui!")
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
