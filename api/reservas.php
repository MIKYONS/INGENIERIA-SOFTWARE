<?php
/* ============================================================================
 * SIGLV · api/reservas.php
 * SUBPROCESOS 1.4 / 2.4 / 3.4 · Registrar reserva
 * Escribe en el almacén RE (tabla reserva). El disparador
 * trg_reserva_descuenta_inventario ajusta asientos, cupos y habitaciones.
 * ========================================================================= */
require __DIR__ . '/config.php';

/* ---------------------- GET: consulta del almacén RE -------------------- */
if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $iti = param_str('Id_Itinerario');
    if ($iti !== '') {
        $st = db()->prepare('SELECT * FROM reserva WHERE Id_Itinerario = :i ORDER BY Id_Reserva');
        $st->execute([':i' => $iti]);
    } else {
        $st = db()->query('SELECT * FROM reserva ORDER BY Fecha_Reserva DESC, Id_Reserva DESC LIMIT 200');
    }
    responder(array_map('normalizar_reserva', $st->fetchAll()));
}

/* ------------------------- POST: nueva reserva ------------------------- */
exigir_metodo('POST');

$id_cliente = param_str('Id_Cliente');
$tipo       = strtoupper(param_str('Tipo_Servicio'));
$referencia = param_str('Id_Referencia');
$personas   = max(param_int('N_Personas', 1), 1);
$monto      = param_num('Monto_Reserva', 0);
$iti        = param_str('Id_Itinerario');

if ($id_cliente === '')                               responder_error('Id_Cliente es obligatorio');
if (!in_array($tipo, ['VUELO','HOTEL','ACTIVIDAD'], true))
                                                      responder_error('Tipo_Servicio inválido');
if ($referencia === '')                               responder_error('Id_Referencia es obligatorio');
if ($monto < 0)                                       responder_error('Monto_Reserva no puede ser negativo');

/* El cliente debe existir; si no, se crea al vuelo con el nombre recibido */
$st = db()->prepare('SELECT 1 FROM cliente WHERE Id_Cliente = :i');
$st->execute([':i' => $id_cliente]);
if (!$st->fetchColumn()) {
    $ins = db()->prepare('INSERT INTO cliente (Id_Cliente, Nombre) VALUES (:i, :n)');
    $ins->execute([':i' => $id_cliente, ':n' => param_str('Nombre_Cliente', $id_cliente)]);
}

/* Validación de inventario antes de escribir en RE */
switch ($tipo) {
    case 'VUELO':
        $v = db()->prepare('SELECT Asientos_Disponibles, Estado FROM vuelo WHERE Id_Vuelo = :i');
        $v->execute([':i' => $referencia]);
        $f = $v->fetch();
        if (!$f)                                          responder_error('El vuelo no existe', 404);
        if ($f['Estado'] !== 'Disponible')                responder_error('El vuelo está agotado', 409);
        if ((int) $f['Asientos_Disponibles'] < $personas) responder_error('Asientos insuficientes', 409);
        break;
    case 'ACTIVIDAD':
        $v = db()->prepare('SELECT Cupos_Libres FROM actividad WHERE Id_Actividad = :i');
        $v->execute([':i' => $referencia]);
        $f = $v->fetch();
        if (!$f)                                     responder_error('La actividad no existe', 404);
        if ((int) $f['Cupos_Libres'] < $personas)    responder_error('Cupos insuficientes', 409);
        break;
    case 'HOTEL':
        $v = db()->prepare('SELECT Habitaciones_Libres FROM hotel WHERE Id_Hotel = :i');
        $v->execute([':i' => $referencia]);
        $f = $v->fetch();
        if (!$f)                                  responder_error('El hotel no existe', 404);
        if ((int) $f['Habitaciones_Libres'] < 1) responder_error('Sin habitaciones libres', 409);
        break;
}

$reserva = [
    'Id_Reserva'     => nuevo_folio('RES', 'reserva', 'Id_Reserva'),
    'Id_Cliente'     => $id_cliente,
    'Id_Itinerario'  => $iti !== '' ? $iti : null,
    'Tipo_Servicio'  => $tipo,
    'Id_Referencia'  => $referencia,
    'Descripcion'    => mb_substr(param_str('Descripcion'), 0, 120),
    'Fecha_Reserva'  => date('Y-m-d'),
    'Fecha_Inicio'   => fecha_valida(param_str('Fecha_Inicio')) ? param_str('Fecha_Inicio') : null,
    'Fecha_Fin'      => fecha_valida(param_str('Fecha_Fin'))    ? param_str('Fecha_Fin')    : null,
    'N_Personas'     => $personas,
    'Monto_Reserva'  => round($monto, 2),
    'Estado_Reserva' => 'Confirmado',
];

$st = db()->prepare(
    'INSERT INTO reserva (Id_Reserva, Id_Cliente, Id_Itinerario, Tipo_Servicio, Id_Referencia,
                          Descripcion, Fecha_Reserva, Fecha_Inicio, Fecha_Fin, N_Personas,
                          Monto_Reserva, Estado_Reserva)
     VALUES (:Id_Reserva, :Id_Cliente, :Id_Itinerario, :Tipo_Servicio, :Id_Referencia,
             :Descripcion, :Fecha_Reserva, :Fecha_Inicio, :Fecha_Fin, :N_Personas,
             :Monto_Reserva, :Estado_Reserva)');
$st->execute($reserva);

responder(normalizar_reserva($reserva));

/* ------------------------------------------------------------------------ */
function normalizar_reserva(array $r): array {
    $r['N_Personas']    = (int)   $r['N_Personas'];
    $r['Monto_Reserva'] = (float) $r['Monto_Reserva'];
    return $r;
}
