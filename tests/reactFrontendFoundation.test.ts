import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const text = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("package scripts use a Vite React frontend while preserving domain test coverage", async () => {
  const pkg = JSON.parse(await text("package.json"));

  assert.equal(pkg.scripts.dev, "vite --host 127.0.0.1");
  assert.equal(pkg.scripts.build, "vite build");
  assert.equal(pkg.scripts.test, "node --experimental-strip-types --test tests/*.test.ts");
  assert.equal(pkg.scripts["test:frontend"], "vitest run src/frontend");

  assert.ok(pkg.dependencies.react, "React should be a runtime dependency");
  assert.ok(pkg.dependencies["react-dom"], "React DOM should be a runtime dependency");
  assert.ok(pkg.devDependencies.vite, "Vite should be available for dev/build");
  assert.ok(pkg.devDependencies["@vitejs/plugin-react"], "Vite React plugin should be configured");
  assert.ok(pkg.devDependencies.tailwindcss, "Tailwind should be configured for the frontend foundation");
  assert.ok(pkg.devDependencies.vitest, "Frontend component tests should have a browser-UI test runner");
});

test("frontend foundation has Vite, Tailwind, and React entrypoint configuration", async () => {
  const [viteConfig, tailwindConfig, postcssConfig, indexHtml, entrypoint, appComponent] = await Promise.all([
    text("vite.config.ts"),
    text("tailwind.config.js"),
    text("postcss.config.js"),
    text("index.html"),
    text("src/frontend/main.tsx"),
    text("src/frontend/renderFrontendApp.ts"),
  ]);

  assert.match(viteConfig, /@vitejs\/plugin-react/);
  assert.match(viteConfig, /outDir:\s*"dist"/);
  assert.match(viteConfig, /environment:\s*"jsdom"/);
  assert.match(tailwindConfig, /\.\/src\/frontend\/\*\*\/\*\.\{ts,tsx\}/);
  assert.match(postcssConfig, /tailwindcss/);
  assert.match(indexHtml, /<div id="root"><\/div>/);
  assert.match(entrypoint, /createRoot\(document\.getElementById\("root"\)!\)/);
  assert.match(appComponent, /No browser-to-provider model calls/i);
  assert.match(appComponent, /server-side gateway/i);
});

test("React frontend renders the initial app shell without provider secrets", async () => {
  const { renderFrontendApp } = await import("../src/frontend/renderFrontendApp.ts");

  const html = renderFrontendApp("/");

  assert.match(html, /data-frontend-route="home"/);
  assert.match(html, /School of the Ancients/i);
  assert.match(html, /Start a goal/i);
  assert.match(html, /Curriculum/i);
  assert.match(html, /Quest/i);
  assert.match(html, /Lesson/i);
  assert.match(html, /Progress/i);
  assert.doesNotMatch(html, /api[_-]?key/i);
  assert.doesNotMatch(html, /AIza|sk-/i);
});
