// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRECTIONS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const DIRS = DIRECTIONS;
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const tileValue of row ) if ( tileValue === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    elapsedSeconds: 0,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( ghostStart ) => ( {
      name: ghostStart.name,
      x: ghostStart.x,
      y: ghostStart.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: ghostStart.kind,
      phase: 'waiting',
      releaseAt: ghostStart.releaseAt,
      exitLaneX: ( ghostStart.kind === 'blinky' || ghostStart.kind === 'inky' ) ? 13 : 14,
    } ) ),
  };
}

function aligned( position ) {
  return Math.abs( position - Math.round( position ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const tileValue = grid[ y ][ x ];
  if ( tileValue === 1 ) return true;
  if ( tileValue === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion directionName?
function canMove( grid, x, y, directionName, actor ) {
  const directionStep = DIRECTIONS[ directionName ];
  if ( !directionStep ) return false;
  const targetX = x + directionStep.x;
  const targetY = y + directionStep.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( targetY === TUNNEL_ROW && ( targetX < 0 || targetX >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, targetX, targetY, actor );
}

function wrapTunnel( movingActor, mazeWidth ) {
  if ( Math.round( movingActor.y ) === TUNNEL_ROW ) {
    if ( movingActor.x < 0 ) movingActor.x += mazeWidth;
    else if ( movingActor.x >= mazeWidth ) movingActor.x -= mazeWidth;
  }
}

function movePacman( game ) {
  const pacman = game.pacman;
  const grid = game.grid;
  const mazeWidth = grid[ 0 ].length;

  if ( aligned( pacman.x ) && aligned( pacman.y ) ) {
    pacman.x = Math.round( pacman.x );
    pacman.y = Math.round( pacman.y );

    // Aplicar giro pendiente si es posible.
    if ( pacman.nextDir && canMove( grid, pacman.x, pacman.y, pacman.nextDir, 'pacman' ) ) {
      pacman.dir = pacman.nextDir;
      pacman.nextDir = null;
    }
    // Comer dot.
    if ( grid[ pacman.y ][ pacman.x ] === 2 ) {
      grid[ pacman.y ][ pacman.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, pacman.x, pacman.y, pacman.dir, 'pacman' ) ) return;
  }

  const directionStep = DIRECTIONS[ pacman.dir ];
  pacman.x += directionStep.x * pacman.speed;
  pacman.y += directionStep.y * pacman.speed;
  wrapTunnel( pacman, mazeWidth );
}

function getGhostTarget( game, ghost ) {
  const pacmanCellX = Math.round( game.pacman.x );
  const pacmanCellY = Math.round( game.pacman.y );
  const pacmanDirection = DIRECTIONS[ game.pacman.dir ] || { x: 0, y: 0 };

  if ( ghost.kind === 'pinky' ) {
    return {
      x: pacmanCellX + pacmanDirection.x * 4,
      y: pacmanCellY + pacmanDirection.y * 4,
    };
  }

  if ( ghost.kind === 'inky' ) {
    const pivotX = pacmanCellX + pacmanDirection.x * 2;
    const pivotY = pacmanCellY + pacmanDirection.y * 2;
    const blinkyGhost = game.ghosts.find( ( otherGhost ) => otherGhost.kind === 'blinky' ) || ghost;
    const blinkyCellX = Math.round( blinkyGhost.x );
    const blinkyCellY = Math.round( blinkyGhost.y );
    return {
      x: 2 * pivotX - blinkyCellX,
      y: 2 * pivotY - blinkyCellY,
    };
  }

  if ( ghost.kind === 'clyde' ) {
    const clydeCellX = Math.round( ghost.x );
    const clydeCellY = Math.round( ghost.y );
    const manhattanDistance = Math.abs( clydeCellX - pacmanCellX ) + Math.abs( clydeCellY - pacmanCellY );
    if ( manhattanDistance > 8 ) {
      return { x: pacmanCellX, y: pacmanCellY };
    }
    return { x: 1, y: 29 };
  }

  return { x: pacmanCellX, y: pacmanCellY };
}

function decideGhost( game, ghost ) {
  const grid = game.grid;
  const forbiddenDirection = OPPOSITE[ ghost.dir ];
  const preferenceOrder = [ 'up', 'left', 'down', 'right' ];
  const passableDirections = preferenceOrder.filter(
    ( direction ) => direction !== forbiddenDirection && canMove( grid, ghost.x, ghost.y, direction, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const candidateDirections = passableDirections.length ? passableDirections : [ '' + forbiddenDirection ];

  const targetCell = getGhostTarget( game, ghost );
  let bestDirection = candidateDirections[ 0 ];
  let bestDistance = Infinity;
  for ( const direction of candidateDirections ) {
    const directionStep = DIRECTIONS[ direction ];
    const neighborX = ghost.x + directionStep.x;
    const neighborY = ghost.y + directionStep.y;
    const manhattanDistance = Math.abs( neighborX - targetCell.x ) + Math.abs( neighborY - targetCell.y );
    if ( manhattanDistance < bestDistance ) {
      bestDistance = manhattanDistance;
      bestDirection = direction;
    }
  }
  ghost.dir = bestDirection;
}

function moveGhostWaiting( ghost ) {
  if ( ghost.dir !== 'up' && ghost.dir !== 'down' ) ghost.dir = 'up';
  if ( aligned( ghost.x ) && aligned( ghost.y ) ) {
    ghost.x = Math.round( ghost.x );
    ghost.y = Math.round( ghost.y );
    if ( ghost.y <= 13 ) ghost.dir = 'down';
    else if ( ghost.y >= 15 ) ghost.dir = 'up';
  }
  const direction = DIRECTIONS[ ghost.dir ];
  ghost.y += direction.y * ghost.speed;
  if ( ghost.y < 13 ) {
    ghost.y = 13;
    ghost.dir = 'down';
  } else if ( ghost.y > 15 ) {
    ghost.y = 15;
    ghost.dir = 'up';
  }
}

function moveGhostExiting( ghost ) {
  const targetLaneX = ghost.exitLaneX;
  const targetCorridorY = 11;
  const horizontalDistance = ghost.x - targetLaneX;
  if ( Math.abs( horizontalDistance ) > 1e-3 ) {
    const horizontalDirection = horizontalDistance < 0 ? 'right' : 'left';
    ghost.dir = horizontalDirection;
    const step = DIRECTIONS[ horizontalDirection ].x * ghost.speed;
    const nextX = ghost.x + step;
    if ( ( horizontalDirection === 'right' && nextX > targetLaneX ) ||
         ( horizontalDirection === 'left' && nextX < targetLaneX ) ) {
      ghost.x = targetLaneX;
    } else {
      ghost.x = nextX;
    }
    return;
  }
  ghost.x = targetLaneX;
  ghost.dir = 'up';
  const nextY = ghost.y - ghost.speed;
  if ( nextY <= targetCorridorY ) {
    ghost.y = targetCorridorY;
    ghost.phase = 'active';
  } else {
    ghost.y = nextY;
  }
}

function moveGhost( game, ghost ) {
  const grid = game.grid;
  const mazeWidth = grid[ 0 ].length;

  if ( ghost.phase === 'waiting' ) {
    moveGhostWaiting( ghost );
    return;
  }
  if ( ghost.phase === 'exiting' ) {
    moveGhostExiting( ghost );
    return;
  }
  if ( aligned( ghost.x ) && aligned( ghost.y ) ) {
    ghost.x = Math.round( ghost.x );
    ghost.y = Math.round( ghost.y );
    decideGhost( game, ghost );
    if ( !canMove( grid, ghost.x, ghost.y, ghost.dir, 'ghost' ) ) return;
  }

  const direction = DIRECTIONS[ ghost.dir ];
  ghost.x += direction.x * ghost.speed;
  ghost.y += direction.y * ghost.speed;
  wrapTunnel( ghost, mazeWidth );
}

function resetPositions( game ) {
  const pacman = game.pacman;
  pacman.x = PACMAN_START.x;
  pacman.y = PACMAN_START.y;
  pacman.dir = 'left';
  pacman.nextDir = null;
  game.elapsedSeconds = 0;
  game.ghosts.forEach( ( ghost, ghostIndex ) => {
    ghost.x = GHOST_STARTS[ ghostIndex ].x;
    ghost.y = GHOST_STARTS[ ghostIndex ].y;
    ghost.dir = 'up';
    ghost.phase = 'waiting';
  } );
}

function collides( firstActor, secondActor ) {
  return Math.abs( firstActor.x - secondActor.x ) < 0.5 && Math.abs( firstActor.y - secondActor.y ) < 0.5;
}

function updateGhostReleases( game ) {
  for ( const ghost of game.ghosts ) {
    if ( ghost.phase === 'waiting' && game.elapsedSeconds >= ghost.releaseAt ) {
      ghost.phase = 'exiting';
      ghost.x = Math.round( ghost.x );
      ghost.y = Math.round( ghost.y );
    }
  }
}

function update( game, deltaSeconds ) {
  if ( Number.isFinite( deltaSeconds ) && deltaSeconds > 0 ) {
    game.elapsedSeconds += Math.min( deltaSeconds, 0.25 );
  }
  updateGhostReleases( game );
  movePacman( game );
  game.ghosts.forEach( ( ghost ) => moveGhost( game, ghost ) );

  for ( const ghost of game.ghosts ) {
    if ( ghost.phase === 'waiting' ) continue;
    if ( collides( game.pacman, ghost ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRECTIONS = DIRECTIONS;
window.DIRS = DIRECTIONS;
