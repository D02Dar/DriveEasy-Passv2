import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: [
        'vue',
        'vue-router',
        'vuex'
      ],
      dts: true
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: true
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 2606,
    hmr: {
      overlay: true, // 重新启用错误覆盖层，帮助调试
      clientPort: 2606, // 确保HMR客户端端口正确
      port: 2606
    },
    proxy: {
      '/api': {
        target: 'http://localhost:2607',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('代理错误:', err);
            }
          });
        }
      },
      '/uploads': {
        target: 'http://localhost:2607',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('上传文件代理错误:', err);
            }
          });
        }
      }
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '590702.xyz'
    ],
    cors: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]'
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@/styles/variables.scss" as *;',
        api: 'modern-compiler' // 使用现代编译器API
      }
    }
  }
})
