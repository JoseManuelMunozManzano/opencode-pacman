# SPEC 03 — Power pellets y fantasmas asustados

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-09-27
> **Objective:** Añadir cuatro power pellets en las esquinas que activan 10 segundos de modo asustado comestible con retorno al corral y espera de 10 segundos tras cada captura.

## Por qué existe este spec

SPEC 01 definió cuatro personalidades permanentes sin modos globales.
SPEC 02 cerró la puerta del corral para fase `active` sin añadir estados nuevos.
Este spec introduce el primer modo temporal global y la primera excepción de retorno al corral.
Fija temporizadores, colisiones y representación sin recrear el arcade completo.

## Scope

**In:**

- Cuatro power pellets en `(1, 1)`, `(26, 1)`, `(1, 29)` y `(26, 29)`.
- Nuevo valor de tile `4` para power pellet en `src/js/maze.js`.
- Consumo de power pellet por Pac-Man con 50 puntos.
- Efecto global asustado con suma de 10 segundos y máximo de 20 segundos.
- Estado asustado aplicable a fantasmas en `active` y `exiting`.
- Huida en cruces mediante maximización de distancia Manhattan.
- Representación azul con cara asustada y parpadeo azul/blanco en los últimos 2 segundos.
- Captura de fantasma asustado con 200 puntos fijos por fantasma.
- Teletransporte inmediato del fantasma comido a su spawn con fase `eatenWaiting`.
- Espera post-captura de 10 segundos con rebote, color normal e inmunidad.
- Transición desde `eatenWaiting` a `exiting` al agotar su espera.
- Orden de actualización con expiración del efecto antes de resolver colisiones.
- Reinicio por pérdida de vida que conserva pellets consumidos y cancela el efecto.
- Cambios contenidos en `src/js/maze.js`, `src/js/game.js` y `src/js/render.js`.

**Out of scope (for future specs):**

- Combo progresivo 200, 400, 800 y 1600 por capturas encadenadas.
- Retorno visible al corral con estado comido u ojos viajando.
- Velocidades distintas en modo asustado o en espera post-captura.
- Niveles, dificultad progresiva y persistencia entre sesiones.
- Cambios de geometría del laberinto fuera de los cuatro tiles de esquina.
- HUD con temporizador visible del efecto o contador de capturas.
- Harness automatizado de pruebas.

## Data model

Esta funcionalidad extiende el mapa pristino de `src/js/maze.js` y el estado mutable de `src/js/game.js`.
No crea archivos nuevos.

```js
// src/js/maze.js
// Tile 4 = power pellet. Ocupa las cuatro esquinas transitables.
const POWER_PELLET_POINTS = 50;
const POWER_PELLET_POSITIONS = [
  { x: 1, y: 1 },
  { x: 26, y: 1 },
  { x: 1, y: 29 },
  { x: 26, y: 29 },
];
```

```js
// src/js/game.js
game.frightenedSecondsRemaining = 0; // 0 = sin efecto; >0 = efecto activo
game.ghosts[i] = {
  name: 'Blinky',
  kind: 'blinky',
  x: 13,
  y: 14,
  dir: 'up',
  speed: GHOST_SPEED,
  phase: 'waiting', // 'waiting' | 'exiting' | 'active' | 'eatenWaiting'
  releaseAt: 1.5,
  exitLaneX: 13,
  respawnSecondsRemaining: 0, // solo relevante en 'eatenWaiting'
};
```

Convenciones:

- Coordenadas: origen arriba-izquierda.
- `x` en `[0, 27]`.
- `y` en `[0, 30]`.
- Tiempos en segundos de tiempo activo con `deltaSeconds`.
- Efecto asustado activo cuando `frightenedSecondsRemaining > 0`.
- Límite del efecto: `frightenedSecondsRemaining` nunca supera 20.
- Cada power pellet suma 10 segundos al tiempo restante actual.
- Captura de fantasma suma 200 puntos fijos sin contador de cadena.
- `dotsRemaining` cuenta solo tiles `2`.
- Power pellets no cuentan para victoria.
- Fantasma asustado es comestible solo en `active` o `exiting`.
- Fantasma en `waiting` nunca se vuelve asustado ni comestible.
- Fantasma en `eatenWaiting` es inmune a colisiones.
- Puerta tile `3` conserva la regla de SPEC 02 por fase.
- `eatenWaiting` cruza tiles como `waiting` a efectos de puerta.
- Velocidades en celdas por frame sin cambios por modo.

Objetivos en modo asustado:

- Fantasma `active` y asustado maximiza distancia Manhattan hacia Pac-Man.
- Desempate fijo en orden arriba, izquierda, abajo y derecha.
- Sin inversión inmediata al activar el efecto.
- La huida aplica en la siguiente decisión en cruce.
- Fantasma `exiting` conserva su ruta fija por `exitLaneX` hasta la fila 11.
- Fantasma `exiting` asustado conserva aspecto asustado y resulta comestible.
- Los objetivos de personalidad de SPEC 01 quedan suspendidos mientras dura el efecto.

## Implementation plan

