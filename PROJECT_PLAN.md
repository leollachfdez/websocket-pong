# Plan de Proyecto — WebSocket-Pong

## 1. Resumen Ejecutivo

Este plan describe las etapas, hitos, recursos y cronograma para el desarrollo de **WebSocket-Pong**: un juego Pong multijugador en tiempo real con estética retro, basado en WebSocket y jugable desde el navegador. El proyecto se estructura en **6 fases** con un enfoque iterativo e incremental.

---

## 2. Fases del Desarrollo

### Fase 0 — Configuración del Entorno y Bootstrapping

**Objetivo**: Preparar el entorno de desarrollo, inicializar el proyecto y establecer la estructura base.

| Tarea | Descripción | Requisitos cubiertos |
|-------|-------------|----------------------|
| 0.1 | Inicializar repositorio Git con estructura de carpetas (`client/`, `server/`, `shared/`) | O-4 |
| 0.2 | Configurar Node.js + TypeScript para el servidor | Req. Técnicos §6.1 |
| 0.3 | Configurar Vite + TypeScript para el cliente | Req. Técnicos §6.1 |
| 0.4 | Instalar dependencias: `ws` (o Socket.IO), `express` (para servir archivos estáticos) | Req. Técnicos §6.1 |
| 0.5 | Configurar ESLint + Prettier | O-4 |
| 0.6 | Crear script de desarrollo (`dev`) que levante servidor y cliente simultáneamente | O-4 |

**Entregable**: Proyecto funcional que compila y levanta servidor + cliente vacío en `localhost`.

---

### Fase 1 — Servidor: Gestión de Salas y Conexión WebSocket

**Objetivo**: Implementar la infraestructura de comunicación y el sistema de salas.

| Tarea | Descripción | Requisitos cubiertos |
|-------|-------------|----------------------|
| 1.1 | Crear servidor WebSocket que acepte conexiones | RF-23 |
| 1.2 | Implementar sistema de salas: crear sala, generar código único | RF-01 |
| 1.3 | Implementar lógica para unirse a una sala existente por código | RF-02 |
| 1.4 | Emitir evento `waiting` cuando la sala tiene un solo jugador | RF-19 |
| 1.5 | Emitir evento `start` cuando ambos jugadores están conectados | RF-03 |
| 1.6 | Detectar desconexión y notificar al oponente (`opponent_disconnected`) | RF-04 |
| 1.7 | Implementar limpieza de salas inactivas (timeout 5 min) | RNF-09 |
| 1.8 | Validar mensajes entrantes del cliente (formato, tipo, valores) | RNF-11 |
| 1.9 | Implementar rate limiting por conexión | RNF-12 |

**Entregable**: Servidor que gestiona salas, empareja jugadores y maneja conexiones/desconexiones.

---

### Fase 2 — Servidor: Game Loop y Lógica del Juego

**Objetivo**: Implementar el motor de juego autoritativo en el servidor.

| Tarea | Descripción | Requisitos cubiertos |
|-------|-------------|----------------------|
| 2.1 | Definir tipos/interfaces compartidas para el estado del juego (`shared/`) | Req. Técnicos §6.4 |
| 2.2 | Implementar game loop a tick rate configurable (30-60 ticks/s) | RF-24, RNF-02 |
| 2.3 | Procesar entradas (`input`) de los jugadores y actualizar posición de las paletas | RF-07, RF-23 |
| 2.4 | Implementar movimiento de la pelota con velocidad constante | RF-08 |
| 2.5 | Implementar colisión de la pelota con bordes superior e inferior | RF-08 |
| 2.6 | Implementar colisión de la pelota con las paletas | RF-07 |
| 2.7 | Implementar variación del ángulo de rebote según punto de impacto | RF-13 |
| 2.8 | Implementar aumento progresivo de velocidad durante el rally | RF-12 |
| 2.9 | Detectar gol (pelota pasa la paleta) y actualizar marcador | RF-09 |
| 2.10 | Reiniciar pelota en el centro tras gol | RF-10 |
| 2.11 | Detectar fin de partida al alcanzar puntos límite | RF-11 |
| 2.12 | Emitir estado del juego a ambos clientes cada tick | RF-24, RF-25 |
| 2.13 | Emitir eventos `score` y `end` | RF-05 |

**Entregable**: Motor de juego completo y testeable ejecutándose en el servidor.

---

### Fase 3 — Cliente: Renderizado y Estética Retro

**Objetivo**: Implementar la interfaz visual del juego con la estética del Pong original.

