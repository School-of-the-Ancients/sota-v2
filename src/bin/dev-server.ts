import { startAppServer } from "../app/server.ts";

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg.startsWith("--")) {
    args.set(arg.slice(2), process.argv[index + 1] ?? "");
    index += 1;
  }
}

await startAppServer({
  host: args.get("host") || "127.0.0.1",
  port: Number(args.get("port") || "5173"),
});
