import { Navigate, useRoutes } from 'react-router-dom'

import Editor from '../page/editor/Editor'
import Design from '../page/editor/Design'

import { RoutersProps } from './interface/index'

//路由
const routers: RoutersProps[] = [
    {
        path: '/',
        element: <Navigate to="editor" />
    },
    {
        path: 'editor',
        element: <Editor />,
    },
    {
        path: 'design',
        element: <Design />,
    }
]

//准备路由
const Router = () => {
    const routes = useRoutes(routers)
    return routes
}

export { Router }