| Tarea | Descripción | Requisitos cubiertos |
|-------|-------------|----------------------|
| 3.1 | Crear estructura HTML con elemento `<canvas>` a pantalla completa | RF-14 |
| 3.2 | Implementar módulo de renderizado del canvas (fondo negro, elementos blancos) | RF-15 |
| 3.3 | Dibujar las paletas como rectángulos blancos | RF-14 |
| 3.4 | Dibujar la pelota como cuadrado blanco | RF-14 |
| 3.5 | Dibujar la línea central discontinua | RF-16 |
| 3.6 | Dibujar el marcador con tipografía pixelada/retro | RF-17 |
| 3.7 | Implementar render loop con `requestAnimationFrame` a 60 FPS | RNF-01 |
| 3.8 | Implementar interpolación del estado del servidor para animación suave | Req. Técnicos §6.3 |
| 3.9 | Hacer el canvas responsive (adaptación a distintas resoluciones) | RNF-05 |

**Entregable**: Cliente que renderiza el juego con estética retro fiel al original.

---

### Fase 4 — Cliente: Pantallas, Controles e Integración

**Objetivo**: Completar la experiencia del usuario integrando pantallas de UI, controles y la conexión WebSocket.

| Tarea | Descripción | Requisitos cubiertos |
|-------|-------------|----------------------|
| 4.1 | Implementar pantalla de inicio/lobby (crear o unirse a partida) | RF-18 |
| 4.2 | Implementar flujo de crear sala → mostrar código → esperar oponente | RF-01, RF-19 |
| 4.3 | Implementar flujo de unirse a sala mediante código compartido | RF-02 |
| 4.4 | Conectar cliente al servidor WebSocket | RF-23 |
| 4.5 | Enviar entradas del jugador al servidor | RF-23 |
| 4.6 | Recibir y aplicar estado del juego desde el servidor | RF-24 |
| 4.7 | Implementar captura de teclado (flechas arriba/abajo, W/S) | RF-21 |
| 4.8 | Implementar pantalla de resultado con marcador final | RF-05 |
| 4.9 | Implementar cuenta regresiva 3-2-1 antes de iniciar | RF-20 |
| 4.10 | Implementar botón de revancha | RF-06 |
| 4.11 | Implementar reconexión automática (< 5 s) | RNF-08 |
| 4.12 | Manejar notificación de desconexión del oponente en la UI | RF-04 |

**Entregable**: Juego completamente funcional y jugable de extremo a extremo.

---

### Fase 5 — Testing, Pulido y Despliegue

**Objetivo**: Asegurar calidad, corregir defectos y desplegar a producción.

| Tarea | Descripción | Requisitos cubiertos |
|-------|-------------|----------------------|
| 5.1 | Escribir tests unitarios para la lógica del game loop (colisiones, puntuación) | O-4 |
| 5.2 | Escribir tests de integración para el flujo de salas (crear, unirse, desconectar) | O-4 |
| 5.3 | Pruebas manuales de jugabilidad en Chrome, Firefox, Edge y Safari | RNF-04 |
| 5.4 | Pruebas de rendimiento: verificar 60 FPS en cliente y tick rate estable en servidor | RNF-01, RNF-02 |
| 5.5 | Pruebas de latencia con conexiones simuladas | RNF-03 |
| 5.6 | Pruebas de carga: verificar 50 salas simultáneas | RNF-06 |
| 5.7 | Configurar WSS (TLS) para producción | RNF-10 |
| 5.8 | Configurar despliegue en proveedor cloud (Railway / Render / VPS) | Req. Técnicos §6.1 |
| 5.9 | Desplegar y validar en producción | — |
| 5.10 | Actualizar README con instrucciones de uso y despliegue | — |

**Entregable**: Aplicación desplegada, estable y accesible públicamente.

---

## 3. Hitos del Proyecto

| Hito | Fase | Descripción | Criterio de aceptación |
|------|------|-------------|------------------------|
| **M0** | Fase 0 | Entorno listo | Proyecto compila; servidor y cliente arrancan en `localhost` |
| **M1** | Fase 1 | Networking funcional | Dos clientes se conectan y se emparejan en una sala via WebSocket |
| **M2** | Fase 2 | Motor de juego operativo | El game loop ejecuta colisiones, movimiento y puntuación correctamente (verificable con logs o cliente de test) |
| **M3** | Fase 3 | Renderizado completo | El canvas muestra todos los elementos del juego con estética retro |
| **M4** | Fase 4 | Juego jugable end-to-end | Dos jugadores pueden jugar una partida completa desde el navegador |
| **M5** | Fase 5 | Producción | Aplicación desplegada, testeada y accesible públicamente |

---

## 4. Recursos Necesarios

### 4.1 Recursos Humanos

| Rol | Responsabilidad | Dedicación estimada |
|-----|-----------------|---------------------|
| Desarrollador Full-Stack | Implementación de cliente y servidor | 100% del proyecto |
| (Opcional) QA / Tester | Pruebas de jugabilidad, rendimiento y compatibilidad | Fase 5 |

