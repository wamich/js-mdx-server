# js-mdx-server

> 基于 [terasum/js-mdict](https://github.com/terasum/js-mdict)

## 支持多 mdd 文件

推荐词典: [牛津高阶双解第 10 版](https://forum.freemdict.com/t/topic/30466)

## 前提

- 安装 deno:

  - en: https://docs.deno.com/runtime/
  - cn: https://www.denojs.cn/#installation

- 安装 依赖:

  ```sh
  deno install
  ```

## 运行

> **命令行参数**

```sh
deno run -A main.ts -h

当前版本: v0.1

Usage(使用): deno run -A main.ts [options]

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
```

1. 运行方式一：(直接运行)

   ```sh
   deno run -A main.ts --dir='你的目录!' --port=3000
   ```

2. 运行方式二：(调试运行)

   - 据实修改 **deno.json** 中 **--dir 参数**、**--port 参数**。

   ```json
   {
     "tasks": {
       "dev": "deno run -A --watch main.ts --dir='/Users/ming/dict-workspace/dictionaries/' --port=3000"
     }
   }
   ```

   - 执行:

   ```sh
   deno task dev
   ```

## 说明

- **main.ts**: 程序主入口
- **injection.js**: 参考 [ninja33/mdx-server](https://github.com/ninja33/mdx-server)
