// Inicializa o mapa centralizado em São João del Rei (exemplo)
var map = L.map('map').setView([-21.137, -44.259], 13);
console.log("Olá, mundo!");

// Adiciona o "tile layer" do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

// Função exemplo: adiciona um marcador
function adicionarMarcador(lat, lon, popupText) {
    L.marker([lat, lon]).addTo(map)
        .bindPopup(popupText)
        .openPopup();
}

// Teste da função
adicionarMarcador(-21.137, -44.259, "Estou aqui!");
