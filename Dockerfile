# 使用官方 Node.js 镜像作为基础
# 指定版本（推荐使用 LTS 版本），这里使用 alpine 版本以减小镜像体积
FROM node:lts-alpine

# 设置工作目录
WORKDIR /root/app

# 复制项目文件
COPY ./client/dist ./client/dist
COPY *.json ./

# 安装依赖
# RUN corepack install -g pnpm && corepack enable pnpm
RUN npm install

COPY *.ts *.html ./

# 声明数据卷（词典存放）
VOLUME /root/dictionaries

# 暴露应用运行的端口
EXPOSE 3000

# 子服务将使用的端口范围 (在容器内部)
# 这些可以通过环境变量在运行时传递给你的应用
ENV SUB_PORT_START=9001
ENV SUB_PORT_END=9005
EXPOSE ${SUB_PORT_START}-${SUB_PORT_END}

# 运行应用
CMD ["npx", "tsx", "main.ts", "--dir", "/root/dictionaries", "--port", "3000"]