### 4.2 Recursos Tecnológicos

| Recurso | Propósito |
|---------|-----------|
| Node.js 20+ | Runtime del servidor |
| TypeScript 5+ | Lenguaje de desarrollo (cliente y servidor) |
| Vite 5+ | Bundler y dev server del cliente |
| Librería `ws` o Socket.IO | Comunicación WebSocket |
| Git + GitHub/GitLab | Control de versiones |
| Proveedor cloud (Railway / Render / VPS) | Hosting de producción |
| Navegadores modernos (Chrome, Firefox, Edge, Safari) | Entorno de prueba |

### 4.3 Recursos de Conocimiento

| Área | Referencia |
|------|------------|
| API Canvas HTML5 | MDN Web Docs — Canvas API |
| Protocolo WebSocket | RFC 6455, documentación de `ws` / Socket.IO |
| Diseño de game loops | "Fix Your Timestep!" (Gaffer on Games) |
| Networking para juegos | "Networked Physics" (Gaffer on Games), técnicas de interpolación |

---

## 5. Cronograma Estimado

```
Semana    1         2         3         4         5
        ┌─────────┬─────────┬─────────┬─────────┬─────────┐
Fase 0  │███      │         │         │         │         │  ~2 días
Fase 1  │   ██████│██       │         │         │         │  ~5 días
Fase 2  │         │  ███████│███      │         │         │  ~6 días
Fase 3  │         │         │   ██████│         │         │  ~4 días
Fase 4  │         │         │         │█████████│██       │  ~6 días
Fase 5  │         │         │         │         │  ███████│  ~5 días
        └─────────┴─────────┴─────────┴─────────┴─────────┘
```

| Fase | Duración estimada | Semana |
|------|-------------------|--------|
| Fase 0 — Setup | 2 días | Semana 1 |
| Fase 1 — Servidor: Salas y WebSocket | 5 días | Semana 1–2 |
| Fase 2 — Servidor: Game Loop | 6 días | Semana 2–3 |
| Fase 3 — Cliente: Renderizado | 4 días | Semana 3 |
| Fase 4 — Cliente: Integración | 6 días | Semana 4–5 |
| Fase 5 — Testing y Despliegue | 5 días | Semana 5 |
| **Total estimado** | **~28 días laborales (5-6 semanas)** | |

> **Nota**: El cronograma asume un desarrollador trabajando a tiempo completo. Fases 2 y 3 tienen cierto solapamiento posible ya que el renderizado del cliente puede avanzar en paralelo con pruebas del game loop usando datos ficticios.

---

## 6. Riesgos y Mitigaciones

| ID | Riesgo | Impacto | Probabilidad | Mitigación |
|----|--------|---------|--------------|------------|
| R-1 | Latencia alta en WebSocket degrada la experiencia | Alto | Media | Implementar interpolación en cliente; optimizar payload; permitir tick rate configurable |
| R-2 | Desfase entre estado del servidor y visualización en cliente | Alto | Media | Implementar interpolación y reconciliación; probar con latencia simulada |
| R-3 | Problemas de compatibilidad entre navegadores | Medio | Baja | Usar APIs estándar (Canvas 2D, WebSocket nativo); probar temprano en múltiples navegadores |
| R-4 | El proveedor de hosting no soporta conexiones WebSocket persistentes | Alto | Baja | Verificar soporte WSS antes de elegir proveedor; tener alternativa (polling como fallback) |
| R-5 | Complejidad inesperada en la física del juego | Medio | Baja | Empezar con mecánicas simples; iterar incrementalmente (velocidad variable y ángulos en segunda iteración) |

---

## 7. Definición de "Done" por Fase

Cada fase se considera completada cuando:

1. **Todas las tareas** de la fase están implementadas.
2. **El código compila** sin errores de TypeScript.
3. **El entregable** descrito en la fase es verificable manualmente.
4. **El código está commiteado** en la rama principal (o en una rama de feature mergeada).
5. En Fase 5 adicionalmente: tests pasan, pruebas manuales completadas, despliegue exitoso.

---

## 8. Dependencias entre Fases

```
Fase 0 ──→ Fase 1 ──→ Fase 2 ──┐
                                 ├──→ Fase 4 ──→ Fase 5
              Fase 3 ────────────┘
```

- **Fase 1** depende de **Fase 0** (proyecto inicializado).
- **Fase 2** depende de **Fase 1** (infraestructura WebSocket y salas).
- **Fase 3** depende de **Fase 0** (puede iniciarse en paralelo con Fases 1-2 usando datos mock).
- **Fase 4** depende de **Fase 2** y **Fase 3** (requiere server y render listos).
- **Fase 5** depende de **Fase 4** (juego funcional completo).
