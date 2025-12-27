---
status: be-editing
---
## 一、Docker 基础信息与环境检查

### 1.1 查看 Docker 版本

- **简单释义**：查看 Docker 是否安装以及版本信息
    
- **详细释义**：用于确认 Docker 客户端和服务端版本，排查环境问题
    

```bash
docker version
```

**注意事项**

- 如果 `Server` 部分报错，说明 Docker 服务未启动
    

---

### 1.2 查看 Docker 系统信息

- **简单释义**：查看 Docker 运行环境的整体状态
    
- **详细释义**：包含镜像数量、容器数量、存储驱动、系统架构等
    

```bash
docker info
```

**常见用途**

- 排查磁盘占用
    
- 判断是否运行在 rootless 模式
    
- 查看 cgroup / storage driver
    

---

## 二、镜像（Image）相关命令

---

### 2.1 查看本地镜像列表

- **简单释义**：列出本机所有 Docker 镜像
    
- **详细释义**：展示镜像名、标签、ID、大小、创建时间
    

```bash
docker images
```

**常用参数**

- `-a`：显示所有镜像（包括中间层）
    

---

### 2.2 搜索远程镜像（Docker Hub）

- **简单释义**：在 Docker Hub 中搜索镜像
    
- **详细释义**：用于查找官方或社区镜像
    

```bash
docker search nginx
```

**注意事项**

- `OFFICIAL` 标记为官方维护镜像，优先选择
    

---

### 2.3 拉取镜像

- **简单释义**：从远程仓库下载镜像
    
- **详细释义**：如果本地不存在该镜像，会自动下载
    

```bash
docker pull nginx
docker pull nginx:1.25
```

**参数说明**

- `镜像名:tag`
    
- 不写 tag 默认是 `latest`
    

**注意事项**

- 生产环境**不建议使用 `latest`**
    

---

### 2.4 删除镜像

- **简单释义**：删除本地镜像
    
- **详细释义**：释放磁盘空间
    

```bash
docker rmi nginx
docker rmi 镜像ID
```

**常用参数**

- `-f`：强制删除（即使被容器使用）
    

**注意事项**

- 需先删除使用该镜像的容器
    

---

## 三、容器（Container）生命周期管理

---

### 3.1 运行一个容器（最核心命令）

- **简单释义**：创建并启动一个容器
    
- **详细释义**：Docker 最常用命令，集创建 + 启动于一体
    

```bash
docker run nginx
```

---

#### 常见完整写法示例

```bash
docker run -d \
  --name nginx-test \
  -p 8080:80 \
  nginx
```

**参数详解**

- `-d`：后台运行（detached）
    
- `--name`：指定容器名称
    
- `-p 宿主端口:容器端口`：端口映射
    

**注意事项**

- 容器名不可重复
    
- 端口冲突会导致启动失败
    

---

### 3.2 查看运行中的容器

- **简单释义**：查看当前正在运行的容器
    

```bash
docker ps
```

**常用参数**

- `-a`：显示所有容器（包含已停止）
    

---

### 3.3 停止容器

- **简单释义**：正常关闭容器
    

```bash
docker stop 容器名或ID
```

**注意事项**

- 默认有 10 秒优雅停止时间
    

---

### 3.4 强制停止容器

- **简单释义**：立即杀死容器进程
    

```bash
docker kill 容器名或ID
```

---

### 3.5 启动 / 重启容器

```bash
docker start 容器名
docker restart 容器名
```

---

### 3.6 删除容器

- **简单释义**：删除已停止的容器
    

```bash
docker rm 容器名
```

**常用参数**

- `-f`：强制删除运行中的容器
    

---

## 四、进入容器 & 执行命令

---

### 4.1 进入容器（推荐）

- **简单释义**：进入容器内部进行操作
    

```bash
docker exec -it 容器名 /bin/bash
```

**参数说明**

- `-i`：保持输入
    
- `-t`：分配终端
    

**注意事项**

- Alpine 镜像常用 `/bin/sh`
    

---

### 4.2 运行一次性命令

```bash
docker exec 容器名 ls /app
```

---

## 五、日志与调试

---

### 5.1 查看容器日志

- **简单释义**：查看容器标准输出
    

```bash
docker logs 容器名
```

**常用参数**

- `-f`：实时跟踪日志
    
- `--tail 100`：只看最后 100 行
    

---

### 5.2 查看容器详细信息

```bash
docker inspect 容器名
```

**用途**

- 查看 IP、挂载、环境变量、启动参数
    

---

## 六、数据卷（Volume）与挂载

---

### 6.1 挂载宿主目录（最常用）

```bash
docker run -v /宿主路径:/容器路径 nginx
```

**注意事项**

- 宿主路径必须存在
    
- Windows / Mac 路径需授权
    

---

### 6.2 使用命名 Volume

```bash
docker volume create mydata
docker run -v mydata:/data nginx
```

---

## 七、网络相关命令

---

### 7.1 查看 Docker 网络

```bash
docker network ls
```

---

### 7.2 创建自定义网络

```bash
docker network create my-net
```

---

### 7.3 指定网络启动容器

```bash
docker run --network my-net nginx
```

**好处**

- 容器间可通过容器名互相访问
    

---

## 八、Dockerfile & 镜像构建

---

### 8.1 构建镜像

- **简单释义**：根据 Dockerfile 构建镜像
    

```bash
docker build -t my-app:1.0 .
```

**参数说明**

- `-t`：指定镜像名和版本
    
- `.`：Dockerfile 所在目录
    

---

## 九、资源清理（非常重要）

---

### 9.1 清理无用容器

```bash
docker container prune
```

---

### 9.2 清理无用镜像

```bash
docker image prune
```

---

### 9.3 一键清理所有无用资源（慎用）

```bash
docker system prune -a
```

**会删除**

- 停止的容器
    
- 未使用的镜像
    
- 未使用的网络
    
- 构建缓存
    

---

## 十、常见易错点总结

- 容器 ≠ 镜像
    
- 容器停止 ≠ 删除
    
- `docker rm` ≠ `docker rmi`
    
- 端口映射方向：**宿主:容器**
    
- 生产环境避免 `latest`
    
- 日志优先用 `docker logs`
    

---

如果你愿意，我可以：

- 帮你**裁剪成“面试版 / 新手版 / 运维版”**
    
- 或补充 **Docker + Node.js / Nginx / MySQL 实战示例**
    
- 或整理一份 **Docker + Docker Compose 对照文档**
    

你可以直接告诉我使用场景。