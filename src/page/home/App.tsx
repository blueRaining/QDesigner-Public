
import { connect } from 'react-redux'
import { HashRouter } from 'react-router-dom'

import '/@/assets/aliFont/iconfont.css'
import "./index.less"
import { Router } from './router/index'
 
const App = (props: any) => {
    return (
        /**Router路由组件 */
        <HashRouter>
            <Router />
        </HashRouter>

    )
}
export default connect((state: any) => state)(App)
