// render.js
// Dibujo arcade sobre canvas. Usa game.grid (no MAZE) para reflejar dots comidos.

const TILE = 20;
const WALL_COLOR = '#2121ff';
const DOOR_COLOR = '#ffb8ff';
const DOT_COLOR = '#ffb897';

function cellCenter( x, y ) {
  return { centerX: x * TILE + TILE / 2, centerY: y * TILE + TILE / 2 };
}

// Paredes estilo arcade: lineas finas redondeadas que conectan los centros
// de celdas-pared adyacentes. Produce el trazado continuo del original.
function drawWalls( drawingContext, grid ) {
  const mazeHeight = grid.length;
  const mazeWidth = grid[ 0 ].length;
  drawingContext.strokeStyle = WALL_COLOR;
  drawingContext.lineWidth = 2.5;
  drawingContext.lineCap = 'round';
  drawingContext.lineJoin = 'round';
  drawingContext.beginPath();
  for ( let y = 0; y < mazeHeight; y++ ) {
    for ( let x = 0; x < mazeWidth; x++ ) {
      if ( grid[ y ][ x ] !== 1 ) continue;
      const { centerX, centerY } = cellCenter( x, y );
      // Conectar solo hacia derecha y abajo evita trazos duplicados.
      if ( x + 1 < mazeWidth && grid[ y ][ x + 1 ] === 1 ) {
        drawingContext.moveTo( centerX, centerY );
        drawingContext.lineTo( centerX + TILE, centerY );
      }
      if ( y + 1 < mazeHeight && grid[ y + 1 ][ x ] === 1 ) {
        drawingContext.moveTo( centerX, centerY );
        drawingContext.lineTo( centerX, centerY + TILE );
      }
      // Celda-pared aislada (sin vecino): punto corto para que se vea.
      const isolatedWallCell =
        ( x + 1 >= mazeWidth || grid[ y ][ x + 1 ] !== 1 ) &&
        ( x - 1 < 0 || grid[ y ][ x - 1 ] !== 1 ) &&
        ( y + 1 >= mazeHeight || grid[ y + 1 ][ x ] !== 1 ) &&
        ( y - 1 < 0 || grid[ y - 1 ][ x ] !== 1 );
      if ( isolatedWallCell ) {
        drawingContext.moveTo( centerX - 3, centerY );
        drawingContext.lineTo( centerX + 3, centerY );
      }
    }
  }
  drawingContext.stroke();
}

function drawDoor( drawingContext, grid ) {
  const mazeHeight = grid.length;
  const mazeWidth = grid[ 0 ].length;
  drawingContext.strokeStyle = DOOR_COLOR;
  drawingContext.lineWidth = 3;
  drawingContext.beginPath();
  for ( let y = 0; y < mazeHeight; y++ ) {
    for ( let x = 0; x < mazeWidth; x++ ) {
      if ( grid[ y ][ x ] !== 3 ) continue;
      const pixelX = x * TILE;
      const pixelY = y * TILE + TILE / 2;
      drawingContext.moveTo( pixelX, pixelY );
      drawingContext.lineTo( pixelX + TILE, pixelY );
    }
  }
  drawingContext.stroke();
}

function drawDots( drawingContext, grid ) {
  drawingContext.fillStyle = DOT_COLOR;
  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[ 0 ].length; x++ ) {
      if ( grid[ y ][ x ] !== 2 ) continue;
      const { centerX, centerY } = cellCenter( x, y );
      drawingContext.beginPath();
      drawingContext.arc( centerX, centerY, 2.5, 0, Math.PI * 2 );
      drawingContext.fill();
    }
  }
}

