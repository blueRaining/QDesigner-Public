
import { Navigate, useRoutes } from 'react-router-dom'

import Home from '../Element/home'
import HomeContent from '../Element/HomeContent'
import ResourcePlaza from '../Element/ResourcePlaza'
import FeatureIntro from '../Element/FeatureIntro'
import APIDocs from '../Element/APIDocs'

import { RoutersProps } from './interface/index'

//路由
const routers: RoutersProps[] = [
    {
        path: '/',
        element: <Navigate to="home" />
    },
    {
        // Home 作为布局组件，包含 header + footer
        element: <Home />,
        children: [
            {
                path: 'home',
                element: <HomeContent />,
            },
            {
                path: 'resource-plaza',
                element: <ResourcePlaza />,
            },
            {
                path: 'features',
                element: <FeatureIntro />,
            },
            {
                path: 'api-docs',
                element: <APIDocs />,
            },
        ]
    },
]

//准备路由
const Router = () => {

    const routes = useRoutes(routers)
    return routes
}

export { Router }
