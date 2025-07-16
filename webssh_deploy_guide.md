# Web SSH 项目部署完整文档（个人专属）

## 📌 项目目标

将一个基于 Node.js 的 Web SSH 项目部署至一台 VPS，并通过 Cloudflare 提供域名访问，最终实现：

- 通过浏览器访问一个 Web 界面终端
- 可直接连接 VPS 本机或其他主机的 SSH
- 使用 HTTPS 安全加密
- 持久运行，支持自动重启

---

## 🧱 项目结构

本地项目目录结构如下：

```
Web-SSh/
├── client/                # 前端网页：index.html, css, js
└── server/                # 后端 Node.js 服务
    ├── index.js
    ├── package.json
    ├── package-lock.json
    └── node_modules/
```

---

## 🚀 部署流程详解（含错误处理）

### 第一步：VPS 基础配置

1. 登录 VPS：

```bash
ssh root@<VPS_IP>
```

2. 安装 Node.js：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

❗ 遇到问题：`Could not get lock /var/lib/dpkg/lock-frontend`

- ✅ 解决方法：等待 `unattended-upgr` 自动更新结束，或者：

```bash
sudo killall -9 unattended-upgr
sudo dpkg --configure -a
```

### 第二步：上传项目文件

- 通过 SCP 或 SFTP 将本地 `Web-SSh` 项目上传至 VPS（尤其包含 `node_modules`）

### 第三步：安装 PM2 并守护服务

```bash
sudo npm install -g pm2
cd ~/Web-SSh/server
pm2 start index.js --name web-ssh
pm2 startup
pm2 save
```

---

## 🔧 Web 无法连接的故障排查过程总结

### ❶ 无法连接 SSH（ETIMEDOUT）

- 原因：VPS 禁用了出向 TCP 22 端口（或目标 IP 错误）
- 解决方案：
  - ✅ 修改 `/etc/ssh/sshd_config`，确保 `Port 22` 未注释
  - ✅ 检查 Node.js 日志 & 客户端 IP 正确性

### ❷ SSHD 正常但网页连接失败

- telnet 或 PowerShell 测试 22 端口失败：

```powershell
Test-NetConnection -ComputerName <IP> -Port 22
```

- ✅ 最终确认是**IP 填错**，实际使用 IP 为 `23.142.200.13`

---

## 🌐 配置 Nginx + HTTPS + Cloudflare

### 第一步：安装 nginx + certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 第二步：绑定 Cloudflare 域名

在 DNS 中添加：

```
A记录    ssh.example.com    23.142.200.13    ✅ 开启代理
```

### 第三步：配置 Nginx 反向代理

编辑配置文件：

```bash
sudo nano /etc/nginx/sites-available/webssh
```

添加内容：

```
server {
    listen 80;
    server_name ssh.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

然后执行：

```bash
sudo ln -s /etc/nginx/sites-available/webssh /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 第四步：申请 HTTPS 证书

```bash
sudo certbot --nginx -d ssh.example.com
```

✔ 成功后：自动配置 HTTPS 和续期定时任务

---

## 💾 内存优化（避免 Node 崩溃）

由于 VPS 内存仅 512M，因此配置 Swap：

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 开机自动挂载：
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## ✅ 最终上线状态

| 服务         | 状态           |
| ---------- | ------------ |
| Node.js    | pm2 守护运行中    |
| Nginx      | 正常反代端口3000   |
| HTTPS      | Certbot 自动配置 |
| Cloudflare | 已接入          |
| Swap       | 已设置 1GB      |

---

## 📌 后续建议

- 设置前端密码保护
- 设置日志记录连接 IP / 命令行为
- 新增第二个站点（如 IP 检查）绑定另一子域名
- 加入 fail2ban/iptables 限制 SSH 爆破

如需继续优化部署，欢迎继续协助 👍

