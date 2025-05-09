# js-mdx-server

> 基于 [terasum/js-mdict](https://github.com/terasum/js-mdict)

## 支持多 mdd 文件

推荐词典: [精装 - 牛津高阶双解第 10 版完美版（OALDPE）](https://forum.freemdict.com/t/topic/30466)。  
下载完该词典后，请进一步参考 [词典适配说明](https://mingchang.wang/FAQ#mdx)。

## A. 前提

- 安装 [node.js](https://nodejs.org/zh-cn)

- 下载项目

  ```sh
  git clone --recurse-submodules https://github.com/wamich/js-mdx-server.git
  ```

- 安装依赖:

  ```sh
  npm install
  # 或者
  pnpm install
  ```

## B. 运行

<details>
  <summary>命令行参数</summary>

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

</details>

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

## C. 更新

- 当后续存在更新时

  ```sh
  # 1. 更新代码
  git pull --recurse-submodules

  # 2. 安装依赖
  npm install
  # 或者
  pnpm install

  # 3. 重新运行
  # 见上节: B. 运行
  ```

## D. 补充说明

- **main.ts**: 程序主入口
- **injection.html**: 公共的注入内容，每个词典都会注入。参考 [ninja33/mdx-server](https://github.com/ninja33/mdx-server)
- 如需为特定 mdx 词典定制或修复时，一般有几种方法：

  1. 直接修改 mdx 词典引用的 js 或 css 文件
  2. 可在 **该 mdx 词典目录下，新建一个 html 文件**，以实现注入特定的需求。示例：

  ```html
  <!-- 如为单独的词典（CED_231010_v231014.mdx），进行自定义。 -->
  <!-- 原词典内容：特殊单词之间没有空格，而采用是边距 margin 隔开。 -->
  <script>
    // inject js
    document.querySelectorAll("div.ced23 a").forEach((a) => {
      // 特殊单词前后插入空格字符串
      a.insertAdjacentText("beforebegin", " ");
      a.insertAdjacentText("afterend", " ");
    });
  </script>
  <style>
    /* inject css */
    div.ced23 a {
      /* 禁止边距 */
      margin: 0px !important;
    }
  </style>
  ```

## Docker 运行

### 构建镜像 image

- **本地**

```sh
# 通过 Dockerfile 构建镜像，名称为：js-mdx-server:0.2
docker build -t js-mdx-server:0.2 .
```

- **NAS**

```sh
# 指定platform
docker build --platform=linux/amd64 -t js-mdx-server-nas:0.2 .
# 将镜像导出
docker image save -o ./js-mdx-server-nas-0.2.tar js-mdx-server-nas:0.2
# 将镜像上传至NAS中
```

### 运行容器 container

- **本地**

```sh
docker run -d \
  -p 3000:3000 \
  -p 9001-9005:9001-9005 \
  -e SUB_PORT_START=9001 \
  -e SUB_PORT_END=9005 \
  -v ~/dict-workspace/dictionaries:/root/dictionaries \
  --name js-mdx-server \
  js-mdx-server:0.2
```

- 主服务端口 : <u>[容器内]主服务端口</u>

  > -p 3000:<u>3000</u>

  - ‼️ 主服务端口: 3000，可修改
  - ‼️ <u>[容器内]主服务端口</u>: <u>3000</u>，不可修改

- 子服务端口范围 : <u>[容器内]子服务端口范围</u>

  > -p 9001-9005:9001-9005

  - ‼️ 预留端口范围：
    - 范围**之差** 应当 **大于** 挂载目录下 mdx 词典目录的**数量**，例中的范围 9001-9005，即允许最多 5 个本地 mdx 词典目录
  - ‼️ **本机**的端口范围 和 **容器**的端口范围 **必须保持一致!!**

- 子服务端口（起始值）

  > -e SUB_PORT_START=9001

  - ‼️ 上述范围的**起始值**

- 子服务端口（结束值）

  > -e SUB_PORT_END=9005

  - ‼️ 上述范围的**结束值**

- 目录映射，本地词典目录 : <u>[容器内]词典目录</u>

  > -v ~/dict-workspace/dictionaries:/root/dictionaries

  - ‼️ 本地词典目录: 示例(~/dict-workspace/dictionaries)，请修改
  - ‼️ <u>[容器内]词典目录</u>: /root/dictionaries，不可修改

- **NAS**

```sh
# 在 NAS 中选择上传的镜像文件，并导入
# 参照上述运行容器的命令行信息，配置容器
```
