import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // UnoCSS 插件
    UnoCSS(),
    // Bundle 分析（仅构建时生效）
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },

  build: {
    // 生产构建优化
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除 console
        drop_debugger: true, // 移除 debugger
      },
    },

    // 代码分割策略
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom'],
          // TDesign UI 库
          'tdesign-vendor': ['tdesign-react', '@tdesign-react/chat'],
          // 状态管理
          'zustand-vendor': ['zustand'],
          // 工具库
          'utils-vendor': ['@octokit/core'],
        },
        // 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // 构建 CSS 代码分割
    cssCodeSplit: true,

    // 启用 Source Map（生产环境可选关闭）
    sourcemap: false,

    // 块大小警告阈值
    chunkSizeWarningLimit: 500,
  },

  // 依赖预构建优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'tdesign-react',
      'zustand',
    ],
  },

  // CSS 配置
  css: {
    // CSS 预处理器
    preprocessorOptions: {
      // less: {
      //   javascriptEnabled: true,
      // },
    },
    // CSS 模块化
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
