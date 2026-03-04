import React, { useState } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { Editor3D } from '/@/3D/Editor';
import { downloadAsZip } from '/@/utils/file';
import './index.less';

const SaveButton: React.FC = () => {
    const [saving, setSaving] = useState(false);

    // 缩放图片：宽度设置为512，高度按比例缩放
    const scaleImageDataUrl = async (dataUrl: string, targetWidth: number = 512): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const targetHeight = Math.round((targetWidth / img.naturalWidth) * img.naturalHeight);
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    };

    const handleDownload = async () => {
        if (!Editor3D.instance) {
            message.error('编辑器未初始化');
            return;
        }

        setSaving(true);

        try {
            // 并行获取场景数据和截图
            const [sceneDataBlob, screenshotDataUrl] = await Promise.all([
                Editor3D.instance.getSceneData(),
                Editor3D.instance.getScreenShot(false),
            ]);

            if (!sceneDataBlob) {
                message.warning('没有可下载的场景数据');
                return;
            }

            // 获取 AIConfig
            const designData = Editor3D.instance.getDesignData();
            const aiConfig = designData?.aiConfig || null;

            // 缩放缩略图
            let thumbnailDataUrl: string | null = null;
            if (screenshotDataUrl) {
                thumbnailDataUrl = await scaleImageDataUrl(screenshotDataUrl, 512);
            }

            // 获取环境球信息
            const envUrl = Editor3D.instance.getCurrentEnvUrl();
            const envFileType = Editor3D.instance.getCurrentEnvFileType();

            // 产品元信息（从 Editor3D 读取，模板和设计通用）
            const metadata = Editor3D.instance.getProductMeta();

            // 打包下载
            await downloadAsZip(sceneDataBlob, aiConfig, thumbnailDataUrl, envUrl, envFileType, metadata);
            message.success('下载成功');
        } catch (error: any) {
            console.error('Download failed:', error);
            message.error(error.message || '下载失败');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="save-button-group">
            <Button
                type="primary"
                icon={saving ? <LoadingOutlined /> : <DownloadOutlined />}
                onClick={handleDownload}
                disabled={saving}
                className="save-design-btn"
            >
                {saving ? '打包中...' : '下载'}
            </Button>
        </div>
    );
};

export default SaveButton;
