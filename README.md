# dsh-memory

DSH（DeepSeek Harness）**持久化记忆插件**（`dsh.bundle`）。为 agent 提供跨会话的**用户画像 + 长期记忆**：新建对话自动读到稳定记忆，对话过程中自动沉淀新记忆，并可在 Web「设置 → 记忆管理」里查看、修改、补录。

> 大部分代码由 DeepSeek 开发，如介意请勿使用
---

## 功能一览

| 能力 | 说明 |
|---|---|
| 用户画像 | 从对话抽取稳定特征（基本信息/性格/偏好/禁忌/当前关注）并合并更新 |
| 持久化记忆 | 把对话按窗口提炼成结构化记忆（`basic_fact`/`preference`/`event`/`summary`） |
| 新建对话自动读取 | 首轮注入画像 + 固定/高重要度记忆；每回合按关键词召回相关记忆 |
| 查看与修改 | Web「记忆管理」页 或 使用`/memory`、`/profile` 命令 |
| 自定义总结模型 | 可选 `defaultExtractModel`；为空时用窗口级回退路由，不占用主对话模型 |
| 本地持久化 | `~/.dsh/storages/memory.json`，重启后仍在 |

> 自动抽取记忆、生成/更新用户画像 默认**关闭**。仅在你明确开启后，对话片段才会（经本地脱敏：邮箱/电话/证件等）发送到你选定的提取模型。

---

## 安装

> 前置：本机已装 `dsh` CLI（`dsh --version` 可查），并有 `web` profile。

### 方式 1：git clone 后本机安装（推荐）

```sh
# 克隆仓库
git clone git@github.com:aipiao-gh/dsh-memory.git
cd ./dsh-memory

# 进入项目本体目录并构建（产出 lib/ 与 dist/client.js）
# 需 Node 20+、pnpm≥9；首次需联网拉 tsdown/typescript 等依赖
cd packages/dsh-memory
pnpm install
pnpm run prepare        # 即 pnpm run build（用 tsdown 转译 Host 与 Client）

# 回到仓库根目录，装进目标 profile（这里以 web 为例）
cd ../..
dsh plugin --profile web add ./packages/dsh-memory

# 重启 dsh
dsh --profile web
```

- 本机安装**通常不需要**改动 pnpm-workspace.yaml（`prepare` 已在本机跑过了）。
- 若仍遇到“运行 prepare 被 pnpm 拒绝”，参照下方「放行构建脚本」处理。
- 若启动后「记忆管理」没出现：先**硬刷新浏览器**（Ctrl+Shift+R）；仍无则确认上面 `add` 成功、且 `packages/dsh-memory/dist/client.js` 已生成。
- 卸载：`dsh plugin --profile web remove dsh-memory`。

### 方式 2：GitHub 直接安装

```sh
# 先放行构建（见下方「放行构建脚本」），再安装：
dsh plugin --profile web add github:aipiao-gh/dsh-memory

# 重启 dsh 并验证，同方式 1。
```

> 注意：pnpm≥10 默认拒绝运行 git 依赖的构建脚本，**首次 `add` 会失败**并打印类似
> `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED … not in the "allowBuilds" allowlist` 的信息。
> 这是预期，按下方「放行构建脚本」处理后再重跑即可。

### 放行构建脚本（仅 git 安装需要用）

当 `dsh plugin ... add github:...` 报 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` / `Failed to prepare git-hosted package` 时：

1. **定位文件**：`web` profile 的 pnpm 配置路径是
   ```
   .dsh/profiles/web/pnpm-workspace.yaml
   ```
  （若你的 `DSH_HOME` 不是 `/home/aipiao/.dsh`，用 `echo $DSH_HOME` 替换前缀；`tui` 等 profile 把文件名里 `web` 换成对应名字。）

2. **追加而非替换**：文件里通常已有 `allowBuilds:` 段，把 **pnpm 报错信息里打印的那一行**（含完整 key 与 commit 哈希，例如
   `dsh-memory@git+ssh://git@github.com/aipiao-gh/dsh-memory.git#a1d49fd…: true`）追加进去，变成：

   ```yaml
   allowBuilds:
     cloudflared: true
     cpu-features: true
     ssh2: true
     node-pty: true
     dsh-memory@git+ssh://git@github.com/aipiao-gh/dsh-memory.git#a1d49fd…: true
   ```

   ⚠️ key 必须是**报错原文**里的那整串（已含 commit 哈希）。只写 `dsh-memory: true` 匹配不到这个 git 依赖。

3. **重跑**同一条 `dsh plugin --profile web add github:aipiao-gh/dsh-memory`。

> 因为 key 含 commit 哈希，**每次 push 换 commit 都要重新加一次 allowlist**。若不想每次处理：
> - 用 tarball：在本包 `cd packages/dsh-memory && pnpm pack` → `dsh plugin --profile web add ./dsh-memory-0.2.0.tgz`（免放行）；
> - 或发布到 npm 后 `dsh plugin --profile web add dsh-memory`（免放行）。

### 多 profile

安装有多套 profile（如 `tui`）时，把 `--profile web` 换成对应 profile 名即可；对应的 `pnpm-workspace.yaml` 也在 `$DSH_HOME/profiles/<名字>/` 下。

---

## 使用

### Web「记忆管理」页（设置 → 记忆管理）

