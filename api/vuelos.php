<?php
/* ============================================================================
 * SIGLV · api/vuelos.php
 * SUBPROCESO 1.2 · Buscar vuelos
 * Entrada : Datos de búsqueda (Origen, Destino, Fecha_Salida, Fecha_Regreso,
 *           N_Pasajeros, Clase_Tarifa)
 * Salida  : Lista de vuelos = List<Vuelo> con Fecha_Hora_Salida y
 *           Fecha_Hora_Llegada ya materializadas.
 * Almacén : VU (tabla vuelo)
 * ========================================================================= */
require __DIR__ . '/config.php';

$origen   = strtoupper(param_str('Origen'));
$destino  = strtoupper(param_str('Destino'));
$salida   = param_str('Fecha_Salida');
$regreso  = param_str('Fecha_Regreso');
$pax      = param_int('N_Pasajeros', 1);
$clase    = param_str('Clase_Tarifa', 'Cualquiera');

if (!$origen || !$destino)       responder_error('Origen y Destino son obligatorios');
if (!fecha_valida($salida))      responder_error('Fecha_Salida inválida');
if ($regreso && !fecha_valida($regreso)) responder_error('Fecha_Regreso inválida');
if ($pax < 1 || $pax > 99)       responder_error('N_Pasajeros debe estar entre 1 y 99');

/* DAYOFWEEK() de MySQL devuelve 1=Domingo … 7=Sábado; el catálogo usa 0..6 */
$sql = "SELECT v.*,
               TIMESTAMP(:fsalida, v.Hora_Salida) AS Fecha_Hora_Salida,
               TIMESTAMP(:fsalida2, v.Hora_Salida)
                 + INTERVAL v.Duracion_Minutos MINUTE AS Fecha_Hora_Llegada,
               TIMESTAMP(:fregreso, v.Hora_Salida) AS Fecha_Hora_Regreso,
               v.Precio_Base * :pax AS Importe_Total
          FROM vuelo v
         WHERE v.Origen = :origen
           AND v.Destino = :destino
           AND v.Estado = 'Disponible'
           AND v.Asientos_Disponibles >= :pax2
           AND LOCATE(DAYOFWEEK(:fsalida3) - 1, v.Dias_Operacion) > 0";

if ($clase !== '' && $clase !== 'Cualquiera') $sql .= " AND v.Clase_Tarifa = :clase";
$sql .= " ORDER BY v.Precio_Base ASC";

$st = db()->prepare($sql);
$st->bindValue(':origen',  $origen);
$st->bindValue(':destino', $destino);
$st->bindValue(':fsalida',  $salida);
$st->bindValue(':fsalida2', $salida);
$st->bindValue(':fsalida3', $salida);
$st->bindValue(':fregreso', $regreso ?: $salida);
$st->bindValue(':pax',  $pax, PDO::PARAM_INT);
$st->bindValue(':pax2', $pax, PDO::PARAM_INT);
if ($clase !== '' && $clase !== 'Cualquiera') $st->bindValue(':clase', $clase);
$st->execute();

$vuelos = [];
foreach ($st->fetchAll() as $v) {
    $min = (int) $v['Duracion_Minutos'];
    $v['Escalas']          = (int) $v['Escalas'];
    $v['Precio_Base']      = (float) $v['Precio_Base'];
    $v['Importe_Total']    = (float) $v['Importe_Total'];
    $v['Hora_Salida']      = substr((string) $v['Hora_Salida'], 0, 5);
    $v['Duracion_Minutos'] = $min;
    $v['Duracion_Texto']   = $min % 60
        ? intdiv($min, 60) . ' h ' . ($min % 60) . ' min'
        : intdiv($min, 60) . ' h';
    // ISO-8601 para que el front lo formatee con Intl
    $v['Fecha_Hora_Salida']  = str_replace(' ', 'T', (string) $v['Fecha_Hora_Salida']);
    $v['Fecha_Hora_Llegada'] = str_replace(' ', 'T', (string) $v['Fecha_Hora_Llegada']);
    $v['Fecha_Hora_Regreso'] = str_replace(' ', 'T', (string) $v['Fecha_Hora_Regreso']);
    $v['Dias_Operacion']     = array_map('intval', str_split((string) $v['Dias_Operacion']));
    $vuelos[] = $v;
}

responder($vuelos);
