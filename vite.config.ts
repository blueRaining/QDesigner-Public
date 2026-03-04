import { resolve } from 'path'

import type { ConfigEnv, UserConfig } from 'vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { wrapperEnv } from './build/utils'
import { vitePlugins } from './build/vite/plugin'
import svgr from 'vite-plugin-svgr'


// https://vitejs.dev/config/
export default ({ command, mode }: ConfigEnv): UserConfig => {
    const root = process.cwd()

    // The boolean type read by loadEnv is a string. This function can be converted to boolean type
    const env = loadEnv(mode, root)

    const isBuild = command === 'build'

    const { VITE_PORT, VITE_USE_MOCK, VITE_OPEN } = wrapperEnv(env)

    // CDN 地址：开发环境 '/'，生产环境可设为 CDN 域名如 'https://cdn.babylonjsx.cn/'
    const VITE_PUBLIC_PATH = env.VITE_PUBLIC_PATH || '/'

    return {
        base: VITE_PUBLIC_PATH,
        build: {
            sourcemap: false,
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.info', 'console.debug'],
                    passes: 2,
                },
                mangle: {
                    toplevel: true,
                    properties: false,
                },
                format: {
                    comments: false,
                },
            },
            rollupOptions: {
                input: {
                    editor: resolve(__dirname, './editor.html'),
                    home: resolve(__dirname, './home.html'),
                    preview: resolve(__dirname, './preview.html'),
                },
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', 'react-redux', 'redux', 'react-router-dom'],
                        'vendor-antd': ['antd', '@ant-design/icons'],
                        'vendor-babylon': ['babylonjs'],
                    },
                },
            },
        },

        cacheDir: 'node_modules/.vite',
        server: {
            port: VITE_PORT,
            host: '0.0.0.0',
            open: VITE_OPEN,
            hmr: {
                overlay: true
            },
        },
        css: {
            modules: {
                localsConvention: 'camelCase',
                scopeBehaviour: 'local',
                generateScopedName: '[name]_[local]_[hash:5]'
            },
            preprocessorOptions: {
                less: {
                    javascriptEnabled: true
                },
            }
        },

        plugins: [
            react(),
            svgr(),
            // 构建时将 HTML 中的 ./ 相对路径替换为 CDN 绝对路径
            ...(isBuild ? [{
                name: 'html-public-path',
                transformIndexHtml(html: string) {
                    return html
                        .replace(/src="\.\/libs\//g, `src="${VITE_PUBLIC_PATH}libs/`)
                        .replace(/href="\.\/icons\//g, `href="${VITE_PUBLIC_PATH}icons/`)
                }
            }] : []),
        ],

        resolve: {
            alias: {
                '/@/': resolve(__dirname, 'src') + '/',
            },
        }
    }
}
