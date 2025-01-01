import { ServerType } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { getMimeType } from "hono/utils/mime";
import Mdict from "mdict-js";
import { Buffer } from "node:buffer";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { AddressInfo } from "node:net";
import { basename, extname, join } from "node:path";
import { createStreamBody, FallbackMimeType, MdictFileInfo } from "./util.ts";

type IServerInfo = {
  server: ServerType;
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
    if (c.req.path === "/") return c.notFound();

    const key = decodeURIComponent(c.req.path).slice(1);
    const mimeType = getMimeType(key);

    // 1. 是否是mdx目录中的静态文件？
    const staticPath = join(this.mdxDir, ...key.split("/"));
    try {
      const stats = await stat(staticPath);
      if (stats.isFile()) {
        // sendFile
        c.header("Content-Type", mimeType || FallbackMimeType);
        const body = createStreamBody(createReadStream(staticPath));
        return c.body(body);
      }
    } catch (_error) {
      // static file not exist, try to search in mdx or mdd
    }

    // 2. mdx, mddArr
    const { mdx, mddArr } = this.mdictInfo;

    const ext = extname(key);

    // 2.1 hasn't ext (means to lookup in mdx)
    if (!ext) {
      const wordArr: string[] = [key];
      if (/^[A-Z]+$/.test(key)) {
        // camel case
        wordArr.push(key.slice(0) + key.slice(1).toLowerCase());
        // lower case
        wordArr.push(key.toLowerCase());
      } else if (/[A-Z]/.test(key)) {
        // lower case
        wordArr.push(key.toLowerCase());
      }
      for (let i = 0; i < wordArr.length; i++) {
        const word = wordArr[i];
        const result = loop2AvoidLink(mdx, word);
        if (result?.definition) {
          const html = assemblyHtml(result.definition);
          return c.html(html, 200);
        }
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
        const buffer = Buffer.from(definition, "base64");
        return c.body(buffer);
      }
    }

    return c.notFound();
  }

  info() {
    const address = this.serverInfo.server.address() as AddressInfo;
    return {
      fileInfo: this.fileInfo,
      mdxHeader: this.mdictInfo.mdx.header,
      port: address.port,
      mdxDir: this.mdxDir,
      title: basename(this.mdxDir), // 页面展示的tab标题
    };
  }
}

// loop to avoid "@@@LINK"
function loop2AvoidLink(mdx: Mdict, key: string) {
  let result = mdx.lookup(key);

  // TODO: 这个mdict-js库还是不完美
  const searched = new Set<string>();

  while (true) {
    searched.add(key);
    if (!result.definition) return;

    const matchArr = result.definition.match(/@@@LINK=(\w+)/);
    if (!matchArr) break;
    if (!matchArr[1]) break;

    /**
     * 避免无限循环(way, chinese)
     * TODO: Chinese chinese
     * key == way
     * result.definition == '@@@LINK=way\r\n\r\n'
     * matchArr[1] == way
     */
    if (matchArr[1] === key) return;

    key = matchArr[1];

    // TODO: crayfish, crawfish 导致死循环
    if (searched.has(key)) return;
    result = mdx.lookup(key);
  }

  if (result.definition) return result;
}

const injectionScriptHtml = readFileSync(join(__dirname, "injection.js")).toString();

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
