import { useState, useEffect, useRef, useCallback, ReactElement } from 'react';
import { Modal, Tabs, Image } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { Viewer3D } from '/@/page/preview/3D/Preview';
import { getDesign } from '/@/api/local/designs';
import { getTemplate } from '/@/api/local/templates';
import { importFromRemoteZip } from '/@/utils/file';

import styles from './PreviewModal.module.less';

interface PreviewModalProps {
  open: boolean;
  templateId?: string;
  designId?: string;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ open, templateId, designId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [interactiveElement, setInteractiveElement] = useState<ReactElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer3D | null>(null);

  const isMobile = useCallback(() => {
    const ua = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(ua) || window.innerWidth <= 768;
  }, []);

  useEffect(() => {
    if (!open) return;

    let disposed = false;
    let blobUrlToRevoke: string | null = null;

    const initViewer = async () => {
      // Wait for canvas to mount
      await new Promise((r) => setTimeout(r, 100));
      if (disposed || !canvasRef.current) return;

      let modelUrl = '';
      let environmentUrl: string | undefined;

      if (designId) {
        try {
          const design = await getDesign(designId);
          if (design.model_url) modelUrl = design.model_url;
          if ((design as any).environment_url) environmentUrl = (design as any).environment_url;
        } catch (e) {
          console.error('Failed to load design:', e);
        }
      }

      if (!modelUrl && templateId) {
        try {
          const template = await getTemplate(templateId);
          if ((template as any).zip_url) {
            // 远程 ZIP 模板：下载并提取模型
            const { modelBlob } = await importFromRemoteZip((template as any).zip_url);
            modelUrl = URL.createObjectURL(modelBlob);
            blobUrlToRevoke = modelUrl;
          } else if (template.model_url) {
            modelUrl = template.model_url;
          }
          // 获取环境球路径
          if ((template as any).environment_url) {
            environmentUrl = (template as any).environment_url;
          }
        } catch (e) {
          console.error('Failed to load template:', e);
        }
      }

      if (disposed || !modelUrl || !canvasRef.current) {
        if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
        setLoading(false);
        return;
      }

      // 动态导入 Viewer3D，避免首页加载 babylonjs（6.8M）
      const { Viewer3D: Viewer3DClass } = await import('/@/page/preview/3D/Preview');
      if (disposed || !canvasRef.current) return;

      const viewer = new Viewer3DClass(canvasRef.current, {
        modelUrl,
        optimization: isMobile(),
        environmentUrl,
      });
      await viewer.init();

      if (disposed) {
        viewer.dispose();
        return;
      }

      viewerRef.current = viewer;

 

      setLoading(false);
    };

    setLoading(true);
    setInteractiveElement(null);
    initViewer();

    return () => {
      disposed = true;
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
        blobUrlToRevoke = null;
      }
    };
  }, [open, templateId, designId, isMobile]);

  const handleClose = () => {
    if (viewerRef.current) {
      viewerRef.current.dispose();
      viewerRef.current = null;
    }
    setInteractiveElement(null);
    setLoading(true);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      centered
      width="85vw"
      className={styles.modal}
      closeIcon={<CloseOutlined className={styles.closeIcon} />}
      styles={{
        body: { padding: 0, height: '80vh', overflow: 'hidden' },
        content: { background: '#1a1a2e', borderRadius: 16, overflow: 'hidden' },
      }}
    >
      <div className={styles.container}>
        <canvas className={styles.canvas} ref={canvasRef} />
        {interactiveElement}
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PreviewModal;
