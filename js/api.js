// js/api.js

export async function enviarTrilha(nome, autor, coordenadas) {
  try {
    if (window.location.protocol === 'file:') {
      alert('Avise: operações de rede podem falhar quando os arquivos são abertos via file://. Use um servidor local (http://localhost/)');
    }
    const resposta = await fetch("php/salvar_trilha.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, autor, coordenadas }),
    });
    const texto = await resposta.text();
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (e) {
      console.error('Resposta inesperada do servidor:', texto);
      alert('Erro: resposta inválida do servidor. Verifique se o PHP retornou JSON. Veja o console para detalhes.');
      return;
    }

    if (resposta.ok && dados.sucesso) {
      alert("✅ Trilha salva com sucesso!");
    } else {
      const msg = dados.mensagem || ('Status HTTP: ' + resposta.status);
      alert("⚠️ Erro ao salvar trilha: " + msg);
      console.error('Falha ao salvar trilha:', dados);
    }
  } catch (erro) {
    alert("❌ Erro na comunicação com o servidor: " + erro.message + '\nVerifique se o servidor (XAMPP/Apache) está rodando e se você abriu o site via http://localhost/.');
    console.error('Fetch error in enviarTrilha:', erro);
  }
}
