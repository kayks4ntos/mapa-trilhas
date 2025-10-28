<?php
// Retorna JSON com trilhas pré-definidas a partir do banco; se falhar, usa fallback estático.
// Estrutura JSON de cada item: { id, nome, descricao, lat, lon, gpx_url, iconUrl? }

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$rows = null;

// Tente carregar config e consultar MySQL
try {
    $cfgPath = dirname(__DIR__) . '/config/db.php';
    if (file_exists($cfgPath)) {
        require $cfgPath; // espera variáveis: DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_CHARSET

        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . (defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4');
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        // Tabela sugerida:
        // CREATE TABLE trilhas (
        //   id INT AUTO_INCREMENT PRIMARY KEY,
        //   nome VARCHAR(255) NOT NULL,
        //   descricao TEXT NULL,
        //   lat DECIMAL(10,6) NOT NULL,
        //   lon DECIMAL(10,6) NOT NULL,
        //   gpx_url VARCHAR(512) NOT NULL,
        //   iconUrl VARCHAR(512) NULL,
        //   cor VARCHAR(16) NULL,
        //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        // ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        $stmt = $pdo->query('SELECT id, nome, descricao, lat, lon, gpx_url, iconUrl FROM trilhas ORDER BY id DESC');
        $rows = $stmt->fetchAll();
    }
} catch (Throwable $e) {
    // silencia e cai no fallback
}

if (!is_array($rows) || !count($rows)) {
    // Fallback estático: ajuste caminhos/coords conforme seus arquivos reais em /gpx
    $rows = [
        [
            'id' => 1,
            'nome' => 'Canal dos Ingleses',
            'descricao' => 'Trilha no Parque Serra do Lenheiro (exemplo).',
            'lat' => -21.127727,
            'lon' => -44.264111,
            'gpx_url' => '/mapa-trilhas/gpx/canal_dos_ingleses.gpx',
            'iconUrl' => '/mapa-trilhas/img/iconclaro.png'
        ],
    ];
}

echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
