# Google Drive Mirror

一个面向 Obsidian 的 Google Drive 手动 Push/Pull 插件原型。

这版切到了 Google Drive 的**可见文件夹**方案，目标仍然是第一阶段：

- 桌面端登录 Google Drive
- 导出 setup bundle 给其他设备
- Push 当前文件
- Push 全部本地变更并覆盖远端
- Pull 全部远端变更并覆盖本地

## 当前边界

这不是实时双向同步器，当前刻意不做：

- 自动监听和自动同步
- 重命名映射
- Google Drive changes 增量同步
- 真正的多端并发合并

所以它仍然更接近 `manual mirror sync`。

## 平台范围

当前实现是 **桌面端负责登录，Windows / iPhone / iPad 都可以手动 Push/Pull**。

原因是 Google 浏览器 OAuth 这版只在桌面端内建：

- `Desktop app` OAuth client
- 浏览器授权
- 本地 `127.0.0.1` 临时回调

移动端不走浏览器登录，而是**导入桌面导出的 setup bundle**。

## 远端布局

插件会在 `My Drive` 根目录下创建一个**可见文件夹**，名字就是 `Remote vault name`。

远端内部是实际目录树：

- 一个远端 `manifest`：`.gdrive-mirror-manifest.json`
- 一组按原始相对路径镜像的 vault 文件

所以你现在可以直接在 Google Drive 网页里看到这个文件夹和文件结构。

## Google Cloud 配置

你需要先在 Google Cloud Console 里做 3 件事：

1. 新建一个 project
2. 启用 `Google Drive API`
3. 创建一个 OAuth Client，类型选 `Desktop app`

### OAuth consent screen

如果只是你自己测试：

- User type 选 `External`
- Publishing status 保持 `Testing`

这类私用测试通常会看到 `unverified app` 提示，但可以继续。

### OAuth Client

在 `APIs & Services -> Credentials -> Create Credentials -> OAuth client ID`：

- Application type: `Desktop app`
- 创建完成后复制 `Client ID`
- 如果控制台也显示 `Client secret`，一并复制到插件设置里

## 插件设置

- `Client ID`: 填 Google OAuth Desktop App 的 client ID
- `Client Secret`: 如果 Google Cloud 控制台显示了 secret，就一并填入
- `Remote vault name`: `My Drive` 里的可见文件夹名，默认取当前 vault 名
- `.obsidian allow list`: 默认只同步少量稳定配置文件

升级自旧版 `appDataFolder` 实现时，记得重新登录一次，因为 OAuth scope 已切到 `drive.file`。

## 首次登录

### 桌面端

1. 在设置页点击 `Start sign-in`
2. 插件会打开默认浏览器
3. Google 登录和授权完成后，浏览器会回到类似：

```text
http://127.0.0.1:{随机端口}/oauth2callback
```

4. 插件拿到回调后会自动完成登录

### iPhone / iPad

1. 在桌面端登录成功后，点击 `Copy bundle`
2. 把 bundle 通过安全方式传到 iPhone / iPad
3. 在移动端插件设置里点击 `Import bundle`
4. 粘贴 bundle 并导入

这个 bundle 包含 refresh token，等价于长期凭据，按密码对待。

### 用二维码导入

桌面端现在也支持 `Show QR`：

1. 在 Windows / macOS / Linux 上登录成功后，点击 `Show QR`
2. iPhone / iPad 打开相机扫描二维码
3. 点开二维码里的 `obsidian://...` 链接
4. 已安装插件的 Obsidian 会自动导入 setup bundle

## 推荐用法

1. 主设备配置好后先执行一次 `Push all`
2. 日常使用时维持手动节奏：
   - 切换到某个设备前先 `Pull all`
   - 编辑完成后再 `Push all`

## 当前同步规则

- `Push all`: 当前设备覆盖远端，可删除远端多余文件
- `Pull all`: 远端覆盖当前设备，可删除本地多余文件
- 这版故意不做复杂冲突合并，手动 Push/Pull 的方向就是唯一真源

## 已知限制

- 第一次在已有非空 vault 上接管前，最好先备份。
- 这版会在 `My Drive` 里创建可见目录，适合手工检查；但仍然不建议你直接在网页里重命名或移动这些同步文件。
- 这版还没有重命名检测和增量 changes API。
- 桌面端可以直接浏览器登录；移动端需要先从桌面导入 bundle。
- 私有插件上 iPhone / iPad 时，通常需要借助 BRAT 安装。

## BRAT 安装

如果你把这个目录放到 GitHub 仓库里，当前结构已经满足 BRAT 常见要求：

- 根目录有 `manifest.json`
- 根目录有 `main.js`
- 根目录有 `styles.css`
- 根目录有 `versions.json`

另外仓库里还带了 GitHub Actions：

- `.github/workflows/ci.yml`：每次 push / PR 自动构建检查
- `.github/workflows/release.yml`：打 tag 后自动构建并上传 release 资产

这能让 BRAT 安装和后续版本分发更稳一些。

## 开发

源码在 `src/main.js`，根目录 `main.js` 是构建产物。

```bash
npm install
npm run build
```

开发时可以用：

```bash
npm run dev
```
