/// <reference types="vite/client" />

declare module '*.module.less' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.less' {
  const classes: Record<string, string>
  export default classes
}

// 允许直接 import 本地 .js 数据文件（项目内有 datas/data.js）
declare module '*.js' {
  const value: any
  export default value
}
