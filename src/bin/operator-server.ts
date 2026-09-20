import { resolve } from "node:path";
import { createOperatorServer } from "../features/operator/operatorServer.ts";

let host = "127.0.0.1";
let port = 8787;
let directory = resolve(".sota-data", "operator");
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const name = args[index];
  const value = args[++index];
  if (!value) throw new Error("Missing value for " + name);
  if (name === "--host") host = value;
  else if (name === "--port") port = Number(value);
  else if (name === "--data") directory = resolve(value);
  else throw new Error("Unknown argument: " + name);
}
if (!["127.0.0.1", "::1", "localhost"].includes(host)) throw new Error("Operator API binds only to loopback");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port");
const server = createOperatorServer({ directory });
server.on("error", error => { console.error("Operator server could not start: " + error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log("SOTA Operator API ready on " + host + ":" + port + " (authored local lesson; no mastery grading)"));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close(() => process.exit(0)));