1. Añadir tile `4` en `src/js/maze.js` con nuevo carácter de mapa y cuatro esquinas como power pellets. Manual test: inspeccionar `MAZE[1][1] === 4` y las otras tres esquinas.
2. Exponer `POWER_PELLET_POSITIONS` o equivalente sin alterar el orden de scripts clásicos. Manual test: `node --check src/js/maze.js` pasa.
3. Extender `createGame()` en `src/js/game.js` con `frightenedSecondsRemaining = 0` y `respawnSecondsRemaining = 0` por fantasma. Manual test: partida nueva arranca sin efecto.
4. Excluir tiles `4` de `dotsRemaining` y conservar pellets consumidos entre vidas. Manual test: comer un dot reduce el contador y comer un pellet no lo reduce.
5. Implementar consumo de tile `4` en `movePacman` o en `update` con 50 puntos y suma de 10 segundos limitada a 20. Manual test: comer una esquina suma 50 y activa el modo.
6. Implementar decremento por `deltaSeconds` de `frightenedSecondsRemaining` y de cada `respawnSecondsRemaining` en `eatenWaiting`. Manual test: el efecto expira tras el tiempo restante.
7. Implementar huida en `decideGhost` para fantasmas asustados en `active` mediante distancia máxima y mismo desempate. Manual test: en un cruce aislado el fantasma aumenta su distancia Manhattan.
8. Implementar captura por colisión con fantasma asustado en `active` o `exiting` con 200 puntos, teletransporte a su spawn y paso a `eatenWaiting` con 10 segundos. Manual test: tocar un fantasma azul suma 200 y lo devuelve al corral.
9. Implementar rebote en `eatenWaiting` entre filas 13 y 15 con inmunidad y transición a `exiting` al agotar 10 segundos. Manual test: el fantasma capturado espera 10 segundos y sale por su carril.
10. Fijar orden de `update` con expiración del efecto antes de colisiones y captura asustada antes de pérdida de vida. Manual test: en el frame límite el contacto quita vida en lugar de comer.
11. Actualizar `resetPositions` para cancelar el efecto, limpiar esperas post-captura y restaurar fases y liberaciones originales. Manual test: perder una vida conserva pellets consumidos y reinicia la secuencia de SPEC 01.
12. Dibujar tiles `4` como círculo fijo de 6 px y fantasmas asustados en azul con cara asustada en `src/js/render.js`. Manual test: las esquinas se ven grandes y los fantasmas cambian a azul.
13. Implementar parpadeo azul/blanco cada 0.25 segundos durante los últimos 2 segundos del efecto. Manual test: el azul alterna con blanco antes de volver al color propio.

## Acceptance criteria

- [ ] `node --check src/js/maze.js && node --check src/js/game.js && node --check src/js/render.js && node --check src/js/main.js` termina sin errores.
- [ ] Las celdas `(1, 1)`, `(26, 1)`, `(1, 29)` y `(26, 29)` contienen power pellets al iniciar partida nueva.
- [ ] Comer un power pellet suma exactamente 50 puntos.
- [ ] Comer un power pellet activa o extiende el efecto sin superar 20 segundos restantes.
- [ ] Comer un segundo pellet con efecto activo suma 10 segundos al tiempo restante.
- [ ] Los fantasmas en `active` y `exiting` muestran aspecto asustado mientras el efecto está activo.
- [ ] Un fantasma en `waiting` conserva su color y no resulta comestible durante el efecto.
- [ ] Un fantasma `active` asustado elige en un cruce la salida con mayor distancia Manhattan con desempate arriba, izquierda, abajo y derecha.
- [ ] Un fantasma `exiting` conserva su ruta por `exitLaneX` hasta la fila 11 durante el efecto.
- [ ] Tocar un fantasma asustado en `active` o `exiting` suma 200 puntos y lo devuelve a su spawn.
- [ ] El fantasma capturado permanece 10 segundos en `eatenWaiting` con rebote e inmunidad.
- [ ] El fantasma capturado pasa a `exiting` al agotar sus 10 segundos.
- [ ] Si el efecto global sigue activo al salir, el fantasma que sale vuelve a mostrarse asustado y comestible.
- [ ] En los últimos 2 segundos del efecto los fantasmas asustados alternan azul y blanco cada 0.25 segundos.
- [ ] Al expirar el efecto en el mismo frame del contacto, Pac-Man pierde una vida en lugar de comer.
- [ ] Tras perder una vida, los pellets ya consumidos no reaparecen y el efecto queda cancelado.
- [ ] Tras perder una vida, los cuatro fantasmas vuelven a `waiting` con sus liberaciones originales.
- [ ] Comer todos los dots normales con power pellets sin comer permite ganar.
- [ ] El juego sigue permitiendo perder al agotar vidas.

## Decisions

