<?php
require 'bancodb.php';


$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Dados inválidos']);
    exit;
}

$nome = $data['nome'] ?? '';
$autor = $data['autor'] ?? '';
$rota = json_encode($data['rota'] ?? []);

if ($nome && $autor && $rota) {
    $stmt = $conn->prepare("INSERT INTO trilhas (nome, autor, data, rota) VALUES (:nome, :autor, NOW(), :rota)");
    $stmt->bindParam(':nome', $nome);
    $stmt->bindParam(':autor', $autor);
    $stmt->bindParam(':rota', $rota);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'sucesso', 'mensagem' => 'Trilha salva!']);
    } else {
        echo json_encode(['status' => 'erro', 'mensagem' => 'Falha ao salvar trilha']);
    }
} else {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Campos obrigatórios faltando']);
}
?>
