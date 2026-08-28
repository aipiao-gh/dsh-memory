// tsdown 配置：只构建 Host 半（lib/）。
// 注意：`dist/client.js` 是手写的「module-loader bundle」格式（镜像 dsh-notify），
// 不走 tsdown——请直接编辑 dist/client.js，构建不会覆盖它。
// 产物（lib/ 与 dist/）已提交进仓库，git 安装无需本地构建。
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    dts: true,
    sourcemap: false,
    clean: false,
    platform: 'node',
  },
])