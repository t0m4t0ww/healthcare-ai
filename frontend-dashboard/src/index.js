import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import thêm ConfigProvider và App (đổi tên thành AntdApp) từ antd
import { ConfigProvider, App as AntdApp } from 'antd';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      {/* Bọc toàn bộ ứng dụng trong ConfigProvider và AntdApp */}
      <ConfigProvider>
        <AntdApp>
          <App />
          <ToastContainer 
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            limit={5}
          />
        </AntdApp>
      </ConfigProvider>
    </React.StrictMode>
  </BrowserRouter>
);

reportWebVitals();