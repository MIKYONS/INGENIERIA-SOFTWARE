<?php
/* ============================================================================
 * SIGLV · api/catalogo.php
 * Lectura directa de los almacenes para la pantalla "Catálogo".
 *   ?almacen=VU | HT | AC | PR | RE
 * ========================================================================= */
require __DIR__ . '/config.php';

$almacenes = [
    'VU' => 'SELECT * FROM vuelo ORDER BY Origen, Destino, Precio_Base',
    'HT' => 'SELECT * FROM hotel ORDER BY Ciudad, Tarifa_Noche',
    'AC' => 'SELECT * FROM actividad ORDER BY Ciudad, Distancia_Hotel',
    'PR' => 'SELECT * FROM precio_bloqueado ORDER BY Tipo_Servicio, Id_Referencia',
    'RE' => 'SELECT * FROM reserva ORDER BY Fecha_Reserva DESC, Id_Reserva DESC LIMIT 300',
];

$almacen = strtoupper(param_str('almacen', 'VU'));
if (!isset($almacenes[$almacen])) {
    responder_error('Almacén no reconocido. Use VU, HT, AC, PR o RE');
}

$filas = db()->query($almacenes[$almacen])->fetchAll();

/* Normaliza tipos numéricos para que el front los reciba como números */
$enteros   = ['Escalas','Asientos_Disponibles','Categoria','Nivel_Seguridad',
              'Habitaciones_Libres','Cupos_Maximos','Cupos_Libres','N_Personas',
              'Duracion_Minutos','Operacion_Diaria'];
$decimales = ['Precio_Base','Tarifa_Noche','Costo_Persona','Distancia_Destino',
              'Distancia_Hotel','Precio_Unitario','Porcentaje_Impuesto','Monto_Reserva'];
$horas     = ['Hora_Salida','Hora_Inicio','Duracion_Estimada'];

$filas = array_map(static function (array $f) use ($enteros, $decimales, $horas): array {
    foreach ($enteros   as $c) if (isset($f[$c])) $f[$c] = (int)   $f[$c];
    foreach ($decimales as $c) if (isset($f[$c])) $f[$c] = (float) $f[$c];
    foreach ($horas     as $c) if (isset($f[$c])) $f[$c] = substr((string) $f[$c], 0, 5);
    if (isset($f['Dias_Operacion'])) {
        $f['Dias_Operacion'] = array_map('intval', str_split((string) $f['Dias_Operacion']));
    }
    return $f;
}, $filas);

responder($filas);
