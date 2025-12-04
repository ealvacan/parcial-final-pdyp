const { parentPort, workerData } = require('worker_threads');

function generarTablero(palabras, tamaño = 15) {
  // Crear tablero vacío
  const tablero = Array(tamaño).fill().map(() => Array(tamaño).fill(''));
  const soluciones = [];
  
  
  const direcciones = [
    { fila: 0, columna: 1 },   
    { fila: 1, columna: 0 },   
    { fila: 1, columna: 1 },   
    { fila: 1, columna: -1 }   
  ];
  
 
  function cabePalabra(fila, columna, direccion, palabra) {
    for (let i = 0; i < palabra.length; i++) {
      const nuevaFila = fila + i * direccion.fila;
      const nuevaColumna = columna + i * direccion.columna;
      
      
      if (nuevaFila < 0 || nuevaFila >= tamaño || nuevaColumna < 0 || nuevaColumna >= tamaño) {
        return false;
      }
      
      
      if (tablero[nuevaFila][nuevaColumna] !== '' && tablero[nuevaFila][nuevaColumna] !== palabra[i]) {
        return false;
      }
    }
    return true;
  }
  
  
  function colocarPalabra(fila, columna, direccion, palabra) {
    const posiciones = [];
    for (let i = 0; i < palabra.length; i++) {
      const nuevaFila = fila + i * direccion.fila;
      const nuevaColumna = columna + i * direccion.columna;
      tablero[nuevaFila][nuevaColumna] = palabra[i];
      posiciones.push({ fila: nuevaFila, columna: nuevaColumna });
    }
    
    soluciones.push({
      palabra,
      inicio: { fila, columna },
      fin: { 
        fila: fila + (palabra.length - 1) * direccion.fila, 
        columna: columna + (palabra.length - 1) * direccion.columna 
      },
      posiciones
    });
  }
  
  
  for (const palabra of palabras) {
    let colocada = false;
    let intentos = 0;
    
    while (!colocada && intentos < 100) {
      const direccion = direcciones[Math.floor(Math.random() * direcciones.length)];
      const fila = Math.floor(Math.random() * tamaño);
      const columna = Math.floor(Math.random() * tamaño);
      
      if (cabePalabra(fila, columna, direccion, palabra)) {
        colocarPalabra(fila, columna, direccion, palabra);
        colocada = true;
      }
      
      intentos++;
    }
  }
  
  
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let fila = 0; fila < tamaño; fila++) {
    for (let columna = 0; columna < tamaño; columna++) {
      if (tablero[fila][columna] === '') {
        tablero[fila][columna] = letras[Math.floor(Math.random() * letras.length)];
      }
    }
  }
  
  return {
    grid: tablero,
    soluciones
  };
}


const { palabras, tamaño } = workerData;
const tablero = generarTablero(palabras, tamaño);

parentPort.postMessage(tablero);