import { ServerType } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { getMimeType } from "hono/utils/mime";
import { MDX, MDD, MDictHeader } from "js-mdict";
import { Buffer } from "node:buffer";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { AddressInfo } from "node:net";
import { basename, extname, join } from "node:path";
import { createStreamBody, FallbackMimeType, IScanResult, MdictFilesInfo } from "./util.ts";

type IServerInfo = {
  server: ServerType;
  app: Hono;
};

export class MdxServer {
  mdictInfo: { mdx: MDX; mddArr: MDD[] };

  // 如需特殊定制功能，可在mdx词典目录，新建一个html文件，以实现注入独特定的需求
  injectionHtml?: string;

  constructor(public scanResult: IScanResult, public serverInfo: IServerInfo) {
    const { mdxDir, filesInfo } = scanResult;
    this.mdictInfo = {
      mdx: new MDX(join(mdxDir, filesInfo.mdx)),
      mddArr: filesInfo.mddArr.map((mdd) => new MDD(join(mdxDir, mdd))),
    };

    if (filesInfo.html) {
      this.injectionHtml = readFileSync(join(mdxDir, filesInfo.html)).toString();
    }
  }

  _info: {
    mdxDir: string;
    fileInfo: MdictFilesInfo;
    mdxHeader: MDictHeader;
    port: number;
    title: string; // 页面展示的tab标题
  };

  get info() {
    if (this._info) return this._info;

    const { mdxDir, filesInfo } = this.scanResult;
    const address = this.serverInfo.server.address() as AddressInfo;

    const info = {
      mdxDir: mdxDir,
      fileInfo: filesInfo,
      mdxHeader: this.mdictInfo.mdx.header,
      port: address.port,
      title: basename(mdxDir),
    };
    this._info = info;

    return info;
  }

  async lookup(c: Context) {
    if (c.req.path === "/") return c.notFound();

    const key = decodeURIComponent(c.req.path).slice(1);
    const mimeType = getMimeType(key);

    // 1. 是否是mdx目录中的静态文件？
    const staticPath = join(this.scanResult.mdxDir, ...key.split("/"));
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
          const html = assemblyHtml(this.info.title, result.definition, this.injectionHtml);
          return c.html(html, 200);
        }
      }
    }
    // 2.2 has ext (means a resource in mddArr)
    else if (mddArr.length) {
      const resourceKey = "\\" + key.replaceAll("/", "\\");
      for (let i = 0; i < mddArr.length; i++) {
        const { keyText, definition } = mddArr[i].locate(resourceKey);
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
}

// loop to avoid "@@@LINK"
function loop2AvoidLink(mdx: MDX, key: string) {
  let result = mdx.lookup(key);

  // 防止死循环
  const searched = new Set<string>();

  while (true) {
    searched.add(key);
    if (!result.definition) return;

    /**
     * ex:
     * key == abner
     * result.definition == '@@@LINK=abner-doubleday\r\n\r\n'
     * matchArr[1] == abner-doubleday
     */
    const matchArr = result.definition.match(/@@@LINK=(\S+)/);
    if (!matchArr) break;
    if (!matchArr[1]) break;

    /**
     * ex:
     * key == way
     * result.definition == '@@@LINK=way\r\n\r\n'
     * matchArr[1] == way
     */
    if (matchArr[1] === key) return;

    key = matchArr[1];

    if (searched.has(key)) return;
    result = mdx.lookup(key);
  }

  if (result.definition) return result;
}

// injection.html 公共的注入内容，每个词典都会注入
const injectionHtml = readFileSync(join(__dirname, "injection.html")).toString();

/**
 * append style and injection.js
 * @param title 页面标题
 * @param definition 词典定义
 * @param mdxInjectionHtml mdx目录下html文件内容，用于针对该词典特殊自定义
 * @returns 组装后的html
 */
function assemblyHtml(title: string, definition: string, mdxInjectionHtml?: string) {
  return /* html */ `
  ${definition}
  ${injectionHtml || ""}
  ${mdxInjectionHtml || ""}
  <script>document.title = "${title}";</script>
  `;
}
