import { serve, type ServerType } from "@hono/node-server";
import { program } from "commander";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import process from "node:process";

import { mainHandler } from "./mainHandler.ts";
import { MdxServer } from "./mdxServer.ts";
import { scanDir } from "./util.ts";

async function main() {
  program
    .option("-h, --help", "帮助信息", false)
    .option("-p, --port <char>", "服务端口", "3000") // 默认3000端口
    .option("-d, --dir <char>", "mdx目录");

  program.parse(process.argv);
  const flags = program.opts<{
    help: boolean;
    port: string;
    dir: string;
  }>();

  if (flags.help) {
    console.log(`
当前版本: v0.2

Usage(使用): npx tsx main.ts [options]

Options（参数说明）:
  -h, --help         显示帮助信息
  -p, --port: (可选)。服务运行端口，默认端口：3000
  -d, --dir:  (必填)。请指定绝对路径！示例如下：
      1. 一个 mdx 文件时，dir 参数为: *父级目录* 的绝对路径。
        └── 父级目录
            └── oaldpe.mdx
      2. 多个 mdx 文件时，dir 参数为: *祖父级目录* 的绝对路径。
        └── 祖父级目录
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

  const scanResults = scanDir(flags.dir);
  if (!scanResults.length) throw "没有找到mdx文件，请检查！";

  const mdxServers: MdxServer[] = [];

  // Docker容器内运行: 因为子服务端口也需要对外暴露，配合环境变量确定端口范围
  if (process.env.SUB_PORT_START && process.env.SUB_PORT_END) {
    const subPortStart = parseInt(process.env.SUB_PORT_START);
    const subPortEnd = parseInt(process.env.SUB_PORT_END);

    const portCount = subPortEnd - subPortStart + 1;
    if (portCount < scanResults.length) throw "端口范围不足，请指定更大的范围";

    // 尝试端口
    function tryServer(port: number, fetch: Hono["fetch"]) {
      return new Promise<ServerType>((resolve, reject) => {
        const server = serve({ port, fetch }, (_info) => {
          resolve(server);
        });
        server.once("error", (err: NodeJS.ErrnoException) => {
          const { code, message } = err;
          reject(`code: ${code}, message: ${message}`);
        });
      });
    }

    let currPort = subPortStart;
    for (let i = 0; i < scanResults.length; i++) {
      const app = new Hono();
      // for http 304 cache
      app.use("*", etag({ weak: true }));
      app.get("/*", (c) => mdxServer.lookup(c));

      // 动态分配端口，如果端口占用，尝试下一个端口
      let server: ServerType;
      while (true) {
        try {
          server = await tryServer(currPort, app.fetch);
          currPort++;
          break;
        } catch (error) {
          // console.warn(error);
          console.warn(`端口${currPort}占用，尝试${currPort + 1}`);
          currPort++;
          if (currPort > subPortEnd) throw "端口范围不足，请指定更大的范围";
        }
      }

      const mdxServer = new MdxServer(scanResults[i], { server, app });
      mdxServers.push(mdxServer);
    }
  }
  // 裸主机 运行: 子服务端口动态分配
  else {
    for (let i = 0; i < scanResults.length; i++) {
      const app = new Hono();
      // for http 304 cache
      app.use("*", etag({ weak: true }));
      app.get("/*", (c) => mdxServer.lookup(c));

      const server = serve({ port: 0, fetch: app.fetch });
      const mdxServer = new MdxServer(scanResults[i], { server, app });
      mdxServers.push(mdxServer);
    }
  }

  console.log("MDX  INFO:");
  mdxServers.forEach((it) => {
    console.log({
      ...it.scanResult,
      iframeUrl: `http://127.0.0.1:${it.info.port}/welcome`,
    });
  });

  // main server
  const mainApp = new Hono();
  mainApp.use(cors());
  // for http 304 cache
  mainApp.use("*", etag({ weak: true }));
  mainApp.get("/*", mainHandler);
  mainApp.post("/api/info", (c) => c.json({ data: mdxServers.map((it) => it.info) }));

  const mainServer = serve({ port, fetch: mainApp.fetch }, (info) => {
    console.info("Server is running.");
    console.info(`Please open: %chttp://127.0.0.1:${info.port}/welcome`, "color:green;");
  });

  // 捕获终止信号，关闭所有服务器
  function shutdownServers() {
    console.log("\nShutting down all servers...");
    mdxServers.forEach(({ serverInfo: { server } }) => server.close());
    mdxServers.splice(0, mdxServers.length - 1);
    mainServer.close();
  }

  // 监听退出信号，确保所有服务关闭
  process.addListener("SIGINT", shutdownServers);
}

main();
