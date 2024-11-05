import { Mdict } from "js-mdict";
import { Hono, type Context } from "jsr:@hono/hono";
import { getMimeType } from "jsr:@hono/hono/utils/mime";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import { extname, join } from "jsr:@std/path";
import { FallbackMimeType, MdictFileInfo } from "./util.ts";

type IServerInfo = {
  controller: AbortController;
  server: Deno.HttpServer<Deno.NetAddr>;
  app: Hono;
};

export class MdxServer {
  mdictInfo: { mdx: Mdict; mddArr: Mdict[] };

  constructor(
    public mdxDir: string,
    public fileInfo: MdictFileInfo,
    public serverInfo: IServerInfo
  ) {
    this.mdictInfo = {
      mdx: new Mdict(join(mdxDir, this.fileInfo.mdx)),
      mddArr: this.fileInfo.mddArr.map((mdd) => new Mdict(join(mdxDir, mdd))),
    };
  }

  async lookup(c: Context) {
    const key = decodeURIComponent(c.req.path).slice(1);
    const mimeType = getMimeType(key);

    // 1. 是否是mdx目录中的静态文件？
    const staticPath = join(this.mdxDir, ...key.split("/"));
    try {
      const stats = await Deno.stat(staticPath);
      if (stats.isFile) {
        // sendFile
        const file = await Deno.open(staticPath);
        c.header("Content-Type", mimeType || FallbackMimeType);
        return c.body(file.readable);
      }
    } catch (_error) {
      // static file not exist, try to search in mdx or mdd
    }

    // 2. mdx, mddArr
    const { mdx, mddArr } = this.mdictInfo;

    const ext = extname(key);

    // 2.1 hasn't ext (means to lookup in mdx)
    if (!ext) {
      const result = loop2AvoidLink(mdx, key);
      if (result?.definition) {
        const html = assemblyHtml(result.definition);
        return c.html(html, 200);
      }
    }
    // 2.2 has ext (means a resource in mddArr)
    else if (mddArr.length) {
      const resourceKey = "\\" + key.replaceAll("/", "\\");
      for (let i = 0; i < mddArr.length; i++) {
        const { keyText, definition } = mddArr[i].lookup(resourceKey);
        if (!definition) continue;
        if (keyText !== resourceKey) continue;

        c.header("Content-Type", mimeType || FallbackMimeType);
        c.header("Content-Disposition", `inline; filename="${key}"`);
        // sendBuffer
        const buffer = decodeBase64(definition).buffer;
        return c.body(buffer);
      }
    }

    return c.notFound();
  }

  info() {
    return {
      fileInfo: this.fileInfo,
      mdxHeader: this.mdictInfo.mdx.header,
      hostname: this.serverInfo.server.addr.hostname,
      port: this.serverInfo.server.addr.port,
      mdxDir: this.mdxDir,
    };
  }
}

// loop to avoid "@@@LINK"
function loop2AvoidLink(mdx: Mdict, key: string) {
  let result = mdx.lookup(key);

  while (true) {
    if (!result.definition) break;

    const matchArr = result.definition.match(/@@@LINK=(\w+)/);
    if (!matchArr) break;

    key = matchArr[1];
    result = mdx.lookup(key);
  }

  if (result.definition) return result;
}

const injectionScriptHtml = Deno.readTextFileSync(join(import.meta.dirname!, "injection.js"));

// append style and injection.js
function assemblyHtml(definition: string) {
  return /* html */ `
  <style>
    html, body {
      padding: 0;
      margin: 0;
    }
  </style>
  ${definition}
  <script>
    ${injectionScriptHtml}
  </script>
  `;
}
