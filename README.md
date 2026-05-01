# zen-stylus

Auto-generated [Stylus](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne) userstyles derived from [sameerasw/my-internet](https://github.com/sameerasw/my-internet), with all transparency rules stripped out.

A GitHub Action runs nightly, fetches the latest upstream styles, strips transparency, adds proper UserCSS auto-update headers, and commits the results. Stylus polls the raw file URLs and updates automatically.

## Setup (one time)

### 1. Create the repo

- Go to [github.com/new](https://github.com/new)
- Name it `zen-stylus` (or anything you like)
- Set it to **Public** (required for raw URLs to work with Stylus)
- Don't initialize with any files

### 2. Push this code

```bash
git clone https://github.com/YOUR-USERNAME/zen-stylus.git
cd zen-stylus
# copy these files in, then:
git add .
git commit -m "init"
git push
```

### 3. Run the Action for the first time

- Go to your repo on GitHub
- Click the **Actions** tab
- Click **Update styles** in the left sidebar
- Click **Run workflow** → **Run workflow**
- Wait ~2 minutes for it to finish
- The `styles/` folder will appear with all the generated `.user.css` files

### 4. Install a style in Stylus

- Browse to `styles/README.md` in your repo for a full list
- Click any **Install** link — it opens the raw `.user.css` file
- Stylus will detect it and show an install prompt automatically
- The `@updateURL` header is already set to your repo, so Stylus will auto-update it

### 5. Configure auto-update in Stylus

- Click the Stylus extension icon → gear icon (options)
- Under **Updates**, set your preferred check interval (daily recommended)
- Stylus will silently update styles whenever the upstream repo changes

## How it works

```
sameerasw/my-internet (upstream)
        ↓ fetched nightly by GitHub Action
scripts/process.js
        ↓ strips transparency rules
        ↓ adds UserCSS headers with @updateURL
styles/*.user.css  (in your repo)
        ↓ Stylus polls raw URLs
Your browser (Arc + Stylus)
```

## Customizing

- To **exclude a site**, delete its `.user.css` file from the `styles/` folder and commit. The Action won't re-add files it doesn't generate (but it will regenerate them — to permanently exclude a site, add it to the `EXCLUDED` list in `scripts/process.js`).
- To **change the update schedule**, edit the `cron` line in `.github/workflows/update.yml`.
- To **trigger an update manually**, go to Actions → Update styles → Run workflow.

## Credits

All styles are from [sameerasw/my-internet](https://github.com/sameerasw/my-internet) by [@sameerasw](https://github.com/sameerasw), licensed MIT.
