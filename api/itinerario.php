<?php
/* ============================================================================
 * SIGLV · api/itinerario.php
 * SUBPROCESO 3.4 · Consolidar itinerario
 * Entrada : Tours elegidos + Vuelo seleccionado + Hotel seleccionado
 * Salida  : Itinerario = Id_Itinerario + Vuelo + Hotel + Detalle_Actividades +
 *           Fecha_Creacion
 * Tablas  : itinerario, itinerario_actividad; enlaza las reservas de RE.
 * ========================================================================= */
require __DIR__ . '/config.php';

/* ------------------------ GET: leer un itinerario ---------------------- */
if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $id = param_str('Id_Itinerario');
    if ($id === '') responder_error('Falta Id_Itinerario');

    $st = db()->prepare('SELECT * FROM itinerario WHERE Id_Itinerario = :i');
    $st->execute([':i' => $id]);
    $iti = $st->fetch();
    if (!$iti) responder_error('Itinerario no encontrado', 404);

    $st = db()->prepare(
        'SELECT d.*, a.Nombre_Tour, a.Ubicacion, a.Tipo
           FROM itinerario_actividad d
           JOIN actividad a ON a.Id_Actividad = d.Id_Actividad
          WHERE d.Id_Itinerario = :i
          ORDER BY d.Fecha_Ejecucion, d.Hora_Inicio');
    $st->execute([':i' => $id]);
    $iti['Detalle_Actividades'] = $st->fetchAll();

    responder($iti);
}

/* -------------------- POST: consolidar un itinerario ------------------- */
exigir_metodo('POST');

$cliente = param_str('Id_Cliente');
$vuelo   = param('vuelo');
$hotel   = param('hotel');
$tours   = param('tours', []);

if ($cliente === '')          responder_error('Id_Cliente es obligatorio');
if (!is_array($vuelo) || empty($vuelo['Id_Vuelo']))
                              responder_error('Falta el Vuelo seleccionado');
if (!is_array($tours))        $tours = [];

$pdo = db();
$pdo->beginTransaction();

try {
    $id_iti = nuevo_folio('ITI', 'itinerario', 'Id_Itinerario');

    $st = $pdo->prepare(
        'INSERT INTO itinerario (Id_Itinerario, Id_Cliente, Id_Vuelo, Id_Hotel, Origen, Destino,
             Fecha_Salida, Fecha_Regreso, Fecha_CheckIn, Fecha_CheckOut, N_Pasajeros,
             Habitaciones, Clase_Tarifa, Preferencias, Fecha_Creacion)
         VALUES (:iti, :cli, :vue, :hot, :ori, :des, :fsal, :freg, :fin, :fout, :pax,
                 :hab, :clase, :pref, CURDATE())');
    $st->execute([
        ':iti'   => $id_iti,
        ':cli'   => $cliente,
        ':vue'   => $vuelo['Id_Vuelo'],
        ':hot'   => is_array($hotel) ? ($hotel['Id_Hotel'] ?? null) : null,
        ':ori'   => $vuelo['Origen'],
        ':des'   => $vuelo['Destino'],
        ':fsal'  => substr((string) ($vuelo['Fecha_Hora_Salida'] ?? ''), 0, 10),
        ':freg'  => substr((string) ($vuelo['Fecha_Hora_Regreso'] ?? ''), 0, 10),
        ':fin'   => is_array($hotel) ? ($hotel['Fecha_CheckIn']  ?? null) : null,
        ':fout'  => is_array($hotel) ? ($hotel['Fecha_CheckOut'] ?? null) : null,
        ':pax'   => max((int) param_int('N_Pasajeros', 1), 1),
        ':hab'   => max((int) param_int('Habitaciones', 1), 1),
        ':clase' => $vuelo['Clase_Tarifa'] ?? null,
        ':pref'  => mb_substr(param_str('Preferencias'), 0, 200),
    ]);

    /* Detalle_Actividades */
    $det = $pdo->prepare(
        'INSERT INTO itinerario_actividad (Id_Itinerario, Id_Actividad, Fecha_Ejecucion,
             Hora_Inicio, Duracion_Estimada, N_Personas, Costo_Persona, Criterio_Seleccion)
         VALUES (:iti, :act, :fec, :hora, :dur, :pax, :costo, :crit)');
    foreach ($tours as $t) {
        $det->execute([
            ':iti'   => $id_iti,
            ':act'   => $t['Id_Actividad'],
            ':fec'   => $t['Fecha_Ejecucion'],
            ':hora'  => $t['Hora_Inicio'],
            ':dur'   => $t['Duracion_Estimada'],
            ':pax'   => max((int) ($t['N_Personas'] ?? 1), 1),
            ':costo' => (float) ($t['Costo_Persona'] ?? 0),
            ':crit'  => $t['Criterio_Seleccion'] ?? null,
        ]);
    }

    /* Enlaza al itinerario las reservas de vuelo y hotel creadas antes */
    if (!empty($vuelo['Id_Reserva']) || !empty($hotel['Id_Reserva'])) {
        $up = $pdo->prepare('UPDATE reserva SET Id_Itinerario = :iti WHERE Id_Reserva = :res');
        foreach ([$vuelo['Id_Reserva'] ?? null, $hotel['Id_Reserva'] ?? null] as $res) {
            if ($res) $up->execute([':iti' => $id_iti, ':res' => $res]);
        }
    } else {
        // Respaldo: enlaza las reservas del cliente que aún no tienen itinerario
        $pdo->prepare('UPDATE reserva SET Id_Itinerario = :iti
                        WHERE Id_Cliente = :cli AND Id_Itinerario IS NULL')
            ->execute([':iti' => $id_iti, ':cli' => $cliente]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    responder_error('No se pudo consolidar el itinerario: ' . $e->getMessage(), 500);
}

responder([
    'Id_Itinerario'       => $id_iti,
    'Id_Cliente'          => $cliente,
    'Vuelo_seleccionado'  => $vuelo,
    'Hotel_seleccionado'  => $hotel,
    'Detalle_Actividades' => $tours,
    'Fecha_Creacion'      => date('Y-m-d'),
]);
