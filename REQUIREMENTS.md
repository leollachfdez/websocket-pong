# Documento de Requisitos — WebSocket-Pong

## 1. Introducción

### 1.1 Propósito
Definir los requisitos funcionales, no funcionales y técnicos para el desarrollo de **WebSocket-Pong**, una aplicación web multijugador del clásico juego retro Pong con la estética visual original, que utiliza WebSocket como tecnología de comunicación en tiempo real.

### 1.2 Alcance
El producto es un juego Pong jugable desde el navegador que permite a dos jugadores competir en tiempo real a través de una conexión WebSocket. El juego replica la experiencia visual y mecánica del Pong original de Atari (1972).

---

## 2. Objetivos del Proyecto

| ID | Objetivo | Criterio de éxito |
|----|----------|-------------------|
| O-1 | Ofrecer una experiencia multijugador en tiempo real con latencia mínima | Latencia percibida < 100 ms entre acción y respuesta |
| O-2 | Reproducir fielmente la estética retro del Pong original | Paleta monocromática, tipografía pixelada, elementos rectangulares |
| O-3 | Permitir partidas rápidas sin registro ni instalación | El usuario accede desde el navegador y juega en menos de 3 clics |
| O-4 | Garantizar una arquitectura simple, mantenible y extensible | Separación clara cliente-servidor; código modular |

---

## 3. Descripción General del Sistema

### 3.1 Perspectiva del producto
WebSocket-Pong es una aplicación cliente-servidor:
- **Cliente**: Aplicación web que renderiza el juego en un elemento `<canvas>` HTML5, captura la entrada del jugador y se comunica con el servidor mediante WebSocket.
- **Servidor**: Proceso que gestiona la lógica del juego (game loop autoritativo), sincroniza el estado entre ambos jugadores y arbitra las partidas.

### 3.2 Usuarios objetivo
- Jugadores casuales que buscan partidas rápidas en el navegador.
- Aficionados a los juegos retro.

---

## 4. Requisitos Funcionales

### 4.1 Gestión de Partidas

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-01 | El sistema debe permitir crear una nueva sala/partida | Alta |
| RF-02 | El sistema debe permitir a un segundo jugador unirse a una sala existente mediante un código o enlace | Alta |
| RF-03 | La partida comienza automáticamente cuando ambos jugadores están conectados | Alta |
| RF-04 | Si un jugador se desconecta, la partida se pausa o finaliza notificando al otro jugador | Alta |
| RF-05 | Al terminar la partida se muestra la pantalla de resultado con el marcador final | Media |
| RF-06 | Los jugadores pueden iniciar una revancha sin salir de la sala | Baja |

### 4.2 Mecánicas del Juego

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-07 | Cada jugador controla una paleta (paddle) que se mueve verticalmente | Alta |
| RF-08 | La pelota se mueve de forma continua rebotando en los bordes superior e inferior | Alta |
| RF-09 | Cuando la pelota sobrepasa una paleta, el jugador contrario anota un punto | Alta |
| RF-10 | Tras anotar un punto, la pelota se reinicia en el centro con dirección aleatoria | Alta |
| RF-11 | La partida termina cuando un jugador alcanza un número configurable de puntos (por defecto 11) | Alta |
| RF-12 | La velocidad de la pelota aumenta progresivamente durante cada rally | Media |
| RF-13 | El ángulo de rebote de la pelota varía según el punto de impacto en la paleta | Media |

### 4.3 Interfaz de Usuario

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-14 | La pantalla de juego muestra el campo, las dos paletas, la pelota y el marcador | Alta |
| RF-15 | El diseño visual replica la estética monocromática del Pong original (fondo negro, elementos blancos) | Alta |
| RF-16 | La línea central divisoria se dibuja con patrón de línea discontinua | Media |
| RF-17 | El marcador se muestra en la parte superior con tipografía pixelada/retro | Media |
| RF-18 | Se muestra una pantalla de inicio/lobby para crear o unirse a una partida | Alta |
| RF-19 | Se muestra un indicador de "esperando oponente" mientras la sala no está completa | Media |
| RF-20 | Se reproduce una cuenta regresiva (3-2-1) antes de iniciar o reanudar el juego | Baja |

### 4.4 Controles

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-21 | El jugador controla la paleta con las teclas de flecha arriba/abajo o W/S | Alta |
| RF-22 | En dispositivos táctiles, el jugador controla la paleta mediante gestos de deslizamiento vertical | Baja |

### 4.5 Comunicación en Tiempo Real

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-23 | El cliente envía al servidor las entradas del jugador (dirección de movimiento) mediante WebSocket | Alta |
| RF-24 | El servidor envía el estado del juego actualizado a ambos clientes a una tasa fija (tick rate) | Alta |
| RF-25 | El servidor es autoritativo: toda la lógica de colisiones, puntuación y física se ejecuta en el servidor | Alta |

