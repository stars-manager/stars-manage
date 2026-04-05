import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tdesign-react/es/_util/react-19-adapter'; // React 19 适配器
import 'virtual:uno.css'; // UnoCSS 虚拟模块
import '@unocss/reset/tailwind.css'; // UnoCSS 重置样式
import 'tdesign-react/es/style/index.css';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
