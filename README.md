# mirror-server
基于 nestjs 开发的服务端项目,为mirror-chat提供后端服务

## 依赖安装

```bash
$ npm install
```

## 快速启动

```bash
# 开发模式
$ npm run start

# 生产模式
$ npm run start:prod
```

## 数据库
本项目采用了prisma作为数据库连接工具,需要在prisma文件夹下配置env文件
项目操作prisma客户端,prisma负责和远程数据库进行交互

```bash
# 生成prisma客户端(启动前需执行)
$ npx prisma generate

# 查看远程数据库
$ npx prisma studio

# 迁移数据库(当数据库发送变动时使用,会根据配置文件重新生成prisma客户端)
$ npx prisma migrate dev

# 清空远程数据库
$ npx prisma migrate reset
```