function drawPacman( drawingContext, pacman, animationFrame ) {
  const { centerX, centerY } = cellCenter( pacman.x, pacman.y );
  let rotationRadians = 0;
  if ( pacman.dir === 'right' ) rotationRadians = 0;
  else if ( pacman.dir === 'down' ) rotationRadians = Math.PI / 2;
  else if ( pacman.dir === 'left' ) rotationRadians = Math.PI;
  else if ( pacman.dir === 'up' ) rotationRadians = -Math.PI / 2;

  // Boca animada: abre/cierra con el frame.
  const mouthOpenRadians = ( Math.sin( animationFrame * 0.3 ) * 0.5 + 0.5 ) * 0.28 + 0.02;

  drawingContext.fillStyle = '#ffff00';
  drawingContext.beginPath();
  drawingContext.moveTo( centerX, centerY );
  drawingContext.arc( centerX, centerY, TILE / 2 - 1, rotationRadians + mouthOpenRadians * Math.PI, rotationRadians - mouthOpenRadians * Math.PI );
  drawingContext.closePath();
  drawingContext.fill();
}

function drawGhost( drawingContext, ghost, color ) {
  const { centerX, centerY } = cellCenter( ghost.x, ghost.y );
  const bodyRadius = TILE / 2 - 1;
  const topEdge = centerY - bodyRadius;
  const bottomEdge = centerY + bodyRadius;
  const leftEdge = centerX - bodyRadius;
  const rightEdge = centerX + bodyRadius;

  drawingContext.fillStyle = color;
  drawingContext.beginPath();
  drawingContext.arc( centerX, centerY - 1, bodyRadius, Math.PI, 0, false ); // cabeza
  drawingContext.lineTo( rightEdge, bottomEdge );
  // falda ondulada (3 picos)
  drawingContext.lineTo( rightEdge - bodyRadius * 0.66, bottomEdge - 4 );
  drawingContext.lineTo( centerX, bottomEdge );
  drawingContext.lineTo( leftEdge + bodyRadius * 0.66, bottomEdge - 4 );
  drawingContext.lineTo( leftEdge, bottomEdge );
  drawingContext.closePath();
  drawingContext.fill();

  // ojos mirando segun direccion
  const directionStep = ( window.DIRECTIONS || window.DIRS )[ ghost.dir ] || { x: 0, y: 0 };
  const eyeOffsetX = directionStep.x * 1.6;
  const eyeOffsetY = directionStep.y * 1.6;
  for ( const eyeOffset of [ -3.5, 3.5 ] ) {
    drawingContext.fillStyle = '#fff';
    drawingContext.beginPath();
    drawingContext.arc( centerX + eyeOffset, centerY - 1, 3, 0, Math.PI * 2 );
    drawingContext.fill();
    drawingContext.fillStyle = '#0000bb';
    drawingContext.beginPath();
    drawingContext.arc( centerX + eyeOffset + eyeOffsetX, centerY - 1 + eyeOffsetY, 1.5, 0, Math.PI * 2 );
    drawingContext.fill();
  }
}

function drawHUD( drawingContext, game, mazeWidth ) {
  drawingContext.fillStyle = '#fff';
  drawingContext.font = '14px "Courier New", monospace';
  drawingContext.textBaseline = 'top';
  drawingContext.textAlign = 'left';
  drawingContext.fillText( 'SCORE ' + game.score, 8, 4 );
  drawingContext.textAlign = 'right';
  drawingContext.fillText( 'VIDAS ' + game.lives, mazeWidth * TILE - 8, 4 );
}

const GHOST_COLOR_BY_KIND = {
  blinky: '#ff0000',
  pinky: '#ffb8ff',
  inky: '#00ffff',
  clyde: '#ffb852',
};

function getGhostColor( ghost ) {
  return GHOST_COLOR_BY_KIND[ ghost.kind ] || '#ff0000';
}

function draw( drawingContext, game, animationFrame ) {
  const grid = game.grid;
  const mazeWidth = grid[ 0 ].length;
  const mazeHeight = grid.length;

  drawingContext.fillStyle = '#000';
  drawingContext.fillRect( 0, 0, mazeWidth * TILE, mazeHeight * TILE );

  drawWalls( drawingContext, grid );
  drawDoor( drawingContext, grid );
  drawDots( drawingContext, grid );
  drawPacman( drawingContext, game.pacman, animationFrame );
  game.ghosts.forEach( ( ghost ) => drawGhost( drawingContext, ghost, getGhostColor( ghost ) ) );
  drawHUD( drawingContext, game, mazeWidth );
}

window.draw = draw;
