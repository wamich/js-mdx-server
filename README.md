# js-mdx-server

> 基于 [terasum/js-mdict](https://github.com/terasum/js-mdict)

## 支持多 mdd 文件

测试词典: [牛津高阶双解第 10 版](https://forum.freemdict.com/t/topic/30466)

## 前提

- 安装 deno:

  - en: https://docs.deno.com/runtime/
  - cn: https://www.denojs.cn/#installation

- 安装 依赖:

  ```sh
  deno install
  ```

## 运行

> **注意**：2 个参数

- **--dir**: 词典 mdx 文件所在目录
- **--port** : 服务端口号

1. 运行方式一：(直接运行)

   ```sh
   deno run -A main.ts --dir='mdx词典文件所在目录' --port=4008
   ```

2. 运行方式二：(调试运行)

   - 据实修改 **deno.json** 中 **--dir 参数**、**--port 参数**。
   - 执行:

   ```sh
   deno task dev
   ```

## 说明

- **main.ts**: 程序主入口
- **injection.js**: 参考 [ninja33/mdx-server](https://github.com/ninja33/mdx-server)
