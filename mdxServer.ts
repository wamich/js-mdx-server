import { ServerType } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { getMimeType } from "hono/utils/mime";
import { MDX, MDD, MDictHeader } from "js-mdict";
import { Buffer } from "node:buffer";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { AddressInfo } from "node:net";
import { basename, extname, join } from "node:path";
import { createStreamBody, FallbackMimeType, IScanResult, MdictFilesInfo } from "./util";

type IServerInfo = {
  server: ServerType;
  app: Hono;
};

export class MdxServer {
  mdictInfo: { mdx: MDX; mddArr: MDD[] };

  // 如需特殊定制功能，可在mdx词典目录，新建一个html文件，以实现注入独特定的需求
  injectionHtml?: string;

  constructor(
    public scanResult: IScanResult,
    public serverInfo: IServerInfo,
  ) {
    const { mdxDir, filesInfo } = scanResult;
    this.mdictInfo = {
      mdx: new MDX(join(mdxDir, filesInfo.mdx)),
      mddArr: filesInfo.mddArr.map((mdd) => new MDD(join(mdxDir, mdd))),
    };

    if (filesInfo.html) {
      this.injectionHtml = readFileSync(join(mdxDir, filesInfo.html)).toString();
    }
  }

  _info!: {
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
      const definitions = lookupAllDefinitions(mdx, key);
      const html = assemblyHtml(this.info.title, definitions.join(""), this.injectionHtml);
      return c.html(html, 200);
    }
    // 2.2 has ext (means a resource in mddArr)
    else if (mddArr.length) {
      const resourceKey = "\\" + key.replaceAll("/", "\\");
      for (const mdd of mddArr) {
        const { keyText, definition } = mdd.locate(resourceKey);
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

/**
 * 参考 js-mdict@7.0.0 lookupAll 方法，改写查找 definition
 * @since js-mdict@7.0.0
 * @link https://github.com/terasum/js-mdict?tab=readme-ov-file#lookupall---handle-duplicate-keys-new-in-v608
 */
function lookupAllDefinitions(mdx: MDX, word: string) {
  const low = word.toLowerCase();
  const lowReg = new RegExp(`^${low}$`, "i");
  // 遍历，忽略大小写
  const matchedItems = mdx.keywordList.filter(({ keyText }) => keyText.toLowerCase() === low);

  const definitions: string[] = [];
  const lineSet = new Set<string>();

  for (const item of matchedItems) {
    const def = mdx.lookupRecordByKeyBlock(item);
    if (!def) continue;

    let definition = mdx.meta.decoder.decode(def);

    // @@@LINK
    // const matchArr = definition.match(/@@@LINK=(\S+)/);
    const matchArr = definition.match(/@@@LINK=([^\r\n]+)/); // fix: @@@LINK=USA, the\r\n\u0000
    const link = matchArr?.at(1);

    if (!link) {
      definitions.push(definition);
      continue;
    }

    // 如 link 和单词一致，没必要存在
    if (lowReg.test(link)) continue;

    // link 去重。x-raying 有2个相同的 link: x-ray
    if (lineSet.has(link)) continue;

    lineSet.add(link);

    // link 重写 definition
    definition = /* html */ `
          <div>
            <b>@LINK</b>&nbsp;
            <a style="all: revert;" href="entry://${link}">${link}</a>
          </div>`
      .split("\n")
      .map((line) => line.trim())
      .join("");

    definitions.push(definition);
  }
  return definitions;
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
  ${definition || "404 Not Found"}
  ${injectionHtml || ""}
  ${mdxInjectionHtml || ""}
  <script>document.title = "${title}";</script>
  `;
}
