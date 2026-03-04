import { useCallback, useState } from 'react'
import {
  RocketOutlined,
  CameraOutlined,
  BgColorsOutlined,
  BulbOutlined,
  ApartmentOutlined,
  FormatPainterOutlined,
  DragOutlined,
  PictureOutlined,
  UndoOutlined,
  SettingOutlined,
  AppstoreOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import styles from './APIDocs.module.less'

/* ──────────── type helpers ──────────── */
interface Param {
  name: string
  type: string
  desc: string
  optional?: boolean
  default?: string
}
interface Method {
  name: string
  signature: string
  desc: string
  params?: Param[]
  returns?: string
}
interface EventItem {
  name: string
  desc: string
  payload?: string
}
interface Section {
  id: string
  icon: React.ReactNode
  title: string
  desc: string
  methods: Method[]
}

/* ──────────── Events ──────────── */
const events: EventItem[] = [
  { name: 'selectedModel', desc: '场景中模型/节点被选中时触发', payload: '{ uiConfigs: UiObjectConfig2[], key: string }' },
  { name: 'selectedMaterial', desc: '材质被选中时触发', payload: '{ uiConfigs: UiObjectConfig2[], key: string }' },
  { name: 'startExportMaterial', desc: '开始导出材质时触发', payload: '无' },
  { name: 'endExportMaterial', desc: '材质导出完成时触发', payload: '{ detail: any }' },
  { name: 'sceneTreeUpdated', desc: '场景层级结构更新时触发', payload: '事件对象' },
  { name: 'materialThumbChanged', desc: '材质缩略图更新时触发', payload: '无' },
  { name: 'textureChanged', desc: '纹理贴图更新时触发', payload: '无' },
  
  { name: 'environmentChanged', desc: '环境贴图更换时触发', payload: '{ hdrUrl: string, thumbnailUrl: string }' },
  { name: 'backgroundImageChanged', desc: '背景图片更换时触发', payload: '{ imageUrl: string }' },
  { name: 'backgroundGradientChanged', desc: '背景渐变改变时触发', payload: '无' },
  { name: 'sceneLightChanged', desc: '场景灯光参数变化时触发', payload: '无' },
  { name: 'environmentSettingsChanged', desc: '环境参数（强度/旋转）变化时触发', payload: '无' },
]

/* ──────────── API Sections ──────────── */
const sections: Section[] = [
  {
    id: 'constructor',
    icon: <RocketOutlined />,
    title: '构造 & 初始化',
    desc: '创建 Editor 实例并初始化插件系统与事件监听。',
    methods: [
      {
        name: 'constructor',
        signature: 'new Editor(options: EditorOptions)',
        desc: '创建一个 Editor 实例。全局单例可通过 Editor.instance 访问。',
        params: [
          { name: 'options.canvas', type: 'HTMLCanvasElement', desc: '用于渲染 3D 场景的 Canvas 元素' },
          
          { name: 'options.cdnBaseUrl', type: 'string', desc: 'CDN 基础路径', optional: true },
        ],
      },
      {
        name: 'init',
        signature: 'async init(): Promise<void>',
        desc: '初始化编辑器：加载所有插件、绑定事件、调整画布尺寸。必须在 constructor 之后调用。',
      },
      {
        name: 'dispose',
        signature: 'dispose(): void',
        desc: '销毁编辑器实例，释放所有资源。',
      },
      {
        name: 'resize',
        signature: 'resize(): void',
        desc: '手动触发画布尺寸重新计算。在容器大小变化时调用。',
      },
    ],
  },
  {
    id: 'model',
    icon: <AppstoreOutlined />,
    title: '模型加载',
    desc: '加载 3D 模型文件，支持 GLTF/GLB/FBX 等多种格式及 .rain 项目文件。',
    methods: [
      {
        name: 'loadModel',
        signature: 'async loadModel(url: string | File, options?: AddObjectOptions): Promise<void>',
        desc: '加载 3D 模型到场景中。支持 URL 路径或 File 对象。加载 .rain 文件时会自动还原完整场景。',
        params: [
          { name: 'url', type: 'string | File', desc: '模型文件路径或 File 对象' },
          { name: 'options.autoUpdateCamera', type: 'boolean', desc: '加载后自动调整相机', optional: true, default: 'true' },
          { name: 'options.clearSceneObjects', type: 'boolean', desc: '加载前清空当前场景', optional: true, default: 'true' },
        ],
      },
      {
        name: 'createBaseObject',
        signature: 'createBaseObject(type: string): any',
        desc: '创建基础几何体。可选类型：Node（空节点）、Sphere（球体）、Box（正方体）、Cylinder（圆柱）、Cone（圆锥）、Capsule（胶囊体）、Torus（圆环）、Disc（圆盘）、Plane（平面）、Ground（地面）。',
        params: [
          { name: 'type', type: '"Node" | "Sphere" | "Box" | "Cylinder" | "Cone" | "Capsule" | "Torus" | "Disc" | "Plane" | "Ground"', desc: '几何体类型名称' },
        ],
      },
      {
        name: 'deleteSelectedNode',
        signature: 'deleteSelectedNode(id?: string): void',
        desc: '删除当前选中的节点。如传入 id，则删除对应节点。支持 Undo/Redo。',
        params: [
          { name: 'id', type: 'string', desc: '节点 ID，不传则删除当前选中节点', optional: true },
        ],
      },
      {
        name: 'copyModelById',
        signature: 'copyModelById(id: string): void',
        desc: '复制指定 ID 的模型节点',
        params: [
          { name: 'id', type: 'string', desc: '源模型节点 ID' },
        ],
      },
      {
        name: 'hasInstanceNode',
        signature: 'hasInstanceNode(id: string): boolean',
        desc: '判断指定节点是否为实例化节点。',
        params: [
          { name: 'id', type: 'string', desc: '节点 ID' },
        ],
        returns: 'boolean',
      },
    ],
  },
  {
    id: 'environment',
    icon: <CameraOutlined />,
    title: '环境贴图',
    desc: '管理场景环境贴图（HDR/ENV/EXR），控制环境光照强度和旋转。',
    methods: [
      {
        name: 'setEnvirment',
        signature: 'async setEnvirment(url: string): Promise<void>',
        desc: '设置环境贴图。支持 HDR、ENV、EXR、DDS 格式。会触发 environmentChanged 事件。支持 Undo/Redo。',
        params: [
          { name: 'url', type: 'string', desc: '环境贴图文件路径' },
        ],
      },
      {
        name: 'getEnvirmentUrl',
        signature: 'getEnvirmentUrl(): string | undefined',
        desc: '获取当前环境贴图的源路径。',
        returns: 'string | undefined',
      },
      {
        name: 'getEnvirmentPreView',
        signature: 'getEnvirmentPreView(): string',
        desc: '获取当前环境贴图的预览图（base64 或 URL）。',
        returns: 'string',
      },
      {
        name: 'parseEnvirmentImage',
        signature: 'async parseEnvirmentImage(blob: Blob, type: string): Promise<any>',
        desc: '解析环境贴图图片 Blob 并转换为引擎可用的纹理格式。',
        params: [
          { name: 'blob', type: 'Blob', desc: '图片二进制数据' },
          { name: 'type', type: 'string', desc: '文件类型（如 "hdr"、"env"）' },
        ],
      },
      {
        name: 'getEnvironmentIntensity',
        signature: 'getEnvironmentIntensity(): number',
        desc: '获取环境光强度值。',
        returns: 'number（默认 1）',
      },
      {
        name: 'setEnvironmentIntensity',
        signature: 'setEnvironmentIntensity(value: number, finished?: boolean): void',
        desc: '设置环境光强度。拖拽滑块时 finished=false，松开时 finished=true 以记录 Undo。',
        params: [
          { name: 'value', type: 'number', desc: '强度值' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整（用于 Undo 记录）', optional: true, default: 'false' },
        ],
      },
      {
        name: 'getEnvirmentRotation',
        signature: 'getEnvirmentRotation(): number',
        desc: '获取环境贴图旋转角度。',
        returns: 'number（默认 0）',
      },
      {
        name: 'setEnvirmentRotation',
        signature: 'setEnvirmentRotation(value: number, finished?: boolean): void',
        desc: '设置环境贴图旋转角度。支持拖拽防抖 Undo/Redo。',
        params: [
          { name: 'value', type: 'number', desc: '旋转角度' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'background',
    icon: <BgColorsOutlined />,
    title: '背景',
    desc: '控制场景背景：渐变色、背景图片、透明背景等。',
    methods: [
      {
        name: 'setBackground',
        signature: 'async setBackground(url: string): Promise<void>',
        desc: '通过 URL 设置背景图片。支持 Undo/Redo。',
        params: [
          { name: 'url', type: 'string', desc: '背景图片路径' },
        ],
      },
      {
        name: 'setBackgroundGradientType',
        signature: 'setBackgroundGradientType(gradientType: GradientType): void',
        desc: '设置背景渐变类型。支持 Undo/Redo。',
        params: [
          { name: 'gradientType', type: 'GradientType', desc: '渐变类型枚举值' },
        ],
      },
      {
        name: 'getBackgroundGradientType',
        signature: 'getBackgroundGradientType(): GradientType | undefined',
        desc: '获取当前背景渐变类型。',
        returns: 'GradientType | undefined',
      },
      {
        name: 'getBackgroundGradientAngle',
        signature: 'getBackgroundGradientAngle(): number | undefined',
        desc: '获取渐变角度。',
        returns: 'number | undefined',
      },
      {
        name: 'setBackgroundGradientAngle',
        signature: 'setBackgroundGradientAngle(value: number, finished?: boolean): void',
        desc: '设置渐变角度。支持拖拽防抖 Undo/Redo。',
        params: [
          { name: 'value', type: 'number', desc: '角度值' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
        ],
      },
      {
        name: 'getBackgroundStartColor',
        signature: 'getBackgroundStartColor(): string | undefined',
        desc: '获取渐变起始颜色（Hex 格式）。',
        returns: 'string | undefined',
      },
      {
        name: 'getBackgroundEndColor',
        signature: 'getBackgroundEndColor(): string | undefined',
        desc: '获取渐变结束颜色（Hex 格式）。',
        returns: 'string | undefined',
      },
      {
        name: 'setGradientColors',
        signature: 'setGradientColors(startColor: string, endColor: string, finished?: boolean, preview?: boolean): void',
        desc: '设置渐变颜色。preview=true 时仅预览不记录 Undo，preview=false 且 finished=true 时记录。',
        params: [
          { name: 'startColor', type: 'string', desc: '起始颜色（Hex）' },
          { name: 'endColor', type: 'string', desc: '结束颜色（Hex）' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
          { name: 'preview', type: 'boolean', desc: '是否为预览模式', optional: true, default: 'false' },
        ],
      },
      {
        name: 'setBackgroundImageURL',
        signature: 'async setBackgroundImageURL(path: string | null): Promise<void>',
        desc: '设置背景图片 URL。传 null 清除背景图。支持 Undo/Redo。',
        params: [
          { name: 'path', type: 'string | null', desc: '图片路径，null 清除' },
        ],
      },
      {
        name: 'getBackgroundImageURL',
        signature: 'getBackgroundImageURL(): string | undefined',
        desc: '获取当前背景图片 URL。',
        returns: 'string | undefined',
      },
      {
        name: 'setBackgroundTransparent',
        signature: 'setBackgroundTransparent(transparent: boolean): void',
        desc: '设置背景是否透明。支持 Undo/Redo。',
        params: [
          { name: 'transparent', type: 'boolean', desc: '是否透明' },
        ],
      },
      {
        name: 'getBackgroundTransparent',
        signature: 'getBackgroundTransparent(): boolean | undefined',
        desc: '获取当前背景是否透明。',
        returns: 'boolean | undefined',
      },
    ],
  },
  {
    id: 'scene-light',
    icon: <BulbOutlined />,
    title: '场景灯光',
    desc: '控制场景主灯光的亮度、阴影、角度、高度和颜色。',
    methods: [
      {
        name: 'getSceneLightPlugin',
        signature: 'getSceneLightPlugin(): SceneLightPlugin',
        desc: '获取场景灯光插件实例，用于直接访问灯光属性。',
        returns: 'SceneLightPlugin',
      },
      {
        name: 'setSceneLightBrightness',
        signature: 'setSceneLightBrightness(value: number, finished?: boolean): void',
        desc: '设置灯光亮度。支持拖拽防抖 Undo/Redo。',
        params: [
          { name: 'value', type: 'number', desc: '亮度值' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
        ],
      },
      {
        name: 'setSceneLightShadowDarkness',
        signature: 'setSceneLightShadowDarkness(value: number, finished?: boolean): void',
        desc: '设置阴影深度。',
        params: [
          { name: 'value', type: 'number', desc: '阴影深度值' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
        ],
      },
      {
        name: 'setSceneLightHeight',
        signature: 'setSceneLightHeight(value: number, finished?: boolean): void',
        desc: '设置灯光高度角度。',
        params: [
          { name: 'value', type: 'number', desc: '高度值' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
        ],
      },
      {
        name: 'setSceneLightAngle',
        signature: 'setSceneLightAngle(value: number, finished?: boolean): void',
        desc: '设置灯光水平角度。',
        params: [
          { name: 'value', type: 'number', desc: '角度值' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
        ],
      },
      {
        name: 'setSceneLightDiffuseColor',
        signature: 'setSceneLightDiffuseColor(value: string, finished?: boolean, preview?: boolean): void',
        desc: '设置灯光漫反射颜色。preview=true 仅预览，preview=false 时记录 Undo。',
        params: [
          { name: 'value', type: 'string', desc: '颜色值（Hex）' },
          { name: 'finished', type: 'boolean', desc: '是否完成调整', optional: true, default: 'false' },
          { name: 'preview', type: 'boolean', desc: '是否预览模式', optional: true, default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'scene-tree',
    icon: <ApartmentOutlined />,
    title: '场景树 & 选择',
    desc: '操作场景层级结构，获取和管理节点选择状态。',
    methods: [
      {
        name: 'getSceneTree',
        signature: 'getSceneTree(): TreeNode[] | undefined',
        desc: '获取场景层级树结构。返回树节点数组。',
        returns: 'TreeNode[] | undefined',
      },
      {
        name: 'dragSelectNodeToTargetNodes',
        signature: 'dragSelectNodeToTargetNodes(selectedNode: TreeNode, targetNode: TreeNode | null, asChild?: boolean, before?: boolean): void',
        desc: '拖拽节点到目标节点位置。用于场景树节点排序/嵌套。',
        params: [
          { name: 'selectedNode', type: 'TreeNode', desc: '被拖拽的节点' },
          { name: 'targetNode', type: 'TreeNode | null', desc: '目标节点，null 为根级' },
          { name: 'asChild', type: 'boolean', desc: '是否作为子节点插入', optional: true, default: 'true' },
          { name: 'before', type: 'boolean', desc: '是否插入到目标之前', optional: true, default: 'false' },
        ],
      },
      {
        name: 'getLastSelectedObject',
        signature: 'getLastSelectedObject(): any',
        desc: '获取最后一次选中的场景对象。',
        returns: 'any',
      },
    ],
  },
  {
    id: 'materials',
    icon: <FormatPainterOutlined />,
    title: '材质',
    desc: '材质查询、赋值、导出，以及从服务端/场景拖拽材质到模型。',
    methods: [
      {
        name: 'getMaterialUIById',
        signature: 'getMaterialUIById(materialId: string): void',
        desc: '通过材质 ID 获取材质属性面板配置并触发 selectedMaterial 事件。会高亮 PBR 材质。',
        params: [
          { name: 'materialId', type: 'string', desc: '材质 ID' },
        ],
      },
      {
        name: 'getAllMaterialImages',
        signature: 'getAllMaterialImages(): any',
        desc: '获取场景中所有材质的缩略图数据。',
        returns: '材质图片数据',
      },
      {
        name: 'setNodeMaterialById',
        signature: 'setNodeMaterialById(nodeId: string, materialId: string): void',
        desc: '将指定材质赋给指定节点。',
        params: [
          { name: 'nodeId', type: 'string', desc: '目标节点 ID' },
          { name: 'materialId', type: 'string', desc: '材质 ID' },
        ],
      },
      {
        name: 'getMaterialById',
        signature: 'getMaterialById(materialId: string): Material | undefined',
        desc: '通过 ID 获取材质实例。',
        params: [
          { name: 'materialId', type: 'string', desc: '材质 ID' },
        ],
        returns: 'Material | undefined',
      },
      {
        name: 'setMaterialFromServe',
        signature: 'async setMaterialFromServe(event: MouseEvent, data: string): Promise<void>',
        desc: '从服务端材质数据拖拽到画布，自动拾取目标 Mesh 并赋材质。支持 PBR 贴图加载和 Undo/Redo。',
        params: [
          { name: 'event', type: 'MouseEvent', desc: '鼠标事件（用于射线拾取）' },
          { name: 'data', type: 'string', desc: '材质 JSON 数据（含 materialPath、name）' },
        ],
      },
      {
        name: 'setMaterialFromScene',
        signature: 'setMaterialFromScene(event: MouseEvent, materialId: string): void',
        desc: '从场景已有材质拖拽到目标 Mesh。支持 Undo/Redo。',
        params: [
          { name: 'event', type: 'MouseEvent', desc: '鼠标事件' },
          { name: 'materialId', type: 'string', desc: '场景材质 ID' },
        ],
      },
      {
        name: 'exportMaterialZip',
        signature: 'async exportMaterialZip(material: Material): Promise<void>',
        desc: '将材质导出为 ZIP 文件（含贴图和配置 JSON），并下载。',
        params: [
          { name: 'material', type: 'Material', desc: '要导出的材质实例' },
        ],
      },
    ],
  },
  {
    id: 'transform',
    icon: <DragOutlined />,
    title: '变换工具',
    desc: '切换 Gizmo 模式（平移 / 旋转 / 缩放）。',
    methods: [
      {
        name: 'setTransformModel',
        signature: 'setTransformModel(model: "translate" | "scale" | "rotation"): void',
        desc: '切换当前变换工具类型。支持 Undo/Redo。',
        params: [
          { name: 'model', type: '"translate" | "scale" | "rotation"', desc: '变换模式' },
        ],
      },
    ],
  },
  {
    id: 'screenshot',
    icon: <PictureOutlined />,
    title: '截图 & 导出',
    desc: '截取 3D 视口画面或导出完整场景数据。',
    methods: [
      {
        name: 'screenShot',
        signature: 'async screenShot(download: boolean): Promise<string>',
        desc: '截取当前渲染画面。download=true 时自动下载为 model.png。',
        params: [
          { name: 'download', type: 'boolean', desc: '是否自动下载' },
        ],
        returns: 'Promise<string>（base64 DataURL）',
      },
      {
        name: 'getScreenShot',
        signature: 'async getScreenShot(transparent?: boolean, download?: boolean): Promise<string>',
        desc: '高级截图：可选透明背景。会等待渐进式渲染完成后再截图以保证画质。',
        params: [
          { name: 'transparent', type: 'boolean', desc: '是否使用透明背景', optional: true, default: 'false' },
          { name: 'download', type: 'boolean', desc: '是否自动下载', optional: true, default: 'false' },
        ],
        returns: 'Promise<string>（base64 DataURL）',
      },
      {
        name: 'getSceneData',
        signature: 'async getSceneData(): Promise<Blob>',
        desc: '导出当前场景为 GLB 二进制数据（model.rain 格式）。包含模型、材质、动画等完整场景信息。',
        returns: 'Promise<Blob>',
      },
    ],
  },
  {
    id: 'undo-redo',
    icon: <UndoOutlined />,
    title: '撤销 & 重做',
    desc: '操作历史管理，支持全局撤销和重做。',
    methods: [
      {
        name: 'undo',
        signature: 'undo(): void',
        desc: '撤销上一步操作。',
      },
      {
        name: 'redo',
        signature: 'redo(): void',
        desc: '重做上一步撤销的操作。',
      },
    ],
  },
  {
    id: 'ui-config',
    icon: <SettingOutlined />,
    title: 'UI 配置',
    desc: '获取各模块的属性面板配置（用于动态生成编辑 UI）。',
    methods: [
      {
        name: 'getPostProcessUIConfig',
        signature: 'getPostProcessUIConfig(): UiObjectConfig2 | undefined',
        desc: '获取后处理效果面板配置（Bloom、SSAO、色差等）。',
        returns: 'UiObjectConfig2 | undefined',
      },
      {
        name: 'getLightUIConfig',
        signature: 'getLightUIConfig(): UiObjectConfig2 | undefined',
        desc: '获取灯光面板配置。',
        returns: 'UiObjectConfig2 | undefined',
      },
      {
        name: 'getBaseObjectGeneratorUIConfig',
        signature: 'getBaseObjectGeneratorUIConfig(): UiObjectConfig2 | undefined',
        desc: '获取基础物体生成器面板配置。',
        returns: 'UiObjectConfig2 | undefined',
      },
      {
        name: 'getEditorUiConfig',
        signature: 'getEditorUiConfig(design?: boolean): UiObjectConfig2 | undefined',
        desc: '获取编辑器通用 UI 面板配置。',
        params: [
          { name: 'design', type: 'boolean', desc: '是否为设计模式', optional: true, default: 'false' },
        ],
        returns: 'UiObjectConfig2 | undefined',
      },
    ],
  },
  {
    id: 'other',
    icon: <CodeOutlined />,
    title: '其他',
    desc: '硬件缩放、地面网格等辅助功能。',
    methods: [
      {
        name: 'setHardwareScalingLevel',
        signature: 'setHardwareScalingLevel(value: number): void',
        desc: '设置渲染分辨率缩放级别。值越小分辨率越高（1 = 原始分辨率，2 = 半分辨率）。',
        params: [
          { name: 'value', type: 'number', desc: '缩放级别' },
        ],
      },
      {
        name: 'showGroundGride',
        signature: 'showGroundGride(show: boolean): void',
        desc: '显示或隐藏地面参考网格。',
        params: [
          { name: 'show', type: 'boolean', desc: '是否显示' },
        ],
      },
    ],
  },
]

/* ──────────── Component ──────────── */
const tocItems = [
  { id: 'editor-options', title: 'EditorOptions' },
  ...sections.map((s) => ({ id: s.id, title: s.title })),
  { id: 'events', title: '事件列表' },
]

const APIDocs = () => {
  const [activeId, setActiveId] = useState<string>('')

  const scrollTo = useCallback((id: string) => {
    setActiveId(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className={styles.container}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Editor API</h1>
          <p className={styles.subtitle}>
            Editor 是 3D 编辑器的核心类，继承自 EventDispatcher。通过插件架构集成了模型加载、材质管理、灯光控制、后处理、截图导出等全部功能。全局单例通过 <code className={styles.inlineCode}>Editor.instance</code> 访问。
          </p>
        </div>
      </section>

      <div className={styles.layout}>
        {/* Sidebar TOC */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSticky}>
            <div className={styles.sidebarTitle}>API 目录</div>
            <ul className={styles.tocList}>
              {tocItems.map((item) => (
                <li
                  key={item.id}
                  className={`${styles.tocItem} ${activeId === item.id ? styles.tocItemActive : ''}`}
                  onClick={() => scrollTo(item.id)}
                >
                  {item.title}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {/* EditorOptions */}
          <section id="editor-options" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}><CodeOutlined /></div>
              <div>
                <h2 className={styles.sectionTitle}>EditorOptions</h2>
                <p className={styles.sectionDesc}>构造 Editor 时传入的配置接口。</p>
              </div>
            </div>
            <div className={styles.codeBlock}>
              <pre>{`interface EditorOptions {
  canvas: HTMLCanvasElement;    // 渲染画布
  cdnBaseUrl?: string;          // CDN 基础路径
}`}</pre>
            </div>
          </section>

          {/* API Sections */}
          {sections.map((sec) => (
            <section key={sec.id} id={sec.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>{sec.icon}</div>
                <div>
                  <h2 className={styles.sectionTitle}>{sec.title}</h2>
                  <p className={styles.sectionDesc}>{sec.desc}</p>
                </div>
              </div>

              {sec.methods.map((m) => (
                <div key={m.name} className={styles.methodCard}>
                  <div className={styles.methodName}>{m.name}</div>
                  <div className={styles.methodSignature}>
                    <code>{m.signature}</code>
                  </div>
                  <p className={styles.methodDesc}>{m.desc}</p>

                  {m.params && m.params.length > 0 && (
                    <div className={styles.paramTable}>
                      <div className={styles.paramHeader}>
                        <span>参数</span>
                        <span>类型</span>
                        <span>说明</span>
                      </div>
                      {m.params.map((p) => (
                        <div key={p.name} className={styles.paramRow}>
                          <span className={styles.paramName}>
                            {p.name}
                            {p.optional && <span className={styles.paramOptional}>?</span>}
                          </span>
                          <span className={styles.paramType}>{p.type}</span>
                          <span className={styles.paramDesc}>
                            {p.desc}
                            {p.default && <span className={styles.paramDefault}>默认: {p.default}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.returns && (
                    <div className={styles.returnInfo}>
                      <span className={styles.returnLabel}>返回值</span>
                      <code className={styles.returnType}>{m.returns}</code>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}

          {/* Events */}
          <section id="events" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}><RocketOutlined /></div>
              <div>
                <h2 className={styles.sectionTitle}>事件列表</h2>
                <p className={styles.sectionDesc}>
                  Editor 继承自 EventDispatcher，使用 <code className={styles.inlineCode}>addEventListener(type, callback)</code> 监听以下事件。
                </p>
              </div>
            </div>

            {events.map((e) => (
              <div key={e.name} className={styles.methodCard}>
                <div className={styles.methodName}>{e.name}</div>
                <p className={styles.methodDesc}>{e.desc}</p>
                {e.payload && (
                  <div className={styles.returnInfo}>
                    <span className={styles.returnLabel}>Payload</span>
                    <code className={styles.returnType}>{e.payload}</code>
                  </div>
                )}
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}

export default APIDocs
