<?php
/* ============================================================================
 * SIGLV · api/solicitud.php
 * SUBPROCESO 1.1 · Capturar solicitud
 * Normaliza y valida los "Datos solicitud" del cliente y emite el flujo
 * interno "Datos de búsqueda". Las reglas son las del Catálogo de Elementos
 * Dato (longitudes, rangos y validaciones de fecha).
 * ========================================================================= */
require __DIR__ . '/config.php';
exigir_metodo('POST');

$sol = [
    'Id_Cliente'     => strtoupper(param_str('Id_Cliente')),
    'Nombre_Cliente' => param_str('Nombre_Cliente'),
    'Origen'         => strtoupper(param_str('Origen')),
    'Destino'        => strtoupper(param_str('Destino')),
    'Fecha_Salida'   => param_str('Fecha_Salida'),
    'Fecha_Regreso'  => param_str('Fecha_Regreso'),
    'N_Pasajeros'    => param_int('N_Pasajeros', 0),
    'Clase_Tarifa'   => param_str('Clase_Tarifa', 'Económica'),
    'Preferencias'   => mb_substr(param_str('Preferencias'), 0, 200),
];

$errores = [];
$hoy = date('Y-m-d');

if ($sol['Id_Cliente'] === '')                 $errores['Id_Cliente']   = 'El Id_Cliente es obligatorio.';
elseif (mb_strlen($sol['Id_Cliente']) > 14)    $errores['Id_Cliente']   = 'Máximo 10 caracteres significativos.';
if ($sol['Nombre_Cliente'] === '')             $errores['Nombre_Cliente'] = 'Captura el nombre del cliente.';
if ($sol['Origen'] === '')                     $errores['Origen']       = 'Selecciona el origen.';
if ($sol['Destino'] === '')                    $errores['Destino']      = 'Selecciona el destino.';
if ($sol['Origen'] !== '' && $sol['Origen'] === $sol['Destino'])
                                               $errores['Destino']      = 'El destino debe ser distinto del origen.';
if (!fecha_valida($sol['Fecha_Salida']))       $errores['Fecha_Salida'] = 'Captura la fecha de salida.';
elseif (dias_entre($hoy, $sol['Fecha_Salida']) < 0)
                                               $errores['Fecha_Salida'] = 'La fecha de salida debe ser mayor a hoy.';
if (!fecha_valida($sol['Fecha_Regreso']))      $errores['Fecha_Regreso'] = 'Captura la fecha de regreso.';
elseif (dias_entre($sol['Fecha_Salida'], $sol['Fecha_Regreso']) < 1)
                                               $errores['Fecha_Regreso'] = 'El regreso debe ser posterior a la salida.';
if ($sol['N_Pasajeros'] < 1 || $sol['N_Pasajeros'] > 99)
                                               $errores['N_Pasajeros']  = 'Entre 1 y 99 pasajeros.';

/* Las ciudades deben existir en el catálogo */
if (!$errores) {
    $st = db()->prepare('SELECT COUNT(*) FROM ciudad WHERE Codigo IN (:o, :d)');
    $st->execute([':o' => $sol['Origen'], ':d' => $sol['Destino']]);
    if ((int) $st->fetchColumn() < 2) $errores['Destino'] = 'Origen o destino no están en el catálogo de ciudades.';
}

if ($errores) {
    echo json_encode(['ok' => true, 'datos' => ['ok' => false, 'errores' => $errores]],
        JSON_UNESCAPED_UNICODE);
    exit;
}

/* Alta o actualización del cliente (tabla cliente) */
db()->prepare('INSERT INTO cliente (Id_Cliente, Nombre) VALUES (:i, :n)
               ON DUPLICATE KEY UPDATE Nombre = VALUES(Nombre)')
    ->execute([':i' => $sol['Id_Cliente'], ':n' => $sol['Nombre_Cliente']]);

responder([
    'ok'        => true,
    'solicitud' => $sol,
    'datos_busqueda' => [
        'Origen'        => $sol['Origen'],
        'Destino'       => $sol['Destino'],
        'Fecha_Salida'  => $sol['Fecha_Salida'],
        'Fecha_Regreso' => $sol['Fecha_Regreso'],
        'N_Pasajeros'   => $sol['N_Pasajeros'],
        'Clase_Tarifa'  => $sol['Clase_Tarifa'],
        'Preferencias'  => $sol['Preferencias'],
    ],
    'noches' => dias_entre($sol['Fecha_Salida'], $sol['Fecha_Regreso']),
]);
