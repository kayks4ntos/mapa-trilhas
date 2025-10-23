// === MAPA BASE ===
// Centraliza em São João del Rei
var map = L.map('map').setView([-21.137, -44.259], 13);

// Camada do mapa (pode trocar entre estilos do Mapbox ou OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

// === CONTROLES BÁSICOS ===

// Mostra escala de distância (em metros e km)
L.control.scale().addTo(map);

// === FUNÇÃO PARA ADICIONAR MARCADORES ===

// Ícone personalizado (exemplo: uma montanha)
var iconeTrilha = L.icon({
  iconUrl: 'img/montanha.png', // coloque sua imagem aqui (32x32px é um bom tamanho)
  iconSize: [32, 32],
  iconAnchor: [16, 32], // ponto que "encosta" no chão
  popupAnchor: [0, -32]  // onde o popup aparece em relação ao ícone
});

// Função para adicionar marcador com popup HTML
function adicionarMarcador(lat, lon, nome, descricao, linkImg) {
  var popupContent = `
    <div style="text-align:center;">
      <h3 style="margin:4px 0;">${nome}</h3>
      <img src="${linkImg}" alt="${nome}" width="150" style="border-radius:8px; margin-bottom:5px;">
      <p style="font-size:13px;">${descricao}</p>
    </div>
  `;

  L.marker([lat, lon], { icon: iconeTrilha })
    .addTo(map)
    .bindPopup(popupContent);
}

// === TESTES DE MARCADORES ===
adicionarMarcador(-21.137, -44.259, "Trilha do Bonfim", "Trilha leve com vista panorâmica da cidade.", "https://upload.wikimedia.org/wikipedia/commons/9/9e/Sao_Joao_del_Rei.jpg");

adicionarMarcador(-21.145, -44.270, "Cachoeira do Matozinho", "Trilha moderada com cachoeira e área para banho.", "https://upload.wikimedia.org/wikipedia/commons/e/e0/Waterfall_example.jpg");

adicionarMarcador(-21.120, -44.250, "Serra do Lenheiro", "Trilha difícil, ideal para escaladas e observação de aves.", "https://upload.wikimedia.org/wikipedia/commons/3/3b/Mountain_example.jpg");

// === LOCALIZAÇÃO DO USUÁRIO ===
// Tenta localizar o usuário (requer permissão)
map.locate({ setView: true, maxZoom: 16 });

// Quando a localização for encontrada
function onLocationFound(e) {
  var radius = e.accuracy / 2;

  L.marker(e.latlng).addTo(map)
    .bindPopup("Você está aqui!").openPopup();

  L.circle(e.latlng, radius).addTo(map);
}
map.on('locationfound', onLocationFound);

// Se der erro (usuário negou permissão, etc.)
map.on('locationerror', function(e) {
  alert("Não foi possível acessar sua localização.");
});

// === GRAVAÇÃO DE DADOS ===
import { iniciarGravacao, pararGravacao } from './gps.js';

// Eventos dos botões de gravação
const btnIniciar = document.getElementById('btnIniciar');
const btnParar = document.getElementById('btnParar');

if (btnIniciar && btnParar) {
  btnIniciar.addEventListener('click', () => iniciarGravacao(map));
  btnParar.addEventListener('click', () => pararGravacao());
} else {
  console.warn('Botões de gravação não encontrados no DOM.');
}
