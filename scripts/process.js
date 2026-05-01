#!/usr/bin/env node

/**
 * Fetches all CSS files from sameerasw/my-internet, strips transparency
 * rules, wraps them with proper UserCSS headers, and writes them to /styles.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const REPO_API =
  "https://api.github.com/repos/sameerasw/my-internet/contents/websites";
const RAW_BASE =
  "https://raw.githubusercontent.com/sameerasw/my-internet/main/websites/";
const OUTPUT_DIR = path.join(__dirname, "../styles");

function get(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "zen-stylus-processor",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        } else {
          resolve(data);
        }
      });
    }).on("error", reject);
  });
}

function stripTransparency(css) {
  const lines = css.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip transparency feature comment blocks:
    // These are comments like /* site-transparency */ followed by a :root { ... } block
    // that sets background variables to transparent
    const isTransparencyComment =
      /\/\*\s*[\w-]*-?transparency\s*\*\//i.test(line);

    if (isTransparencyComment) {
      // Peek ahead — if the next non-empty line opens a :root or similar block
      // containing transparent, skip the whole block
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const lookahead = lines.slice(j, j + 10).join("\n");
      if (/transparent/i.test(lookahead)) {
        // Skip the comment
        i++;
        // Skip any whitespace
        while (i < lines.length && lines[i].trim() === "") i++;
        // Skip the block (count braces)
        if (i < lines.length && lines[i].includes("{")) {
          let depth = 0;
          while (i < lines.length) {
            for (const ch of lines[i]) {
              if (ch === "{") depth++;
              if (ch === "}") depth--;
            }
            i++;
            if (depth === 0) break;
          }
        }
        continue;
      }
    }

    // Strip individual transparency property declarations
    const isTransparencyProp =
      /background(?:-color)?\s*:\s*transparent\s*!important/i.test(line) ||
      /--[\w-]*(?:bg|background|color-?bg|colorBg)[\w-]*\s*:\s*transparent\s*!important/i.test(line);

    if (isTransparencyProp) {
      i++;
      continue;
    }

    result.push(line);
    i++;
  }

  // Clean up orphaned empty :root {} blocks left after stripping
  let out = result.join("\n");
  out = out.replace(/:root\s*\{\s*\}/g, "");
  // Collapse 3+ blank lines to 2
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function buildUserCSS(domain, css, version) {
  // Strip any existing UserStyle metadata from upstream
  css = css.replace(/\/\* ==UserStyle==[\s\S]*?==\/UserStyle== \*\//g, "").trim();
  // Strip any @-moz-document wrappers from upstream
  css = css.replace(/^@-moz-document[^\{]*\{([\s\S]*)\}\s*$/m, "$1").trim();

  const stripped = stripTransparency(css);

  if (!stripped) return null;

  const updateURL = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY || "YOUR-USERNAME/YOUR-REPO"}/main/styles/${domain}.user.css`;

  return `/* ==UserStyle==
@name           ${domain} (Zen Internet - no transparency)
@namespace      github.com/sameerasw/my-internet
@description    Layout and distraction-removal tweaks from Zen Internet for ${domain}, with transparency stripped. Auto-generated — do not edit manually.
@version        ${version}
@updateURL      ${updateURL}
@license        MIT
==/UserStyle== */

@-moz-document domain("${domain}") {
${stripped.split("\n").map(l => (l ? "  " + l : "")).join("\n")}
}
`;
}

async function main() {
  console.log("Fetching site list from GitHub...");
  const listing = JSON.parse(await get(REPO_API));

  const cssFiles = listing.filter(
    (f) => f.name.endsWith(".css") && !f.name.startsWith("example")
  );

  console.log(`Found ${cssFiles.length} site stylesheets.`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate a version string from today's date: YYYYMMDD.1
  const today = new Date();
  const version = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}.1`;

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of cssFiles) {
    const domain = file.name.replace(/^-/, "").replace(".css", "");
    process.stdout.write(`  Processing ${domain}... `);

    try {
      const raw = await get(RAW_BASE + file.name);
      const userCSS = buildUserCSS(domain, raw, version);

      if (!userCSS) {
        console.log("skipped (nothing left after stripping)");
        skipped++;
        continue;
      }

      const outPath = path.join(OUTPUT_DIR, `${domain}.user.css`);
      fs.writeFileSync(outPath, userCSS, "utf8");
      console.log("done");
      succeeded++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
    }

    // Small delay to be kind to GitHub's API
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone: ${succeeded} generated, ${skipped} skipped, ${failed} failed.`);

  // Write an index file listing all available styles
  const available = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith(".user.css"))
    .map((f) => f.replace(".user.css", ""));

  const indexContent = `# Available Styles

These are auto-generated from [sameerasw/my-internet](https://github.com/sameerasw/my-internet) with transparency rules stripped.
Updated nightly via GitHub Actions.

## How to install

1. Install the [Stylus](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne) extension for Chrome/Arc
2. Find the site you want below
3. Click the raw link and Stylus will offer to install it automatically
4. Enable auto-update in Stylus settings — it will stay in sync with upstream

## Sites (${available.length})

| Site | Install |
|------|---------|
${available.map((d) => `| ${d} | [Install](../../raw/main/styles/${d}.user.css) |`).join("\n")}

_Last updated: ${new Date().toUTCString()}_
`;

  fs.writeFileSync(path.join(__dirname, "../styles/README.md"), indexContent, "utf8");
  console.log("Index written to styles/README.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
