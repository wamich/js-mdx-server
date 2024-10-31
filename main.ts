import express from "express";
import { lookup } from "./api.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

import { getMdictWrapper, setMdxDir } from "./mdict-wrapper.ts";

// 命令行参数
const flags = parseArgs(Deno.args, {
  string: ["port", "dir"], // 端口、mdx目录
  default: { port: "3000" }, // 默认端口
});

// port 参数
let port: number;
try {
  port = parseInt(flags.port);
} catch (error) {
  console.error(error);
  throw "--port 参数: 端口错误。不指定时，默认端口号：3000";
}

// dir 参数
if (!flags.dir) throw "--dir 参数: 表示 mdx 所在目录，需要指定";
setMdxDir(flags.dir);

// init mdict
getMdictWrapper();

// server
const app = express();

app.get("/*+", lookup);

app.listen(port, () => {
  console.info(`js-mdx-server running: http://localhost:${port}`);
});
