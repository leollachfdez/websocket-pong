# Arquitectura del Sistema — WebSocket-Pong

## 1. Visión General

WebSocket-Pong sigue una arquitectura **cliente-servidor con servidor autoritativo**. El servidor es la única fuente de verdad del estado del juego; los clientes son capas de presentación e input que se comunican exclusivamente mediante WebSocket.

```
┌─────────────────────┐         WebSocket (WSS)         ┌─────────────────────┐
│     CLIENTE A        │◄──────────────────────────────►│      SERVIDOR        │
│  (Navegador)         │                                 │    (Node.js)         │
│                      │         WebSocket (WSS)         │                      │
│  - Canvas Renderer   │                                 │  - WebSocket Server  │
│  - Input Handler     │                                 │  - Room Manager      │
│  - Network Client    │                                 │  - Game Engine       │
│  - State Interpolator│                                 │  - Message Router    │
└─────────────────────┘                                  └──────────┬──────────┘
                                                                    │
┌─────────────────────┐         WebSocket (WSS)                     │
│     CLIENTE B        │◄───────────────────────────────────────────┘
│  (Navegador)         │
│                      │
│  (mismos módulos)    │
└─────────────────────┘
```

---

## 2. Estructura de Carpetas del Proyecto

```
websocket-pong/
├── client/                     # Aplicación del cliente (Vite + TypeScript)
│   ├── index.html
│   ├── src/
│   │   ├── main.ts             # Punto de entrada
│   │   ├── network/
│   │   │   └── WebSocketClient.ts    # Conexión y reconexión WebSocket
│   │   ├── game/
│   │   │   ├── Renderer.ts           # Renderizado Canvas 2D
│   │   │   ├── InputHandler.ts       # Captura de teclado y touch
│   │   │   └── StateInterpolator.ts  # Interpolación entre estados del servidor
│   │   ├── screens/
│   │   │   ├── LobbyScreen.ts        # Pantalla de crear/unirse a sala
│   │   │   ├── GameScreen.ts         # Pantalla de juego activo
│   │   │   └── ResultScreen.ts       # Pantalla de resultado/revancha
│   │   ├── ui/
│   │   │   └── ScreenManager.ts      # Máquina de estados de pantallas
│   │   └── config.ts                 # Constantes del cliente
│   ├── public/
│   │   └── fonts/                    # Tipografía pixelada
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                     # Servidor (Node.js + TypeScript)
│   ├── src/
│   │   ├── main.ts             # Punto de entrada del servidor
│   │   ├── network/
│   │   │   ├── WebSocketServer.ts    # Servidor WebSocket + HTTP estático
│   │   │   ├── MessageRouter.ts      # Despacha mensajes al handler correcto
│   │   │   └── RateLimiter.ts        # Rate limiting por conexión
│   │   ├── rooms/
│   │   │   ├── RoomManager.ts        # Crear, buscar, eliminar salas
│   │   │   └── Room.ts              # Estado y ciclo de vida de una sala
│   │   ├── game/
│   │   │   ├── GameLoop.ts           # Bucle de simulación a tick rate fijo
│   │   │   ├── Physics.ts            # Movimiento, colisiones, rebotes
│   │   │   └── Scoring.ts            # Lógica de puntuación y fin de partida
│   │   ├── validation/
│   │   │   └── MessageValidator.ts   # Validación de mensajes entrantes
│   │   └── config.ts                 # Constantes del servidor
│   └── tsconfig.json
│
├── shared/                     # Tipos y constantes compartidas
│   ├── types.ts                # Interfaces: GameState, Message, etc.
│   ├── constants.ts            # Dimensiones del campo, velocidades, puntos para ganar
│   └── messages.ts             # Tipos de mensajes del protocolo
│
├── package.json                # Workspace root (scripts dev/build)
├── tsconfig.base.json          # Configuración TS compartida
├── REQUIREMENTS.md
├── PROJECT_PLAN.md
├── ARCHITECTURE.md             # (este documento)
└── README.md
```

---

## 3. Componentes del Servidor

### 3.1 WebSocketServer

**Responsabilidad**: Aceptar conexiones WebSocket, servir archivos estáticos del cliente en producción y delegar mensajes al `MessageRouter`.

