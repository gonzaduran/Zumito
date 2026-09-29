@AGENTS.md

# Zumito — Contexto del proyecto

PWA de control de gastos personales. Rol de Claude: ingeniero senior full-stack y diseñador de producto.

## Objetivo

- Registrar un gasto en **menos de 5 segundos**.
- Que ver en qué se va el dinero sea un placer, no una obligación.

## Stack (no cambiar nada sin preguntar)

- Next.js (App Router) + TypeScript estricto
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase: Auth, Postgres, Row Level Security, Edge Functions si hacen falta
- PWA con manifest y service worker (Serwist)
- Despliegue en Vercel, código en GitHub
- Interfaz en español (España), moneda EUR, fechas dd/mm/aaaa. Preparado para i18n.

## Identidad de marca

- Logo: un zumo de brick con pajita. Es el **único** elemento relacionado con el zumo.
- El logo aparece solo en: icono de la app, pantalla de carga, onboarding y ajustes.
- Resto de la app **sin** temática de zumo, frutas ni bebidas: nada de metáforas, mascotas, colores cítricos ni juegos de palabras.
- Diseño moderno y premium. Referencias de tono: Revolut, Copilot Money, Monzo, Linear. Limpio, con aire, jerarquía clara, números protagonistas.
- Los emojis de categorías forman parte de la personalidad de la app.
- Textos: claros, cercanos, directos, español de España, tuteando, sin humor forzado.
  - Ejemplos: "Gasto guardado", "Aún no hay gastos hoy", "Vas por el 80% del presupuesto de Ocio".
- **Claude Design** produce el diseño visual definitivo. Su bundle es la fuente de verdad de colores, tipografía, componentes y pantallas. No cambiarlo sin preguntar.

## Principios

1. Mobile-first, uso con una mano. Zonas táctiles de mínimo 44px.
2. Rapidez: cero pasos innecesarios, teclado numérico propio, valores por defecto inteligentes.
3. Modo claro/oscuro automático, microanimaciones sutiles, háptica donde sea posible.
4. Seguridad: RLS en todas las tablas, nunca exponer la service role key en el cliente, validar todo con Zod.
5. Accesibilidad: contraste AA, etiquetas ARIA, navegación por teclado.
6. Código limpio: componentes pequeños, hooks reutilizables, sin código muerto, commits pequeños con mensajes claros.

## Forma de trabajar

- Antes de cada fase: explicar el plan en pocas líneas y **esperar OK**.
- Al terminar cada fase: indicar qué probar a mano y qué comandos ejecutar.
- Si algo es ambiguo: preguntar en lugar de suponer.
- El usuario manda cada fase como un prompt. Al terminar, avisar para recibir el siguiente.

## Diseño

- Pantallas de Claude Design en `design/screens/`. Detalles en `design/README.md`.
- Fuente de verdad: **sistema v2**, dirección A · Minimal (pantalla 13). De la B (pantalla 14) solo se usa el botón central "+".
- Las pantallas 01–12 usan la paleta cítrica antigua: solo sirven como referencia de estructura y textos, nunca de estilo.
- Tokens en `src/app/globals.css`. El acento es `--primary`.
- Clases propias: `num` para cifras (Inter con números tabulares) y `tap` para zonas táctiles de 44px.

## Estructura

- `src/app/(app)`: pantallas con la barra inferior (Inicio, Historial, Estadísticas, Ajustes).
- `src/components/{ui,forms,charts,layout}`, `src/lib/{supabase,utils,validators}`, `src/hooks`, `src/types`.
- `src/i18n`: diccionarios tipados y formato de euros y fechas. Ningún texto de interfaz va directamente en los componentes.
- `supabase/migrations`: migraciones SQL.

## Plan por fases

0. Base: Next.js + TS estricto, Tailwind, shadcn/ui, ESLint/Prettier, i18n (es-ES), repo en GitHub y Vercel.
1. Diseño: integrar el bundle de Claude Design (tokens, tipografía, tema claro/oscuro, componentes base).
2. Supabase: esquema (perfiles, categorías, gastos, presupuestos), RLS, migraciones, tipos generados.
3. Auth y onboarding: login, sesión, categorías por defecto con emoji.
4. Registro rápido: teclado numérico propio, categoría y fecha por defecto, guardado optimista, háptica.
5. Listado y edición: gastos por día, editar/borrar, estados vacíos.
6. Análisis: resumen mensual, por categoría, gráficos y tendencias.
7. Presupuestos: por categoría, avisos de progreso.
8. PWA: manifest, Serwist, instalable, soporte offline con sincronización.
9. Pulido: accesibilidad, rendimiento, animaciones, ajustes, pruebas y despliegue a producción.