---

## 5. Requisitos No Funcionales

### 5.1 Rendimiento

| ID | Requisito |
|----|-----------|
| RNF-01 | El juego debe renderizar a 60 FPS en navegadores modernos |
| RNF-02 | El servidor debe procesar el game loop a un tick rate mínimo de 30 ticks/s |
| RNF-03 | La latencia de ida y vuelta WebSocket no debe superar los 150 ms para una experiencia aceptable |

### 5.2 Compatibilidad

| ID | Requisito |
|----|-----------|
| RNF-04 | El cliente debe funcionar en las últimas dos versiones estables de Chrome, Firefox, Edge y Safari |
| RNF-05 | El diseño debe ser responsive y adaptarse a resoluciones desde 320 px de ancho |

### 5.3 Escalabilidad

| ID | Requisito |
|----|-----------|
| RNF-06 | El servidor debe soportar al menos 50 salas simultáneas (100 jugadores) |
| RNF-07 | La arquitectura debe permitir escalar horizontalmente añadiendo instancias del servidor |

### 5.4 Disponibilidad y Fiabilidad

| ID | Requisito |
|----|-----------|
| RNF-08 | El sistema debe reconectar automáticamente al jugador si se pierde la conexión WebSocket momentáneamente (< 5 s) |
| RNF-09 | El servidor debe limpiar salas inactivas tras 5 minutos sin actividad |

### 5.5 Seguridad

| ID | Requisito |
|----|-----------|
| RNF-10 | Las conexiones WebSocket deben utilizar WSS (WebSocket Secure) en producción |
| RNF-11 | El servidor debe validar todas las entradas del cliente para prevenir trampas o inyección de datos |
| RNF-12 | Se debe implementar rate limiting en las conexiones para mitigar ataques de denegación de servicio |

---

## 6. Requisitos Técnicos

### 6.1 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Cliente** | HTML5 Canvas + JavaScript/TypeScript |
| **Servidor** | Node.js |
| **Comunicación** | WebSocket (librería `ws` o Socket.IO) |
| **Empaquetado** | Vite o similar |
| **Despliegue** | Cualquier proveedor con soporte WebSocket (Railway, Render, VPS) |

### 6.2 Protocolo de Mensajes WebSocket

Se define un protocolo JSON ligero para la comunicación cliente-servidor:

**Cliente → Servidor**
| Tipo de mensaje | Descripción |
|-----------------|-------------|
| `join` | Solicita crear o unirse a una sala |
| `input` | Envía la entrada del jugador (dirección de movimiento) |
| `rematch` | Solicita una revancha |

**Servidor → Cliente**
| Tipo de mensaje | Descripción |
|-----------------|-------------|
| `waiting` | Confirma que la sala fue creada y espera oponente |
| `start` | Notifica que la partida comienza (incluye rol: jugador 1 o 2) |
| `state` | Envía el estado del juego (posiciones, marcador, estado de la pelota) |
| `score` | Notifica que se anotó un punto |
| `end` | Notifica el fin de la partida con el resultado |
| `opponent_disconnected` | Notifica la desconexión del oponente |

### 6.3 Game Loop del Servidor

- El servidor ejecuta un bucle de simulación a **30-60 ticks por segundo**.
- En cada tick: procesa entradas, actualiza posiciones, detecta colisiones, actualiza marcador y emite el estado a los clientes.
- El cliente realiza **interpolación** del estado recibido para lograr animación suave a 60 FPS.

### 6.4 Estructura del Estado del Juego

```json
{
  "ball": { "x": 400, "y": 300, "vx": 5, "vy": 3 },
  "paddles": {
    "player1": { "y": 250 },
    "player2": { "y": 250 }
  },
  "score": { "player1": 0, "player2": 0 },
  "status": "playing"
}
```

---

## 7. Restricciones

| ID | Restricción |
|----|-------------|
| C-01 | No se requiere autenticación ni persistencia de datos de usuario |
| C-02 | No se requiere inteligencia artificial para modo un solo jugador en esta fase |
| C-03 | El juego es exclusivamente para dos jugadores humanos |
| C-04 | No se incluyen efectos de sonido ni música en la versión inicial |

---

## 8. Glosario

| Término | Definición |
|---------|------------|
| **Paddle** | Paleta controlada por el jugador que se desplaza verticalmente |
| **Rally** | Secuencia de intercambios de la pelota entre ambos jugadores sin que se anote punto |
| **Tick rate** | Frecuencia de actualización del game loop en el servidor (ticks por segundo) |
| **Autoritativo** | Modelo donde el servidor es la fuente de verdad del estado del juego |
| **Interpolación** | Técnica del cliente para suavizar el movimiento entre estados recibidos del servidor |
| **WSS** | WebSocket Secure, conexión WebSocket cifrada con TLS |
