// tsdown 配置：把 Host（lib）与 Client（dist/client.js）分别转译。
// `prepare` 脚本在 git 安装时运行本配置，产出 */lib 与 dist/client.js，
// 使 `dsh plugin add github:...` 无需用户额外的 build 权限。
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    dts: true,
    sourcemap: false,
    clean: true,
    platform: 'node',
  },
  {
    entry: ['src/client/index.tsx'],
    outDir: 'dist',
    format: ['esm'],
    // 不产出 dts（客户端 bundle 运行时无类型需求）
    dts: false,
    sourcemap: false,
    clean: false,
    // 客户端的 React 由 web 运行时提供，标记为外部 module-table 依赖
  },
])