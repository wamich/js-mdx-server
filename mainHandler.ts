import { Context } from "hono";
import { getMimeType } from "hono/utils/mime";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { createStreamBody, FallbackMimeType } from "./util.ts";

const root = join(__dirname, "client", "dist");

const getIndexHtml = (() => {
  let indexHtml: string;
  return () => {
    if (indexHtml) return indexHtml;
    indexHtml = readFileSync(join(root, "index.html")).toString();
    return indexHtml;
  };
})();

// serveStatic({ root: "./client/dist" })
export async function mainHandler(c: Context) {
  const path = c.req.path;

  if (path === "/") return c.html(getIndexHtml());

  const ifFilePath = join(root, ...path.split("/"));
  try {
    const stats = await stat(ifFilePath);
    const mimeType = getMimeType(path);
    if (stats.isFile()) {
      c.header("Content-Type", mimeType || FallbackMimeType);
      // sendFile
      const body = createStreamBody(createReadStream(ifFilePath));
      return c.body(body);
    }
  } catch (_error) {
    // static file not exist, return index.html
  }

  return c.html(getIndexHtml());
}
