<?php
require 'banco.php';

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Dados inválidos']);
    exit;
}

$nome = $data['nome'] ?? '';
$autor = $data['autor'] ?? '';
$coordenadas = $data['coordenadas'] ?? [];
$rota = json_encode($coordenadas);

// Verifica campos obrigatórios e se há ao menos uma coordenada
if ($nome && $autor && is_array($coordenadas) && count($coordenadas) > 0) {
    try {
    // Inserir sem coluna de data para compatibilidade com esquemas que não possuem 'data' ou 'data_criacao'
    $stmt = $conn->prepare("INSERT INTO trilhas (nome, autor, rota) VALUES (:nome, :autor, :rota)");
    $stmt->bindParam(':nome', $nome);
    $stmt->bindParam(':autor', $autor);
    $stmt->bindParam(':rota', $rota);

        if ($stmt->execute()) {
            echo json_encode(['sucesso' => true, 'mensagem' => 'Trilha salva!']);
        } else {
            echo json_encode(['sucesso' => false, 'mensagem' => 'Falha ao salvar trilha']);
        }
    } catch (PDOException $e) {
        echo json_encode(['sucesso' => false, 'mensagem' => 'Erro no banco: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Campos obrigatórios faltando ou rota vazia']);
}
?>
