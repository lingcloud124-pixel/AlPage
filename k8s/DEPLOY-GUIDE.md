# Theme Studio Kubernetes 部署操作手册

## 1. 前置条件

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Kubernetes | 1.24+ | 已通过 kubectl 连接集群 |
| kubectl | 1.24+ | 与集群版本匹配 |
| Docker / containerd | 20.10+ | 用于构建镜像 |
| Ingress Controller | - | Nginx Ingress 或等效 |
| PV Provisioner | - | 支持 dynamic provisioning 或手动创建 PV |

## 2. 目录结构

```
k8s/
├── namespace.yaml      # 命名空间
├── configmap.yaml      # 配置与密钥模板
├── deployment.yaml     # 无状态工作负载
├── service.yaml        # ClusterIP 服务
├── ingress.yaml        # 入口路由
├── pvc.yaml            # 持久化存储声明
└── DEPLOY-GUIDE.md     # 本文档
```

项目根目录已有 `Dockerfile`，构建为单体镜像（前端静态资源由后端 Express 直接托管）。

## 3. 构建与推送镜像

运行时系统依赖统一维护在 `deploy/runtime-apt-packages.txt`。该清单覆盖 Python 打包、图片处理、Playwright Chromium 截图所需的 Debian/Ubuntu 包；Dockerfile 会直接使用它安装依赖。

如果部署同事不是用本项目 Dockerfile 构建镜像，而是在已有 Debian/Ubuntu 镜像或服务器中手动补依赖，请执行：

```bash
apt-get update
xargs -a deploy/runtime-apt-packages.txt apt-get install -y --no-install-recommends
```

```bash
# 在项目根目录执行
docker build -t theme-studio:latest .

# 推送到私有镜像仓库（示例）
docker tag theme-studio:latest registry.example.com/theme-studio:latest
docker push registry.example.com/theme-studio:latest
```

如果使用私有仓库，需要在 deployment.yaml 中把 `image` 改为完整仓库地址，并配置 imagePullSecrets：

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=YOUR_USER \
  --docker-password=YOUR_PASSWORD \
  -n theme-studio
```

然后在 deployment.yaml 的 `spec.template.spec` 下添加：

```yaml
      imagePullSecrets:
        - name: regcred
```

## 4. 配置环境变量

编辑 `configmap.yaml` 和 `secret.yaml`：

**必须修改的值：**

| 键 | 说明 |
|----|------|
| `ADMIN_PASSWORD` | 后台管理密码，必须为强密码 |
| `SCREENSHOT_BASE_URL` | 改为你的正式域名，如 `https://theme-studio.example.com` |

**按需配置的值：**

| 键 | 说明 |
|----|------|
| `JIMENG_ACCESS_KEY` | 即梦生图 AK（在 /admin 后台配置也可） |
| `JIMENG_SECRET_KEY` | 即梦生图 SK |
| `EKP_BASE_URL` | EKP 同域 SSO 地址 |
| `EKP_SSO_USER` / `EKP_SSO_PASS` | SSO 服务账号 |

> 对话模型、生图模型的 Endpoint / API Key / Model 名称建议通过 `/admin` 后台页面在线配置，存储在 SQLite 中，无需放入 K8s Secret。

## 5. 部署步骤

### 5.1 一键部署（按顺序）

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 5.2 验证

```bash
# 检查 Pod 状态
kubectl get pods -n theme-studio

# 等待 Ready
kubectl wait --for=condition=ready pod -l app=theme-studio -n theme-studio --timeout=120s

# 查看日志
kubectl logs -f -l app=theme-studio -n theme-studio

# 本地端口转发测试
kubectl port-forward svc/theme-studio-svc 3001:3001 -n theme-studio
# 浏览器访问 http://localhost:3001
```

### 5.3 配置 DNS

将 `theme-studio.example.com` 解析到 Ingress Controller 的外部 IP：

```bash
kubectl get svc -n ingress-nginx
# 取 EXTERNAL-IP，配置 A 记录
```

## 6. 更新部署

### 6.1 更新镜像版本

```bash
docker build -t registry.example.com/theme-studio:v1.1.0 .
docker push registry.example.com/theme-studio:v1.1.0

# 修改 deployment.yaml 中的 image tag，然后：
kubectl apply -f k8s/deployment.yaml

# 或直接 set image：
kubectl set image deployment/theme-studio theme-studio=registry.example.com/theme-studio:v1.1.0 -n theme-studio
```

### 6.2 滚动更新状态

```bash
kubectl rollout status deployment/theme-studio -n theme-studio
```

### 6.3 回滚

```bash
kubectl rollout undo deployment/theme-studio -n theme-studio
```

## 7. 数据持久化

所有持久化数据统一存储在 `/app/data/` 目录下，通过单个 PVC 挂载：

| 目录 | 用途 |
|------|------|
| `/app/data/theme-studio.db` | SQLite 数据库（用户、配置、对话） |
| `/app/data/backups/` | 数据库备份 |
| `/app/data/logs/` | 应用日志 |
| `/app/data/output/service-jobs/` | 导出任务产物（主题包 zip） |
| `/app/data/exports/` | 导出文件 |

| PVC | 挂载路径 | 建议大小 |
|-----|---------|---------|
| `theme-studio-data-pvc` | `/app/data` | 5Gi |

> SQLite 是单写库，当前架构仅支持单副本（`replicas: 1`）。如需多副本水平扩展，需迁移至 PostgreSQL/MySQL 并将文件存储改为 S3/NFS。

## 8. 运维操作

### 查看 PVC 使用情况

```bash
kubectl exec -it -n theme-studio $(kubectl get pods -n theme-studio -l app=theme-studio -o jsonpath='{.items[0].metadata.name}') -- df -h /app/data
```

### 手动备份数据库

```bash
kubectl exec -n theme-studio $(kubectl get pods -n theme-studio -l app=theme-studio -o jsonpath='{.items[0].metadata.name}') -- \
  sqlite3 /app/data/theme-studio.db ".backup /app/data/theme-studio-backup.db"

kubectl cp theme-studio/$(kubectl get pods -n theme-studio -l app=theme-studio -o jsonpath='{.items[0].metadata.name}'):/app/data/theme-studio-backup.db ./backup-$(date +%Y%m%d).db
```

### 调整资源配额

编辑 `deployment.yaml` 中的 `resources` 块：

```yaml
resources:
  requests:
    cpu: "200m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

## 9. 卸载

```bash
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/pvc.yaml
kubectl delete -f k8s/namespace.yaml
```

> 删除 namespace 会清除其下所有资源，包括 PVC 中的数据。如需保留数据，先备份数据库再删除。
