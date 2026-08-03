import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "../helpers/nodeTestCompat.js";
import openApiSpec from "../../docs/openapi.js";

const backendDir = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Statically parses app.js's own `import xRoutes from "./routes/xRoutes.js"` +
// `app.use("/api/x", xRoutes)` declarations, rather than introspecting
// Express's live router internals - Express 5 restructured routing so that
// a mounted sub-router's own prefix isn't reliably exposed via a stable,
// documented property, only via undocumented internals that could change
// again on a future Express bump. Reading app.js's own source text is far
// less brittle than depending on that.
const discoverRegisteredRoutes = async () => {
  const appSource = await readFile(path.join(backendDir, "app.js"), "utf8");

  const importedRouters = new Map();
  for (const match of appSource.matchAll(/import (\w+Routes) from "(\.\/routes\/[^"]+)"/g)) {
    importedRouters.set(match[1], match[2]);
  }

  const mounts = [];
  for (const match of appSource.matchAll(/app\.use\("(\/api[^"]*)",\s*(\w+Routes)\)/g)) {
    const [, prefix, varName] = match;
    if (importedRouters.has(varName)) {
      mounts.push({ prefix, filePath: importedRouters.get(varName) });
    }
  }

  const routes = ["GET /"]; // registered directly in app.js, not via a routes/*.js router

  for (const { prefix, filePath } of mounts) {
    const routerModule = await import(path.join(backendDir, filePath));
    const router = routerModule.default;

    for (const layer of router.stack) {
      if (!layer.route) {
        continue;
      }

      const subPath = layer.route.path === "/" ? "" : layer.route.path;
      const openApiPath = (prefix + subPath).replace(/:([A-Za-z0-9_]+)/g, "{$1}");
      for (const method of Object.keys(layer.route.methods)) {
        routes.push(`${method.toUpperCase()} ${openApiPath}`);
      }
    }
  }

  return routes;
};

describe("docs/openapi.js completeness", () => {
  it("has a spec entry for every route Express actually registers", async () => {
    const registeredRoutes = await discoverRegisteredRoutes();

    const missing = registeredRoutes.filter(
      (route) => !new Set(collectSpecRoutes(openApiSpec)).has(route)
    );

    assert.deepEqual(
      missing,
      [],
      `docs/openapi.js is missing an entry for: ${missing.join(", ")}`
    );
  });
});

const collectSpecRoutes = (spec) => {
  const specRoutes = [];
  for (const [specPath, methods] of Object.entries(spec.paths)) {
    for (const method of Object.keys(methods)) {
      specRoutes.push(`${method.toUpperCase()} ${specPath}`);
    }
  }
  return specRoutes;
};
