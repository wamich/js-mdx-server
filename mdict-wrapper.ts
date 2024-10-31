import { Mdict } from "js-mdict";
import { assertExists } from "jsr:@std/assert";
import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

// mdx词典文件所在目录
let mdxDir: string;

export const getMdxDir = () => {
  assertExists(mdxDir);
  return mdxDir;
};

export const setMdxDir = (dir: string) => {
  try {
    const stats = statSync(dir);
    if (!stats.isDirectory()) throw "--dir 参数: 必须是目录";
    mdxDir = dir;
  } catch (error) {
    console.error(error);
    throw "--dir 参数: 目录不存在！";
  }
};

type MdictFileInfo = {
  // 目录（如: 牛津高阶十）下的mdx文件名称。
  // 如: oaldpe.mdx
  mdx: string;
  // 目录（如: 牛津高阶十）下的mdd文件名称，可能有多个。
  // 如: [oaldpe.mdd, oaldpe.1.mdd, oaldpe.2.mdd, ]
  mddArr: string[];
};

class MdictWrapper {
  mdx: Mdict;
  mddArr: Mdict[];

  constructor() {
    const mdictInfo = this.findMdictInfo();
    if (!mdictInfo.mdx) throw "--dir 参数: 指定目录中，不存在 mdx 文件";

    console.info("MDX & MDD INFO:", mdictInfo);

    const mdxDir = getMdxDir();
    this.mdx = new Mdict(join(mdxDir, mdictInfo.mdx));
    this.mddArr = mdictInfo.mddArr.map((mdd) => new Mdict(join(mdxDir, mdd)));
  }

  findMdictInfo() {
    const mdictInfo: MdictFileInfo = {
      mdx: "",
      mddArr: [],
    };

    // 1. 词典mdx所在文件夹下的1级
    const files = readdirSync(mdxDir);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = join(mdxDir, file);
      const stats = statSync(filePath);

      // 只考虑1级目录下的文件，不考虑文件夹了
      if (!stats.isFile()) continue;

      const ext = extname(file);
      if (ext === ".mdx") {
        mdictInfo.mdx = file;
      } else if (ext === ".mdd") {
        mdictInfo.mddArr.push(file);
      }
    }
    return mdictInfo;
  }
}

export const getMdictWrapper = (() => {
  let mdictWrapper: MdictWrapper;
  return () => {
    if (mdictWrapper) return mdictWrapper;
    mdictWrapper = new MdictWrapper();
    return mdictWrapper;
  };
})();
