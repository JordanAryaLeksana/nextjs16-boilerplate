// Lets Node import this project's TypeScript the way the bundler does:
// "@/x" means "src/x", and a path without an extension means ".ts" or ".tsx".
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = new URL("../../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  let url = null;

  if (specifier.startsWith("@/")) {
    url = new URL(specifier.slice(2), src);
  } else if (
    /^\.\.?\//.test(specifier) &&
    context.parentURL?.startsWith(src.href)
  ) {
    url = new URL(specifier, context.parentURL);
  }

  if (!url) {
    return nextResolve(specifier, context);
  }

  if (!/\.[a-z]+$/.test(url.pathname)) {
    for (const extension of [".ts", ".tsx"]) {
      if (existsSync(fileURLToPath(url) + extension)) {
        return nextResolve(url.href + extension, context);
      }
    }
  }

  return nextResolve(url.href, context);
}
