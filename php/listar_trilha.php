<?php
require 'bancodb.php';

$stmt = $conn->query("SELECT * FROM trilhas ORDER BY data DESC");
$trilhas = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($trilhas);
?>
