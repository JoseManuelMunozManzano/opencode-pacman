// maze.js
// Laberinto 28x31 fiel a la geometria del nivel 1 de Pac-Man.
// Se escribe como 31 strings de 28 chars (legible) y se parsea a numeros.
//   '#' pared(1) · '.' dot(2) · ' ' vacio transitable(0) · '-' puerta pen(3) · 'o' power pellet(4)
// Coordenadas: celda (x,y), origen arriba-izquierda. x in [0,27], y in [0,30].
// Simetrico respecto al eje vertical central (entre cols 13 y 14).

const MAZE_TEXT_ROWS = [
  '############################', // 0  borde
  '#o...........##...........o#', // 1  power pellets en (1,1) y (26,1)
  '#.####.#####.##.#####.####.#', // 2
  '#.####.#####.##.#####.####.#', // 3
  '#.####.#####.##.#####.####.#', // 4
  '#..........................#', // 5
  '#.####.##.########.##.####.#', // 6
  '#.####.##.########.##.####.#', // 7
  '#......##....##....##......#', // 8
  '######.#####.##.#####.######', // 9
  '######.#####.##.#####.######', // 10
  '######.##..........##.######', // 11
  '######.##.###--###.##.######', // 12  puerta pen cols 13-14
  '######.##.#      #.##.######', // 13  interior pen
  '          #      #          ', // 14  tunel (extremos abiertos) + pen
  '######.##.#      #.##.######', // 15  interior pen
  '######.##.########.##.######', // 16  fondo pen
  '######.##..........##.######', // 17
  '######.#####.##.#####.######', // 18
  '######.#####.##.#####.######', // 19
  '#............##............#', // 20
  '#.####.#####.##.#####.####.#', // 21
  '#.####.#####.##.#####.####.#', // 22
  '#...##................##...#', // 23  fila inicio Pacman (13,23)
  '###.##.##.########.##.##.###', // 24
  '###.##.##.########.##.##.###', // 25
  '#......##....##....##......#', // 26
  '#.##########.##.##########.#', // 27
  '#.##########.##.##########.#', // 28
  '#o........................o#', // 29  power pellets en (1,29) y (26,29)
  '############################', // 30  borde
];

function parseTile( character ) {
  if ( character === '#' ) return 1;
  if ( character === '.' ) return 2;
  if ( character === '-' ) return 3;
  if ( character === 'o' ) return 4;
  return 0; // espacio = vacio transitable
}

// Matriz numerica pristina (no se muta; cada partida copia esto).
const MAZE = MAZE_TEXT_ROWS.map( ( row ) => row.split( '' ).map( parseTile ) );

const TUNNEL_ROW = 14;
const PACMAN_START = { x: 13, y: 23 };
const POWER_PELLET_POINTS = 50;
const POWER_PELLET_POSITIONS = [
  { x: 1, y: 1 },
  { x: 26, y: 1 },
  { x: 1, y: 29 },
  { x: 26, y: 29 },
];
const GHOST_STARTS = [
  { name: 'Blinky', kind: 'blinky', x: 13, y: 14, releaseAt: 1.5 },
  { name: 'Pinky', kind: 'pinky', x: 14, y: 14, releaseAt: 3.0 },
  { name: 'Inky', kind: 'inky', x: 12, y: 14, releaseAt: 4.5 },
  { name: 'Clyde', kind: 'clyde', x: 15, y: 14, releaseAt: 6.0 },
];

window.MAZE = MAZE;
window.TUNNEL_ROW = TUNNEL_ROW;
window.PACMAN_START = PACMAN_START;
window.GHOST_STARTS = GHOST_STARTS;
window.POWER_PELLET_POINTS = POWER_PELLET_POINTS;
window.POWER_PELLET_POSITIONS = POWER_PELLET_POSITIONS;
