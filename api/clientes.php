<?php
/* ============================================================================
 * SIGLV · api/clientes.php    ·    Tabla cliente
 *   GET          → lista de clientes registrados
 *   POST (JSON)  → alta o actualización de un cliente
 * ========================================================================= */
require __DIR__ . '/config.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $st = db()->query('SELECT Id_Cliente, Nombre, Email, Telefono, Documento
                         FROM cliente ORDER BY Nombre');
    responder($st->fetchAll());
}

exigir_metodo('POST');

$id     = strtoupper(param_str('Id_Cliente'));
$nombre = param_str('Nombre');
if ($id === '' || $nombre === '') responder_error('Id_Cliente y Nombre son obligatorios');

db()->prepare('INSERT INTO cliente (Id_Cliente, Nombre, Email, Telefono, Documento)
               VALUES (:i, :n, :e, :t, :d)
               ON DUPLICATE KEY UPDATE Nombre = VALUES(Nombre), Email = VALUES(Email),
                                       Telefono = VALUES(Telefono), Documento = VALUES(Documento)')
    ->execute([
        ':i' => $id,
        ':n' => $nombre,
        ':e' => param_str('Email') ?: null,
        ':t' => param_str('Telefono') ?: null,
        ':d' => param_str('Documento') ?: null,
    ]);

responder(['Id_Cliente' => $id, 'Nombre' => $nombre]);
