// js/gps.js
import { enviarTrilha } from "./api.js";

let rotaPolyline;
let coordenadas = [];
let watchId = null;
let gravando = false;
let marcadorUsuario = null;

// === Inicia gravação de rota ===
export function iniciarGravacao(map) {
  if (gravando) {
    alert("A gravação já está em andamento!");
    return;
  }

  gravando = true;
  coordenadas = [];
  rotaPolyline = L.polyline([], { color: "red", weight: 5 }).addTo(map);

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => atualizarPosicao(map, pos),
      (erro) => alert("Erro ao acessar GPS: " + erro.message),
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
    alert("📍 Gravação iniciada!");
  } else {
    alert("Seu navegador não suporta geolocalização.");
  }
}

// === Atualiza posição e desenha ===
function atualizarPosicao(map, posicao) {
  const { latitude, longitude } = posicao.coords;
  const novaCoord = [latitude, longitude];
  coordenadas.push(novaCoord);

  // Atualiza linha da rota
  rotaPolyline.addLatLng(novaCoord);

  // Atualiza marcador de posição atual
  if (marcadorUsuario) {
    marcadorUsuario.setLatLng(novaCoord);
  } else {
    marcadorUsuario = L.marker(novaCoord).addTo(map);
  }

  map.setView(novaCoord, 16);
}

// === Para gravação e envia rota ===
export function pararGravacao() {
  if (!gravando) {
    alert("Nenhuma gravação ativa.");
    return;
  }

  gravando = false;
  navigator.geolocation.clearWatch(watchId);

  const nome = prompt("Nome da trilha:");
  const autor = prompt("Autor da trilha:");

  if (nome && autor && coordenadas.length > 0) {
    enviarTrilha(nome, autor, coordenadas);
  } else {
    alert("⚠️ Dados incompletos ou rota vazia.");
  }
}
