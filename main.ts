import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";

import { parseArgs } from "jsr:@std/cli/parse-args";

import { mainHandler } from "./mainHandler.ts";
import { MdxServer } from "./mdxServer.ts";
import { scanDir } from "./util.ts";

const Hostname = "127.0.0.1";

function main() {
  // 命令行参数
  const flags = parseArgs(Deno.args, {
    boolean: ["help"],
    string: ["port", "dir"], // 端口、mdx目录
    default: { port: "3000" }, // 默认端口
    alias: { p: "port", d: "dir", h: "help" }, // 短别名
  });

  if (flags.help) {
    console.log(`参数说明:

--port: (可选)。服务运行端口，默认端口：3000

--dir:  (必填)。请指定绝对路径！表示mdx文件所在目录。多个mdx文件时，请分别建立不同目录，此时dir参数应该为这些目录的上级目录。例如：
  1. 一个 mdx 文件时，dir 参数为: 父级目录。
    └── *父级目录*
        └── oaldpe.mdx
  2. 多个 mdx 文件时，dir 参数为: 祖父级目录。
    └── *祖父级目录*
        ├── 精选牛津十
        │   ├── oaldpe.mdx
        │   ├── oaldpe.mdd
        │   ├── oaldpe1.mdd
        │   ├── oaldpe2.mdd
        │   ├── oaldpe3.mdd
        │   └── oaldpe4.mdd
        └── 21 世纪英汉词典
            └── 21 世纪英汉词典.mdx
`);
    return;
  }

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
  if (!results.length) throw "没有找到mdx文件，请检查！";

  // mdx server
  const mdxServers = results.map((result) => {
    const controller = new AbortController();
    const app = new Hono();
    app.get("/*", (c) => mdxServer.lookup(c));
    const server = Deno.serve(
      { port: 0, signal: controller.signal, hostname: Hostname },
      app.fetch
    );
    const mdxServer = new MdxServer(result.mdxDir, result.fileInfo, { controller, server, app });
    return mdxServer;
  });

  console.log(
    "MDX FILE INFO:",
    mdxServers.map((it) => it.fileInfo)
  );

  // main server
  const mainApp = new Hono();
  mainApp.use(cors());
  mainApp.get("/*", mainHandler);
  mainApp.post("/api/info", (c) => c.json({ data: mdxServers.map((it) => it.info()) }));

  const onListen = () => {
    console.info(`Server is running.\nPlease open: %chttp://${Hostname}:${port}/`, "color:green;");
  };
  const mainServer = Deno.serve({ port, onListen, hostname: Hostname }, mainApp.fetch);

  // 捕获终止信号，关闭所有服务器
  function shutdownServers() {
    console.log("\nShutting down all servers...");
    mdxServers.forEach(({ serverInfo: { controller } }) => controller.abort());
    mdxServers.splice(0, mdxServers.length - 1);
    mainServer.shutdown();
  }

  // 监听退出信号，确保所有服务关闭
  Deno.addSignalListener("SIGINT", shutdownServers);
  Deno.addSignalListener("SIGTERM", shutdownServers);
}

main();
