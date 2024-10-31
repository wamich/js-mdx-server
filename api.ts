import { Request, Response } from "express";
import * as mime from "mime-types";
import * as fs from "node:fs";
import * as path from "node:path";
import { getMdictWrapper, getMdxDir } from "./mdict-wrapper.ts";
import { base64ToBuffer, fixHtml } from "./util.ts";

export function lookup(req: Request, res: Response) {
  let key = decodeURIComponent(req["path"]).slice(1);

  // 是否是mdx目录中的静态文件？
  const staticPath = path.join(getMdxDir(), ...key.split("/"));
  try {
    const stats = fs.statSync(staticPath);
    if (stats.isFile()) {
      res.sendFile(staticPath);
      return;
    }
  } catch (_error) {
    // static file not exist, try to search in mdx or mdd
  }

  const { mdx, mddArr } = getMdictWrapper();

  const ext = path.extname(key);

  // has't ext (means to lookup word in mdx)
  if (!ext) {
    let result = mdx.lookup(key);

    // loop to avoid "@@@LINK"
    while (true) {
      if (!result.definition) break;

      const matchArr = result.definition.match(/@@@LINK=(\w+)/);
      if (!matchArr) break;

      key = matchArr[1];
      result = mdx.lookup(key);
    }

    if (result.definition) {
      const html = fixHtml(result.definition);
      res.status(200).setHeader("Content-Type", "text/html").send(html);
      return;
    }
  }
  // has ext (means a resource in mddArr)
  else {
    const resourceKey = "\\" + key.replaceAll("/", "\\");
    for (let i = 0; i < mddArr.length; i++) {
      const { keyText, definition } = mddArr[i].lookup(resourceKey);
      if (!definition) continue;
      if (keyText !== resourceKey) continue;

      res.status(200);
      const mimeType = mime.lookup(ext);
      if (mimeType) res.setHeader("Content-Type", mimeType);
      res
        .setHeader("Content-Disposition", `inline; filename="${key}"`)
        .send(base64ToBuffer(definition)); // 将buffer传输给客户端
      return;
    }
  }

  res.status(404).send();
}
