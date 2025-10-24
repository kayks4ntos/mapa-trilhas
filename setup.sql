-- setup.sql
-- Cria o banco de dados e a tabela usada pelos scripts PHP do projeto
-- Compatível com MySQL moderno (JSON column). Caso seu MySQL seja antigo (pre-5.7),
-- veja a seção alternativa abaixo (use rota TEXT).

CREATE DATABASE IF NOT EXISTS `trilhas_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `trilhas_db`;

-- Tabela principal: trilhas
CREATE TABLE IF NOT EXISTS `trilhas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `autor` VARCHAR(255) NOT NULL,
  `rota` JSON NOT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados de exemplo (salvos como JSON na coluna 'rota')
INSERT INTO `trilhas` (`nome`, `autor`, `rota`) VALUES
('Trilha do Bonfim', 'Dev1', '[{"lat": -21.137, "lon": -44.259}, {"lat": -21.145, "lon": -44.270}]'),
('Cachoeira do Matozinho', 'Dev2', '[{"lat": -21.145, "lon": -44.270}, {"lat": -21.140, "lon": -44.275}]'),
('Serra do Lenheiro', 'Dev3', '[{"lat": -21.120, "lon": -44.250}, {"lat": -21.125, "lon": -44.245}, {"lat": -21.130, "lon": -44.255}]');

-- Exemplo de SELECT (Read)
-- Lista todas as trilhas
SELECT * FROM `trilhas`;

-- Seleciona somente nome e autor
SELECT `id`, `nome`, `autor`, `criado_em` FROM `trilhas` ORDER BY `criado_em` DESC;

-- Extrair elementos do JSON (requere suporte JSON do MySQL)
-- Por exemplo: obter a latitude do primeiro ponto da rota
SELECT id, nome, JSON_EXTRACT(rota, '$[0].lat') AS primeira_lat FROM `trilhas`;

-- Exemplo de UPDATE (Update)
-- Atualiza o nome da trilha com id = 1
UPDATE `trilhas`
SET `nome` = 'Trilha do Bonfim (Atualizada)'
WHERE `id` = 1;

-- Exemplo de DELETE (Delete)
-- Remove a trilha com id = 3
DELETE FROM `trilhas` WHERE `id` = 3;

-- -------------------------------------------------------------
-- Alternativa para MySQL antigo (antes do suporte a JSON)
-- Se seu MySQL não suporta o tipo JSON, comente a criação acima e use a versão abaixo.
-- A coluna 'rota' será TEXT e irá armazenar a string JSON (o PHP continuará a gravar com json_encode)
-- -------------------------------------------------------------
/*
CREATE TABLE IF NOT EXISTS `trilhas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `autor` VARCHAR(255) NOT NULL,
  `rota` TEXT NOT NULL,
  `criado_em` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/

-- Observações:
-- 1) O arquivo JavaScript / PHP do projeto grava a coluna `rota` usando json_encode, então
--    armazenar como TEXT funciona bem em versões antigas do MySQL.
-- 2) Se usar a versão JSON, você pode aproveitar funções JSON do MySQL (JSON_EXTRACT, JSON_ARRAY, etc).
