import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { ConfigProvider, theme, message } from "antd";
import zhCN from 'antd/locale/zh_CN'
import App from './page/App'

import { store } from '/@/redux/index'

// 全局 message 层级高于 UVShow 面板（z-index: 9999~20000）
message.config({ top: 24, getContainer: () => document.body });


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).
    render(
    <Provider store={store}>
     <ConfigProvider locale={zhCN} theme={{
        algorithm: theme.darkAlgorithm,
        token: {
            zIndexPopupBase: 100000,
        },
        components: {
            Select: {
                optionSelectedBg:"#1E90FF",
                optionActiveBg:"#1E90FF",
                optionSelectedFontWeight:500,
            },
            InputNumber: {
                hoverBorderColor:"#00000000",
                handleHoverColor:"#ffffff",
                activeBorderColor:"#00000000",
              },
              Slider: {
                dotActiveBorderColor:"#bfbfbf",
                handleActiveColor:"#bfbfbf",
                handleColor:"#bfbfbf",
                handleActiveOutlineColor:"#ffffff55",
                trackBg:"#bfbfbf",
                trackHoverBg:"#bfbfbf",
              },
              Tree:{
                directoryNodeSelectedBg:"#ffffff55",
                directoryNodeSelectedColor:"#000000",
                nodeHoverBg:"#ffffff55",
                nodeSelectedBg:"#ffffff55",
              }
          }
        }}>
        <App />
    </ConfigProvider>
    </Provider>
)