- **记忆块**（默认展开，可折叠）
  - 标题统计：`记忆（共 N 条 · active N 条 · basic_fact:N …）`
  - 筛选：状态（Active/待确认/回收站/全部）+ 类型 + 关键词 + 刷新
  - 新增：填「记忆内容」（可选「来源」）→ 添加；重复内容自动去重
  - 每条操作：固定/取消固定、删除、恢复、彻底删除
- **用户画像**：分字段展示（基本/性格/偏好/不喜欢/关注/override），点「编辑」修改，保存落盘
- **插件设置**：自动抽取记忆、生成/更新用户画像、每 N 条对话自动总结一次、提取模型

### 命令

>在对话框也可以直接使用以下命令

```
/memory list [--type T] [--keyword K]      列出/搜索记忆
/memory show <id>                          查看单条（JSON）
/memory add <content> [--category 甲,乙] [--source 来源]   手动新增（manual=true）
/memory edit <id> <newContent>             编辑
/memory rm <id> [--purge]                  软删 / 彻底删除
/profile show                              查看画像
/profile edit <field> <value>             修改画像字段
```

---

## 要让记忆“自动沉淀”，需同时满足

自动抽取（写回记忆 + 更新画像）是旁路异步任务，不阻塞主对话，需：

1. **开关**：开启「自动抽取记忆」（`memory.enabled`）或「生成/更新用户画像」（`profile.enabled`）；
2. **有提取模型**：在设置里选了提取模型，或窗口有主请求路由可回退（否则标记 `no-route` 不执行）；
3. **触发窗口**：对话累积达到「每 N 条对话自动总结一次」（默认 5），或会话结束（flush）兜底。

> 手动新增记忆不受这些条件限制，直接写入并立即可被召回。

## 记忆是怎么被读到的（注入）

- **首轮基线注入**：`system-prompt` 注入**画像 + pinned 或"重要度≥4"的记忆**。普通 `importance=3`/未固定记忆**不会进基线**。
- **每回合召回**：`agent/pre-step` 按**当前消息关键词**从 `active` 记忆召回（上限 `recall.maxMemories`=5），作为「记忆检索（不可验证的用户数据）」附加。
  - 验证是否生效：在空白对话问含关键词的问题（如“你还记得我喜欢喝什么吗”），并看设置页顶部 `baseline 触发/注入`、`recall 触发/命中` 计数是否增长。
  - 想让某条记忆“必被新会话读到”：在列表把它**固定（pinned）**——固定记忆必进基线。

---

## 设置与默认值（存于 `memory.json` 的 `config` 表）

| 项 | 默认 | 说明 |
|---|---|---|
| `自动抽取记忆`（memory.enabled） | false | 是否自动抽取记忆 |
| `生成/更新用户画像`（profile.enabled） | false | 是否自动更新画像 |
| 每 N 条对话自动总结一次（extract.windowMessages） | **5** | 阈值触发一次窗口写回；0=仅会话结束（flush）时 |
| `model.defaultExtractModel` | 空 | 提取模型；为空→窗口级回退路由 |
| `recall.maxMemories` | 5 | 每回合召回条数上限 |
| `baselineInjection.maxTokens` | 800 | 首轮基线注入 token 预算 |
| `extract.confidenceThreshold` | 0.7 | 置信度低于此的抽取不入库 |

---

## 常见问题

**Q：新建对话完全不知道我存的记忆？**
通常是注入门槛：普通记忆不进基线，靠关键词召回。先看诊断行的 `baseline`/`recall` 计数是否随对话增长——增长说明注入机制在工作。想让某条必被读到就「固定」它。

**Q：为什么没有自动抽取出记忆？**
需「开关 + 有提取模型 + 攒够条数/flush」三者齐备，否则窗口 `no-route` 不执行。手动新增不受限。

**Q：记忆存哪？会丢吗？**
`~/.dsh/storages/memory.json`（storageDomain 的 `memory` 域）。重启后仍在。

**Q：自动总结间隔能调吗？**
能：设置里的「每 N 条」或改 `extract.windowMessages`。太密会频繁调提取模型、更费 token。

**Q：Web 页面没出现「记忆管理」？**
Client 半需要浏览器**硬刷新**；确认插件已装进该 profile 且 `dsh --profile web` 已重启。

---

## 目录

```
dsh-memory/
├── package.json            # dsh.bundle + dsh.client manifest
├── cordis.patch.yml        # 安装时插入 dsh-memory 插件行
├── src/
│   ├── index.ts            # Host 插件（含 memory Service：清单/增删改/画像/配置/模型）
│   └── client/index.tsx    # Web 记忆管理视图（settings.section）
├── tsconfig.json
└── tsdown.config.ts        # 构建 lib/（Host）与 dist/client.js（Web）
```

## 开发提示

- `pnpm run build` / `pnpm run prepare` 用 [tsdown](https://github.com/rolldown/tsdown) 构建。
- Host：`export const inject` + `export async function apply(ctx)`，暴露 `memory` Service。
- Client：`dsh.client`（`platform:"web"`, `inject:["memory"]`, `external:["react"]`）→ `exports["./client"]` = `dist/client.js`。
- Client 视图 `import React`，已在 `package.json.dsh.client.external` 声明 `["react"]` 走 web 运行时模块表基线。
