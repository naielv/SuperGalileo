# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.6 create --template minimal --no-types --add prettier eslint paraglide="languageTags:es, en, eu+demo:no" --install npm supergalileo
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Authentication

Configure the Authentik OIDC application and provide these server-side variables:

```env
AUTHENTIK_ISSUER=https://auth.example.com/application/o/supergalileo
AUTHENTIK_CLIENT_ID=...
AUTHENTIK_CLIENT_SECRET=...
AUTH_SESSION_SECRET=use-a-long-random-secret
AUTHENTIK_REDIRECT_URI=https://app.example.com/auth/callback
PB_URL=https://pb.example.com
PB_USER=admin@example.com
PB_PASSWORD=change-me
```

`AUTHENTIK_REDIRECT_URI` is optional in local development and defaults to
`http://localhost:3000/auth/callback`. If `PB_USER` and `PB_PASSWORD` are not
set, the server uses `admin@example.com` and `changeme`.

PocketBase access is performed only by the SvelteKit server. The browser uses
the authenticated `/api/pb/*` proxy and never receives the PocketBase
credentials.

Mealie integration uses these private server-side variables:

```env
MEALIE_URL=https://mealie.example.com
MEALIE_API_TOKEN=...
```

The `/taller-cocina` page loads and searches recipes through SvelteKit; the
Mealie token is never sent to the browser.