- **Sí:** esquinas `(1, 1)`, `(26, 1)`, `(1, 29)` y `(26, 29)`. Son las únicas esquinas transitables y reproducen el patrón clásico.
- **No:** extremos interiores u otras coordenadas. Rompen la simetría esperada del laberinto.
- **Sí:** tile `4` separado del dot. Permite puntuación, render y victoria diferenciados.
- **No:** reutilizar tile `2` con lista aparte de posiciones. Acopla el mapa a estado mutable externo.
- **Sí:** 50 puntos por pellet y 200 fijos por fantasma. Regla simple y cercana al arcade sin combos.
- **No:** combo 200, 400, 800 y 1600. Requiere contador de cadena y otro spec si llega.
- **Sí:** sumar 10 segundos con máximo de 20. Respuesta del usuario con límite contra acumulaciones largas.
- **No:** reiniciar a 10 ni suma sin límite. La primera ignora el pellet y la segunda permite hasta 40 segundos prácticos.
- **Sí:** solo `active` y `exiting` se vuelven asustados. `waiting` queda seguro dentro del corral.
- **No:** incluir `waiting`. Pac-Man no entra normalmente y crea capturas confusas.
- **Sí:** huir maximizando Manhattan en el siguiente cruce. Reutiliza la decisión local determinista de SPEC 01.
- **No:** inversión inmediata ni movimiento aleatorio. La primera complica alineación y la segunda introduce nondeterminismo.
- **Sí:** `exiting` conserva ruta fija pero comestible. Evita atascos dentro del corral.
- **No:** inmunidad durante `exiting` asustado. Contradice la respuesta del usuario.
- **Sí:** teletransporte inmediato a spawn con fase `eatenWaiting`. Alcance menor y regla inequívoca.
- **No:** retorno visible ni solo ojos. Requieren navegación especial y assets nuevos.
- **Sí:** espera de 10 segundos desde la colisión y salida por `exiting`. Reloj claro y reutiliza la ruta existente.
- **No:** espera desde llegada ni salida directa a `active`. La primera solo encaja con retorno visible y la segunda rompe continuidad.
- **Sí:** expiración antes de colisión. El frame límite favorece al fantasma normal.
- **No:** colisión primero en el frame límite. Permite capturas tras el fin nominal del efecto.
- **Sí:** pellets no obligatorios para victoria. Respuesta del usuario y victoria estable con dots normales.
- **No:** victoria con pellets obligatorios. Cambia la condición actual sin necesidad.
- **Sí:** cuerpo azul con cara asustada y círculo fijo de 6 px. Diferencia clara sin animación nueva de pellets.
- **No:** sprite externo ni pellet pulsante. Añaden assets o reglas temporales de render.
- **Sí:** parpadeo azul/blanco cada 0.25 segundos en los últimos 2 segundos. Aviso determinista y verificable.
- **No:** cambio inmediato sin aviso ni cadencias más lentas. Pierde aviso o reduce tiempo azul estable.
- **Sí:** `eatenWaiting` visible con color propio, rebote e inmunidad. Reutiliza el movimiento de espera.
- **No:** oculto ni ojos inmóviles. Añaden reglas de render sin valor pedido.
- **Sí:** al salir durante efecto global, hereda estado asustado. Coherente con un temporizador global.
- **No:** inmunidad hasta `active` ni cancelar su salida. Introducen excepciones temporales difíciles de verificar.
- **Sí:** pérdida de vida conserva pellets y cancela efecto y esperas. Estado predecible tras cada colisión.
- **No:** conservar efecto ni restaurar pellets. La primera arrastra estados temporales y la segunda altera la victoria.
- **Sí:** temporizadores restantes por frame con `frightenedSecondsRemaining` y `respawnSecondsRemaining`. Encajan con `deltaSeconds` y el límite de SPEC 01.
- **No:** marcas absolutas contra `elapsedSeconds`. El reinicio por vida complica la aritmética.
- **Definición por preguntas sin atajos:** alcance y verificación quedaron cerrados tras varios bloques porque la mecánica cruza mapa, reglas y render.

## Risks

| Risk                                                            | Mitigation                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `deltaSeconds` llega como `undefined` desde llamadores antiguos | Conservar el resguardo existente y decrementar solo números finitos no negativos.     |
| Fantasma capturado pisa la puerta al teletransportarse          | `eatenWaiting` conserva el permiso de puerta de `waiting` y rebota dentro del corral. |
| `active` asustado queda sin ruta junto a la puerta              | Mantener el giro de 180 en callejón y la regla de puerta de SPEC 02.                  |
| Pausa o pestaña inactiva genera un delta grande                 | Reutilizar el límite de 0.25 segundos por frame antes de decrementar temporizadores.  |
| Pellet y dot comparten contador de victoria                     | Contar solo tile `2` en `dotsRemaining` y tratar tile `4` como coleccionable aparte.  |
| Parpadeo depende de FPS                                         | Derivar la alternancia del tiempo restante, no del contador de frames.                |

## What is **not** in this spec

- Combo progresivo por capturas encadenadas.
- Retorno visible al corral u ojos viajando.
- Velocidades especiales en modo asustado.
- Niveles, dificultad progresiva y persistencia.
- Cambios de geometría fuera de las cuatro esquinas.
- HUD de temporizador o contador de capturas.
- Harness automatizado de pruebas.

Cada uno de esos, si llega, va en su propio spec.
