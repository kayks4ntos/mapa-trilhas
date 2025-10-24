<?php
require 'banco.php';

header('Content-Type: application/json; charset=utf-8');

// Listagem sem ORDER BY por data para evitar erros caso a coluna de data não exista.
$stmt = $conn->query("SELECT * FROM trilhas");
$trilhas = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($trilhas);
?>
