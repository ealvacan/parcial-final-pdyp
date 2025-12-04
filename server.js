const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Worker } = require('worker_threads');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Almacenamiento de jugadores y salas
const jugadores = {};
const salas = {};
const palabrasPorTema = {
  animales: ['PERRO', 'GATO', 'ELEFANTE', 'JIRAFA', 'TIGRE', 'LEON', 'MONO', 'CEBRA'],
  tecnologia: ['COMPUTADORA', 'INTERNET', 'SOFTWARE', 'HARDWARE', 'PROGRAMACION', 'ALGORITMO', 'DATOS', 'RED'],
  paises: ['ARGENTINA', 'BRASIL', 'CANADA', 'DINAMARCA', 'EGIPTO', 'FRANCIA', 'ALEMANIA', 'INDIA'],
  deportes: ['FUTBOL', 'BASQUETBOL', 'TENIS', 'NATACION', 'CICLISMO', 'ATLETISMO', 'BOXEO', 'GOLF'],
  comida: ['PIZZA', 'HAMBURGUESA', 'SUSHI', 'TACOS', 'PAELLA', 'RISOTTO', 'EMPANADA', 'LASAGNA'],
  peliculas: ['TITANIC', 'AVATAR', 'STARWARS', 'RAPIDOS', 'TOY', 'FROZEN', 'SHREK', 'NEMO']
};

// Crear una nueva sala
function crearSala(idSala, tema, modoJuego, dificultad = 'medio') {
  // Determinar palabras según dificultad
  let palabras = palabrasPorTema[tema] || palabrasPorTema.animales;
  let cantidadPalabras;
  
  switch(dificultad) {
    case 'facil':
      cantidadPalabras = Math.min(5, palabras.length);
      break;
    case 'dificil':
      cantidadPalabras = Math.min(12, palabras.length);
      break;
    case 'medio':
    default:
      cantidadPalabras = Math.min(8, palabras.length);
  }
  
  // Seleccionar palabras aleatorias
  palabras = palabras.sort(() => 0.5 - Math.random()).slice(0, cantidadPalabras);
  
  salas[idSala] = {
    id: idSala,
    tema: tema,
    modoJuego: modoJuego,
    dificultad: dificultad,
    jugadores: [],
    palabras: palabras,
    tiempoInicio: null,
    tiempoTranscurrido: 0,
    tiempoLimite: modoJuego === 'contrarreloj' ? 120 : null, // 2 minutos para contrarreloj
    juegoActivo: false,
    tablero: null
  };
  return salas[idSala];
}

