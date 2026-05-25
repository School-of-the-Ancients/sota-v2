import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { renderAppShell } from "../app/App.ts";

type StaticRoute = {
  path: string;
  file: string;
};

const staticRoutes: StaticRoute[] = [
  { path: "/", file: "dist/index.html" },
  { path: "/goals/new", file: "dist/goals/new/index.html" },
];

export type StaticBuildResult = {
  files: string[];
};

export async function buildStaticApp(): Promise<StaticBuildResult> {
  await rm("dist", { recursive: true, force: true });

  const files: string[] = [];
  for (const route of staticRoutes) {
    await mkdir(dirname(route.file), { recursive: true });
    await writeFile(route.file, renderAppShell(route.path, { staticOnly: true }), "utf8");
    files.push(route.file);
  }

  return { files };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await buildStaticApp();
  console.log(`Built ${result.files.length} static pages:`);
  for (const file of result.files) {
    console.log(`- ${file}`);
  }
}
