# Deployment guide

This project is meant to be deployed as a **Cloudflare Pages** project with **Pages Functions** and a **Workers AI** binding. Do not deploy it to GitHub Pages. GitHub Pages is static only and cannot run the backend model call.

## What to upload

Upload the **entire project folder** to a new GitHub repository. Do not upload only the `public` folder. The deployment needs all of these parts:

- `public/` for the website,
- `functions/` for the backend routes,
- `lib/` for the gating and prompting logic,
- `wrangler.jsonc` for Pages configuration.

## Recommended deployment path

### Step 1. Create the GitHub repository

Create a new repository, for example `kindline-guide`.

Then upload everything from this folder.

A normal Git sequence is:

```bash
git init
git add .
git commit -m "Initial KindLine Guide deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kindline-guide.git
git push -u origin main
```

### Step 2. Create the Cloudflare Pages project

1. Log in to Cloudflare.
2. Go to **Workers & Pages**.
3. Choose **Create application**.
4. Choose **Pages**.
5. Choose **Connect to Git**.
6. Select the repository you just created.

### Step 3. Build settings

Use these settings:

- **Framework preset:** None
- **Build command:** leave blank
- **Build output directory:** `public`

The project uses static assets in `public/` and backend routes in `functions/`.

### Step 4. Confirm Wrangler configuration

This repository already includes a `wrangler.jsonc` file with:

- `pages_build_output_dir: ./public`
- a Workers AI binding named `AI`
- a default model value

If Cloudflare asks you to review the configuration, keep the existing values.

### Step 5. Confirm the AI binding

If the `AI` binding is not already present after import, add it manually:

1. Open your Pages project.
2. Go to **Settings**.
3. Go to **Bindings**.
4. Add a **Workers AI** binding.
5. Name the binding `AI`.
6. Redeploy.

### Step 6. Open the site

After deployment you will receive a `*.pages.dev` URL.

Use that URL as the public demo link.

## Local development

### Install dependencies

```bash
npm install
```

### Log in to Cloudflare

```bash
npx wrangler login
```

### Run locally

```bash
npm run dev
```

This starts Pages local development and exposes the AI binding as `AI`.

## Optional custom domain

If you later want a cleaner public URL:

1. Open the Pages project in Cloudflare.
2. Go to **Custom domains**.
3. Add your domain or subdomain.
4. Follow the DNS instructions.

A sensible naming pattern is something like:

- `guide.yourdomain.com`
- `kindline.yourdomain.com`
- `demo.yourdomain.com`

## What not to do

Do not:

- put an API key in frontend JavaScript,
- deploy the project to GitHub Pages,
- present the site as a therapy or crisis service,
- store public user transcripts without a clear consent process.

## Immediate post-deployment checks

After the site is live, test these paths:

- `/` loads the site.
- `/api/health` returns JSON.
- sending a normal reflective prompt returns a bounded response.
- sending a medical prompt triggers the medical boundary fallback.
- sending a crisis prompt triggers the crisis fallback before model generation.
- the evaluation panel runs and returns a result table.
