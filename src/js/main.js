// main.js
// Bucle, teclado y pantallas. Usa createGame/update/draw (globals).

const canvas = document.getElementById( 'game' );
const drawingContext = canvas.getContext( '2d' );
const overlay = document.getElementById( 'overlay' );
const actionButtonElement = document.getElementById( 'action-btn' );

let game = createGame();
let animationFrame = 0;
let lastFrameTimestamp = null;

const KEY_TO_DIRECTION = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

document.addEventListener( 'keydown', ( event ) => {
  const direction = KEY_TO_DIRECTION[ event.key ];
  if ( !direction ) return;
  event.preventDefault();
  if ( game.state === 'playing' ) game.pacman.nextDir = direction;
} );

function showOverlay( title, styleClass, buttonLabel ) {
  overlay.innerHTML =
    '<h1' + ( styleClass ? ' class="' + styleClass + '"' : '' ) + '>' + title + '</h1>' +
    '<button id="action-btn">' + buttonLabel + '</button>';
  overlay.classList.add( 'show' );
  document.getElementById( 'action-btn' ).addEventListener( 'click', startGame );
}

function startGame() {
  game = createGame();
  game.state = 'playing';
  lastFrameTimestamp = null;
  overlay.classList.remove( 'show' );
}

if ( actionButtonElement ) actionButtonElement.addEventListener( 'click', startGame );

function loop( currentTimestamp ) {
  animationFrame++;
  if ( game.state === 'playing' ) {
    if ( lastFrameTimestamp === null ) lastFrameTimestamp = currentTimestamp;
    const deltaSeconds = ( currentTimestamp - lastFrameTimestamp ) / 1000;
    lastFrameTimestamp = currentTimestamp;
    update( game, deltaSeconds );
    if ( game.state === 'won' ) showOverlay( 'GANASTE', 'win', 'Reiniciar' );
    else if ( game.state === 'lost' ) showOverlay( 'PERDISTE', 'lose', 'Reiniciar' );
  } else {
    lastFrameTimestamp = currentTimestamp;
  }
  draw( drawingContext, game, animationFrame );
  requestAnimationFrame( loop );
}

requestAnimationFrame( loop );
