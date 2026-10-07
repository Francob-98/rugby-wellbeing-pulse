# Informes en PNG y PDF con seguimiento prioritario

## Objetivo
Ampliar la pantalla **Informes** para que el preparador físico pueda descargar el resumen general o la ficha individual tanto en PNG como en PDF, y detectar rápidamente a los jugadores que requieren seguimiento por esfuerzo alto o dolor muscular.

## Cambios
- Mantener la descarga PNG actual y sumar un botón **Descargar PDF**.
- Generar el PDF localmente en el navegador, sin enviar datos de jugadores a servicios externos.
- Preparar el PDF en formato vertical, con márgenes y división automática en páginas para que las secciones se lean con más espacio.
- En el resumen general, mostrar una sección destacada de **Seguimiento prioritario** que incluya a todos los jugadores con:
  - RPE igual o mayor a 8.
  - Dolor muscular informado antes y/o después del entrenamiento.
- Indicar junto a cada jugador la causa concreta: RPE, dolor pre-entreno, dolor post-entreno y zonas afectadas.
- Mantener la identidad visual del CBMM, el escudo transparente y los filtros actuales por fecha y equipo.

## Detalles técnicos
- Usar la misma vista autenticada del informe como fuente para PNG y PDF.
- Incorporar una librería compatible con navegador para componer el PDF desde la imagen renderizada.
- Ajustar el listado para no limitar la cantidad de jugadores prioritarios y evitar que se omita una alerta relevante.
- Actualizar el texto de estado vacío para confirmar que no hubo RPE 8+ ni dolor reportado.
- Verificar compilación, descarga de ambos formatos, informe general, ficha individual y presentación en pantalla angosta.