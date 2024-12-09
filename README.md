# js-mdx-server

> 基于 [tonyzhou1890/js-mdict](https://github.com/tonyzhou1890/js-mdict)

## 支持多 mdd 文件

推荐词典: [精装 - 牛津高阶双解第 10 版完美版（OALDPE）](https://forum.freemdict.com/t/topic/30466)。  
下载完该词典后，请进一步参考 [词典适配说明](https://mingchang.wang/FAQ#mdx)。

## 前提

- 下载

  ```sh
  git clone --recurse-submodules https://github.com/wamich/js-mdx-server.git
  ```

- 安装 node.js:

  - 下载地址: https://nodejs.org/zh-cn

- 安装 依赖:

  ```sh
  npm install
  # 或者
  pnpm install
  ```

## 运行

> **命令行参数**

```sh
npx tsx main.ts -h

当前版本: v0.2

Usage(使用): npx tsx main.ts [options]

Options（参数说明）:
  -h, --help         显示帮助信息
  -p, --port: (可选)。服务运行端口，默认端口：3000
  -d, --dir:  (必填)。请指定绝对路径！示例如下：
      1. 一个 mdx 文件时，dir 参数为: *父级目录* 的绝对路径。
        └── *父级目录*
            └── oaldpe.mdx
      2. 多个 mdx 文件时，dir 参数为: *祖父级目录* 的绝对路径。
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
```

1. 运行方式一：(直接运行)

   ```sh
   npx tsx main.ts --dir='你的目录!' --port=3000

   # mac 示例:
   npx tsx main.ts --dir='/Users/ming/dict-workspace/dictionaries' --port=3000

   # win 示例:
   npx tsx main.ts --dir='C:\Users\Ming\Downloads\OALD 2024.09' --port=3000
   ```

2. 运行方式二：(调试运行)

   - 据实修改 **package.json** 中，**scripts** 字段中 **--dir 参数**、**--port 参数**。

   ```json
   {
     "scripts": {
       "dev": "tsx watch main.ts --dir='/Users/ming/dict-workspace/dictionaries' --port=3000"
     }
   }
   ```

   - 执行:

   ```sh
   npm run dev
   ```

## 说明

- **main.ts**: 程序主入口
- **injection.js**: 参考 [ninja33/mdx-server](https://github.com/ninja33/mdx-server)
