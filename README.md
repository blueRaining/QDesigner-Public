# QDesign — 3D 产品设计工作台

基于 BabylonJS 的 Web 端 3D 产品设计编辑器，支持多品类模型实时预览、PBR 材质编辑、环境光照配置、后处理管线，以及模板化设计工作流。

> 产品设计 · 3D 展示 · 在线协作

**Pro 版在线体验：** [http://babylonjsx.cn/home.html#/home](http://babylonjsx.cn/home.html#/home)

## 开源版 vs Pro 版

| 功能模块 | 开源版 | Pro 版 |
|---------|:------:|:------:|
| 3D 模型加载与预览 | :white_check_mark: | :white_check_mark: |
| 场景层级管理（拖拽排序、分组） | :white_check_mark: | :white_check_mark: |
| PBR 材质编辑器 | :white_check_mark: | :white_check_mark: |
| 材质库（场景 / 用户 / 公共） | :white_check_mark: | :white_check_mark: |
| 环境球管理（HDR / EXR / ENV） | :white_check_mark: | :white_check_mark: |
| 多光源与光照配置 | :white_check_mark: | :white_check_mark: |
| 背景设置（纯色 / 渐变 / 图片） | :white_check_mark: | :white_check_mark: |
| 后处理管线（TAA / Bloom / SSAO / 色差 / 暗角） | :white_check_mark: | :white_check_mark: |
| 渲染设置 | :white_check_mark: | :white_check_mark: |
| 模板中心 | :white_check_mark: | :white_check_mark: |
| 高清截图导出 | :white_check_mark: | :white_check_mark: |
| 项目导出与离线预览部署 | :white_check_mark: | :white_check_mark: |
| 基本体创建（球体 / 立方体 / 圆柱等） | :white_check_mark: | :white_check_mark: |
| 变换工具（移动 / 旋转 / 缩放） | :white_check_mark: | :white_check_mark: |
| 撤销 / 重做 | :white_check_mark: | :white_check_mark: |
| UV 贴图编辑器 | :x: | :white_check_mark: |
| AI 背景生成 | :x: | :white_check_mark: |
| AI 智能配色 / AI 生图 | :x: | :white_check_mark: |

## 功能介绍

### 3D 产品展示

支持包装盒、瓶型、服装、瓷器等多品类模型的实时预览，基于 PBR（Physically Based Rendering）材质渲染，真实还原产品质感。支持 GLB、GLTF、Blend 等主流 3D 格式导入，不支持的格式会自动转换为 GLB。

### 场景层级管理

完整的场景树视图，支持展开/折叠、拖拽排序、右键菜单（复制/删除）。节点类型涵盖 Camera、Light、Mesh、Node（分组），可通过工具栏快速创建球体、立方体、圆柱、圆锥、胶囊、圆环、平面等基本体。

### PBR 材质编辑

内置 PBR 材质编辑器，可调节金属度、粗糙度、法线、反射率等参数。支持多层纹理贴图（Albedo、Normal、Metallic、Roughness 等）。编辑器提供三级材质库：

- **场景材质** — 当前模型自带的材质
- **用户材质** — 保存到本地的个人材质收藏
- **公共材质** — 预设的可复用材质模板

材质可导出保存，跨项目复用。

### 环境球与光照

- **环境球管理** — 支持 HDR、EXR、ENV、DDS 格式的环境贴图，提供公共和个人环境球库，可上传自定义环境球，调节环境强度（0–5）和旋转角度（-180° ~ 180°）
- **方向光** — 可调节亮度、阴影深度、光照角度、光照高度、漫反射颜色

### 背景设置

- 纯色背景
- 渐变背景（线性/径向），支持角度控制，内置 20 种预设渐变（灰调、暖调、冷调、紫调、绿调、高端）
- 图片背景（公共库 + 个人上传）

### 后处理管线

专业级后处理效果，提升画面质感：

- **TAA** — 时间性抗锯齿
- **Bloom** — 泛光效果
- **SSAO** — 屏幕空间环境光遮蔽
- **色差** — 色彩像差模拟
- **暗角** — 画面四周压暗

### 模板中心

涵盖包装盒、瓶型、服装、瓷器等多品类预设模板，选择即用，快速启动设计。支持远程模板加载。

### 预览与导出

- 高清截图导出（支持透明背景）
- 完整项目打包导出（ZIP 格式）
- 预览页面可独立离线部署，无需编辑器运行时

### 双模式设计

- **编辑器模式** — 完整功能面板，适合精细调整
- **设计模式** — 简洁紧凑布局，聚焦产品设计工作流

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/your-org/QDesigner-Public.git
cd QDesigner-Public

# 安装依赖
npm install --legacy-peer-deps

# 复制环境变量模板
cp .env.example .env.development

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

## 技术栈

- **3D 引擎** — BabylonJS 8.x
- **前端框架** — React 18 + TypeScript
- **UI 组件** — Ant Design 5
- **构建工具** — Vite 4
- **状态管理** — Redux + Redux Persist
- **本地存储** — IndexedDB（离线优先）

## 项目结构

```
src/
├── 3D/                    # 3D 引擎核心
├── api/local/             # 本地 API 层（IndexedDB）
├── components/Element/    # 通用 UI 组件
├── config/                # 全局配置
├── page/
│   ├── editor/            # 编辑器主页面
│   │   ├── components/    # 编辑器子组件
│   │   │   ├── Asset/     # 资产管理面板
│   │   │   ├── LeftSider/ # 场景树
│   │   │   ├── RightSider/# 属性面板
│   │   │   ├── ToolsBar/  # 工具栏
│   │   │   └── ...
│   │   ├── Editor.tsx     # 编辑器模式入口
│   │   └── Design.tsx     # 设计模式入口
│   ├── home/              # 首页
│   └── preview/           # 预览页面
├── redux/                 # 状态管理
└── utils/                 # 工具函数
```

## 声明

本项目以 [MIT License](./LICENSE) 开源发布，仅供学习、研究和合法的商业用途。使用者应遵守以下条款：

1. **合法用途** — 本软件仅限用于合法目的，不得将其用于任何违反中华人民共和国法律法规或使用者所在地法律法规的活动。
2. **禁止滥用** — 不得利用本软件从事侵犯他人知识产权、隐私权、肖像权等合法权益的行为；不得用于制作、传播违法违规内容。
 
4. **免责说明** — 本软件按"原样"提供，作者不对因使用本软件而产生的任何直接或间接损失承担责任。使用者应自行评估使用风险。
5. **商标声明** — QDesign、QDesigner 名称及相关标识为项目作者所有，未经授权不得用于暗示与本项目存在官方关联或背书。
6. **出口管制** — 使用者应自行确保使用本软件时符合相关出口管制和贸易制裁法规的要求。

使用本软件即表示您已阅读并同意上述声明。

## License

[MIT](./LICENSE) &copy; QDesign

