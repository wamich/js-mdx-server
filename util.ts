import { extname, join } from "jsr:@std/path";

export const FallbackMimeType = "application/octet-stream";

export type MdictFileInfo = {
  // 目录（如: 牛津高阶十）下的mdx文件名称。
  // 如: oaldpe.mdx
  mdx: string;
  // 目录（如: 牛津高阶十）下的mdd文件名称，可能有多个。
  // 如: [oaldpe.mdd, oaldpe.1.mdd, oaldpe.2.mdd, ]
  mddArr: string[];
};

// 扫描目录
export const scanDir = (_dir: string) => {
  let rootDir: string;
  try {
    const stats = Deno.statSync(_dir);
    if (!stats.isDirectory) throw "--dir 参数: 必须是目录，要求是绝对路径";
    rootDir = _dir;
  } catch (error) {
    console.error(error);
    throw "--dir 参数: 目录不存在，要求是绝对路径！";
  }

  const results: { mdxDir: string; fileInfo: MdictFileInfo }[] = [];

  // 1. 二级目录搜索
  for (const dirEntry of Deno.readDirSync(rootDir)) {
    // 只考虑root目录下的文件夹，不考虑其他
    if (!dirEntry.isDirectory) continue;

    const mdxDir = join(rootDir, dirEntry.name);
    const fileInfo = findMdictInfo(mdxDir);
    if (fileInfo.mdx) results.push({ mdxDir, fileInfo });
  }

  // 2. 没有数据，则可能是一级目录
  if (results.length === 0) {
    const mdxDir = rootDir;
    const fileInfo = findMdictInfo(mdxDir);
    if (fileInfo.mdx) results.push({ mdxDir, fileInfo });
  }

  return results;
};

export function findMdictInfo(mdxDir: string) {
  const mdictInfo: MdictFileInfo = {
    mdx: "",
    mddArr: [],
  };

  // 1. 词典mdx所在文件夹下的1级
  for (const dirEntry of Deno.readDirSync(mdxDir)) {
    const file = dirEntry.name;

    // 只考虑1级目录下的文件，不考虑其他
    if (!dirEntry.isFile) continue;

    const ext = extname(file);
    if (ext === ".mdx") {
      mdictInfo.mdx = file;
    } else if (ext === ".mdd") {
      mdictInfo.mddArr.push(file);
    }
  }

  return mdictInfo;
}
