import { defineConfig } from 'vite'

// Конфигурация Vite для проекта Chill Out Lingerie
// Настройка для работы с HTML, CSS и JavaScript
export default defineConfig({
  // Корневая директория проекта
  root: '.',
  
  // Директория для статических файлов (изображения, шрифты и т.д.)
  publicDir: 'public',
  
  // Настройки сборки
  build: {
    // Директория для собранных файлов
    outDir: 'dist',
    
    // Генерировать source maps для отладки (отключено для production)
    sourcemap: false,
    
    // Минификация в production
    minify: 'esbuild',
    
    // Размер предупреждения о больших чанках (в килобайтах)
    chunkSizeWarningLimit: 1000,
    
    // Очищать выходную директорию перед сборкой
    emptyOutDir: true,
    
      // Настройки rollup (Vite использует Rollup для сборки)
      rollupOptions: {
        input: {
          main: './index.html',
          catalog: './catalog.html'
        },
      // Настройки вывода
      output: {
        // Формат имени файлов для чанков
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // Настройки dev-сервера
  server: {
    // Порт для dev-сервера
    port: 5173,
    
    // Автоматически открывать браузер
    open: true,
    
    // Включить CORS
    cors: true
  },
  
  // Настройки препроцессоров
  css: {
    // Поддержка SASS/SCSS
    preprocessorOptions: {
      scss: {
        // Дополнительные опции для SASS, если понадобятся
        additionalData: ''
      }
    }
  }
})


