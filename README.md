# Accessible Game Platform (minigioco)

Deployed at: https://magnatronic.github.io/minigioco/

## Scripts
- `npm run dev` — local dev
- `npm run build` — production build to `dist/`
- `npm run preview` — preview build
- `npm run test` — run tests
- `npm run typecheck` — TypeScript check

## GitHub Pages
- Vite base path is set to `/minigioco/` in `vite.config.ts`.
- Workflow `.github/workflows/deploy.yml` builds on pushes to `main` and deploys `dist/` to GitHub Pages.

## First-time setup
1. Create the repo on GitHub: `magnatronic/minigioco`.
2. In this folder, run the following once (replace with your info if needed):

```powershell
git init
git branch -M main
git remote add origin https://github.com/magnatronic/minigioco.git
npm ci
npm run build
# Commit and push
git add -A
git commit -m "chore: initial commit and GH Pages workflow"
git push -u origin main
```

3. In GitHub → Settings → Pages, set Source to "GitHub Actions" (if not already). The `deploy.yml` takes care of builds.

If you fork or change the repo name, update `base` in `vite.config.ts` and the README URL.
