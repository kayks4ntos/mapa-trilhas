// js/api.js

export async function enviarTrilha(nome, autor, coordenadas) {
  try {
    const resposta = await fetch("php/salvar_trilha.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, autor, coordenadas }),
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      alert("✅ Trilha salva com sucesso!");
    } else {
      alert("⚠️ Erro ao salvar trilha: " + dados.mensagem);
    }
  } catch (erro) {
    alert("❌ Erro na comunicação com o servidor: " + erro.message);
  }
}
