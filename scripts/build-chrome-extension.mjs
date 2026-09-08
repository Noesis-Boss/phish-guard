import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const repoRoot = process.cwd();
const appDir = path.join(repoRoot, "apps", "chrome-extension");
const outDir = path.join(repoRoot, "dist", "chrome-extension");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(path.join(outDir, "assets"), { recursive: true });
await mkdir(path.join(outDir, "popup"), { recursive: true });
await mkdir(path.join(outDir, "ui"), { recursive: true });

await build({
  entryPoints: {
    "popup/popup": path.join(appDir, "src", "popup", "popup.ts")
  },
  bundle: true,
  outdir: outDir,
  platform: "browser",
  format: "esm",
  target: "chrome120",
  logLevel: "silent"
});

await build({
  entryPoints: {
    "background/service-worker": path.join(appDir, "src", "background", "service-worker.ts")
  },
  bundle: true,
  outdir: outDir,
  platform: "browser",
  format: "esm",
  target: "chrome120",
  logLevel: "silent"
});

await build({
  entryPoints: {
    "content/gmail-content": path.join(appDir, "src", "content", "gmail-content.ts"),
    "content/outlook-content": path.join(appDir, "src", "content", "outlook-content.ts"),
    "content/yahoo-content": path.join(appDir, "src", "content", "yahoo-content.ts"),
    "content/proton-content": path.join(appDir, "src", "content", "proton-content.ts"),
    "content/custom-content": path.join(appDir, "src", "content", "custom-content.ts")
  },
  bundle: true,
  outdir: outDir,
  platform: "browser",
  format: "iife",
  target: "chrome120",
  logLevel: "silent"
});

for (const platform of ["outlook", "yahoo", "proton"]) {
  await build({
    entryPoints: {
      [`content/${platform}-content`]: path.join(appDir, "src", "content", `${platform}-content.ts`)
    },
    bundle: true,
    outdir: outDir,
    platform: "browser",
    format: "iife",
    target: "chrome120",
    logLevel: "silent"
  });
}

await cp(path.join(appDir, "src", "ui", "banner.css"), path.join(outDir, "ui", "banner.css"));
await cp(path.join(appDir, "src", "popup", "popup.html"), path.join(outDir, "popup", "popup.html"));
for (const size of [16, 32, 48, 128]) {
  await cp(
    path.join(appDir, "assets", `icon-${size}.png`),
    path.join(outDir, "assets", `icon-${size}.png`)
  );
}

for (const scriptName of ["gmail-content", "outlook-content", "yahoo-content", "proton-content", "custom-content"]) {
  const contentScript = await readFile(path.join(outDir, "content", `${scriptName}.js`), "utf8");
  if (/(^|\n)\s*(import|export)\s/m.test(contentScript)) {
    throw new Error(`Chrome content script build must not contain top-level import/export syntax: ${scriptName}`);
  }
}

const manifest = JSON.parse(await readFile(path.join(appDir, "manifest.json"), "utf8"));
await writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Built Chrome extension files in ${path.relative(repoRoot, outDir)}`);