```
Conexión entrante
       │
       ▼
┌──────────────────┐    upgrade     ┌──────────────────┐
│   HTTP Server    │───────────────►│  WebSocket Server │
│   (Express)      │                │     (ws)          │
│                  │                │                   │
│  Sirve archivos  │                │  on('connection') │
│  estáticos del   │                │  on('message')    │
│  build del       │                │  on('close')      │
│  cliente         │                │                   │
└──────────────────┘                └────────┬──────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │  MessageRouter    │
                                    └──────────────────┘
```

- Escucha en un único puerto (ej. `3000`).
- En desarrollo, Vite sirve el cliente por separado; en producción, Express sirve el build estático.
- Asigna un `playerId` único a cada conexión.

### 3.2 MessageRouter

**Responsabilidad**: Validar, deserializar y despachar los mensajes entrantes al componente correcto.

| Mensaje recibido | Se delega a |
|-------------------|-------------|
| `join` | `RoomManager` |
| `input` | `Room` → `GameLoop` |
| `rematch` | `Room` |

Aplica el `RateLimiter` antes de procesar cualquier mensaje.

### 3.3 RateLimiter

**Responsabilidad**: Limitar la frecuencia de mensajes por conexión para prevenir abuso.

- Algoritmo: Token bucket (ej. 60 mensajes/segundo).
- Si se excede el límite, el mensaje se descarta silenciosamente.
- Si el abuso es persistente, se cierra la conexión.

### 3.4 RoomManager

**Responsabilidad**: Gestionar el ciclo de vida completo de las salas.

```
                    ┌──────────────┐
          crear     │              │    jugador 2
  ────────────────► │   WAITING    │ ◄──────────────
                    │  (1 jugador) │    se une
                    └──────┬───────┘
                           │ ambos conectados
                           ▼
                    ┌──────────────┐
                    │   PLAYING    │◄───── revancha
                    │  (2 jugadores│
                    │   + GameLoop)│
                    └──────┬───────┘
                           │ fin de partida
                           ▼
                    ┌──────────────┐
                    │   FINISHED   │
                    │              │
                    └──────┬───────┘
                           │ timeout / ambos salen
                           ▼
                    ┌──────────────┐
                    │   DESTROYED  │
                    └──────────────┘
```

- Genera códigos de sala únicos (alfanuméricos, 4-6 caracteres).
- Mantiene un `Map<string, Room>` de salas activas.
- Ejecuta un temporizador periódico para limpiar salas inactivas (> 5 min).

### 3.5 Room

**Responsabilidad**: Representar una sala individual con sus dos jugadores y su instancia de `GameLoop`.

- Almacena referencias a las conexiones WebSocket de ambos jugadores.
- Instancia y destruye el `GameLoop` según el estado de la sala.
- Reenvía los inputs del jugador al `GameLoop`.
- Emite mensajes (`state`, `score`, `end`) a ambos clientes.

### 3.6 GameLoop

**Responsabilidad**: Ejecutar la simulación del juego a tick rate fijo.

```
┌─────────────────────────────────────────────────────────┐
│                    GameLoop (1 tick)                      │
│                                                          │
│  1. Procesar inputs pendientes                           │
│     └─► Actualizar posición de paletas                   │
│                                                          │
│  2. Physics.update(deltaTime)                            │
│     ├─► Mover pelota                                     │
│     ├─► Detectar colisión con bordes (rebote)            │
│     ├─► Detectar colisión con paletas (rebote + ángulo)  │
│     └─► Aplicar aceleración progresiva                   │
│                                                          │
│  3. Scoring.check()                                      │
│     ├─► ¿Gol? → Actualizar marcador, reiniciar pelota   │
│     └─► ¿Fin? → Emitir 'end', detener loop              │
│                                                          │
│  4. Emitir estado a ambos clientes                       │
└─────────────────────────────────────────────────────────┘
```

- Usa `setInterval` con delta time para compensar desviaciones del temporizador.
- Tick rate configurable (por defecto 30 ticks/s).
- Mantiene una cola de inputs por jugador, procesados en orden FIFO.

### 3.7 Physics

**Responsabilidad**: Cálculos de movimiento y colisiones, totalmente puro (sin side effects ni I/O).

- Movimiento de la pelota: $\vec{p}_{new} = \vec{p} + \vec{v} \cdot \Delta t$
- Colisión con bordes: invierte $v_y$.
- Colisión con paleta: invierte $v_x$, modifica $v_y$ según punto de impacto relativo al centro de la paleta.
- Aceleración: incrementa $|\vec{v}|$ un factor constante por colisión con paleta.

### 3.8 MessageValidator

**Responsabilidad**: Validar estructura y valores de todos los mensajes entrantes.

