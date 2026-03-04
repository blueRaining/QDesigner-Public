import { Navigate, useRoutes } from 'react-router-dom'

import Home from '../Element/home'

import { RoutersProps } from './interface/index'

//路由
const routers: RoutersProps[] = [
    {
        path: '/',
        element: <Navigate to="home" />
    },
    {
        path: 'home',
        element: <Home />,

    }
]

//准备路由
const Router = () => {

    const routes = useRoutes(routers)
    return routes
}

export { Router }
