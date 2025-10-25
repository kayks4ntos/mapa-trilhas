// js/gps.js
import { enviarTrilha } from "./api.js";

let rotaPolyline;
let coordenadas = [];
let watchId = null;
let gravando = false;
let marcadorUsuario = null;

// --- Configurações de GPS e suavização ---
const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 };
const INTERPOLATION_SEGMENTS = 6; // pontos gerados entre cada par de pontos reais
const SMOOTHING_WINDOW = 3; // janela para média móvel

// === Inicia gravação de rota ===
export function iniciarGravacao(map) {
  if (gravando) {
    alert("A gravação já está em andamento!");
    return;
  }
  if (!map) {
    alert('Erro interno: mapa não fornecido para iniciarGravacao.');
    console.error('iniciarGravacao called without map');
    return;
  }

  if (window.location.protocol === 'file:') {
    alert('⚠️ Aviso: Abra este projeto através de um servidor local (http://localhost/) — recursos como geolocalização e fetch podem falhar em file://');
  }

  gravando = true;
  coordenadas = [];
  rotaPolyline = L.polyline([], { color: "red", weight: 5 }).addTo(map);

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => atualizarPosicao(map, pos),
      (erro) => alert("Erro ao acessar GPS: " + erro.message),
      WATCH_OPTIONS
    );
    alert("📍 Gravação iniciada!");
  } else {
    alert("Seu navegador não suporta geolocalização.");
  }
}

// === Filtragem simples: média móvel para reduzir jitter ===
function smoothMovingAverage(points, window = SMOOTHING_WINDOW) {
  if (points.length < window) return points.slice();
  const res = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - (window - 1));
    const end = i;
    let sumLat = 0, sumLon = 0, cnt = 0;
    for (let j = start; j <= end; j++) {
      sumLat += points[j][0];
      sumLon += points[j][1];
      cnt++;
    }
    res.push([sumLat / cnt, sumLon / cnt]);
  }
  return res;
}

// === Interpolação Catmull-Rom para curvas suaves ===
function catmullRomSpline(points, segmentsPerPair = INTERPOLATION_SEGMENTS) {
  if (!points || points.length < 2) return points.slice();

  const out = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    for (let s = 0; s < segmentsPerPair; s++) {
      const t = s / segmentsPerPair;
      const t2 = t * t;
      const t3 = t2 * t;

      const lat = 0.5 * ((-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3 + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + p2[0]) * t + 2 * p1[0]);

      const lon = 0.5 * ((-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3 + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + p2[1]) * t + 2 * p1[1]);

      out.push([lat, lon]);
    }
  }

  out.push(points[n - 1]);
  return out;
}

// === Atualiza posição e desenha (com suavização + interpolação) ===
function atualizarPosicao(map, posicao) {
  const { latitude, longitude } = posicao.coords;
  const novaCoord = [latitude, longitude];
  coordenadas.push(novaCoord);

  // Aplica filtragem simples para reduzir ruído do GPS
  const filtered = smoothMovingAverage(coordenadas, SMOOTHING_WINDOW);

  // Aplica interpolação para gerar curvas suaves
  const smoothedCoords = catmullRomSpline(filtered, INTERPOLATION_SEGMENTS);

  // Atualiza a polyline com os pontos suavizados (mais densos)
  if (rotaPolyline) {
    rotaPolyline.setLatLngs(smoothedCoords);
  }

  // Atualiza marcador de posição para a última coordenada REAL (ou última filtrada)
  const ultimaReal = coordenadas[coordenadas.length - 1];
  if (marcadorUsuario) {
    marcadorUsuario.setLatLng(ultimaReal);
  } else {
    marcadorUsuario = L.marker(ultimaReal).addTo(map);
  }

  // Centraliza mapa suavemente na posição atual
  map.setView(ultimaReal, 16);
}

// === Para gravação e envia rota ===
export function pararGravacao() {
  if (!gravando) {
    alert("Nenhuma gravação ativa.");
    return;
  }

  gravando = false;
  navigator.geolocation.clearWatch(watchId);

  // Debug: logar informações da rota antes dos prompts
  console.debug('pararGravacao called — coordenadas.length =', coordenadas.length, 'amostra=', coordenadas.slice(0,5));

  const nome = prompt("Nome da trilha:");
  const autor = prompt("Autor da trilha:");

  if (nome && autor && coordenadas.length > 0) {
    // Envia as coordenadas REAIS (sem interpolação) para o backend
    enviarTrilha(nome, autor, coordenadas);
  } else {
    alert("⚠️ Dados incompletos ou rota vazia.");
  }
}