- Verifica que el JSON sea válido.
- Verifica que el `type` sea un tipo conocido.
- Verifica que los campos requeridos existan y tengan el tipo correcto.
- Rechaza valores fuera de rango (ej. dirección de movimiento solo acepta `"up"`, `"down"`, `"stop"`).

---

## 4. Componentes del Cliente

### 4.1 WebSocketClient

**Responsabilidad**: Gestionar la conexión WebSocket con el servidor.

- Establece la conexión al servidor.
- Implementa reconexión automática con backoff exponencial (máx. 5 s).
- Serializa mensajes salientes y deserializa entrantes.
- Emite eventos internos que consumen los demás módulos.

### 4.2 ScreenManager

**Responsabilidad**: Controlar la navegación entre pantallas del juego como una máquina de estados.

```
┌──────────┐   crear/unirse   ┌──────────┐   start   ┌──────────┐    end    ┌──────────┐
│  LOBBY   │─────────────────►│ WAITING  │──────────►│  GAME    │─────────►│  RESULT  │
│          │                  │          │           │          │          │          │
└──────────┘                  └──────────┘           └──────────┘          └────┬─────┘
     ▲                                                                         │
     │                              revancha / salir                           │
     └─────────────────────────────────────────────────────────────────────────┘
```

- Monta/desmonta pantallas según el estado actual.
- Pasa las dependencias necesarias (WebSocketClient, estado) a cada pantalla.

### 4.3 LobbyScreen

**Responsabilidad**: Interfaz para crear una nueva sala o unirse a una existente.

- Formulario con campo para introducir código de sala.
- Botones: "Crear partida" / "Unirse".
- Al crear: envía mensaje `join` sin código → servidor genera sala.
- Al unirse: envía mensaje `join` con código → servidor busca sala.

### 4.4 GameScreen

**Responsabilidad**: Orquestar la pantalla de juego activo.

- Instancia y coordina `Renderer`, `InputHandler` y `StateInterpolator`.
- Recibe estados del servidor vía `WebSocketClient`.
- Alimenta el `StateInterpolator` con cada estado recibido.
- En cada frame (`requestAnimationFrame`), obtiene el estado interpolado y lo pasa al `Renderer`.

### 4.5 Renderer

**Responsabilidad**: Dibujar todos los elementos del juego en el `<canvas>`.

```
┌─────────────────────────────────────────────┐
│                  Canvas                      │
│                                              │
│   12                  :                  7   │  ← Marcador
│                       :                      │
│   ██                  :                 ██   │  ← Paletas
│   ██                  :                 ██   │
│   ██             ■    :                 ██   │  ← Pelota
│   ██                  :                 ██   │
│   ██                  :                 ██   │
│                       :                      │
│                       :                      │
└─────────────────────────────────────────────┘
         Línea central discontinua
```

- Fondo negro (`#000`), elementos blancos (`#FFF`).
- Paletas: rectángulos verticales.
- Pelota: cuadrado pequeño.
- Línea central: segmentos discontinuos.
- Marcador: tipografía pixelada, parte superior.
- Escala todos los elementos proporcionalmente según tamaño del viewport (responsive).

### 4.6 InputHandler

**Responsabilidad**: Capturar y normalizar la entrada del jugador.

| Dispositivo | Entrada | Salida normalizada |
|-------------|---------|-------------------|
| Teclado | `ArrowUp` / `W` | `"up"` |
| Teclado | `ArrowDown` / `S` | `"down"` |
| Teclado | liberación de tecla | `"stop"` |
| Táctil | deslizamiento vertical | `"up"` / `"down"` |

- Solo envía un mensaje al servidor cuando el estado de input **cambia** (no en cada frame).
- Previene el scroll por defecto al usar teclas de flecha.

### 4.7 StateInterpolator

**Responsabilidad**: Suavizar la transición entre estados discretos del servidor para lograr animación fluida a 60 FPS.

```
Estado del servidor (30 ticks/s)
   t0          t1          t2
   ●───────────●───────────●
        ↑
        │  Interpolación lineal
        │  genera posiciones intermedias
        ▼
   Frames del cliente (60 FPS)
   ○─○─○─○─○─○─○─○─○─○─○─○
```

- Almacena los dos últimos estados recibidos.
- En cada frame, calcula la posición interpolada: $pos = pos_0 + (pos_1 - pos_0) \cdot \alpha$ donde $\alpha = \frac{t_{frame} - t_0}{t_1 - t_0}$.
- Si no llega un nuevo estado a tiempo, extrapola brevemente y luego congela.

