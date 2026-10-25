<?php
/* ============================================================================
 * SIGLV · api/contacto.php   ·   Formulario de contacto del sitio
 * ========================================================================= */
require __DIR__ . '/config.php';
exigir_metodo('POST');

$nombre  = param_str('Nombre');
$email   = param_str('Email');
$asunto  = mb_substr(param_str('Asunto'), 0, 80);
$mensaje = param_str('Mensaje');

if ($nombre === '' || $mensaje === '')            responder_error('Nombre y mensaje son obligatorios');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))   responder_error('Correo electrónico inválido');

db()->prepare('INSERT INTO contacto_mensaje (Nombre, Email, Asunto, Mensaje)
               VALUES (:n, :e, :a, :m)')
    ->execute([':n' => $nombre, ':e' => $email, ':a' => $asunto ?: null, ':m' => $mensaje]);

responder(['mensaje' => 'Mensaje recibido. Te contactamos en menos de 24 horas.']);
