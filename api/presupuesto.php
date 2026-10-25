<?php
/* ============================================================================
 * SIGLV · api/presupuesto.php   ·   PROCESO 4.0 Emitir presupuesto
 *   paso=consolidar → 4.1 Consolidar reservas   (lee RE)
 *   paso=calcular   → 4.2 Calcular costo total  (lee PR)
 *   paso=impuestos  → 4.3 Aplicar impuestos
 *   paso=emitir     → 4.4 Emitir presupuesto    (escribe cotizacion)
 *   paso=listar     → cotizaciones emitidas
 * ========================================================================= */
require __DIR__ . '/config.php';

$paso = param_str('paso', 'consolidar');

/* ======================= 4.1 CONSOLIDAR RESERVAS ======================= */
if ($paso === 'consolidar') {
    $iti = param_str('Id_Itinerario');
    if ($iti === '') responder_error('Falta Id_Itinerario');

    $st = db()->prepare("SELECT * FROM reserva
                          WHERE Id_Itinerario = :i AND Estado_Reserva <> 'Cancelado'
                          ORDER BY FIELD(Tipo_Servicio,'VUELO','HOTEL','ACTIVIDAD'), Id_Reserva");
    $st->execute([':i' => $iti]);
    $reservas = $st->fetchAll();

    $subtotal = 0.0;
    foreach ($reservas as &$r) {
        $r['N_Personas']    = (int)   $r['N_Personas'];
        $r['Monto_Reserva'] = (float) $r['Monto_Reserva'];
        $subtotal          += $r['Monto_Reserva'];
    }
    unset($r);

    responder([
        'Id_Consolidado'          => 'CON-' . date('Y') . '-' . substr(md5($iti), 0, 4),
        'Id_Itinerario'           => $iti,
        'Reservas'                => $reservas,
        'N_Reservas'              => count($reservas),
        'Monto_Subtotal_Reservas' => round($subtotal, 2),
    ]);
}

/* ======================== 4.2 CALCULAR COSTO TOTAL ===================== */
if ($paso === 'calcular') {
    $iti = param_str('Id_Itinerario');
    if ($iti === '') responder_error('Falta Id_Itinerario');

    $cab = db()->prepare('SELECT * FROM itinerario WHERE Id_Itinerario = :i');
    $cab->execute([':i' => $iti]);
    $itinerario = $cab->fetch();
    if (!$itinerario) responder_error('Itinerario no encontrado', 404);

    $noches  = max(dias_entre((string) $itinerario['Fecha_Salida'], (string) $itinerario['Fecha_Regreso']), 1);
    $cuartos = max((int) $itinerario['Habitaciones'], 1);

    $st = db()->prepare("SELECT * FROM reserva
                          WHERE Id_Itinerario = :i AND Estado_Reserva <> 'Cancelado'");
    $st->execute([':i' => $iti]);
    $reservas = $st->fetchAll();

    /* Tarifa vigente en PR, o precio de catálogo como respaldo */
    $tarifa = db()->prepare(
        'SELECT Id_Tarifa, Precio_Unitario, Porcentaje_Impuesto
           FROM precio_bloqueado
          WHERE Tipo_Servicio = :t AND Id_Referencia = :r
            AND CURDATE() BETWEEN Fecha_Vigencia_Inicio AND Fecha_Vigencia_Fin
          ORDER BY Fecha_Vigencia_Inicio DESC LIMIT 1');

    $catalogo = [
        'VUELO'     => db()->prepare('SELECT Precio_Base   AS p, CONCAT(Aerolinea," ",Id_Vuelo) AS d FROM vuelo     WHERE Id_Vuelo = :r'),
        'HOTEL'     => db()->prepare('SELECT Tarifa_Noche  AS p, Nombre_Comercial               AS d FROM hotel     WHERE Id_Hotel = :r'),
        'ACTIVIDAD' => db()->prepare('SELECT Costo_Persona AS p, Nombre_Tour                    AS d FROM actividad WHERE Id_Actividad = :r'),
    ];

    $detalle = [];
    $cv = $ch = $ca = 0.0;

    foreach ($reservas as $r) {
        $tipo = $r['Tipo_Servicio'];
        $tarifa->execute([':t' => $tipo, ':r' => $r['Id_Referencia']]);
        $t = $tarifa->fetch();

        $catalogo[$tipo]->execute([':r' => $r['Id_Referencia']]);
        $base = $catalogo[$tipo]->fetch() ?: ['p' => 0, 'd' => $r['Id_Referencia']];

        $unitario = $t ? (float) $t['Precio_Unitario'] : (float) $base['p'];
        $cantidad = $tipo === 'HOTEL' ? $noches * $cuartos : (int) $r['N_Personas'];
        $importe  = round($unitario * $cantidad, 2);

        if ($tipo === 'VUELO')          $cv += $importe;
        elseif ($tipo === 'HOTEL')      $ch += $importe;
        else                            $ca += $importe;

        $detalle[] = [
            'Tipo_Servicio'   => $tipo,
            'Id_Referencia'   => $r['Id_Referencia'],
            'Id_Reserva'      => $r['Id_Reserva'],
            'Descripcion'     => $r['Descripcion'] ?: $base['d'],
            'Id_Tarifa'       => $t ? $t['Id_Tarifa'] : 'catálogo',
            'Precio_Unitario' => $unitario,
            'Cantidad'        => $cantidad,
            'Importe'         => $importe,
            'Bloqueado'       => (bool) $t,
        ];
    }

    responder([
        'Id_Calculo'        => 'CAL-' . date('Y') . '-' . substr(md5($iti . date('His')), 0, 4),
        'Id_Itinerario'     => $iti,
        'Costo_Vuelos'      => round($cv, 2),
        'Costo_Hoteles'     => round($ch, 2),
        'Costo_Actividades' => round($ca, 2),
        'Subtotal'          => round($cv + $ch + $ca, 2),
        'Detalle'           => $detalle,
        'Fecha_Calculo'     => date('Y-m-d'),
    ]);
}

/* ========================= 4.3 APLICAR IMPUESTOS ======================= */
if ($paso === 'impuestos') {
    $subtotal = param_num('Subtotal', 0);
    $pax      = max(param_int('pax', 1), 1);
    if ($subtotal <= 0) responder_error('Subtotal inválido para el cálculo de impuestos');

    $pct   = (float) parametro('porcentaje_iva', 16);
    $tasa  = (float) parametro('tasa_aeroportuaria', 1250);
    $iva   = round($subtotal * $pct / 100, 2);
    $tasas = round($tasa * $pax, 2);

    responder([
        'Id_Calculo'           => param_str('Id_Calculo'),
        'Subtotal'             => round($subtotal, 2),
        'Porcentaje_IVA'       => $pct,
        'Monto_IVA'            => $iva,
        'Tasas_Aeroportuarias' => $tasas,
        'Monto_Impuestos'      => round($iva + $tasas, 2),
        'Costo_Final'          => round($subtotal + $iva + $tasas, 2),
    ]);
}

/* ======================== 4.4 EMITIR PRESUPUESTO ======================= */
if ($paso === 'emitir') {
    exigir_metodo('POST');

    $iti = param_str('Id_Itinerario');
    if ($iti === '') responder_error('Falta Id_Itinerario');

    $cab = db()->prepare('SELECT * FROM itinerario WHERE Id_Itinerario = :i');
    $cab->execute([':i' => $iti]);
    $itinerario = $cab->fetch();
    if (!$itinerario) responder_error('Itinerario no encontrado', 404);

    $cv      = param_num('Costo_Vuelos', 0);
    $ch      = param_num('Costo_Hoteles', 0);
    $ca      = param_num('Costo_Actividades', 0);
    $sub     = $cv + $ch + $ca;
    $pct     = (float) parametro('porcentaje_iva', 16);
    $iva     = param_num('Monto_IVA', round($sub * $pct / 100, 2));
    $tasas   = param_num('Tasas_Aeroportuarias',
                   (float) parametro('tasa_aeroportuaria', 1250) * (int) $itinerario['N_Pasajeros']);
    $vigencia = (int) parametro('validez_oferta_dias', 15);
    $detalle  = param('Detalle', []);

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $folio = nuevo_folio('COT', 'cotizacion', 'Id_Cotizacion');
        $vence = (new DateTime())->modify("+$vigencia day")->format('Y-m-d');

        $pdo->prepare(
            'INSERT INTO cotizacion (Id_Cotizacion, Id_Itinerario, Id_Cliente, Fecha_Emision,
                 Costo_Vuelos, Costo_Hoteles, Costo_Actividades, Subtotal, Porcentaje_IVA,
                 Monto_IVA, Tasas_Aeroportuarias, Monto_Impuestos, Monto_Total,
                 Validez_Oferta, Vence_El, Estado)
             VALUES (:folio, :iti, :cli, CURDATE(), :cv, :ch, :ca, :sub, :pct, :iva, :tasas,
                     :imp, :total, :vig, :vence, "Emitido")')
            ->execute([
                ':folio' => $folio, ':iti' => $iti, ':cli' => $itinerario['Id_Cliente'],
                ':cv' => $cv, ':ch' => $ch, ':ca' => $ca, ':sub' => $sub, ':pct' => $pct,
                ':iva' => $iva, ':tasas' => $tasas, ':imp' => $iva + $tasas,
                ':total' => $sub + $iva + $tasas, ':vig' => $vigencia, ':vence' => $vence,
            ]);

        if (is_array($detalle) && $detalle) {
            $ins = $pdo->prepare(
                'INSERT INTO cotizacion_detalle (Id_Cotizacion, Tipo_Servicio, Id_Referencia,
                     Id_Reserva, Id_Tarifa, Descripcion, Precio_Unitario, Cantidad, Importe)
                 VALUES (:folio, :tipo, :ref, :res, :tar, :desc, :uni, :cant, :imp)');
            foreach ($detalle as $d) {
                $ins->execute([
                    ':folio' => $folio,
                    ':tipo'  => $d['Tipo_Servicio'],
                    ':ref'   => $d['Id_Referencia'],
                    ':res'   => $d['Id_Reserva'] ?? null,
                    ':tar'   => (!empty($d['Bloqueado']) ? $d['Id_Tarifa'] : null),
                    ':desc'  => mb_substr((string) ($d['Descripcion'] ?? ''), 0, 160),
                    ':uni'   => (float) $d['Precio_Unitario'],
                    ':cant'  => (float) $d['Cantidad'],
                    ':imp'   => (float) $d['Importe'],
                ]);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        responder_error('No se pudo emitir el presupuesto: ' . $e->getMessage(), 500);
    }

    responder([
        'Id_Cotizacion'        => $folio,
        'Id_Itinerario'        => $iti,
        'Id_Cliente'           => $itinerario['Id_Cliente'],
        'Fecha_Emision'        => date('Y-m-d'),
        'Costo_Vuelos'         => round($cv, 2),
        'Costo_Hoteles'        => round($ch, 2),
        'Costo_Actividades'    => round($ca, 2),
        'Subtotal'             => round($sub, 2),
        'Porcentaje_IVA'       => $pct,
        'Monto_IVA'            => round($iva, 2),
        'Tasas_Aeroportuarias' => round($tasas, 2),
        'Monto_Impuestos'      => round($iva + $tasas, 2),
        'Monto_Total'          => round($sub + $iva + $tasas, 2),
        'Validez_Oferta'       => $vigencia,
        'Vence_El'             => $vence,
        'Detalle'              => $detalle,
        'Estado'               => 'Emitido',
    ]);
}

/* ====================== Cotizaciones ya emitidas ======================= */
if ($paso === 'listar') {
    $st = db()->query('SELECT * FROM v_cotizacion_reporte ORDER BY Fecha_Emision DESC LIMIT 100');
    responder($st->fetchAll());
}

responder_error('Paso no reconocido: consolidar, calcular, impuestos, emitir o listar');
