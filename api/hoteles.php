<?php
/* ============================================================================
 * SIGLV · api/hoteles.php
 * SUBPROCESO 2.1 · Filtrar por cercanía   (paso=cercania)
 * SUBPROCESO 2.2 · Filtrar por seguridad  (paso=seguridad)
 * Almacén: HT (tabla hotel)
 * ========================================================================= */
require __DIR__ . '/config.php';

$paso = param_str('paso', 'cercania');

if ($paso === 'cercania') {
    /* -------- 2.1 Hoteles cercanos --------
     * Referencia geográfica: el Destino del Vuelo seleccionado.
     * Salida: List<Hotel_Cercano> = Id_Hotel + Nombre_Comercial + Ubicacion +
     *         Distancia_Destino + Categoria                                  */
    $destino = strtoupper(param_str('destino'));
    $radio   = param_num('radio', 15);
    if (!$destino) responder_error('Falta el destino del vuelo seleccionado');

    $st = db()->prepare(
        'SELECT Id_Hotel, Nombre_Comercial, Ubicacion, Distancia_Destino, Categoria
           FROM hotel
          WHERE Ciudad = :ciudad AND Distancia_Destino <= :radio
          ORDER BY Distancia_Destino ASC');
    $st->execute([':ciudad' => $destino, ':radio' => $radio]);

    $filas = array_map(static function (array $h): array {
        $h['Distancia_Destino'] = (float) $h['Distancia_Destino'];
        $h['Categoria']         = (int)   $h['Categoria'];
        return $h;
    }, $st->fetchAll());

    responder($filas);
}

if ($paso === 'seguridad') {
    /* -------- 2.2 Hoteles seguros --------
     * Valida disponibilidad y nivel de seguridad; calcula Costo_Estancia.    */
    $ids          = array_values(array_filter(array_map('trim', explode(',', param_str('ids')))));
    $nivel        = param_int('nivel', 3);
    $noches       = max(param_int('noches', 1), 1);
    $habitaciones = max(param_int('habitaciones', 1), 1);
    if (!$ids) responder([]);

    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT *, (Tarifa_Noche * ? * ?) AS Costo_Estancia
              FROM hotel
             WHERE Id_Hotel IN ($marcas)
               AND Nivel_Seguridad >= ?
               AND Habitaciones_Libres >= ?
             ORDER BY Tarifa_Noche ASC";

    $st = db()->prepare($sql);
    $st->execute(array_merge([$noches, $habitaciones], $ids, [$nivel, $habitaciones]));

    $filas = array_map(static function (array $h): array {
        $h['Distancia_Destino']   = (float) $h['Distancia_Destino'];
        $h['Tarifa_Noche']        = (float) $h['Tarifa_Noche'];
        $h['Costo_Estancia']      = (float) $h['Costo_Estancia'];
        $h['Categoria']           = (int)   $h['Categoria'];
        $h['Nivel_Seguridad']     = (int)   $h['Nivel_Seguridad'];
        $h['Habitaciones_Libres'] = (int)   $h['Habitaciones_Libres'];
        return $h;
    }, $st->fetchAll());

    responder($filas);
}

responder_error('Paso no reconocido: use cercania o seguridad');