// Generar tablero usando workers
function generarTablero(palabras, dificultad = 'medio') {
  let tamaño;
  switch(dificultad) {
    case 'facil':
      tamaño = 10;
      break;
    case 'dificil':
      tamaño = 20;
      break;
    case 'medio':
    default:
      tamaño = 15;
  }
  
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'tableroWorker.js'), {
      workerData: { palabras, tamaño }
    });
    
    worker.on('message', (tablero) => {
      resolve(tablero);
    });
    
    worker.on('error', (error) => {
      reject(error);
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Iniciar juego en una sala
async function iniciarJuego(idSala) {
  const sala = salas[idSala];
  if (!sala || sala.jugadores.length === 0) return;
  
  sala.juegoActivo = true;
  sala.tiempoInicio = Date.now();
  
  try {
    
    let tableroCompartido = null;
    if (sala.modoJuego === 'cooperativo') {
      tableroCompartido = await generarTablero(sala.palabras, sala.dificultad);
    }
    
    
    for (const jugadorId of sala.jugadores) {
     
      const tablero = tableroCompartido || await generarTablero(sala.palabras, sala.dificultad);
      jugadores[jugadorId].tablero = tablero;
      jugadores[jugadorId].palabrasEncontradas = [];
      jugadores[jugadorId].puntuacion = 0;
      jugadores[jugadorId].powerUps = {
        pistas: 2,
        tiempoExtra: 1,
        revelar: 1
      };
      
      // Enviar tablero personalizado al jugador
      io.to(jugadorId).emit('inicioJuego', {
        tablero: tablero.grid,
        palabras: sala.palabras,
        tema: sala.tema,
        modoJuego: sala.modoJuego,
        dificultad: sala.dificultad,
        tiempoLimite: sala.tiempoLimite,
        powerUps: jugadores[jugadorId].powerUps
      });
    }
    
    // Iniciar contador de tiempo
    const intervaloTiempo = setInterval(() => {
      if (!sala.juegoActivo) {
        clearInterval(intervaloTiempo);
        return;
      }
      
      sala.tiempoTranscurrido = Math.floor((Date.now() - sala.tiempoInicio) / 1000);
      io.to(idSala).emit('actualizarTiempo', sala.tiempoTranscurrido);
      
      // Verificar si el tiempo se agotó en modo contrarreloj
      if (sala.modoJuego === 'contrarreloj' && sala.tiempoTranscurrido >= sala.tiempoLimite) {
        finalizarJuego(idSala);
      }
    }, 1000);
    
    sala.intervaloTiempo = intervaloTiempo;
  } catch (error) {
    console.error('Error al iniciar juego:', error);
    io.to(idSala).emit('error', 'No se pudo iniciar el juego');
  }
}

// Finalizar juego
function finalizarJuego(idSala) {
  const sala = salas[idSala];
  if (!sala) return;
  
  sala.juegoActivo = false;
  clearInterval(sala.intervaloTiempo);
  
  
  for (const jugadorId of sala.jugadores) {
    const jugador = jugadores[jugadorId];
    resultados.push({
      id: jugadorId,
      nombre: jugador.nombre,
      avatar: jugador.avatar,
      puntuacion: jugador.puntuacion,
      palabrasEncontradas: jugador.palabrasEncontradas.length
    });
  }
  
  // Ordenar por puntuación
  resultados.sort((a, b) => b.puntuacion - a.puntuacion);
  
  
  io.to(idSala).emit('finJuego', {
    resultados,
    tiempoTotal: sala.tiempoTranscurrido
  });
}

// Lógica de conexión de Socket.IO
io.on('connection', (socket) => {
  console.log('Nuevo jugador conectado:', socket.id);
  
  // Unirse a una sala
  socket.on('unirseSala', (data) => {
    const { idSala, nombre, tema, modoJuego, dificultad, avatar } = data;
    
    // Verificar si la sala existe
    if (!salas[idSala] && !tema) {
      
      socket.emit('error', 'La sala no existe. Verifica el código e intenta nuevamente.');
      return;
    }
    
  
    if (!salas[idSala]) {
      crearSala(idSala, tema, modoJuego, dificultad);
    }
    
    // Unir jugador a la sala
    socket.join(idSala);
    jugadores[socket.id] = {
      id: socket.id,
      nombre,
      avatar: avatar || 'default',
      sala: idSala,
      tablero: null,
      palabrasEncontradas: [],
      puntuacion: 0,
      powerUps: {
        pistas: 2,
        tiempoExtra: 1,
        revelar: 1
      }
    };
    
    salas[idSala].jugadores.push(socket.id);
    
    // Enviar información de la sala al jugador
    socket.emit('salaUnida', {
      idSala,
      tema: salas[idSala].tema,
      modoJuego: salas[idSala].modoJuego,
      dificultad: salas[idSala].dificultad,
      jugadores: salas[idSala].jugadores.map(id => ({
        nombre: jugadores[id].nombre,
        avatar: jugadores[id].avatar
      }))
    });
    
    // Notificar a otros jugadores
    socket.to(idSala).emit('jugadorUnido', { 
      nombre, 
      avatar: avatar || 'default' 
    });
    
    // Si hay suficientes jugadores, iniciar juego automáticamente
    if (salas[idSala].jugadores.length >= 2 && !salas[idSala].juegoActivo) {
      setTimeout(() => iniciarJuego(idSala), 2000);
    }
  });
  
  // Encontrar palabra
  socket.on('encontrarPalabra', (data) => {
    const { palabra } = data;
    const jugador = jugadores[socket.id];
    const sala = salas[jugador.sala];
    
    if (!sala || !sala.juegoActivo) return;
    
    // Convertir a mayúsculas para comparar
    const palabraEnMayusculas = palabra.toUpperCase();
    
    // Verificar si la palabra es válida y no ha sido encontrada
    if (sala.palabras.includes(palabraEnMayusculas) && !jugador.palabrasEncontradas.includes(palabraEnMayusculas)) {
      jugador.palabrasEncontradas.push(palabraEnMayusculas);
      
      // Calcular puntuación según tiempo y modo de juego
      let puntos = 100;
      
      if (sala.modoJuego === 'contrarreloj') {
        // En contrarreloj, los puntos dependen del tiempo restante
        const tiempoRestante = Math.max(0, sala.tiempoLimite - sala.tiempoTranscurrido);
        puntos += Math.floor(tiempoRestante * 2); 
      } else if (sala.modoJuego === 'cooperativo') {
        puntos = 50; 
      }
      
      // Bonificación por dificultad
      if (sala.dificultad === 'dificil') {
        puntos *= 1.5;
      } else if (sala.dificultad === 'facil') {
        puntos *= 0.8;
      }
      
      // Redondear puntos y sumar a la puntuación total
      const puntosRedondeados = Math.round(puntos);
      jugador.puntuacion += puntosRedondeados;
      
      // Enviar confirmación al jugador
      socket.emit('palabraEncontrada', {
        palabra: palabraEnMayusculas,
        puntuacion: puntosRedondeados,
        totalPuntos: jugador.puntuacion
      });
      
      // Notificar a otros jugadores
      socket.to(jugador.sala).emit('oponenteEncontroPalabra', {
        nombre: jugador.nombre,
        palabra: palabraEnMayusculas
      });
      
      // En modo cooperativo, marcar la palabra como encontrada para todos los jugadores
      if (sala.modoJuego === 'cooperativo') {
        for (const jugadorId of sala.jugadores) {
          if (!jugadores[jugadorId].palabrasEncontradas.includes(palabraEnMayusculas)) {
            jugadores[jugadorId].palabrasEncontradas.push(palabraEnMayusculas);
            
            // Notificar a cada jugador que se ha encontrado una palabra
            io.to(jugadorId).emit('palabraEncontradaCooperativa', {
              palabra: palabraEnMayusculas,
              encontradoPor: jugador.nombre
            });
          }
        }
      }
      
      // Verificar si el juego ha terminado
      if (sala.modoJuego === 'cooperativo') {
        // En cooperativo, el juego termina cuando todas las palabras han sido encontradas por el equipo
        const todasPalabrasEncontradas = sala.palabras.every(palabra => 
          jugadores[sala.jugadores[0]].palabrasEncontradas.includes(palabra)
        );
        
        if (todasPalabrasEncontradas) {
          finalizarJuego(jugador.sala);
        }
      } else {
        // En otros modos (clásico y contrarreloj), el juego termina cuando un jugador encuentra todas las palabras
        if (jugador.palabrasEncontradas.length === sala.palabras.length) {
          finalizarJuego(jugador.sala);
        }
      }
    }
  });
  
  // Enviar mensaje de chat
  socket.on('enviarMensajeChat', (data) => {
    const { mensaje } = data;
    const jugador = jugadores[socket.id];
    
    if (!jugador || !mensaje.trim()) return;
    
    // Enviar el mensaje a todos los jugadores de la sala
    io.to(jugador.sala).emit('mensajeChat', {
      autor: jugador.nombre,
      mensaje: mensaje.trim()
    });
  });
  
  // Usar power-up
  socket.on('usarPowerUp', (data) => {
    const { tipo } = data;
    const jugador = jugadores[socket.id];
    
    if (!jugador || !jugador.powerUps[tipo] || jugador.powerUps[tipo] <= 0) {
      socket.emit('error', 'No tienes este power-up disponible');
      return;
    }
    
    jugador.powerUps[tipo]--;
    
    switch (tipo) {
      case 'pistas':
        // Enviar una pista (resaltar una letra de una palabra no encontrada)
        const sala = salas[jugador.sala];
        const palabrasNoEncontradas = sala.palabras.filter(p => !jugador.palabrasEncontradas.includes(p));
        if (palabrasNoEncontradas.length > 0) {
          const palabraAleatoria = palabrasNoEncontradas[Math.floor(Math.random() * palabrasNoEncontradas.length)];
          const posicion = jugador.tablero.soluciones.find(s => s.palabra === palabraAleatoria);
          if (posicion) {
            socket.emit('pista', {
              palabra: palabraAleatoria,
              posicion: {
                fila: posicion.inicio.fila,
                columna: posicion.inicio.columna
              }
            });
          }
        }
        break;
        
      case 'tiempoExtra':
        // Añadir tiempo en modo contrarreloj
        if (salas[jugador.sala].modoJuego === 'contrarreloj') {
          salas[jugador.sala].tiempoInicio -= 30000; // 30 segundos extra
          socket.emit('tiempoExtraAgregado');
        }
        break;
        
      case 'revelar':
        // Revelar una palabra aleatoria no encontrada
        const salaRevelar = salas[jugador.sala];
        const palabrasNoEncontradasRevelar = salaRevelar.palabras.filter(p => !jugador.palabrasEncontradas.includes(p));
        if (palabrasNoEncontradasRevelar.length > 0) {
          const palabraRevelar = palabrasNoEncontradasRevelar[Math.floor(Math.random() * palabrasNoEncontradasRevelar.length)];
          const solucion = jugador.tablero.soluciones.find(s => s.palabra === palabraRevelar);
          if (solucion) {
            socket.emit('palabraRevelada', {
              palabra: palabraRevelar,
              posicion: solucion
            });
            
            // En modo cooperativo, marcar la palabra como encontrada para todos los jugadores
            if (salaRevelar.modoJuego === 'cooperativo') {
              for (const jugadorId of salaRevelar.jugadores) {
                if (!jugadores[jugadorId].palabrasEncontradas.includes(palabraRevelar)) {
                  jugadores[jugadorId].palabrasEncontradas.push(palabraRevelar);
                  
                  // Notificar a cada jugador que se ha encontrado una palabra
                  io.to(jugadorId).emit('palabraEncontradaCooperativa', {
                    palabra: palabraRevelar,
                    encontradoPor: "Power-up"
                  });
                }
              }
            }
          }
        }
        break;
    }
    
    // Actualizar power-ups en el cliente
    socket.emit('powerUpsActualizados', jugador.powerUps);
  });
  
  // Resolver sopa de letras
  socket.on('resolver', () => {
    const jugador = jugadores[socket.id];
    if (!jugador || !jugador.tablero) return;
    
    socket.emit('solucion', {
      soluciones: jugador.tablero.soluciones
    });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log('Jugador desconectado:', socket.id);
    
    if (jugadores[socket.id]) {
      const salaId = jugadores[socket.id].sala;
      const sala = salas[salaId];
      
      if (sala) {
        // Eliminar jugador de la sala
        sala.jugadores = sala.jugadores.filter(id => id !== socket.id);
        
        // Notificar a otros jugadores
        socket.to(salaId).emit('jugadorDesconectado', {
          nombre: jugadores[socket.id].nombre
        });
        
        // Si no quedan jugadores, eliminar la sala
        if (sala.jugadores.length === 0) {
          if (sala.intervaloTiempo) clearInterval(sala.intervaloTiempo);
          delete salas[salaId];
        } else if (sala.juegoActivo && sala.jugadores.length === 1) {
          // Si solo queda un jugador y el juego está activo, finalizar
          finalizarJuego(salaId);
        }
      }
      
      // Eliminar jugador
      delete jugadores[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});