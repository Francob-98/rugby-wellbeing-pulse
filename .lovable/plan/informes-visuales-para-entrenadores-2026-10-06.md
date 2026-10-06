# Informes visuales para entrenadores

## Objetivo
Agregar una pantalla de **Informes** dentro del acceso del staff para generar y descargar imágenes PNG listas para compartir por WhatsApp.

## Qué se va a construir
- Un acceso nuevo **Informes** en la navegación del staff.
- **Resumen general por fecha**, con selector de equipo y día, que muestre:
  - respuestas recibidas y wellness medio;
  - sueño, fatiga y dolor del plantel;
  - carga total, RPE medio y duración;
  - separación clara entre pre y post entrenamiento;
  - jugadores con señales que merecen atención;
  - mapa de dolor acumulado de frente y espalda.
- **Ficha individual por fecha**, con selector de jugador y día, que reúna:
  - wellness y sus indicadores;
  - entrenamiento o partido, equipo, duración, RPE y carga;
  - comentarios;
  - mapa de dolor de frente y espalda.
- Botón **Descargar PNG** en cada vista. La imagen tendrá formato vertical, identidad CBMM discreta, fecha y filtros aplicados.
- Estados claros cuando falten respuestas pre, post o ambas en la fecha elegida.

## Criterio visual
- Rojo, blanco y bordó oficiales.
- Escudo transparente y discreto.
- Jerarquía de lectura rápida: cifras grandes, indicadores simples, gráficos compactos y alertas visibles.
- La imagen exportada no incluirá botones ni controles de la pantalla.

## Detalles técnicos
- Reutilizar los datos, cálculos, mapa corporal y componentes de identidad existentes.
- Incorporar una utilidad de captura del informe a PNG en el navegador, sin enviar datos de jugadores a servicios externos.
- Mantener el acceso limitado al staff autenticado y no modificar permisos ni almacenamiento.
- Añadir metadatos propios para la nueva pantalla y registrar la decisión estructural del módulo de informes.

## Verificación
- Comprobar que los filtros cambian correctamente los datos generales e individuales.
- Descargar ambas variantes y revisar que el PNG sea legible, completo y sin controles visibles.
- Revisar la pantalla en ancho de computadora y celular, además del estado sin datos.
