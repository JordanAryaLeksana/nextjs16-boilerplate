// `npm run test:auth`
// Starts a mock backend and this app (next dev) on free ports, then checks the
// session endpoints, the route protection, and the Axios token handling.
// Stop any dev server for this project first: Next.js allows one per project.
import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { checkEndpoints } from "./endpoint-checks.mjs";
import { checkInterceptor } from "./interceptor-checks.mjs";
import { startMockBackend } from "./mock-backend.mjs";

// Importing a .ts file from an untyped package prints a notice; hide only that.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.code !== "MODULE_TYPELESS_PACKAGE_JSON") {
    console.warn(warning);
  }
});

function findFreePort() {
  return new Promise((resolve) => {
    const probe = createServer();

    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();

      probe.close(() => resolve(port));
    });
  });
}

async function waitUntilServing(url, app) {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    if (app.exitCode !== null) {
      throw new Error("next dev exited before it was ready");
    }

    try {
      await fetch(url, { redirect: "manual" });

      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error("next dev did not start within 90 seconds");
}

let failures = 0;
let total = 0;

function check(name, passed, detail = "") {
  total += 1;

  if (!passed) {
    failures += 1;
  }

  console.log(
    `${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`,
  );
}

const backend = await startMockBackend();
const port = await findFreePort();
const appUrl = `http://127.0.0.1:${port}`;
const appOutput = [];

const app = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
  {
    env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: backend.url },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

app.stdout.on("data", (chunk) => appOutput.push(chunk));
app.stderr.on("data", (chunk) => appOutput.push(chunk));

try {
  await waitUntilServing(`${appUrl}/login`, app);

  console.log("Session endpoints and route protection");
  await checkEndpoints({ app: appUrl, backend, check });

  console.log("\nAxios token handling");
  await checkInterceptor({ backend, check });
} catch (error) {
  failures += 1;
  console.error(`\n${error.message}`);
  console.error(Buffer.concat(appOutput).toString().trim());
} finally {
  app.kill();
  backend.close();
}

console.log(
  failures === 0
    ? `\nAll ${total} checks passed.`
    : `\n${failures} of ${total} checks failed.`,
);
process.exit(failures === 0 ? 0 : 1);
