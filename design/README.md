# Diseño de Zumito

Pantallas exportadas desde Claude Design (`Zumito — Prototipos móviles.html`), desempaquetadas en `screens/`. Se han quitado las fuentes embebidas y el runtime del prototipo; queda el HTML y el CSS de cada pantalla, legibles.

## Fuente de verdad

**Sistema v2** (neutro, fintech premium), que sustituye a la paleta cítrica:

- `13-inicio-direccion-a-minimal-revolut-linear.html`: **dirección elegida** para la app.
- `14-inicio-direccion-b-glass-copilot-money.html`: alternativa. De aquí sale el botón central "+" grande con degradado.

Los tokens v2 están en `src/app/globals.css`:

- **Color:** fondo `#FAFAFA` / `#0B0B0E`, acento índigo `#5457E5` / `#7274FF` y 7 colores de categoría.
- **Tipografía:** Manrope para textos e Inter con números tabulares para cifras.
- **Radios:** 14, 20 y 28px.
- **Sombras:** una sombra de tarjeta muy sutil.

## Pantallas con la paleta antigua

Las pantallas 01–12 usan la paleta cítrica antigua (Poppins/Nunito, naranja, mascota). **Solo sirven como referencia de estructura, flujos y textos.** Hay que rehacerlas con el sistema v2 y sin temática de zumo: nada de mascota, emojis de fruta ni juegos de palabras.

| Archivo                              | Uso                                           |
| ------------------------------------ | --------------------------------------------- |
| 01–03 onboarding                     | Flujo de bienvenida, categorías e instalación |
| 05 añadir gasto                      | Campos y teclado numérico del registro        |
| 06 historial                         | Lista agrupada por día y filtros              |
| 07 estadísticas / 08 resumen del mes | Gráficos y resúmenes                          |
| 09 ajustes / 10 precios              | Opciones y plan Premium                       |
| 11 estados vacíos y carga            | Estados vacíos, sin resultados y skeletons    |
