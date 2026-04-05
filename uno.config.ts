import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig({
  // 预设
  presets: [
    // UnoCSS 默认预设（类似 Tailwind）
    presetUno(),

    // 属性化模式（可选）
    presetAttributify(),

    // 图标预设（可选）
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),

    // Web 字体（可选）
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,600,800',
        mono: 'DM Mono',
      },
    }),
  ],

  // 转换器
  transformers: [
    // 支持 @apply、@screen 等指令
    transformerDirectives(),

    // 变体组（hover:、focus: 等）
    transformerVariantGroup(),
  ],

  // 主题扩展
  theme: {
    colors: {
      primary: '#0052D9',
      'primary-hover': '#0052cc',
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },

  // 自定义规则
  rules: [
    // 自定义卡片样式
    ['card', {
      'background-color': '#fff',
      'border-radius': '12px',
      'padding': '20px',
      'margin-bottom': '16px',
      'cursor': 'pointer',
      'transition': 'all 0.3s ease',
      'border': '1px solid #e7e7e7',
    }],

    // 自定义悬停效果
    ['card-hover', {
      'box-shadow': '0 4px 12px rgba(0,0,0,0.1)',
      'border-color': '#0052cc',
      'transform': 'translateY(-2px)',
    }],

    // 自定义弹窗遮罩
    ['modal-overlay', {
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'right': '0',
      'bottom': '0',
      'background-color': 'rgba(0,0,0,0.5)',
      'display': 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'z-index': '1000',
      'backdrop-filter': 'blur(4px)',
    }],

    // 自定义弹窗内容
    ['modal-content', {
      'background-color': '#fff',
      'border-radius': '12px',
      'padding': '32px',
      'box-shadow': '0 8px 24px rgba(0,0,0,0.15)',
    }],

    // 备注样式
    ['remark-box', {
      'font-size': '13px',
      'color': '#666',
      'background-color': '#f7f7f7',
      'padding': '8px 12px',
      'border-radius': '6px',
      'margin-bottom': '8px',
      'font-style': 'italic',
      'border-left': '3px solid #0052D9',
    }],

    // 文本截断（2行）
    ['line-clamp-2', {
      'display': '-webkit-box',
      '-webkit-line-clamp': '2',
      '-webkit-box-orient': 'vertical',
      'overflow': 'hidden',
      'text-overflow': 'ellipsis',
    }],
  ],

  // 快捷方式（组合多个类）
  shortcuts: {
    // 按钮
    'btn': 'px-4 py-2 rounded inline-block bg-primary text-white cursor-pointer hover:bg-primary-hover transition-all duration-300',
    'btn-outline': 'px-4 py-2 rounded inline-block border border-primary text-primary cursor-pointer hover:bg-primary hover:text-white transition-all duration-300',

    // 卡片交互
    'card-interactive': 'card hover:card-hover',

    // Flex 布局
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',

    // 文本样式
    'text-primary': 'text-#333',
    'text-secondary': 'text-#666',
    'text-tertiary': 'text-#999',
  },

  // 安全列表（确保这些类始终生成）
  safelist: [
    'card',
    'card-hover',
    'modal-overlay',
    'modal-content',
    'btn',
    'btn-outline',
  ],
})