### 4.8 ResultScreen

**Responsabilidad**: Mostrar el resultado de la partida y ofrecer opciones.

- Muestra marcador final y ganador.
- Botón "Revancha": envía mensaje `rematch`.
- Botón "Salir": vuelve al lobby.

---

## 5. Módulo Compartido (shared/)

### 5.1 types.ts — Interfaces principales

```typescript
interface GameState {
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: {
    player1: { y: number };
    player2: { y: number };
  };
  score: { player1: number; player2: number };
  status: "countdown" | "playing" | "scored" | "finished";
}

interface PlayerInput {
  direction: "up" | "down" | "stop";
}

type PlayerRole = "player1" | "player2";
```

### 5.2 messages.ts — Protocolo de mensajes

```typescript
// Cliente → Servidor
type ClientMessage =
  | { type: "join"; roomCode?: string }
  | { type: "input"; direction: "up" | "down" | "stop" }
  | { type: "rematch" };

// Servidor → Cliente
type ServerMessage =
  | { type: "waiting"; roomCode: string }
  | { type: "start"; role: PlayerRole }
  | { type: "state"; gameState: GameState; tick: number }
  | { type: "score"; scorer: PlayerRole; score: GameState["score"] }
  | { type: "end"; winner: PlayerRole; score: GameState["score"] }
  | { type: "opponent_disconnected" }
  | { type: "error"; message: string };
```

### 5.3 constants.ts — Configuración compartida

```typescript
const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 80,
  PADDLE_SPEED: 6,
  PADDLE_MARGIN: 20,
  BALL_SIZE: 10,
  BALL_INITIAL_SPEED: 5,
  BALL_SPEED_INCREMENT: 0.5,
  BALL_MAX_SPEED: 12,
  WINNING_SCORE: 11,
  TICK_RATE: 30,
};
```

---

## 6. Flujo de Datos — Partida Completa

```
 CLIENTE A                    SERVIDOR                     CLIENTE B
 ─────────                    ────────                     ─────────
     │                            │                            │
     │──── join ─────────────────►│                            │
     │◄─── waiting(code:ABCD) ───│                            │
     │                            │                            │
     │                            │◄──── join(code:ABCD) ─────│
     │◄─── start(player1) ───────│──── start(player2) ───────►│
     │                            │                            │
     │    ┌───── GAME LOOP ───────┤                            │
     │    │                       │                            │
     │────┤── input(up) ─────────►│                            │
     │    │                       │◄──── input(down) ──────────│
     │    │                       │                            │
     │◄───┤── state(tick:1) ──────│──── state(tick:1) ────────►│
     │◄───┤── state(tick:2) ──────│──── state(tick:2) ────────►│
     │    │       ...             │         ...                │
     │    │                       │                            │
     │◄───┤── score(player1) ─────│──── score(player1) ───────►│
     │    │                       │                            │
     │    │       ...             │         ...                │
     │    │                       │                            │
     │◄───┤── end(winner:p1) ─────│──── end(winner:p1) ───────►│
     │    └───────────────────────┤                            │
     │                            │                            │
     │──── rematch ──────────────►│                            │
     │                            │◄──── rematch ──────────────│
     │◄─── start(player1) ───────│──── start(player2) ───────►│
     │                            │                            │
```

---

## 7. Tecnologías y Justificación

| Tecnología | Componente | Justificación |
|------------|------------|---------------|
| **TypeScript** | Cliente + Servidor + Shared | Tipado estático previene errores en el protocolo de mensajes; interfaces compartidas entre cliente y servidor |
| **Node.js** | Servidor | Event loop no-bloqueante ideal para WebSocket; mismo lenguaje que el cliente |
| **ws** | Servidor WebSocket | Librería ligera, sin overhead de Socket.IO; implementación directa de RFC 6455 |
| **Express** | HTTP Server | Sirve archivos estáticos del build del cliente en producción; manejador del upgrade a WebSocket |
| **Vite** | Build del cliente | HMR rápido en desarrollo; build optimizado para producción; soporte nativo de TypeScript |
| **HTML5 Canvas 2D** | Renderizado | API nativa sin dependencias externas; control total sobre píxeles; rendimiento adecuado para 2D simple |

