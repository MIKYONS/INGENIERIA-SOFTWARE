<?php
/* ============================================================================
 * SIGLV · api/config.php
 * Conexión PDO y utilidades comunes de todos los endpoints.
 * Para activar el back-end basta con poner API.modo = 'php' en js/api.js.
 * ========================================================================= */
declare(strict_types=1);

/* --------------------------- Credenciales ------------------------------- */
const DB_HOST = '127.0.0.1';
const DB_NAME = 'siglv';
const DB_USER = 'siglv_app';
const DB_PASS = 'cambia_esta_clave';
const DB_CHARSET = 'utf8mb4';

/* ------------------------- Cabeceras de respuesta ----------------------- */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
// Mismo origen: no se habilita CORS. Si el front vive en otro dominio,
// descomenta y restringe el origen permitido:
// header('Access-Control-Allow-Origin: https://tu-dominio.mx');

/* ------------------------------ Conexión ------------------------------- */
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec("SET time_zone = '-06:00'");
    } catch (PDOException $e) {
        responder_error('No se pudo conectar con la base de datos', 500);
    }
    return $pdo;
}

/* ----------------------------- Respuestas ------------------------------ */
function responder($datos): void {
    echo json_encode(['ok' => true, 'datos' => $datos],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function responder_error(string $mensaje, int $codigo = 400, array $extra = []): void {
    http_response_code($codigo);
    echo json_encode(array_merge(['ok' => false, 'error' => $mensaje], $extra),
        JSON_UNESCAPED_UNICODE);
    exit;
}

/* ------------------------- Entrada de parámetros ----------------------- */
/** Cuerpo JSON de las peticiones POST. */
function cuerpo(): array {
    static $json = null;
    if ($json !== null) return $json;
    $raw  = file_get_contents('php://input') ?: '';
    $json = $raw !== '' ? (json_decode($raw, true) ?: []) : [];
    return $json;
}

/** Parámetro de GET, POST o cuerpo JSON, con valor por omisión. */
function param(string $clave, $defecto = null) {
    $c = cuerpo();
    if (array_key_exists($clave, $c))      return $c[$clave];
    if (array_key_exists($clave, $_GET))   return $_GET[$clave];
    if (array_key_exists($clave, $_POST))  return $_POST[$clave];
    return $defecto;
}

function param_int(string $clave, int $defecto = 0): int   { return (int) param($clave, $defecto); }
function param_num(string $clave, float $defecto = 0): float { return (float) param($clave, $defecto); }
function param_str(string $clave, string $defecto = ''): string {
    return trim((string) param($clave, $defecto));
}

/** Exige que la petición sea del método indicado. */
function exigir_metodo(string $metodo): void {
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $metodo) {
        responder_error('Método no permitido', 405);
    }
}

/* ------------------------- Parámetros del sistema ---------------------- */
function parametros(): array {
    static $p = null;
    if ($p !== null) return $p;
    $p = [];
    foreach (db()->query('SELECT Clave, Valor FROM parametro') as $f) {
        $p[$f['Clave']] = $f['Valor'];
    }
    return $p;
}

function parametro(string $clave, $defecto = null) {
    $p = parametros();
    return $p[$clave] ?? $defecto;
}

/* ------------------------------- Folios -------------------------------- *
 * Genera el siguiente folio con prefijo a partir del máximo existente.
 * Prefijos: RES (reserva), ITI (itinerario), COT (cotización).
 * ---------------------------------------------------------------------- */
function nuevo_folio(string $prefijo, string $tabla, string $columna): string {
    $anio = date('Y');
    $like = "{$prefijo}-{$anio}-%";
    $st = db()->prepare("SELECT MAX($columna) AS ultimo FROM $tabla WHERE $columna LIKE :like");
    $st->execute([':like' => $like]);
    $ultimo = $st->fetchColumn();
    $n = $ultimo ? ((int) substr((string) $ultimo, -4)) + 1 : 1;
    return sprintf('%s-%s-%04d', $prefijo, $anio, $n);
}

/** Valida una fecha en formato YYYY-MM-DD. */
function fecha_valida(?string $f): bool {
    if (!$f) return false;
    $d = DateTime::createFromFormat('Y-m-d', $f);
    return $d && $d->format('Y-m-d') === $f;
}

/** Diferencia en días entre dos fechas ISO. */
function dias_entre(string $a, string $b): int {
    return (int) ((new DateTime($a))->diff(new DateTime($b))->format('%r%a'));
}
