# SPEC 01 — Cuatro fantasmas con personalidades

> **Status:** Aprobado
> **Depends on:** Ninguna
> **Date:** 2026-09-26
> **Objective:** Dotar al juego de cuatro fantasmas con comportamientos diferenciados, uno de ellos agresivo, con liberación escalonada cada 1.5 segundos.

## Por qué existe este spec

El juego actual solo tiene dos fantasmas (`hunter` y `random`).
El objetivo pide cuatro conductas reconocibles sin recrear el arcade completo.
Este spec fija reglas simplificadas, temporización y salidas verificables.

## Scope

**In:**

- Cuatro fantasmas: Blinky, Pinky, Inky y Clyde.
- Personalidades simplificadas de estilo clásico, permanentes y sin modos globales.
- Liberación escalonada a 1.5, 3.0, 4.5 y 6.0 segundos de tiempo activo.
- Espera dentro del corral con rebote vertical.
- Ruta fija de salida por columnas 13 y 14 hasta la fila 11.
- Selección de giro por distancia Manhattan local con desempate fijo.
- Colores clásicos asociados a cada nombre.
- Reinicio completo de posiciones y liberaciones al perder una vida.
- Reloj de tiempo activo con `deltaSeconds` desde `src/js/main.js`.

**Out of scope (for future specs):**

- Píldoras de poder.
- Modos asustado y comido.
- Niveles y dificultad progresiva.
- Velocidades distintas por fantasma.
- Persistencia entre sesiones.
- Modos globales de persecución y dispersión.
- Etiquetas visibles o leyenda HUD con nombres.

## Data model

Esta funcionalidad extiende estructuras existentes en `src/js/maze.js` y `src/js/game.js`.
No crea archivos nuevos.

```js
// src/js/maze.js
const GHOST_STARTS = [
  { name: 'Blinky', kind: 'blinky', x: 13, y: 14, releaseAt: 1.5 },
  { name: 'Pinky', kind: 'pinky', x: 14, y: 14, releaseAt: 3.0 },
  { name: 'Inky', kind: 'inky', x: 12, y: 14, releaseAt: 4.5 },
  { name: 'Clyde', kind: 'clyde', x: 15, y: 14, releaseAt: 6.0 },
];
```

