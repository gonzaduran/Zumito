# Zumito

PWA de control de gastos personales. Registrar un gasto lleva menos de 5 segundos.

## Requisitos

- Node.js 20.9 o superior
- npm
- Un proyecto de [Supabase](https://supabase.com)

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` a `.env.local` y rellena la URL y la publishable key (_Project Settings → API_).
3. Aplica las migraciones de `supabase/migrations`, en orden:
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

## Comandos

```bash
npm install          # instalar dependencias
npm run dev          # servidor de desarrollo en http://localhost:3000
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # comprobación de tipos
npm run format       # formatear con Prettier
npm run test:db      # prueba el esquema y las políticas RLS en Postgres (PGlite)
npm run db:types     # regenera src/types/database.ts desde Supabase
```

El contexto del proyecto (stack, marca, principios y fases) está en [CLAUDE.md](CLAUDE.md).
