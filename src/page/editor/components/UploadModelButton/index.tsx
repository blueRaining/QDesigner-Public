import React, { useState } from 'react';
import { Button, Modal, Upload, message, Spin } from 'antd';
import { CloudUploadOutlined, InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import { Editor3D } from '/@/3D/Editor';
import { needsConversion, isFormatSupported, convertToGlb, SUPPORTED_EXTENSIONS } from '/@/utils/modelConverter';
import { importFromZip } from '/@/utils/file';
import './index.less';

const { Dragger } = Upload;

const ACCEPT_EXTENSIONS = SUPPORTED_EXTENSIONS.map(ext => `.${ext}`).join(',');
const DISPLAY_FORMATS = 'glb / gltf / fbx / obj / stl / 3ds / 3dm / zip';

const UploadModelButton: React.FC = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');

    /**
     * 检测 ZIP 是否为 QDesigner 导出文件（包含 model.rain）
     */
    const isQDesignerZip = async (file: File): Promise<boolean> => {
        const JSZip = (window as any).JSZip;
        if (!JSZip) return false;
        try {
            const zip = await new JSZip().loadAsync(file);
            return !!zip.file('model.rain');
        } catch {
            return false;
        }
    };

    const handleBeforeUpload = async (file: File) => {
        if (!isFormatSupported(file)) {
            message.error(`不支持的文件格式，支持: ${DISPLAY_FORMATS}`);
            return Upload.LIST_IGNORE;
        }

        if (!Editor3D.instance) {
            message.error('编辑器未初始化');
            return Upload.LIST_IGNORE;
        }

        setLoading(true);
        let cleanupFn: (() => void) | null = null;

        try {
            // 判断是否为 QDesigner 导出的 ZIP（包含 model.rain + aiconfig）
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'zip' && await isQDesignerZip(file)) {
                // QDesigner ZIP 导入流程
                setStatusText('正在解析 ZIP...');
                const { modelBlob, aiConfig, envBlob, config } = await importFromZip(file);

                const modelFile = new File([modelBlob], 'model.rain', { type: 'application/octet-stream' });

                setStatusText('正在加载模型...');
                await Editor3D.instance.editor.loadModel(modelFile, {});

       

                // 恢复环境球
                if (envBlob) {
                    setStatusText('正在恢复环境球...');
                    const envObjectUrl = URL.createObjectURL(envBlob);
                    const ext = config?.environment?.split('.').pop() || 'env';
                    await Editor3D.instance.setEnvirment(envObjectUrl + '#envirment.' + ext);
                }

                // 恢复产品元信息
                if (config) {
                    Editor3D.instance.setProductMeta({
                        id: config.id || '',
                        name: config.name || '',
                        description: config.description || '',
                        category: config.category || '',
                        category_name: config.category_name || '',
                    });
                }

                Editor3D.instance.dispatchEvent({ type: 'modelLoaded' });
                message.success('导入成功');
            } else if (needsConversion(file)) {
                // 非 glb/rain 格式，先转换为 glb
                setStatusText('正在转换格式...');
                const { url, cleanup } = await convertToGlb([file]);
                cleanupFn = cleanup;

                setStatusText('正在加载模型...');
                await Editor3D.instance.loadModel(url);

                Editor3D.instance.dispatchEvent({ type: 'modelLoaded' });
                message.success(`模型 "${file.name}" 加载成功`);
            } else {
                // glb/rain 直接加载
                setStatusText('正在加载模型...');
                await Editor3D.instance.editor.loadModel(file, {});

                Editor3D.instance.dispatchEvent({ type: 'modelLoaded' });
                message.success(`模型 "${file.name}" 加载成功`);
            }

            setModalOpen(false);
        } catch (error: any) {
            console.error('Failed to load model:', error);
            message.error(error.message || '模型加载失败');
        } finally {
            // 清理 blob URL
            cleanupFn?.();
            setLoading(false);
            setStatusText('');
        }

        return Upload.LIST_IGNORE;
    };

    return (
        <>
            <Button
                type="text"
                icon={<CloudUploadOutlined />}
                onClick={() => setModalOpen(true)}
                className="upload-model-btn"
            >
                {'上传模型'}
            </Button>
            <Modal
                title={'上传模型'}
                open={modalOpen}
                onCancel={() => !loading && setModalOpen(false)}
                footer={null}
                destroyOnClose
                centered
                width={720}
                closable={!loading}
                maskClosable={!loading}
                className="upload-model-modal"
            >
                <Dragger
                    accept={ACCEPT_EXTENSIONS}
                    multiple={false}
                    showUploadList={false}
                    beforeUpload={handleBeforeUpload}
                    disabled={loading}
                    className="upload-model-dragger"
                >
                    <p className="ant-upload-drag-icon">
                        {loading
                            ? <Spin indicator={<LoadingOutlined style={{ fontSize: 72, color: '#ff9a3c' }} spin />} />
                            : <InboxOutlined />
                        }
                    </p>
                    <p className="ant-upload-text">
                        {loading ? (statusText || '处理中...') : '将模型文件拖拽到此区域，或点击上传'}
                    </p>
                    {!loading && (
                        <p className="ant-upload-hint">
                            {`支持 ${DISPLAY_FORMATS} 格式`}
                        </p>
                    )}
                </Dragger>
            </Modal>
        </>
    );
};

export default UploadModelButton;
