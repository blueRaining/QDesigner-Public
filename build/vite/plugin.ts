import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import vitePluginImp from 'vite-plugin-imp'

export function vitePlugins(VITE_USE_MOCK: boolean, isBuild: boolean) {
    const plugins: (Plugin | Plugin[])[] = []

    plugins.push(vitePluginImp({}))

    plugins.push(react())

    return plugins
}
