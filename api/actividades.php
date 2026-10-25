<?php
/* ============================================================================
 * SIGLV · api/actividades.php
 * SUBPROCESO 3.1 · Buscar actividades cercanas  (paso=cercanas)
 * SUBPROCESO 3.2 · Verificar cupos y horarios   (paso=viables)
 * Almacén: AC (tabla actividad)
 * ========================================================================= */
require __DIR__ . '/config.php';

$paso = param_str('paso', 'cercanas');

if ($paso === 'cercanas') {
    /* 3.1 · List<Actividad_Cercana> ordenada por distancia al hotel */
    $ciudad = strtoupper(param_str('ciudad'));
    $radio  = param_num('radio', 30);
    if (!$ciudad) responder_error('Falta la ciudad del hotel seleccionado');

    $st = db()->prepare(
        'SELECT * FROM actividad
          WHERE Ciudad = :ciudad AND Distancia_Hotel <= :radio
          ORDER BY Distancia_Hotel ASC');
    $st->execute([':ciudad' => $ciudad, ':radio' => $radio]);

    responder(array_map('normalizar_actividad', $st->fetchAll()));
}

if ($paso === 'viables') {
    /* 3.2 · Asigna Fecha_Ejecucion dentro de la ventana del viaje y marca
     *       Compatible_Horario según cupos y fechas.                         */
    $ids   = array_values(array_filter(array_map('trim', explode(',', param_str('ids')))));
    $desde = param_str('desde');
    $hasta = param_str('hasta');
    $pax   = max(param_int('pax', 1), 1);

    if (!$ids) responder([]);
    if (!fecha_valida($desde) || !fecha_valida($hasta))
        responder_error('Ventana de fechas inválida');

    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("SELECT * FROM actividad WHERE Id_Actividad IN ($marcas)
                          ORDER BY Distancia_Hotel ASC");
    $st->execute($ids);
    $filas = $st->fetchAll();

    /* Días disponibles de la estancia */
    $dias  = [];
    $total = max(dias_entre($desde, $hasta), 0);
    for ($i = 0; $i <= $total; $i++) {
        $dias[] = (new DateTime($desde))->modify("+$i day")->format('Y-m-d');
    }

    $salida = [];
    foreach ($filas as $idx => $a) {
        $a = normalizar_actividad($a);
        $compatible = true;
        $motivo     = '';

        if ($a['Operacion_Diaria']) {
            // reparte los tours a lo largo de la estancia, evitando el día de llegada
            $base  = count($dias) > 1 ? 1 : 0;
            $pos   = min($base + ($idx % max(count($dias) - $base, 1)), count($dias) - 1);
            $fecha = $dias[$pos];
        } else {
            $fecha = $a['Fecha_Ejecucion'];
            if (!$fecha || dias_entre($desde, $fecha) < 0 || dias_entre($fecha, $hasta) < 0) {
                $compatible = false;
                $motivo     = 'Fecha fija fuera de la ventana del viaje';
            }
        }

        if ($a['Cupos_Libres'] < $pax) {
            $compatible = false;
            $motivo = $a['Cupos_Libres'] === 0
                ? 'Sin cupos disponibles'
                : "Sólo {$a['Cupos_Libres']} cupos libres";
        }

        $salida[] = [
            'Id_Actividad'       => $a['Id_Actividad'],
            'Nombre_Tour'        => $a['Nombre_Tour'],
            'Ubicacion'          => $a['Ubicacion'],
            'Distancia_Hotel'    => $a['Distancia_Hotel'],
            'Tipo'               => $a['Tipo'],
            'Fecha_Ejecucion'    => $fecha,
            'Hora_Inicio'        => $a['Hora_Inicio'],
            'Duracion_Estimada'  => $a['Duracion_Estimada'],
            'Costo_Persona'      => $a['Costo_Persona'],
            'Cupos_Maximos'      => $a['Cupos_Maximos'],
            'Cupos_Libres'       => $a['Cupos_Libres'],
            'Compatible_Horario' => $compatible,
            'Motivo_No_Viable'   => $motivo,
        ];
    }

    responder($salida);
}

responder_error('Paso no reconocido: use cercanas o viables');

/* ------------------------------------------------------------------------ */
function normalizar_actividad(array $a): array {
    $a['Distancia_Hotel']   = (float) $a['Distancia_Hotel'];
    $a['Costo_Persona']     = (float) $a['Costo_Persona'];
    $a['Cupos_Maximos']     = (int)   $a['Cupos_Maximos'];
    $a['Cupos_Libres']      = (int)   $a['Cupos_Libres'];
    $a['Operacion_Diaria']  = (bool)  $a['Operacion_Diaria'];
    $a['Hora_Inicio']       = substr((string) $a['Hora_Inicio'], 0, 5);
    $a['Duracion_Estimada'] = substr((string) $a['Duracion_Estimada'], 0, 5);
    return $a;
}
