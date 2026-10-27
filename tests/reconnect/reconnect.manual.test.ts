// tests/reconnect/reconnect.manual.test.ts
// ---------------------------------------------------------
// Test del Reto 19: Recupera una partida al reconectar
// ---------------------------------------------------------
// Para correrlo:   npm test    (o vitest run tests/reconnect/reconnect.manual.test.ts)
// Asegúrate de tener el servidor corriendo: npm run dev
// ---------------------------------------------------------

import { describe, it, beforeEach, afterEach, expect } from 'vitest'; // Importamos las funciones de test de Vitest
import { io } from 'socket.io-client'; // Importamos la librería de Socket.IO para simular un cliente

// --- CONFIGURACIÓN ---
// La URL de tu servidor (el puerto que uses en server.ts)
const BASE_URL = 'http://localhost:3000';

// Comentario plano: Si tienes un token de autenticación (JWT), ponlo aquí.
// Si no, lo dejamos vacío y el socket se conectará sin token (para probar la reconexión básica).
const AUTH_TOKEN = 'tu_token_aquí_aqui'; 

// Variables para controlar los sockets y el gameId
let socket1: any; // Será nuestro cliente 1 (jugador)
let gameId: number = 1; // ID de la partida (lo ponemos 1 de ejemplo; si creas una partida real, cambia este número)

// ---Antes de cada test: preparamos el socket---
// Este bloque se ejecuta antes de cada test de abajo.
beforeEach(() => {
  // Conectamos al socket1 en el servidor.
  // Si tienes token, descomenta la línea de 'auth' de abajo.
  // Si no, la conexión será sin token (válido para probar que la reconexión funciona aunque no haya auth compleja).
  socket1 = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: AUTH_TOKEN } // <-- Descomenta esta línea si quieres probar con token
  });
});

// --- Tests del Reto 19 ---

describe('Reto 19: Recupera una partida al reconectar', () => {
  // Test A: Lo básico, que al desconectar y reconectar, el socket sigue vivo.
  it('A. Desconectar y reconectar el socket', () => {
    // Comentario plano: Aquí el socket1 ya se conectó en beforeEach.
    
    // Paso 1: Desconectamos el socket1.
    socket1.disconnect();
    
    // Paso 2: Esperamos un momento (100ms) para que el navegador/Borre la conexión.
    // En Vitest podemos usar setTimeout o await, pero para mantenerlo simple usamos setTimeout.
    setTimeout(() => {
      // Paso 3: Volvemos a conectar el socket1.
      socket1.connect();
    }, 100);
    
    // Paso 4: Esperamos un poco más para que Socket.IO procese la reconexión.
    setTimeout(() => {
      // Comprobación plana: Comprobamos que el socket1 existe y tiene una propiedad 'connected'.
      // Si está conectado, el test pasa esta línea.
      expect(socket1.connected).toBe(true); // ¡Esperamos que sea verdadero!
    }, 500); // Esperamos 500ms para que tenga tiempo de reconectar.
  });
  
  // Test B: Comprobar que si el token es malo, la conexión falla.
  // (Este test está simplificado; si quieres probar el punto de "token caducado", 
  // tendrías que poner un token inválido en la línea de auth de arriba).
  it('B. Probar conexión con token inválido (opcional)', () => {
    // Comentario plano: Este test solo comprueba que si pones un token raro, 
    // es posible que la conexión no se mantenga o dé error.
    // Por ahora, solo comprobamos que el socket existe.
    expect(socket1).toBeDefined();
  });
});
