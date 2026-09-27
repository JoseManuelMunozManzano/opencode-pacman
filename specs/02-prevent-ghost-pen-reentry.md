# SPEC 02 — Impedir reingreso de fantasmas al corral

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-09-27
> **Objective:** Impedir que un fantasma en fase `active` vuelva a entrar al corral, restaurando la posición inicial en el corral solo al perder una vida o al empezar una partida nueva.

## Por qué existe este spec

`isWall(grid, x, y, 'ghost')` permite hoy cruzar la puerta del corral en ambas direcciones.
SPEC 01 introdujo las fases `waiting`, `exiting` y `active`, pero no cerró la frontera tras la salida.
Este spec fija la puerta como muro unidireccional por fase, sin añadir estados nuevos.

## Scope

**In:**

- Bloqueo de las celdas puerta `(13, 12)` y `(14, 12)` para fantasmas en fase `active`.
- Permiso de cruce conservado para fases `waiting` y `exiting`.
- Definición de salida completada al entrar en `active` en la fila 11.
- Restauración de posiciones iniciales en el corral en `resetPositions` al perder una vida.
- Restauración equivalente al crear una partida nueva con `createGame()`.
- Cambios contenidos en `src/js/game.js`.

**Out of scope (for future specs):**

- Píldoras de poder.
- Fantasmas asustados o comidos y su retorno al corral.
- Cambios en `src/js/maze.js`, geometría del corral o posición de la puerta.
- Cambios visuales o de HUD.
- Velocidades distintas por fantasma.
- Persistencia entre sesiones.
- Harness automatizado de pruebas.

## Data model

Esta funcionalidad introduce no nuevas estructuras de datos. Reutiliza el modelo de SPEC 01.

```js
// src/js/game.js (existente, sin campos nuevos)
game.ghosts[i] = {
  name: 'Blinky',
  kind: 'blinky',
  x: 13,
  y: 14,
  dir: 'up',
  speed: GHOST_SPEED,
  phase: 'waiting', // 'waiting' | 'exiting' | 'active'
  releaseAt: 1.5,
  exitLaneX: 13,
};
```

Convenciones:

- Coordenadas: origen arriba-izquierda.
- `x` en `[0, 27]`.
- `y` en `[0, 30]`.
- Puerta del corral: `(13, 12)` y `(14, 12)` con valor de tile `3`.
- Salida completada en `(exitLaneX, 11)` con transición a `active`.
- Velocidades en celdas por frame.
- Regla de colisión: `active` trata tile `3` como muro; `waiting` y `exiting` no.

## Implementation plan

1. Extender `isWall` en `src/js/game.js` para recibir la fase del fantasma y tratar tile `3` como muro cuando el actor es fantasma y `phase === 'active'`.
2. Propagar la fase desde `canMove` hasta `isWall` y actualizar sus llamadas de Pac-Man, `waiting`, `exiting`, `decideGhost` y movimiento `active`. Manual test: `node --check src/js/game.js` pasa.
3. Verificar que la ruta de salida `exiting` sigue cruzando la puerta hacia fuera sin cambios visibles. Manual test: Blinky sale hasta la fila 11 como en SPEC 01.
4. Verificar que un fantasma `active` junto a la puerta elige otra dirección transitable y no pisa tile `3`. Manual test: forzar posición bajo la puerta y observar el giro.
5. Confirmar que `resetPositions` devuelve los cuatro fantasmas a sus spawns del corral en fase `waiting`. Manual test: perder una vida y observar el corral.
6. Confirmar que `createGame()` arranca con los cuatro fantasmas en el corral en fase `waiting`. Manual test: recargar y empezar partida nueva.

## Acceptance criteria

- [ ] `node --check src/js/maze.js && node --check src/js/game.js && node --check src/js/render.js && node --check src/js/main.js` termina sin errores.
- [ ] Un fantasma en `active` no puede moverse a `(13, 12)` desde una celda adyacente transitable.
- [ ] Un fantasma en `active` no puede moverse a `(14, 12)` desde una celda adyacente transitable.
- [ ] Un fantasma en `exiting` conserva su salida actual hasta la fila 11 sin quedarse atascado en la puerta.
- [ ] Un fantasma en `waiting` conserva su rebote vertical entre las filas 13 y 15.
- [ ] Tras perder una vida, los cuatro fantasmas vuelven a sus spawns del corral en fase `waiting`.
- [ ] Al empezar una partida nueva, los cuatro fantasmas arrancan en el corral en fase `waiting`.
- [ ] El juego sigue permitiendo ganar al comer todos los puntos y perder al agotar vidas.

## Decisions

- **Sí:** puerta bloqueada solo en `active`. Cierra el reingreso sin romper la espera ni la salida.
- **No:** interior completo bloqueado. Basta con la puerta y evita reglas extra sobre celdas interiores.
- **No:** cruce dirigido por dirección. Más complejo de verificar que una regla simple por fase.
- **Sí:** salida completada al entrar en `active`. Reutiliza la transición ya definida en SPEC 01 en la fila 11.
- **No:** bloqueo al cruzar la puerta o al iniciar `exiting`. Un fantasma saliendo aún no ha salido.
- **Sí:** reutilizar el campo `phase` existente. Evita un booleano nuevo combinable y contradictorio.
- **No:** campo `canEnterPen` o `hasExitedPen`. Duplica el significado que ya expresa `phase`.
- **Sí:** cambios contenidos en `src/js/game.js`. Mapa, puerta, fases y spawns ya existen.
- **No:** constantes nuevas en `src/js/maze.js`. No hay geometría nueva que declarar.
- **Sí:** excepción en pérdida de vida y partida nueva. Restaura un estado inicial predecible.
- **No:** excepción futura para fantasmas comidos. Ese retorno pertenece a otro spec de píldoras de poder.
- **Sí:** verificación con sintaxis y prueba manual. Coherente con la guía del repositorio sin harness.
- **No:** harness JS automatizado en este spec. Añade un artefacto no pedido para una regla observable.

## Risks

| Risk                                               | Mitigation                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Llamadores antiguos de `canMove` no pasan la fase  | Definir fase por defecto que conserva el permiso actual fuera de `active`. |
| Fantasma `active` queda sin ruta junto a la puerta | La decisión local ya permite giro de 180 en callejón y elige otra salida.  |
| `resetPositions` olvida restaurar alguna fase      | Restaurar explícitamente `phase = 'waiting'` para los cuatro fantasmas.    |

## What is **not** in this spec

- Píldoras de poder.
- Fantasmas asustados o comidos.
- Retorno al corral distinto de perder una vida o empezar partida nueva.
- Cambios en el laberinto, la puerta o los spawns.
- Cambios visuales o de HUD.
- Persistencia entre sesiones.

Cada uno de esos, si llega, va en su propio spec.