```js
// src/js/game.js
game.elapsedSeconds = 0;
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
- Velocidades en celdas por frame.
- Tiempos en segundos de tiempo activo.
- Esquina de Clyde: `(1, 29)`.
- Salida completada en `(exitLaneX, 11)`.
- Carriles: Blinky e Inky usan `x = 13`.
- Carriles: Pinky y Clyde usan `x = 14`.

Objetivos por personalidad:

- Blinky: celda actual redondeada de Pac-Man.
- Pinky: posición de Pac-Man más 4 celdas en su dirección actual.
- Inky: pivote 2 celdas delante de Pac-Man, objetivo igual a `2 * pivote - posición de Blinky`.
- Clyde: posición de Pac-Man si la distancia Manhattan supera 8, esquina `(1, 29)` en caso contrario.
- Los objetivos pueden caer sobre muros o fuera del tablero.
- Los objetivos solo sirven para comparar distancias.
- El movimiento sigue limitado a celdas transitables.

## Implementation plan

1. Extender `GHOST_STARTS` en `src/js/maze.js` con cuatro entradas, nombre, `kind`, posición y `releaseAt`.
2. Extender `createGame()` en `src/js/game.js` con `elapsedSeconds`, `phase`, `releaseAt` y `exitLaneX` por fantasma.
3. Implementar acumulación de `elapsedSeconds` en `update(game, deltaSeconds)` solo con valores numéricos no negativos.
4. Implementar fase `waiting` con rebote vertical entre filas 13 y 15 y sin colisión.
5. Implementar transición a `exiting` cuando `elapsedSeconds >= releaseAt`.
6. Implementar ruta fija de salida por `exitLaneX` hasta `(exitLaneX, 11)` y cambio a `active`.
7. Implementar cálculo de objetivos para Blinky, Pinky, Inky y Clyde.
8. Sustituir la decisión aleatoria por distancia Manhattan local con desempate arriba, izquierda, abajo y derecha.
9. Activar colisión desde `exiting`, excluir `waiting` y reiniciar reloj y fases en `resetPositions`.
10. Pasar `deltaSeconds` real desde `src/js/main.js` con timestamps de `requestAnimationFrame`.
11. Asociar cada nombre a su color clásico en `src/js/render.js`.

## Acceptance criteria

- [ ] `node --check src/js/maze.js && node --check src/js/game.js && node --check src/js/render.js && node --check src/js/main.js` termina sin errores.
- [ ] Al iniciar la partida hay cuatro fantasmas dentro del corral.
- [ ] Ningún fantasma en `waiting` puede quitar una vida.
- [ ] Blinky inicia su salida al alcanzar 1.5 segundos de juego activo.
- [ ] Pinky inicia su salida al alcanzar 3.0 segundos de juego activo.
- [ ] Inky inicia su salida al alcanzar 4.5 segundos de juego activo.
- [ ] Clyde inicia su salida al alcanzar 6.0 segundos de juego activo.
- [ ] Cada fantasma en salida llega al pasillo sobre la puerta y luego usa su personalidad.
- [ ] Blinky reduce su distancia Manhattan hacia Pac-Man en un cruce aislado de prueba manual.
- [ ] Pinky apunta 4 celdas delante de la dirección de Pac-Man en observación manual.
- [ ] Inky usa la posición de Blinky y el pivote adelantado en observación manual.
- [ ] Clyde persigue lejos y apunta a la esquina inferior izquierda cuando está a 8 celdas o menos.
- [ ] Un empate exacto de distancias elige en orden arriba, izquierda, abajo y derecha.
- [ ] Los cuatro conservan la misma velocidad actual de fantasma.
- [ ] Los colores son Blinky rojo, Pinky rosa, Inky cian y Clyde naranja.
- [ ] Tras perder una vida, todos vuelven al corral y la secuencia de 1.5 segundos reinicia.
- [ ] El juego sigue permitiendo ganar al comer todos los puntos y perder al agotar vidas.

## Decisions

- **Sí:** personalidades clásicas simplificadas. Dan identidad diferenciada sin recrear el arcade completo.
- **No:** arcade fiel con modos y temporizadores originales. Excede el tamaño de este spec.
- **Sí:** Blinky siempre apunta a la celda actual de Pac-Man. Hace observable la agresividad pedida.
- **No:** Blinky más rápido. La diferencia debe venir de la conducta, no de la velocidad.
- **Sí:** Pinky 4 celdas delante e Inky con vector desde Blinky. Reglas clásicas reconocibles y simples.
- **Sí:** Clyde con umbral 8 y esquina `(1, 29)`. Alterna persecución y retirada de forma verificable.
- **No:** modos globales de persecución y dispersión. Mantienen conductas permanentes y comparables.
- **Sí:** distancia Manhattan local. Reutiliza la arquitectura actual de decisiones por cruce.
- **No:** BFS con camino más corto real. Más costoso y no necesario para diferencias visibles.
- **Sí:** desempate fijo arriba, izquierda, abajo y derecha. Determinista y fácil de verificar.
- **No:** desempate aleatorio o por continuidad. Introduce nondeterminismo o reglas adicionales.
- **Sí:** objetivo abstracto permitido fuera de pasillos. Evita búsquedas de celda transitable cercana.
- **Sí:** primer lanzamiento a 1.5 segundos y orden Blinky, Pinky, Inky y Clyde. Respeta la respuesta del usuario.
- **Sí:** rebote vertical en `waiting`. Mantiene movimiento visible sin ruta compleja.
- **Sí:** ruta fija de salida por columnas 13 y 14 hasta fila 11. Evita que la personalidad atrape al fantasma dentro.
- **No:** teletransporte fuera del corral. Rompe continuidad espacial.
- **Sí:** colisión desde `exiting`. Un fantasma saliendo ya es peligroso.
- **No:** colisión en `waiting`. Pac-Man no entra normalmente y crea muertes confusas.
- **Sí:** reinicio total de secuencia al perder vida. Estado predecible tras cada colisión.
- **Sí:** tiempo activo real con `elapsedSeconds` y `deltaSeconds`. Independiente de FPS y monitor.
- **No:** conteo de 90 frames por intervalo. Depende del rendimiento.
- **Sí:** configuración extendida en `GHOST_STARTS`. Evita un módulo nuevo y cambios en el orden de scripts.
- **Sí:** campo `phase` con tres valores. Más explícito que booleanos combinables.
- **Sí:** nombres solo en el modelo interno. Conserva la interfaz arcade actual.
- **Decisión rápida sin profundización adicional:** alcance final y verificación manual quedaron cerrados en pocas rondas para no retrasar el spec.

## Risks

| Risk                                                                  | Mitigation                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `deltaSeconds` llega como `undefined` desde llamadores antiguos       | Definir valor por defecto `0` y acumular solo números finitos no negativos.    |
| Fantasma en salida choca inmediatamente con Pac-Man junto a la puerta | Aceptado por diseño; la colisión desde `exiting` es la regla aprobada.         |
| Inky necesita a Blinky antes de su liberación                         | Blinky sale a 1.5 segundos e Inky a 4.5 segundos, así que Blinky ya existe.    |
| Rebote vertical puede desincronizarse de celdas enteras               | Mantener decisiones solo con alineación entera y redondear al cambiar de fase. |
| Pausa o pestaña inactiva genera un delta grande                       | Limitar `deltaSeconds` por frame a un máximo razonable antes de acumularlo.    |

## What is **not** in this spec

- Píldoras de poder.
- Fantasmas asustados o comidos.
- Niveles, puntuaciones persistentes y dificultad progresiva.
- Velocidades individuales por fantasma.
- Persistencia entre sesiones.
- Cambios visuales distintos de los cuatro colores clásicos.

Cada uno de esos, si llega, va en su propio spec.
