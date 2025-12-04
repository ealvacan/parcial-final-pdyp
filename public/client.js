document.addEventListener('DOMContentLoaded', () => {
    // Conexión con Socket.IO
    const socket = io();
    
    // Elementos del DOM
    const pantallas = {
        inicio: document.getElementById('pantalla-inicio'),
        sala: document.getElementById('pantalla-sala'),
        juego: document.getElementById('pantalla-juego'),
        resultados: document.getElementById('pantalla-resultados')
    };
    
    // Elementos de las pestañas
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Elementos para crear sala
    const nombreCreadorInput = document.getElementById('nombre-creador');
    const temaCrearSelect = document.getElementById('tema-crear');
    const modoJuegoCrearSelect = document.getElementById('modo-juego-crear');
    const dificultadCrearSelect = document.getElementById('dificultad-crear');
    const avatarCrearInput = document.getElementById('avatar-crear');
    const btnCrearSala = document.getElementById('btn-crear-sala');
    
    // Elementos para unirse a sala
    const codigoSalaInput = document.getElementById('codigo-sala');
    const nombreUnirseInput = document.getElementById('nombre-unirse');
    const avatarUnirseInput = document.getElementById('avatar-unirse');
    const btnUnirseSala = document.getElementById('btn-unirse-sala');
    
    // Modal para mostrar código de sala
    const modal = document.getElementById('modal-codigo-sala');
    const codigoSalaMostrar = document.getElementById('codigo-sala-mostrar');
    const btnCopiarCodigo = document.getElementById('btn-copiar-codigo');
    const btnIrASala = document.getElementById('btn-ir-a-sala');
    
    // Elementos de la pantalla de sala
    const idSalaMostrar = document.getElementById('id-sala-mostrar');
    const temaMostrar = document.getElementById('tema-mostrar');
    const modoJuegoMostrar = document.getElementById('modo-juego-mostrar');
    const dificultadMostrar = document.getElementById('dificultad-mostrar');
    const listaJugadores = document.getElementById('lista-jugadores');
    
    // Elementos de la pantalla de juego
    const avatarJugador = document.getElementById('avatar-jugador');
    const nombreJugadorMostrar = document.getElementById('nombre-jugador-mostrar');
    const puntuacionSpan = document.getElementById('puntuacion');
    const tiempoSpan = document.getElementById('tiempo-transcurrido');
    const tableroDiv = document.getElementById('tablero');
    const listaPalabras = document.getElementById('lista-palabras');
    const btnResolver = document.getElementById('btn-resolver');
    const btnLimpiarSeleccion = document.getElementById('btn-limpiar-seleccion');
    const btnPista = document.getElementById('btn-pista');
    const btnTiempo = document.getElementById('btn-tiempo');
    const btnRevelar = document.getElementById('btn-revelar');
    const pistasDisponibles = document.getElementById('pistas-disponibles');
    const tiempoDisponible = document.getElementById('tiempo-disponible');
    const revelarDisponible = document.getElementById('revelar-disponible');
    const mensajesChat = document.getElementById('mensajes-chat');
    const inputChat = document.getElementById('input-chat');
    const btnEnviarChat = document.getElementById('btn-enviar-chat');
    
    // Elementos de la pantalla de resultados
    const ganadorAvatar = document.getElementById('ganador-avatar');
    const ganadorNombre = document.getElementById('ganador-nombre');
    const ganadorPuntuacion = document.getElementById('ganador-puntuacion');
    const ganadorPalabras = document.getElementById('ganador-palabras');
    const tablaResultados = document.querySelector('#tabla-resultados tbody');
    const btnJugarNuevamente = document.getElementById('btn-jugar-nuevamente');
    const btnSalir = document.getElementById('btn-salir');
    
    // Elementos de audio
    const soundFound = document.getElementById('sound-found');
    const soundPowerup = document.getElementById('sound-powerup');
    const soundGameover = document.getElementById('sound-gameover');
    const soundBackground = document.getElementById('sound-background');
    
    
    soundBackground.volume = 0.3; 
    
    // Variables de estado
    let tablero = [];
    let soluciones = [];
    let seleccionando = false;
    let celdaInicio = null;
    let celdaFin = null;
    let salaActual = null;
    let modoJuego = null; 
    let tiempoLimite = null; 
    
    // Función para cambiar de pantalla
    function cambiarPantalla(pantalla) {
        Object.values(pantallas).forEach(p => p.classList.remove('activa'));
        pantallas[pantalla].classList.add('activa');
    }
    
    // Manejar cambio de pestañas
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Selección de avatar para crear sala
    document.querySelectorAll('#crear-sala .avatar-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('#crear-sala .avatar-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            avatarCrearInput.value = option.dataset.avatar;
        });
    });
    
    // Selección de avatar para unirse a sala
    document.querySelectorAll('#unirse-sala .avatar-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('#unirse-sala .avatar-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            avatarUnirseInput.value = option.dataset.avatar;
        });
    });
    
    // Crear sala
    btnCrearSala.addEventListener('click', () => {
        const nombre = nombreCreadorInput.value.trim();
        const tema = temaCrearSelect.value;
        const modoJuego = modoJuegoCrearSelect.value;
        const dificultad = dificultadCrearSelect.value;
        const avatar = avatarCrearInput.value;
        
        if (!nombre) {
            mostrarNotificacion('Por favor ingresa tu nombre', 'error');
            return;
        }
        
        const idSala = generarIdSala();
        salaActual = idSala;
        
        socket.emit('unirseSala', { idSala, nombre, tema, modoJuego, dificultad, avatar });
        
        // Mostrar modal con el código de la sala
        codigoSalaMostrar.textContent = idSala;
        modal.style.display = 'flex';
    });
    
    // Unirse a sala existente
    btnUnirseSala.addEventListener('click', () => {
        const idSala = codigoSalaInput.value.trim().toUpperCase();
        const nombre = nombreUnirseInput.value.trim();
        const avatar = avatarUnirseInput.value;
        
        if (!idSala) {
            mostrarNotificacion('Por favor ingresa el código de la sala', 'error');
            return;
        }
        
        if (!nombre) {
            mostrarNotificacion('Por favor ingresa tu nombre', 'error');
            return;
        }
        
        salaActual = idSala;
        socket.emit('unirseSala', { idSala, nombre, avatar });
    });
    
    // Copiar código al portapapeles
    btnCopiarCodigo.addEventListener('click', () => {
        const codigo = codigoSalaMostrar.textContent;
        navigator.clipboard.writeText(codigo).then(() => {
            mostrarNotificacion('Código copiado al portapapeles');
        }).catch(err => {
            console.error('Error al copiar código:', err);
            mostrarNotificacion('No se pudo copiar el código', 'error');
        });
    });
    
    // Ir a la sala de espera
    btnIrASala.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Generar ID de sala aleatorio
    function generarIdSala() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    // Evento: unido a una sala
    socket.on('salaUnida', (data) => {
        const { idSala, tema, modoJuego: modo, dificultad, jugadores } = data;
        
        idSalaMostrar.textContent = idSala;
        temaMostrar.textContent = tema;
        modoJuegoMostrar.textContent = modo;
        dificultadMostrar.textContent = dificultad;
        
        // Guardar el modo de juego
        modoJuego = modo;
        
        // Actualizar lista de jugadores con avatares
        listaJugadores.innerHTML = '';
        jugadores.forEach(jugador => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="avatars/${jugador.avatar}.png" alt="${jugador.nombre}" class="avatar-small">
                <span>${jugador.nombre}</span>
            `;
            listaJugadores.appendChild(li);
        });
        
        cambiarPantalla('sala');
    });
    
    // Evento: nuevo jugador se unió
    socket.on('jugadorUnido', (data) => {
        const { nombre, avatar } = data;
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="avatars/${avatar}.png" alt="${nombre}" class="avatar-small">
            <span>${nombre}</span>
        `;
        listaJugadores.appendChild(li);
        
        // Mostrar mensaje en el chat
        agregarMensajeChat('Sistema', `${nombre} se unió a la sala`);
    });
    
    // Evento: jugador se desconectó
    socket.on('jugadorDesconectado', (data) => {
        const { nombre } = data;
        
        // Eliminar de la lista de jugadores
        const items = listaJugadores.querySelectorAll('li');
        items.forEach(item => {
            if (item.textContent.includes(nombre)) {
                item.remove();
            }
        });
        
        // Mostrar mensaje en el chat
        agregarMensajeChat('Sistema', `${nombre} abandonó la sala`);
    });
    
    // Evento: inicio del juego
    socket.on('inicioJuego', (data) => {
        const { tablero: tableroData, palabras, tema, modoJuego: modo, dificultad, tiempoLimite: limite, powerUps } = data;
        
     
        tablero = tableroData;
        soluciones = []; 
        modoJuego = modo; 
        tiempoLimite = limite; 
        
        // Actualizar UI
        avatarJugador.src = `avatars/${avatarCrearInput.value || avatarUnirseInput.value}.png`;
        nombreJugadorMostrar.textContent = nombreCreadorInput.value || nombreUnirseInput.value;
        puntuacionSpan.textContent = '0';
        tiempoSpan.textContent = '0';
        
        // Mostrar tiempo límite en modo contrarreloj
        if (modoJuego === 'contrarreloj' && tiempoLimite) {
            tiempoSpan.textContent = `${tiempoLimite}s`;
        }
        
        // Actualizar power-ups
        pistasDisponibles.textContent = powerUps.pistas;
        tiempoDisponible.textContent = powerUps.tiempoExtra;
        revelarDisponible.textContent = powerUps.revelar;
        
        // Crear tablero
        crearTablero(tablero);
        
        // Crear lista de palabras
        listaPalabras.innerHTML = '';
        palabras.forEach(palabra => {
            const li = document.createElement('li');
            li.textContent = palabra;
            li.dataset.palabra = palabra;
            listaPalabras.appendChild(li);
        });
        
        // Iniciar música de fondo
        soundBackground.play().catch(e => console.log("Error al reproducir música de fondo:", e));
        
        cambiarPantalla('juego');
    });
    
    // Crear tablero en el DOM
    function crearTablero(datos) {
        tableroDiv.innerHTML = '';
        tableroDiv.style.gridTemplateColumns = `repeat(${datos[0].length}, 1fr)`;
        
        for (let fila = 0; fila < datos.length; fila++) {
            for (let columna = 0; columna < datos[fila].length; columna++) {
                const celda = document.createElement('div');
                celda.classList.add('celda');
                // Asegurar que todas las letras estén en mayúscula
                celda.textContent = datos[fila][columna].toUpperCase();
                celda.dataset.fila = fila;
                celda.dataset.columna = columna;
                
                // Eventos para seleccionar celdas (método de arrastre)
                celda.addEventListener('mousedown', iniciarSeleccion);
                celda.addEventListener('mouseenter', continuarSeleccion);
                celda.addEventListener('mouseup', finalizarSeleccion);
                
                tableroDiv.appendChild(celda);
            }
        }
        
        // Eventos para el ratón
        document.addEventListener('mouseup', finalizarSeleccion);
    }
    
    // Iniciar selección de celdas (método de arrastre)
    function iniciarSeleccion(e) {
        seleccionando = true;
        celdaInicio = e.target;
        celdaFin = e.target;
        actualizarSeleccion();
    }
    
    // Continuar selección de celdas (método de arrastre)
    function continuarSeleccion(e) {
        if (!seleccionando) return;
        celdaFin = e.target;
        actualizarSeleccion();
    }
    
    // Finalizar selección y verificar palabra (método de arrastre)
    function finalizarSeleccion() {
        if (!seleccionando) return;
        seleccionando = false;
        
        // Verificar si es una selección válida
        if (celdaInicio && celdaFin && celdaInicio !== celdaFin) {
            const palabra = obtenerPalabraSeleccionada();
            if (palabra) {
                socket.emit('encontrarPalabra', { palabra });
            }
        }
        
        // Limpiar selección
        limpiarSeleccion();
    }
    
    // Actualizar selección visual (método de arrastre)
    function actualizarSeleccion() {
        limpiarSeleccion();
        
        if (!celdaInicio || !celdaFin) return;
        
        const filaInicio = parseInt(celdaInicio.dataset.fila);
        const columnaInicio = parseInt(celdaInicio.dataset.columna);
        const filaFin = parseInt(celdaFin.dataset.fila);
        const columnaFin = parseInt(celdaFin.dataset.columna);
        
        // Determinar dirección
        const deltaFila = filaFin - filaInicio;
        const deltaColumna = columnaFin - columnaInicio;
        
        // Verificar si es una línea recta (horizontal, vertical o diagonal)
        if (deltaFila === 0 || deltaColumna === 0 || Math.abs(deltaFila) === Math.abs(deltaColumna)) {
            const pasos = Math.max(Math.abs(deltaFila), Math.abs(deltaColumna));
            const pasoFila = pasos === 0 ? 0 : deltaFila / pasos;
            const pasoColumna = pasos === 0 ? 0 : deltaColumna / pasos;
            
            // Resaltar celdas seleccionadas
            for (let i = 0; i <= pasos; i++) {
                const fila = filaInicio + Math.round(i * pasoFila);
                const columna = columnaInicio + Math.round(i * pasoColumna);
                const celda = document.querySelector(`.celda[data-fila="${fila}"][data-columna="${columna}"]`);
                if (celda) {
                    celda.classList.add('seleccionada');
                }
            }
        }
    }
    
    // Limpiar selección visual
    function limpiarSeleccion() {
        document.querySelectorAll('.celda.seleccionada').forEach(celda => {
            celda.classList.remove('seleccionada');
        });
    }
    
    // Obtener palabra seleccionada (método de arrastre)
    function obtenerPalabraSeleccionada() {
        if (!celdaInicio || !celdaFin) return '';
        
        const filaInicio = parseInt(celdaInicio.dataset.fila);
        const columnaInicio = parseInt(celdaInicio.dataset.columna);
        const filaFin = parseInt(celdaFin.dataset.fila);
        const columnaFin = parseInt(celdaFin.dataset.columna);
        
        const deltaFila = filaFin - filaInicio;
        const deltaColumna = columnaFin - columnaInicio;
        
        // Verificar si es una línea recta
        if (deltaFila === 0 || deltaColumna === 0 || Math.abs(deltaFila) === Math.abs(deltaColumna)) {
            const pasos = Math.max(Math.abs(deltaFila), Math.abs(deltaColumna));
            const pasoFila = pasos === 0 ? 0 : deltaFila / pasos;
            const pasoColumna = pasos === 0 ? 0 : deltaColumna / pasos;
            
            let palabra = '';
            for (let i = 0; i <= pasos; i++) {
                const fila = filaInicio + Math.round(i * pasoFila);
                const columna = columnaInicio + Math.round(i * pasoColumna);
                const celda = document.querySelector(`.celda[data-fila="${fila}"][data-columna="${columna}"]`);
                if (celda) {
                    palabra += celda.textContent;
                }
            }
            
            return palabra;
        }
        
        return '';
    }
    
   
    btnLimpiarSeleccion.addEventListener('click', limpiarSeleccion);
    
    
    function marcarPalabraEncontrada(palabra) {
        
        const items = listaPalabras.querySelectorAll('li');
        items.forEach(item => {
            if (item.textContent.trim() === palabra) {
                item.classList.add('encontrada');
            }
        });
    }
    
    
    socket.on('palabraEncontrada', (data) => {
        const { palabra, puntuacion, totalPuntos } = data;
        
       
        puntuacionSpan.textContent = totalPuntos;
        
        
        marcarPalabraEncontrada(palabra);
        
        
        soundFound.currentTime = 0; // Reiniciar sonido
        soundFound.play().catch(e => console.log("Error al reproducir sonido:", e));
        
        mostrarNotificacion(`¡Encontraste "${palabra}"! +${puntuacion} puntos`);
    });
    
    
    socket.on('palabraEncontradaCooperativa', (data) => {
        const { palabra, encontradoPor } = data;
        
        
        marcarPalabraEncontrada(palabra);
        
        
        mostrarNotificacion(`¡${encontradoPor} encontró "${palabra}"!`);
    });
    
    // Evento: oponente encontró palabra
    socket.on('oponenteEncontroPalabra', (data) => {
        const { nombre, palabra } = data;
        agregarMensajeChat('Juego', `${nombre} encontró la palabra "${palabra}"`);
        
        // SOLO marcar la palabra como encontrada en la lista si no es modo clásico
        // En modo clásico, cada jugador tiene su propia lista de palabras encontradas
        if (modoJuego !== 'clasico') {
            marcarPalabraEncontrada(palabra);
        }
    });
    
    // Evento: actualizar tiempo
    socket.on('actualizarTiempo', (tiempo) => {
        if (modoJuego === 'contrarreloj') {
            
            const tiempoRestante = Math.max(0, tiempoLimite - tiempo);
            tiempoSpan.textContent = `${tiempoRestante}s`;
            
            
            if (tiempoRestante <= 10) {
                tiempoSpan.style.color = '#e74c3c';
            } else {
                tiempoSpan.style.color = '#333';
            }
        } else {
            
            tiempoSpan.textContent = `${tiempo}s`;
        }
    });
    
    // Botón resolver
    btnResolver.addEventListener('click', () => {
        socket.emit('resolver');
    });
    
    // Evento: solución recibida
    socket.on('solucion', (data) => {
        const { soluciones: solucionesData } = data;
        
        // Limpiar selecciones anteriores
        document.querySelectorAll('.celda.encontrada').forEach(celda => {
            celda.classList.remove('encontrada');
        });
        
        // Resaltar todas las soluciones
        solucionesData.forEach(solucion => {
            solucion.posiciones.forEach(pos => {
                const celda = document.querySelector(`.celda[data-fila="${pos.fila}"][data-columna="${pos.columna}"]`);
                if (celda) {
                    celda.classList.add('encontrada');
                }
            });
            
            // Marcar como encontrada en la lista
            marcarPalabraEncontrada(solucion.palabra);
        });
    });
    
    // Evento: mensaje de chat recibido
    socket.on('mensajeChat', (data) => {
        const { autor, mensaje } = data;
        agregarMensajeChat(autor, mensaje);
    });
    
    // Power-ups
    btnPista.addEventListener('click', () => {
        socket.emit('usarPowerUp', { tipo: 'pistas' });
    });
    
    btnTiempo.addEventListener('click', () => {
        socket.emit('usarPowerUp', { tipo: 'tiempoExtra' });
    });
    
    btnRevelar.addEventListener('click', () => {
        socket.emit('usarPowerUp', { tipo: 'revelar' });
    });
    
    // Evento: power-ups actualizados
    socket.on('powerUpsActualizados', (powerUps) => {
        pistasDisponibles.textContent = powerUps.pistas;
        tiempoDisponible.textContent = powerUps.tiempoExtra;
        revelarDisponible.textContent = powerUps.revelar;
        
        // Habilitar/deshabilitar botones
        btnPista.disabled = powerUps.pistas <= 0;
        btnTiempo.disabled = powerUps.tiempoExtra <= 0;
        btnRevelar.disabled = powerUps.revelar <= 0;
        
        // Reproducir sonido
        soundPowerup.currentTime = 0; // Reiniciar sonido
        soundPowerup.play().catch(e => console.log("Error al reproducir sonido:", e));
    });
    
    // Evento: pista recibida
    socket.on('pista', (data) => {
        const { palabra, posicion } = data;
        
        // Resaltar la celda de la pista
        const celda = document.querySelector(`.celda[data-fila="${posicion.fila}"][data-columna="${posicion.columna}"]`);
        if (celda) {
            celda.classList.add('pista');
            setTimeout(() => {
                celda.classList.remove('pista');
            }, 3000);
        }
        
        mostrarNotificacion(`Pista para "${palabra}": busca la letra resaltada`);
    });
    
    // Evento: tiempo extra agregado
    socket.on('tiempoExtraAgregado', () => {
        mostrarNotificacion('¡Tiempo extra agregado!');
    });
    
    // Evento: palabra revelada
    socket.on('palabraRevelada', (data) => {
        const { palabra, posicion } = data;
        
        // Resaltar la palabra revelada
        posicion.posiciones.forEach(pos => {
            const celda = document.querySelector(`.celda[data-fila="${pos.fila}"][data-columna="${pos.columna}"]`);
            if (celda) {
                celda.classList.add('encontrada');
            }
        });
        
        // Marcar como encontrada en la lista
        marcarPalabraEncontrada(palabra);
        
        mostrarNotificacion(`¡Palabra "${palabra}" revelada!`);
    });
    
    // Evento: fin del juego
    socket.on('finJuego', (data) => {
        const { resultados, tiempoTotal } = data;
        
        // Detener música de fondo
        soundBackground.pause();
        
        // Reproducir sonido de fin de juego
        soundGameover.play().catch(e => console.log("Error al reproducir sonido:", e));
        
        // Mostrar ganador
        const ganador = resultados[0];
        ganadorAvatar.src = `avatars/${ganador.avatar}.png`;
        ganadorNombre.textContent = `¡${ganador.nombre} es el ganador!`;
        ganadorPuntuacion.textContent = ganador.puntuacion;
        ganadorPalabras.textContent = ganador.palabrasEncontradas;
        
        // Mostrar resultados
        tablaResultados.innerHTML = '';
        resultados.forEach(resultado => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <img src="avatars/${resultado.avatar}.png" alt="${resultado.nombre}" class="avatar-small">
                    ${resultado.nombre}
                </td>
                <td>${resultado.palabrasEncontradas}</td>
                <td>${resultado.puntuacion}</td>
            `;
            tablaResultados.appendChild(tr);
        });
        
        cambiarPantalla('resultados');
    });
    
    // Jugar nuevamente
    btnJugarNuevamente.addEventListener('click', () => {
        cambiarPantalla('inicio');
    });
    
    // Salir
    btnSalir.addEventListener('click', () => {
        cambiarPantalla('inicio');
    });
    
    // Chat
    btnEnviarChat.addEventListener('click', enviarMensajeChat);
    inputChat.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            enviarMensajeChat();
        }
    });
    
    function enviarMensajeChat() {
        const mensaje = inputChat.value.trim();
        if (mensaje) {
            // Enviar mensaje al servidor
            socket.emit('enviarMensajeChat', { mensaje });
            inputChat.value = '';
        }
    }
    
    function agregarMensajeChat(autor, mensaje) {
        const mensajeDiv = document.createElement('div');
        mensajeDiv.classList.add('mensaje');
        mensajeDiv.innerHTML = `<span class="autor">${autor}:</span> ${mensaje}`;
        mensajesChat.appendChild(mensajeDiv);
        mensajesChat.scrollTop = mensajesChat.scrollHeight;
    }
    
    // Mostrar notificación
    function mostrarNotificacion(mensaje, tipo = 'success') {
        const notificacion = document.createElement('div');
        notificacion.classList.add('notificacion', tipo);
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.classList.add('mostrar');
        }, 10);
        
        setTimeout(() => {
            notificacion.classList.remove('mostrar');
            setTimeout(() => {
                document.body.removeChild(notificacion);
            }, 500);
        }, 3000);
    }
    
    // Evento: error
    socket.on('error', (mensaje) => {
        mostrarNotificacion(mensaje, 'error');
    });
});