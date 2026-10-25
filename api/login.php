<?php
/* ============================================================================
 * SIGLV · api/login.php   ·   Sesión del agente (sustituye al localStorage)
 *   POST {Email, Password}   → inicia sesión
 *   GET  ?accion=yo          → datos de la sesión activa
 *   GET  ?accion=salir       → cierra la sesión
 * ========================================================================= */
require __DIR__ . '/config.php';
session_start();

$accion = param_str('accion');

if ($accion === 'salir') {
    session_destroy();
    responder(['mensaje' => 'Sesión cerrada']);
}

if ($accion === 'yo') {
    if (empty($_SESSION['Id_Usuario'])) responder_error('Sin sesión activa', 401);
    responder([
        'Id_Usuario' => $_SESSION['Id_Usuario'],
        'Nombre'     => $_SESSION['Nombre'],
        'Email'      => $_SESSION['Email'],
        'Rol'        => $_SESSION['Rol'],
    ]);
}

exigir_metodo('POST');

$email = param_str('Email');
$pass  = (string) param('Password', '');
if ($email === '' || $pass === '') responder_error('Email y contraseña son obligatorios');

$st = db()->prepare('SELECT * FROM usuario WHERE Email = :e AND Activo = 1');
$st->execute([':e' => $email]);
$u = $st->fetch();

// Mensaje genérico: no se revela si el correo existe
if (!$u || !password_verify($pass, $u['Password_Hash'])) {
    responder_error('Credenciales incorrectas', 401);
}

session_regenerate_id(true);
$_SESSION['Id_Usuario'] = (int) $u['Id_Usuario'];
$_SESSION['Nombre']     = $u['Nombre'];
$_SESSION['Email']      = $u['Email'];
$_SESSION['Rol']        = $u['Rol'];

responder([
    'Id_Usuario' => (int) $u['Id_Usuario'],
    'Nombre'     => $u['Nombre'],
    'Email'      => $u['Email'],
    'Rol'        => $u['Rol'],
]);
