import styles from './renderCanvas.module.less';

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Editor3D,
    EditorOptions
} from "/@/3D/Editor";
import { connect } from 'react-redux';
import queryString from 'query-string';
import { message, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import { updateEditorStatus, updateSceneSelected, updateCurrentDesign, updateCurrentTemplate, updateCurrentPreset, updateUserSubscription } from '/@/redux/modules/editor/action';
import { getDesign } from '/@/api/local'
import { getTemplate } from '/@/api/local/templates'
import { getPreset } from '/@/api/local/presets'
import { getCurrentSubscription } from '/@/api/local/subscriptions'
import { needsConversion, isFormatSupported, convertToGlb } from '/@/utils/modelConverter'
import { importFromRemoteZip, resolveAIConfigImages } from '/@/utils/file'
import type { EditorMode } from '/@/redux/interface'

// 更新全局 loading message
const updateGlobalLoadingMessage = (message: string) => {
    const el = document.getElementById('loading-message');
    if (el) el.textContent = message;
};

// 移除全局 loading
const removeGlobalLoading = () => {
    const el = document.getElementById('global-loading');
    if (el) {
        el.style.transition = 'opacity 0.3s ease-out';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }
};

const RenderCanvas = (props: any) => {
    const { updateEditorStatus, updateSceneSelected, updateCurrentDesign, updateCurrentTemplate, updateCurrentPreset, updateUserSubscription, isDesignMode, editorMode } = props;
    const canvasElement = useRef<HTMLCanvasElement>(null);
    const [editor, setEditor] = useState<Editor3D | null>(null)
    const [isPageReady, setIsPageReady] = useState(false);
    const isInitialized = useRef(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [modelLoadingText, setModelLoadingText] = useState('');

    const onModelSelected = useCallback((data: any) => {

        updateSceneSelected(data.config);
    }, [])

    useEffect(() => {
        // 组件挂载后立即开始初始化，不再等待页面所有资源加载完成
        // 这样可以更快地开始加载模型
        setIsPageReady(true);
    }, []);

    useEffect(() => {
        if (!isPageReady || !canvasElement?.current || isInitialized.current) return;

        const createEditor = async () => {
            const values = queryString.parse(window.location.search);

            // 获取 URL 参数中的各种 ID
            const designId = values.designId as string | undefined;
            const templateId = values.templateId as string | undefined;
            const presetId = values.presetId as string | undefined;

            // 从 URL 参数或 Redux 获取当前模式
            const mode = (values.mode as EditorMode) || editorMode || 'design';

            let modelUrl = "";
            let environmentUrl = "";
            let aiconfigUrl = "";
            let loadedDesign: any = null;
            // 根据编辑器模式获取对应的数据
            // 远程 ZIP 模板加载标记
            let remoteZipTemplate: any = null;
            // 产品元信息（加载模板时收集，init 后写入 Editor3D）
            let pendingProductMeta: any = null;

            if (mode === 'template' && templateId) {
                // 模板模式：获取模板信息
                updateGlobalLoadingMessage("获取模板信息...");
                const t1 = performance.now();
                try {
                    const template = await getTemplate(templateId);
                    updateCurrentTemplate(template);
                    pendingProductMeta = {
                        id: template.id,
                        name: template.name,
                        description: template.description || '',
                        category: template.category,
                        category_name: (template as any).category_name || '',
                    };
                    if ((template as any).zip_url) {
                        remoteZipTemplate = template;
                    } else if ((template as any).model_url) {
                        modelUrl = (template as any).model_url;
                    }
                    if ((template as any).environment_url) {
                        environmentUrl = (template as any).environment_url;
                    }
                    if ((template as any).aiconfig_url) {
                        aiconfigUrl = (template as any).aiconfig_url;
                    }
                } catch (error) {
                    console.error('Failed to load template:', error);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('templateId');
                    window.history.replaceState({}, '', url.toString());
                }
            } else if (mode === 'preset' && presetId) {
                // 预设模式：获取预设信息
                updateGlobalLoadingMessage("获取预设信息...");
                try {
                    const preset = await getPreset(presetId);
                    updateCurrentPreset(preset);
                    // 如果预设有 model_url 则加载
                    if (preset.model_url) {
                        modelUrl = preset.model_url;
                    }
                } catch (error) {
                    console.error('Failed to load preset:', error);
                    // 预设不存在，清除 URL 中的 presetId
                    const url = new URL(window.location.href);
                    url.searchParams.delete('presetId');
                    window.history.replaceState({}, '', url.toString());
                }
            } else if (mode === 'design' && !designId && templateId) {
                // 延迟创建模式：从模板开始设计，但尚未创建 design 记录
                updateGlobalLoadingMessage("获取模板信息...");
                try {
                    const template = await getTemplate(templateId);
                    pendingProductMeta = {
                        id: template.id,
                        name: template.name,
                        description: template.description || '',
                        category: template.category,
                        category_name: (template as any).category_name || '',
                    };
                    if ((template as any).zip_url) {
                        remoteZipTemplate = template;
                    } else if ((template as any).model_url) {
                        modelUrl = (template as any).model_url;
                    }
                    if ((template as any).environment_url) {
                        environmentUrl = (template as any).environment_url;
                    }
                    if ((template as any).aiconfig_url) {
                        aiconfigUrl = (template as any).aiconfig_url;
                    }
                } catch (error) {
                    console.error('Failed to load template:', error);
                }
            } else if (designId) {
                // 设计模式：获取设计信息
                updateGlobalLoadingMessage("获取设计信息...");
                try {
                    const design = await getDesign(designId);
                    loadedDesign = design;
                    updateCurrentDesign(design);
                    // 如果产品信息带有模型url地址则设置modelUrl
                    if (design.model_url) {
                        modelUrl = design.model_url;
                    }
                    if (design.aiconfig_url) {
                        aiconfigUrl = design.aiconfig_url;
                    }
                } catch (error) {
                    console.error('Failed to load design:', error);
                }
            }

            let options: EditorOptions = {};
            if (modelUrl) {
                options.modelUrl = modelUrl;
                updateGlobalLoadingMessage("下载模型文件...");
            }

            if (isDesignMode) {
                options.isDesignModel = true;
            }

            if (isInitialized.current) return;
            updateGlobalLoadingMessage("初始化 3D 引擎...");
            const t2 = performance.now();
            let editor = new Editor3D(canvasElement.current!, options);

            if (modelUrl) {
                updateGlobalLoadingMessage("加载模型中，请稍候...");
            }
            const t3 = performance.now();

            await editor.init();

            // CDN 模板环境球：在模型加载之前先加载环境球
            if (environmentUrl && !remoteZipTemplate) {
                updateGlobalLoadingMessage("加载环境球...");
                try {
                    await editor.setEnvirment(environmentUrl);
                } catch (e) {
                    console.warn('Failed to load environment:', e);
                }
            }

            // CDN 资源：尝试加载 aiconfig.json（非 ZIP 路径）
            if (aiconfigUrl && !remoteZipTemplate) {
                try {
                    const resp = await fetch(aiconfigUrl);
                    if (resp.ok) {
                        const rawAiConfig = await resp.json();
                        if (rawAiConfig) {
                            // 将 aiconfig.json 中的相对图片路径还原为 data URL
                            const baseUrl = aiconfigUrl.substring(0, aiconfigUrl.lastIndexOf('/'));
                            const aiConfig = await resolveAIConfigImages(rawAiConfig, baseUrl);
                            editor.saveSelectedMaterialAIConfig(aiConfig);
                            console.log('[RenderCanvas] AIConfig loaded from CDN');
                        }
                    }
                } catch (e) {
                    // aiconfig.json 不存在或解析失败，忽略即可
                    console.log('[RenderCanvas] No aiconfig.json found, skipping');
                }
            }

            // 远程 ZIP 模板：下载并加载模型+AIConfig+环境球
            if (remoteZipTemplate?.zip_url) {
                updateGlobalLoadingMessage("下载远程模板...");
                try {
                    const { modelBlob, aiConfig, envBlob, config } = await importFromRemoteZip(remoteZipTemplate.zip_url);
                    const modelFile = new File([modelBlob], 'model.rain', { type: 'application/octet-stream' });
                    updateGlobalLoadingMessage("加载模型中...");
                    await editor.editor.loadModel(modelFile, {});
                    if (aiConfig) {
                        editor.saveSelectedMaterialAIConfig(aiConfig);
                    }
                    if (envBlob && config?.environment) {
                        const ext = config.environment.split('.').pop() || 'env';
                        const envObjectUrl = URL.createObjectURL(envBlob);
                        await editor.setEnvirment(envObjectUrl + '#envirment.' + ext);
                    }
                    editor.dispatchEvent({ type: 'modelLoaded' });
                } catch (error) {
                    console.error('Failed to load remote ZIP template:', error);
                }
            }

            // 初始化产品元信息
            if (pendingProductMeta) {
                editor.setProductMeta(pendingProductMeta);
            }

            removeGlobalLoading();
            setEditor(editor);
            updateEditorStatus(true)
            editor.addEventListener("selectedModel", onModelSelected);
            editor.addEventListener("selectedMaterial", onModelSelected);
            isInitialized.current = true;

            // Load subscription info
            getCurrentSubscription()
                .then((sub) => updateUserSubscription(sub))
                .catch((err) => console.warn('[Subscription] Failed to load:', err));
        }

        createEditor();

        return () => {
            if (editor) {
                editor.removeEventListener("selectedModel", onModelSelected)
                editor.removeEventListener("selectedMaterial", onModelSelected)
                editor.dispose()
                isInitialized.current = false;
            }
        }
    }, [isPageReady, isDesignMode, editorMode])

    const onDrop = useCallback((ev: any) => {
        if (ev) {
            ev.preventDefault()
            let serviceMaterialData = ev.dataTransfer.getData("serviceMaterialData");
            if (serviceMaterialData) {
                //material from service

                Editor3D.instance?.setMaterialFromServe(ev, serviceMaterialData)

            }
            let materialId = ev.dataTransfer.getData("materialId");
            if (materialId) {
                //material from scene
                Editor3D.instance?.setMaterialFromScene(ev, materialId)
            }

            // Handle background image drop
            let backgroundImageData = ev.dataTransfer.getData("backgroundImageData");
            if (backgroundImageData) {
                try {
                    const data = JSON.parse(backgroundImageData);
                    if (data.imageUrl) {
                        // 显示 loading 提示并异步设置背景图
                        const hideLoading = message.loading('正在设置背景图...', 0);
                        (async () => {
                            try {
                                await Editor3D.instance?.setBackgroundImageURL(data.imageUrl);
                                message.success('背景图设置成功');
                            } catch (err) {
                                console.error('[RenderCanvas] Failed to set background image:', err);
                                message.error('背景图设置失败');
                            } finally {
                                hideLoading();
                            }
                        })();
                    }
                } catch (err) {
                    console.error('[RenderCanvas] Failed to parse background image data:', err);
                }
            }

            // Handle environment map drop
            let environmentMapData = ev.dataTransfer.getData("environmentMapData");
            if (environmentMapData) {
                try {
                    const data = JSON.parse(environmentMapData);
                    if (data.hdrUrl) {
                        // 显示 loading 提示并异步设置环境球
                        const hideLoading = message.loading('正在设置环境球...', 0);
                        (async () => {
                            try {
                                await Editor3D.instance?.setEnvirment(data.hdrUrl);
                                message.success('环境球设置成功');
                            } catch (err) {
                                console.error('[RenderCanvas] Failed to set environment map:', err);
                                message.error('环境球设置失败');
                            } finally {
                                hideLoading();
                            }
                        })();
                    }
                } catch (err) {
                    console.error('[RenderCanvas] Failed to parse environment map data:', err);
                }
            }

            // Handle model file drop from file system
            const files = ev.dataTransfer.files;
            if (files && files.length > 0 && !serviceMaterialData && !materialId && !backgroundImageData && !environmentMapData) {
                const file = files[0] as File;
                if (isFormatSupported(file) && Editor3D.instance) {
                    setModelLoading(true);
                    let cleanupFn: (() => void) | null = null;
                    (async () => {
                        try {
                            if (needsConversion(file)) {
                                setModelLoadingText('正在转换模型格式...');
                                const { url, cleanup } = await convertToGlb([file]);
                                cleanupFn = cleanup;
                                setModelLoadingText('正在加载模型...');
                                await Editor3D.instance!.loadModel(url);
                            } else {
                                setModelLoadingText('正在加载模型...');
                                await Editor3D.instance!.editor.loadModel(file, {});
                            }
                            Editor3D.instance!.dispatchEvent({ type: 'modelLoaded' });
                            message.success(`模型加载成功: ${file.name}`);
                        } catch (error: any) {
                            console.error('[RenderCanvas] Failed to load dropped model:', error);
                            message.error(error.message || '模型加载失败');
                        } finally {
                            cleanupFn?.();
                            setModelLoading(false);
                            setModelLoadingText('');
                        }
                    })();
                }
            }
        }

    }, [])
    return (
        <div className={styles.RenderCanvasContainer}>
            <canvas onDragOver={(event) => {
                event.preventDefault()
            }}
                onDrop={onDrop} className={styles.renderCanvas} id="renderCanvas" ref={canvasElement}></canvas>
            {modelLoading && (
                <div className={styles.modelLoadingOverlay}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#ff8a00' }} spin />} />
                    <span className={styles.modelLoadingText}>{modelLoadingText}</span>
                </div>
            )}
        </div>
    )
}

export default connect((state: any) => state.editor, { updateEditorStatus, updateSceneSelected, updateCurrentDesign, updateCurrentTemplate, updateCurrentPreset, updateUserSubscription })(RenderCanvas)