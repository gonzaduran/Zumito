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
- Fuente de verdad: **sistema v2**, dirección A · Minimal (pantalla 13). De la B (pantalla 14) se usan el botón "+" elevado y la tarjeta destacada con degradado.
- Efecto cristal solo en la barra inferior y en las hojas flotantes.
- Las pantallas 01–12 usan la paleta cítrica antigua. No se adaptan: Claude Design enviará sus versiones v2.
- Iconos: Lucide. El Toast se deriva de los tokens.
- Tokens en `src/app/globals.css`.
- Acento: `--primary` (#5457E5) es el relleno de los botones en ambos modos, con texto blanco. `--primary-text` (#5457E5 en claro, #7477FF en oscuro, ajuste mínimo de #7274FF para cumplir AA en todas las superficies) es para texto, iconos y enlaces.
- Categorías: 12 colores OKLCH con el mismo brillo y croma, todos AA (≥ 4,5:1) sobre las superficies. Se definen en `src/lib/category-colors.ts` y `--cat-*`.
- El emoji es el identificador principal de cada categoría. En gráficos se muestran las 6 mayores y el resto se agrupa en "Otros" (`groupTopCategories`, color `--cat-other`).
- `--faint` es solo decorativo: no cumple AA como texto.
- `--destructive-text` es para texto rojo sobre su propio fondo tenue (botones destructivos). El chip seleccionado usa `--primary-strong` en claro.
- El contraste se verifica en cada pantalla con axe-core dentro de `npm run test:e2e`. Un cálculo a mano no basta: los fondos reales (cristal sobre velo, fondos tenues sobre la página) cambian el resultado.
- Clases propias: `num` para cifras (Inter con números tabulares) y `tap` para zonas táctiles de 44px.

## Estructura

- `src/app/(app)`: pantallas con la barra inferior (Inicio, Historial, Estadísticas, Ajustes).
- `src/components/{ui,forms,charts,layout}`, `src/lib/{supabase,utils,validators}`, `src/hooks`, `src/types`.
- `src/i18n`: diccionarios tipados y formato de euros y fechas. Ningún texto de interfaz va directamente en los componentes.
- `supabase/migrations`: migraciones SQL. `supabase/tests/rls.test.mjs` prueba el esquema y las políticas RLS en Postgres (PGlite): `npm run test:db`. Hay que ampliarlo con cada migración.

## Datos (Supabase)

- Tablas: `profiles` (la crea un trigger al registrarse), `categories`, `expenses` y `budgets` (`category_id` nulo = presupuesto total del mes).
- Importes siempre en céntimos (`amount_cents`, entero). Máximo 1.000.000 €.
- Las categorías con gastos no se borran: se archivan (`archived_at`).
- Las referencias a categorías usan la clave compuesta `(category_id, user_id)`, así que no se puede apuntar a la categoría de otro usuario.
- Los ids de los gastos se pueden generar en el cliente (`crypto.randomUUID()`): sirve para el guardado optimista y hace idempotentes los reintentos sin conexión.
- Clientes en `src/lib/supabase/{server,client}.ts`. Variables validadas con Zod en `src/lib/env.ts`.
- Tipos en `src/types/database.ts`. Tras cada migración, regenerarlos con `npm run db:types` (proyecto enlazado).
- Validadores Zod en `src/lib/validators`. Sus errores devuelven claves de `validation.*` del diccionario, no textos.

## Registro rápido de gastos

- El panel del "+" está en `src/components/expenses/add-expense-sheet.tsx` y su formulario en `add-expense-form.tsx`.
- Teclado numérico propio (`amount-keypad.tsx`) con entrada natural y coma decimal: "5" = 5 € y "12,5" = 12,50 €. La lógica pura y sus pruebas están en `src/lib/amount-input.ts`.
- También admite el teclado físico: números, coma o punto, borrar y Enter para guardar.
- La categoría preseleccionada es la del último gasto. Fecha por defecto: ahora. Hay atajos "Ayer" y "Otra fecha".
- Guardado optimista:
  - el panel se cierra al instante y aparece el aviso "Gasto guardado" con "Deshacer";
  - el id se genera en el cliente;
  - si falla, el aviso cambia a "Reintentar";
  - "Deshacer" espera a que termine el guardado en curso.
- Acciones de servidor en `src/lib/actions/expenses.ts`. Revalidan todo el layout de la app.
- Háptica en `src/lib/haptics.ts`. Usa `navigator.vibrate`, que solo existe en Android; en iOS no hace nada.
- Los totales del Inicio vienen de la función SQL `expense_summary()`, calculada en la zona horaria del perfil.
- Las fechas se formatean siempre con la zona del usuario (`src/i18n/format.ts`); el servidor está en UTC.

## Historial

- `/historial` usa la función SQL `search_expenses`: busca en concepto, nota y nombre de categoría (con los comodines escapados) y calcula el total de cada día sobre todos los resultados.
- Filtros en la URL (`?q=`, `?c=`) y páginas de 50 con "Ver más" (`?n=`).
- `ExpenseList` (`src/components/expenses/expense-list.tsx`) se usa en el Inicio y en el Historial. Al tocar un gasto se abre el mismo `ExpenseForm` del "+", ya relleno, con "Guardar cambios" y "Eliminar gasto".
- Borrar es optimista y tiene "Deshacer", que vuelve a crear el gasto con el mismo id. Al editar sin cambiar el día se conserva la hora original.
- `src/lib/expense-view.ts` convierte los resultados en filas y grupos por día (función pura, probada).
- Los paneles hacen scroll y el teclado se compacta en pantallas bajas (iPhone SE).

## Estadísticas

- `/estadisticas?m=aaaa-mm`: total del mes, comparación y reparto por categoría (6 mayores + "Otros"), y evolución de los últimos 6 meses.
- La comparación es justa: el mes en curso se compara con los mismos días del anterior (`comparisonRange` en `src/lib/periods.ts`).
- Datos de las funciones SQL `spending_by_category(from, to)` y `spending_by_month(n)`, en la zona del usuario. Las categorías archivadas siguen contando.
- **El color de categoría no identifica nada en los gráficos.** Los 12 colores tienen el mismo brillo y el validador de la guía de visualización lo confirma: con daltonismo (e incluso sin él) hay pares indistinguibles. Por eso:
  - no se usan donuts ni leyendas por color;
  - el reparto va en barras horizontales con emoji, nombre, % e importe escritos;
  - la evolución mensual es una sola serie: el mes elegido en `--primary` y el resto en `--muted-foreground`, con tabla `sr-only`.
- Los textos de datos usan colores de texto, nunca el color de la serie. Subir el gasto se muestra en `--destructive` y bajarlo en `--positive`, siempre con flecha.

## Presupuestos

- `/ajustes/presupuestos`: un presupuesto total del mes y uno por categoría. Un campo vacío es "sin límite".
- Los importes aceptan "150", "12,50", "1.500" o "12.5" (`parseEuros`).
- Se guardan todos de golpe con la función SQL `set_budgets` (atómica). El estado del mes viene de `budget_status()`.
- El formulario se envía a mano (`onSubmit` + `startTransition`): con `action`, React lo vaciaría y se perdería lo escrito si hay un error.
- En el Inicio, el anillo muestra el uso del presupuesto total. `pickBudgetNotice` (`src/lib/budget-view.ts`) elige el aviso:
  - primero, lo que se ha pasado (lo más pasado antes);
  - después, lo que va por el 80 % o más (redondeado hacia abajo);
  - si todo va bien, "Vas bien: llevas X de Y este mes".

## PWA y sin conexión

- Serwist con Turbopack (`@serwist/turbopack`):
  - `next.config.ts` usa `withSerwist`;
  - el service worker está en `src/app/sw.ts` y se sirve en `/serwist/sw.js` (`src/app/serwist/[path]/route.ts`);
  - se registra con `SerwistProvider` en el layout raíz (desactivado en desarrollo).
- Manifest: `src/app/manifest.ts`.
- Iconos: `public/icons` (192, 512 y maskable), `src/app/apple-icon.png` y el favicon `src/app/icon.svg`. Se generan a partir del logo provisional; hay que regenerarlos cuando llegue el definitivo.
- `/~offline`: se muestra si no hay red y la página no estaba en caché. El proxy deja públicas `/serwist` y `/~offline`.
- Gastos sin conexión (`src/lib/offline-queue.ts`):
  - van a una cola en `localStorage`;
  - `OfflineSync` los envía al abrir la app y al volver la red;
  - "Deshacer" los quita de la cola;
  - solo salen de la cola cuando el servidor confirma, y el id generado en el cliente evita duplicados si se reenvían.
- Las acciones de servidor en componentes cliente se esperan con `settle()` (`src/lib/settle.ts`): un fallo de red se trata como error, sin excepciones sin capturar.
- Al cerrar sesión o borrar la cuenta, `clearLocalData()` (`src/lib/local-data.ts`) vacía la cola sin conexión y las cachés de ejecución del service worker (pantallas con datos). La precaché se conserva porque no tiene datos personales y mantiene la app funcionando sin red.
- Ajustes muestra "Instala Zumito": el botón nativo en Android y Chrome, e instrucciones en iOS. No aparece si ya está instalada.
- `src/app/(app)/loading.tsx`: esqueleto mientras carga cada pantalla.

## Ajustes

- `/ajustes`: instalar la app, Categorías, Presupuestos, nombre, exportar CSV, cerrar sesión y borrar la cuenta.
- `/ajustes/categorias`: crear, editar (nombre, emoji y color), ordenar (subir y bajar), archivar y restaurar. El orden se guarda con la función SQL `reorder_categories`. Un nombre repetido (índice único) avisa "Ya tienes una categoría con ese nombre".
- Un gasto de una categoría archivada se puede editar: el formulario añade su categoría (`categoriesFor` en `expense-list.tsx`).
- `/ajustes/exportar`: CSV con `;`, BOM e importes "12,50"; neutraliza fórmulas (`src/lib/csv.ts`).
- Borrar la cuenta usa `delete_my_account()` (security definer; solo borra la fila propia de `auth.users` y el resto cae en cascada).
- El onboarding guarda la zona horaria del dispositivo (`Intl`) validada en el servidor.
- `next.config.ts` añade cabeceras de seguridad. No hay CSP todavía: hay que probarla en producción antes de activarla.
- Páginas `not-found.tsx` y `(app)/error.tsx` en español.

## Pruebas

- `npm test`: pruebas unitarias con Vitest (`src/**/*.test.ts`).
- `npm run test:db`: esquema, funciones SQL y RLS sobre Postgres real (PGlite). Hay que ampliarlo con cada migración.
- `npm run test:e2e` (`e2e/`): compila en `.next-e2e` apuntando a un Supabase simulado (`e2e/mock-supabase.mjs`) y recorre la app con Chrome sin interfaz, en modo claro y oscuro (unas 115 comprobaciones por modo, con 14 auditorías de accesibilidad WCAG A/AA con axe-core y capturas en `e2e/screenshots`). No usa `.env.local`. Si Chrome no está en la ruta habitual, usa `CHROME_PATH`.
- Cuando una función nueva use un endpoint de Supabase que el simulador no conoce, hay que añadirlo a `e2e/mock-supabase.mjs`.

## Autenticación y onboarding

- Acceso sin contraseña con un código de 6 dígitos por email (`signInWithOtp` + `verifyOtp`). Funciona dentro de la PWA instalada, a diferencia de los enlaces mágicos. El enlace del email también sirve (`/auth/confirm`).
- `src/proxy.ts` refresca la sesión y protege las rutas: sin sesión todo lleva a `/login`, salvo `/login` y `/auth/confirm`.
- `src/app/(app)/layout.tsx` redirige a `/onboarding` si `profiles.onboarded_at` es nulo.
- Para leer la sesión y el perfil se usan `getCurrentUser` y `getCurrentProfile` (`src/lib/data/profile.ts`), cacheados por petición.
- Onboarding en 2 pasos: nombre opcional y categorías. El paso "Instalar" va con la fase de la PWA.
- Se guarda de forma atómica con la función SQL `complete_onboarding`.
- Categorías sugeridas: 12, una por color (`src/lib/default-categories.ts`), todas marcadas por defecto.
- El logo (`src/components/brand/logo.tsx`) es **provisional** hasta que Claude Design entregue el definitivo.
- Decisiones de producto:
  - Solo gastos, sin ingresos ni gastos recurrentes por ahora.
  - Un gasto tiene importe, categoría, concepto, nota y fecha. No se piden "¿con quién?" ni "¿cómo te sientes?", para mantener el registro por debajo de 5 segundos.

## Plan por fases

Todas completadas (2026-09-30), pendientes de probar con Supabase real:

0. Base ✅
1. Diseño ✅ (a la espera de las pantallas v2 de Claude Design y del logo definitivo)
2. Supabase: esquema, RLS y tipos ✅
3. Autenticación y onboarding ✅
4. Registro rápido ✅
5. Historial ✅
6. Estadísticas ✅
7. Presupuestos ✅
8. PWA y sin conexión ✅
9. Pulido: categorías, perfil, exportar, borrar cuenta, errores y seguridad ✅
