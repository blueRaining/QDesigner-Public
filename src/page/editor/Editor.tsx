import React, { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { ConfigProvider, Layout, theme, message } from 'antd'
import LayoutHeader from './components/header'
import RenderCanvas from "./components/RenderCanvas"
import './index.less'
import RightSider from './components/RightSider'
import ToolsBar from "./components/ToolsBar"
import EditorSidebar from "./components/EditorSidebar"
import SaveMaterialModal from "./components/SaveMaterialModal"
import UVShowInline from "./components/UVShow/UVShowInline"
import { Editor3D } from '/@/3D/Editor'
import { updateEditorMode, updateHasUnsavedChanges } from '/@/redux/modules/editor/action'
import type { EditorMode, ActiveView } from '/@/redux/interface'

const { Content } = Layout

interface MaterialExportData {
    materialData: any;
    thumbImageData: {
        name: string;
        data: Blob;
    } | null;
    imageData: Map<string, Blob>;
}

// 布局常量
const LEFT_SIDEBAR_WIDTH = 70
const HEADER_MIN = 48
const HEADER_MAX = 72
const RIGHT_PANEL_MIN = 280
const RIGHT_PANEL_MAX = 400

// 计算保持 16:9 的布局
const calculateLayout = (viewportW: number, viewportH: number) => {
    // 1. 先用默认 header 高度计算
    let headerH = 48
    let canvasH = viewportH - headerH
    let canvasW = canvasH * 16 / 9
    let rightW = viewportW - LEFT_SIDEBAR_WIDTH - canvasW

    // 2. 如果右侧面板太窄，调整
    if (rightW < RIGHT_PANEL_MIN) {
        rightW = RIGHT_PANEL_MIN
        canvasW = viewportW - LEFT_SIDEBAR_WIDTH - rightW
        canvasH = canvasW * 9 / 16
        headerH = viewportH - canvasH
    }

    // 3. 如果右侧面板太宽，限制最大值
    if (rightW > RIGHT_PANEL_MAX) {
        rightW = RIGHT_PANEL_MAX
        canvasW = viewportW - LEFT_SIDEBAR_WIDTH - rightW
        canvasH = canvasW * 9 / 16
        headerH = viewportH - canvasH
    }

    // 4. 约束 header 高度在合理范围
    headerH = Math.max(HEADER_MIN, Math.min(HEADER_MAX, headerH))

    // 5. 重新计算 canvas 尺寸
    canvasH = viewportH - headerH
    canvasW = canvasH * 16 / 9

    // 确保 canvas 不超出可用宽度
    const maxCanvasW = viewportW - LEFT_SIDEBAR_WIDTH - RIGHT_PANEL_MIN
    if (canvasW > maxCanvasW) {
        canvasW = maxCanvasW
        canvasH = canvasW * 9 / 16
    }

    rightW = viewportW - LEFT_SIDEBAR_WIDTH - canvasW

    return {
        headerHeight: Math.round(headerH),
        rightPanelWidth: Math.round(rightW),
        canvasWidth: Math.round(canvasW),
        canvasHeight: Math.round(canvasH)
    }
}

/**
 * Editor 页面 - 主编辑器
 * 布局：
 * - 中间：RenderCanvas 铺满
 * - 底部：EditorSidebar（tab式资源管理，包含场景树）
 * - 底部中央悬浮：ToolsBar（工具栏）
 * - 右侧：RightSider（属性面板）
 */
const Editor: React.FC = () => {
    const dispatch = useDispatch();
    const hasUnsavedChanges = useSelector((state: any) => state.editor.hasUnsavedChanges);
    const editorInit = useSelector((state: any) => state.editor.editorInit);
    const activeView = useSelector((state: any) => state.editor.activeView) as ActiveView;
    const isUVShowView = activeView === 'uvshow';

    // 动态布局状态
    const [layout, setLayout] = useState(() => calculateLayout(window.innerWidth, window.innerHeight));

    // 材质保存弹窗状态
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [exportedMaterialData, setExportedMaterialData] = useState<MaterialExportData | null>(null);

    // 监听窗口大小变化
    const handleResize = useCallback(() => {
        setLayout(calculateLayout(window.innerWidth, window.innerHeight));
    }, []);

    // Handle export complete event from Editor3D
    const handleExportComplete = useCallback((event: any) => {
        const detail = event.detail;

        // If detail is null, don't upload
        if (!detail) {
            message.info('没有可导出的材质数据');
            return;
        }

        setExportedMaterialData(detail);
        setSaveModalVisible(true);
    }, []);

    // Handle save modal success
    const handleSaveSuccess = useCallback(() => {
        setSaveModalVisible(false);
        setExportedMaterialData(null);
        message.success('材质保存成功');
    }, []);

    // Handle save modal cancel
    const handleSaveCancel = useCallback(() => {
        setSaveModalVisible(false);
        setExportedMaterialData(null);
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    // 监听材质导出事件
    useEffect(() => {
        if (editorInit && Editor3D.instance) {
            Editor3D.instance.addEventListener("endExportMaterial", handleExportComplete);
        }

        return () => {
            if (Editor3D.instance) {
                Editor3D.instance.removeEventListener("endExportMaterial", handleExportComplete);
            }
        };
    }, [editorInit, handleExportComplete]);

    // 从 URL 参数初始化 editorMode 和 hasUnsavedChanges
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode') as EditorMode | null;
        const templateId = params.get('templateId');
        const presetId = params.get('presetId');

        if (mode === 'design') {
            // 明确指定 design 模式（包括延迟创建：templateId + mode=design）
            dispatch(updateEditorMode('design'));
        } else if (mode === 'template' || mode === 'preset') {
            dispatch(updateEditorMode(mode));
            // 如果是新建模式（没有 ID），标记为有未保存的更改
            if (mode === 'template' && !templateId) {
                dispatch(updateHasUnsavedChanges(true));
            } else if (mode === 'preset' && !presetId) {
                dispatch(updateHasUnsavedChanges(true));
            }
        } else if (templateId) {
            dispatch(updateEditorMode('template'));
        } else if (presetId) {
            dispatch(updateEditorMode('preset'));
        } else {
            dispatch(updateEditorMode('design'));
        }
    }, [dispatch]);

    // beforeunload 监听：如果有未保存的更改，提示用户
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                // 现代浏览器会显示标准提示，忽略自定义消息
                e.returnValue = '您有未保存的更改，确定要离开吗？';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    return (
        <ConfigProvider theme={{
            algorithm: theme.darkAlgorithm,
            token: {
                colorPrimary: "#ff8a00",
                colorInfo: "#ff8a00",
                colorLink: "#ffb000",
                colorBgLayout: "#0b0b0d",
                colorBgContainer: "#121214",
                colorBorder: "#2a2a32",
            },
            components: {
                Tree: {
                    nodeHoverBg: "rgba(255,138,0,0.18)",
                    nodeSelectedBg: "rgba(255,138,0,0.28)",
                    directoryNodeSelectedBg: "rgba(255,138,0,0.28)",
                }
            }
        }}>
            <Layout className="editorThemeScope editorPage" style={{ height: '100vh' }}>
                <LayoutHeader style={{ height: layout.headerHeight, minHeight: layout.headerHeight }} />

                {/* Editor 视图 - 使用 display:none 隐藏，保持 canvas 挂载 */}
                <Layout style={{
                    flex: 1,
                    overflow: 'hidden',
                    flexDirection: 'row',
                    display: isUVShowView ? 'none' : 'flex'
                }}>
                    {/* 渲染区域 - 16:9 比例 */}
                    <Content className="editorCanvasArea" style={{
                        width: layout.canvasWidth,
                        height: layout.canvasHeight,
                        position: 'relative',
                        flexShrink: 0
                    }}>
                        <RenderCanvas></RenderCanvas>
                        {/* 左侧资源导航栏 - 浮动在 canvas 上 */}
                        <EditorSidebar />
                        {/* 底部工具栏 - 悬浮在 canvas 上 */}
                        <ToolsBar />
                    </Content>

                    {/* 右侧属性面板 - 固定宽度 */}
                    <div className="rightSider editorRightSider" style={{ width: layout.rightPanelWidth }}>
                        <RightSider></RightSider>
                    </div>
                </Layout>

                {/* UVShow 视图 */}
                {isUVShowView && <UVShowInline />}
            </Layout>

            {/* 材质保存弹窗 */}
            <SaveMaterialModal
                visible={saveModalVisible}
                onCancel={handleSaveCancel}
                onSuccess={handleSaveSuccess}
                materialData={exportedMaterialData}
            />
        </ConfigProvider>
    )
}

export default Editor
