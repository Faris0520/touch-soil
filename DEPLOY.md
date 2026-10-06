# Deploy

The build in `dist/` is a fully static site. Pick one:

## Render (recommended: it is a partner prize category this week)

1. Claim the Render promo credit at hacktoberfest.com/my/promos if available.
2. Push this repo to GitHub (see below).
3. On dashboard.render.com: New, Static Site, connect the repo.
4. Build command: `pnpm install && pnpm build`. Publish directory: `dist`.
5. Deploy. Put the resulting URL into `DEV_POST.md` (the `[DEPLOYED_URL]` placeholders).

## GitHub Pages (simplest)

```bash
git push            # after adding your remote, see below
```

Then either use GitHub Actions (Pages deployment workflow) or push `dist/` to a `gh-pages` branch with:

```bash
pnpm build
npx gh-pages -d dist
```

## Push this repo to GitHub

The local repo already has two commits. Add your remote and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/touch-soil.git
git push -u origin main
```

Then update `[REPO_URL]` in `DEV_POST.md` and the GitHub embed.
