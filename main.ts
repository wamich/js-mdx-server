import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";

import { parseArgs } from "jsr:@std/cli/parse-args";

import { mainHandler } from "./lookup.ts";
import { MdxServer } from "./mdx-server.ts";
import { scanDir } from "./util.ts";

// 命令行参数
const flags = parseArgs(Deno.args, {
  string: ["port", "dir"], // 端口、mdx目录
  default: { port: "3000" }, // 默认端口
  alias: { p: "port", d: "dir" }, // 短别名
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
if (!flags.dir) throw "--dir 参数: 表示 mdx文件 所在目录的上级目录，请指定绝对路径";
const results = scanDir(flags.dir);

const mdxServerArray: MdxServer[] = [];
for (let i = 0; i < results.length; i++) {
  const result = results[i];
  const controller = new AbortController();

  // server
  const app = new Hono();
  app.get("/*", (c) => mdxServer.lookup(c));
  const server = Deno.serve(
    { port: 0, signal: controller.signal, hostname: "127.0.0.1" },
    app.fetch
  );
  const mdxServer = new MdxServer(result.mdxDir, result.fileInfo, { controller, server, app });
  mdxServerArray.push(mdxServer);
}

console.log(
  "mdx file info:",
  mdxServerArray.map((it) => it.fileInfo)
);

// server
const mainApp = new Hono();
mainApp.use(cors());
mainApp.get("/*", mainHandler);
mainApp.post("/api/info", (c) => c.json({ data: mdxServerArray.map((it) => it.info()) }));

const onListen = () => {
  console.info(`server is running, please open: %chttp://127.0.0.1:${port}/`, "color:green;");
};
const mainServer = Deno.serve({ port, onListen }, mainApp.fetch);

// 捕获终止信号，关闭所有服务器
function shutdownServers() {
  console.log("\nShutting down all servers...");
  mdxServerArray.forEach(({ serverInfo: { controller, server } }) => {
    controller.abort();
    // server.shutdown();
  });
  mdxServerArray.splice(0, mdxServerArray.length - 1);
}

// 监听退出信号，确保所有服务关闭
Deno.addSignalListener("SIGINT", shutdownServers);
Deno.addSignalListener("SIGTERM", shutdownServers);
