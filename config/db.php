<?php
// === Configuração de Banco de Dados ===
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'trilhas_db'); // nome do banco do seu setup.sql
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// === Conexão PDO segura e reutilizável ===
function getPDO() {
    static $pdo;
    if (!$pdo) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}
?>
