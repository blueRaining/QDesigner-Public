import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'

import { store } from '/@/redux/index'

//调用 createRoot 以在浏览器 DOM 元素中创建根节点显示内容。

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).
    //调用 root.render 来显示 React 组件：
    render(
        <Provider store={store}>
          <App></App>
        </Provider>
    )
