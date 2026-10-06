# Zumito

PWA de control de gastos personales. Registrar un gasto lleva menos de 5 segundos.

## Requisitos

- Node.js 20.9 o superior
- npm
- Un proyecto de [Supabase](https://supabase.com)

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` a `.env.local` y rellena la URL y la publishable key (_Project Settings → API_).
3. Aplica las migraciones de `supabase/migrations`, en orden de nombre (van fechadas):
   - desde el panel: pega cada archivo en _SQL Editor_ y ejecútalo, o
   - con la CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`.
4. En _Authentication → URL Configuration_:
   - _Site URL_: la URL de producción (o `http://localhost:3000` mientras desarrollas).
   - _Redirect URLs_: añade `http://localhost:3000/auth/confirm` y `https://<tu-dominio>/auth/confirm`.
5. En _Authentication → Email Templates → Magic Link_, añade el código al email para poder entrar desde la app instalada:

   ```html
   <h2>Tu código para entrar en Zumito</h2>
   <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px">{{ .Token }}</p>
   <p>O entra directamente con <a href="{{ .ConfirmationURL }}">este enlace</a>.</p>
   ```

Tras cambiar el esquema, regenera los tipos con `npm run db:types` (proyecto enlazado).

## Pagos (Stripe)

Premium: 1,49 €/mes o 9,99 €/año, con 7 días de prueba (una vez por persona) y renovación
automática. Oferta de bienvenida: −10 % el primer año del plan anual durante 5 minutos desde
que se ven los planes por primera vez (lo controla el servidor).

1. Aplica las migraciones `20261002090000_billing.sql`, `20261003090000_incomes.sql`, `20261006090000_accounts.sql` y `20261007090000_beta.sql` (en orden).
   La beta deja todo gratis. Para cobrar: `update public.app_settings set beta_open = false;`
2. Con una clave de prueba: `STRIPE_SECRET_KEY=sk_test_… npm run stripe:setup`. Crea
   producto, precios, cupón y portal, e imprime las variables.
3. Crea el webhook en Stripe hacia `/api/stripe/webhook` (eventos `checkout.session.completed`
   y `customer.subscription.*`) y guarda su `whsec_…` en `STRIPE_WEBHOOK_SECRET`.
4. Añade `SUPABASE_SECRET_KEY` (solo servidor). Todas las variables están en `.env.example`.
5. Prueba con la tarjeta `4242 4242 4242 4242` (cualquier fecha futura y CVC).

Sin estas variables la app funciona igual y la pantalla de planes dice "muy pronto".
Premium gratis a mano (Fundadores): `update profiles set premium_comp = true where id = '…'`
en el editor SQL.

## Desplegar en Vercel

1. En [vercel.com/new](https://vercel.com/new) importa el repositorio de GitHub. Detecta Next.js solo.
2. En _Settings → Environment Variables_ añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (las mismas de `.env.local`).
3. Despliega y añade la URL de Vercel en Supabase: _Site URL_ y _Redirect URLs_ (`https://<tu-dominio>/auth/confirm`).
4. Abre la app en el móvil e instálala: en Android, desde el aviso de Ajustes; en iPhone, con Safari → Compartir → «Añadir a pantalla de inicio».

## Comandos

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo en http://localhost:3000
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # comprobación de tipos
npm run format       # formatear con Prettier
npm test             # pruebas unitarias (Vitest)
npm run test:db      # prueba el esquema y las políticas RLS en Postgres (PGlite)
npm run test:e2e     # recorre la app entera con Chrome contra un Supabase simulado
npm run db:types     # regenera src/types/database.ts desde Supabase
```

El contexto del proyecto (stack, marca, principios y fases) está en [CLAUDE.md](CLAUDE.md).
