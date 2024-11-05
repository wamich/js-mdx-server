import { join } from "@std/path";
import { getMimeType } from "jsr:@hono/hono/utils/mime";
import { Context } from "jsr:@hono/hono";
import { FallbackMimeType } from "./util.ts";

const root = join(import.meta.dirname!, "client", "dist");

const getIndexHtml = (() => {
  let indexHtml: string;
  return () => {
    if (indexHtml) return indexHtml;
    indexHtml = Deno.readTextFileSync(join(root, "index.html"));
    return indexHtml;
  };
})();

// serveStatic({ root: "./client/dist" })
export async function mainHandler(c: Context) {
  const path = c.req.path;

  if (path === "/") return c.html(getIndexHtml());

  const ifFilePath = join(root, ...path.split("/"));
  try {
    const stat = await Deno.stat(ifFilePath);
    const mimeType = getMimeType(path);
    if (stat.isFile) {
      // sendFile
      const file = await Deno.open(ifFilePath);
      c.header("Content-Type", mimeType || FallbackMimeType);
      return c.body(file.readable);
    }
  } catch (_error) {
    // static file not exist, return index.html
  }
  return c.html(getIndexHtml());
}
