# CG-MCP

## 局域网访问

后端启动后，在项目目录运行：

```powershell
npm run dev:lan
```

同一局域网内使用 `http://本机IPv4地址:5173` 登录。可用
`Get-NetIPConfiguration` 查看有默认网关的以太网地址。浏览器通过前端的 `/api`
代理访问后端，地址和热更新连接会跟随浏览器实际访问的主机。

如果已有前端监听 `127.0.0.1:5173`，可在另一个终端指定本机局域网 IP，保留两个入口：

```powershell
npm run dev -- --host 172.16.2.153 --port 5173
```

示例 IP 应替换为本机实际的以太网 IPv4 地址。

前端代理自动读取项目 `.env` 的 `APP_API_KEY`，兼容旧配置 `VITE_API_KEY`；
浏览器只接收公开的 `VITE_API_BASE_URL`。默认后端地址为
`http://127.0.0.1:8080`，可用 `VITE_DEV_API_PROXY_TARGET` 调整。

Windows 防火墙需允许 Node.js 的入站 TCP 5173 连接。本机配置、日志和后端源码目录不通过前端静态文件服务提供。
