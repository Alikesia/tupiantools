# 图片工具箱

压缩、转格式、去背景、合成 GIF、拆解 GIF。所有图片都在浏览器里处理，不上传到任何服务器。

## 四个工具

| 工具 | 网址 | 文件 |
|---|---|---|
| 压缩 · 转换 | `/compress/` | `public/compress/index.html` |
| 去背景 | `/remove-bg/` | `public/remove-bg/index.html` |
| 动图合成 | `/gif/` | `public/gif/index.html` |
| GIF 拆解 | `/gif/#split` | `public/gif/split.js`（和动图合成在同一个页面） |

打开网站首页会自动进入上次用的工具，第一次默认进「压缩 · 转换」。

## 文件说明

```
tupiantools/
├── public/                 ← 网站文件，全部放这里
│   ├── index.html          首页：自动跳到上次用的工具
│   ├── assets/
│   │   ├── site.css        顶部工具标签、浅色/深色配色
│   │   └── site.js         顶部工具标签、浅色/深色切换、工具之间传图、ZIP 打包
│   ├── compress/index.html 压缩 · 转换 · 缩放
│   ├── remove-bg/index.html 去背景
│   └── gif/
│       ├── index.html      动图合成
│       └── split.js        GIF 拆解
├── wrangler.jsonc          Cloudflare 部署配置（一般不用改）
└── README.md
```

## 第一次上传到 GitHub

1. 在 GitHub 点右上角 **+ → New repository**，名字填 `tupiantools`，选 **Private**，点 **Create repository**。
2. 在新仓库页面点 **uploading an existing file**。
3. 把解压出来的 `tupiantools` 文件夹**里面**的东西（`public` 文件夹、`wrangler.jsonc`、`README.md`、`.gitignore`）全部拖进去。
   - Mac 上 `.gitignore` 是隐藏文件，在访达里按 `⌘ + Shift + .` 就能看到。漏传也没关系，不影响网站。
4. 点 **Commit changes**。

## 连接 Cloudflare（自动部署）

1. 登录 Cloudflare，左边菜单 **Compute（Workers & Pages）→ Create**。
2. 选 **Import a repository**，授权 GitHub，选 `tupiantools` 仓库。
3. 设置保持默认（不用填构建命令），点 **Deploy**。
4. 部署完成后会给一个网址：`tupiantools.你的账号.workers.dev`。

之后每次在 GitHub 上提交修改，Cloudflare 会在一两分钟内自动更新网站。

## 以后怎么改

- **在 GitHub 网页上直接改**：打开要改的文件，点右上角的铅笔图标，改完点 **Commit changes**。
- **换掉整个文件**：进到对应文件夹，点 **Add file → Upload files**，拖入新文件（同名会覆盖），点 **Commit changes**。
- **改坏了**：在 Cloudflare 项目的 **Deployments** 里找到上一个正常的版本，点 **Rollback** 回滚；GitHub 的 **History** 里也能看到每一次修改。

## 本地使用

不部署也能用：直接双击 `public/index.html` 用浏览器打开。
