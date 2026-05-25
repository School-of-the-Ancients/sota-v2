import { resolveRoute, routes } from "./router.ts";

export function renderAppShell(pathname = "/"): string {
  const route = resolveRoute(pathname);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(route.title)} · School of the Ancients</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #09090b; color: #f4f4f5; }
      body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top left, #1e1b4b, #09090b 42rem); }
      .app-shell { max-width: 960px; margin: 0 auto; padding: 32px 20px 56px; }
      header { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 48px; }
      nav { display: flex; gap: 14px; flex-wrap: wrap; }
      a { color: #a5b4fc; }
      nav a, .primary-action, button { border: 1px solid #52525b; border-radius: 999px; padding: 10px 14px; text-decoration: none; background: #18181b; color: #f4f4f5; }
      .primary-action, button { display: inline-block; background: #4f46e5; border-color: #818cf8; font-weight: 700; }
      main { background: rgba(24, 24, 27, 0.72); border: 1px solid #3f3f46; border-radius: 28px; padding: 32px; box-shadow: 0 24px 80px rgba(0,0,0,.35); }
      h1 { font-size: clamp(2.2rem, 7vw, 4.5rem); line-height: .95; margin: 0 0 18px; }
      h2 { margin-top: 32px; }
      .eyebrow { color: #c4b5fd; text-transform: uppercase; letter-spacing: .14em; font-size: .78rem; font-weight: 800; }
      form { display: grid; gap: 18px; }
      label { display: grid; gap: 8px; color: #e4e4e7; font-weight: 650; }
      textarea { width: 100%; box-sizing: border-box; border-radius: 18px; border: 1px solid #52525b; background: #09090b; color: #f4f4f5; padding: 16px; font: inherit; }
      input[type="checkbox"] { inline-size: 1rem; block-size: 1rem; }
      footer { color: #a1a1aa; margin-top: 32px; font-size: .9rem; }
    </style>
  </head>
  <body>
    <div class="app-shell">
      <header>
        <a href="/" aria-label="School of the Ancients home">SOTA v2</a>
        <nav aria-label="Primary navigation">
          ${routes.map((item) => `<a href="${item.path}">${item.title}</a>`).join("\n          ")}
        </nav>
      </header>
      ${route.html}
      <footer>No browser-to-provider model calls. AI work routes through server-side gateway seams.</footer>
    </div>
  </body>
</html>`;
}

export function App() {
  return renderAppShell(typeof location === "undefined" ? "/" : location.pathname);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
