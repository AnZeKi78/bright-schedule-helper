import { createServer } from "vite";

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return fallback;
}

const host = readArg("--host", "127.0.0.1");
const port = Number(readArg("--port", "5173"));
const strictPort = args.includes("--strictPort") || args.includes("--strict-port");

try {
  const server = await createServer({
    server: {
      host,
      port,
      strictPort,
    },
  });

  await server.listen();

  const localUrl = server.resolvedUrls?.local?.[0] ?? `http://${host}:${port}/`;
  console.log(`Dev server ready: ${localUrl}`);
  console.log("Press Ctrl+C to stop.");

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch (error) {
  console.error("Failed to start dev server.");
  console.error(error?.stack || error);
  process.exit(1);
}