> **¿Por qué `ws` en vez de Socket.IO?** El protocolo es lo suficientemente simple como para no necesitar las abstracciones de Socket.IO (rooms, namespaces, fallback a polling). Usar `ws` reduce el tamaño del bundle del cliente y ofrece control total sobre el protocolo binario/JSON.

---

## 8. Decisiones Arquitectónicas Clave

### 8.1 Servidor Autoritativo

El servidor es la única fuente de verdad. Los clientes **nunca** simulan el juego localmente; solo envían inputs y renderizan el estado recibido. Esto:
- Previene trampas (el cliente no puede manipular posiciones ni marcador).
- Simplifica la lógica (no se necesita reconciliación de estado).
- Acepta un trade-off: la experiencia depende de la latencia de red.

### 8.2 Interpolación sin Predicción

El cliente interpola entre los dos últimos estados recibidos en lugar de predecir el siguiente. Para un juego con tick rate de 30 Hz y latencia < 150 ms, la interpolación produce una experiencia visual fluida sin la complejidad de implementar predicción + rollback.

### 8.3 Protocolo JSON

Los mensajes se intercambian como JSON. Aunque un protocolo binario sería más eficiente, el payload del Pong es extremadamente pequeño (~100-200 bytes por estado) y la simplicidad de JSON facilita debugging y desarrollo.

### 8.4 Módulo Shared como Fuente de Verdad

Las interfaces y constantes en `shared/` se importan tanto desde el cliente como desde el servidor. Esto garantiza consistencia del protocolo en tiempo de compilación: si un tipo cambia, ambos lados deben actualizarse.

---

## 9. Diagrama de Componentes y sus Dependencias

```
┌──────────────────────────────────────────────────────────┐
│                        shared/                            │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │ types.ts │  │ messages.ts  │  │ constants.ts   │     │
│  └────┬─────┘  └──────┬───────┘  └───────┬────────┘     │
│       │               │                  │               │
└───────┼───────────────┼──────────────────┼───────────────┘
        │               │                  │
   ┌────┴───────────────┴──────────────────┴────┐
   │                    │                        │
   ▼                    ▼                        ▼
┌─────────────────────────────┐  ┌──────────────────────────────┐
│         server/             │  │           client/             │
│                             │  │                               │
│  main.ts                    │  │  main.ts                      │
│    └► WebSocketServer       │  │    └► ScreenManager           │
│         └► MessageRouter    │  │         ├► LobbyScreen        │
│              ├► RoomManager │  │         ├► GameScreen          │
│              │    └► Room[] │  │         │    ├► Renderer       │
│              │       └► GameLoop        │    ├► InputHandler   │
│              │          ├► Physics      │    └► StateInterp.   │
│              │          └► Scoring      │         └► ResultScreen│
│              ├► RateLimiter│  │         └► WebSocketClient      │
│              └► Validator  │  │                               │
└─────────────────────────────┘  └──────────────────────────────┘
```

---

## 10. Consideraciones de Seguridad

| Aspecto | Implementación |
|---------|----------------|
| **Transporte** | WSS (TLS) obligatorio en producción |
| **Validación de entrada** | `MessageValidator` rechaza cualquier mensaje que no cumpla el esquema esperado |
| **Rate limiting** | Token bucket por conexión; desconexión ante abuso persistente |
| **Inyección** | No se usa `eval()` ni se insertan datos del cliente en el DOM sin sanitizar |
| **Denegación de servicio** | Límite máximo de conexiones simultáneas; limpieza automática de salas inactivas |
| **Estado del juego** | El cliente nunca modifica el estado directamente; solo envía inputs validados por el servidor |

---

## 11. Consideraciones de Escalabilidad

Para la versión inicial (objetivo: 50 salas simultáneas), una única instancia de Node.js es suficiente. Para escalar más allá:

```
                    ┌───────────────┐
                    │  Load Balancer │
                    │  (sticky sess.)│
                    └───┬───────┬───┘
                        │       │
               ┌────────┘       └────────┐
               ▼                         ▼
        ┌─────────────┐          ┌─────────────┐
        │  Instancia 1 │          │  Instancia 2 │
        │  (salas 1-50)│          │  (salas 51+) │
        └─────────────┘          └─────────────┘
```

- **Sticky sessions**: Los dos jugadores de una sala deben conectarse a la misma instancia.
- **Sin estado compartido**: Cada instancia gestiona sus propias salas en memoria. No se necesita base de datos ni Redis para la versión inicial.
- **Escalado horizontal**: Se añaden instancias detrás del balanceador, cada una independiente.
