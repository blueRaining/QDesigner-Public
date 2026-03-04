
import { connect } from 'react-redux'
import { HashRouter } from 'react-router-dom'

import '/@/assets/aliFont/iconfont.css'

import '/@/design/index.less'

import { Router } from '/@/router/index'
import Loading from "./editor/loading/index"
const App = (props: any) => {
    const { showLoading } = props;
    return (
        <HashRouter>

            <Router />
            { showLoading && <Loading></Loading>}

        </HashRouter>

    )
}
export default connect((state: any) => state.editor)(App)
