import { useState, useEffect } from 'react';
import { Modal, Input, Select, message, Progress } from 'antd';
import { FolderOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import {
  getMaterialFolders,
  uploadMaterial,
  type MaterialFolder,
  type UploadMaterialData,
} from '/@/api/local';
import styles from './index.module.less';

interface SaveMaterialModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  materialData: {
    materialData: any; // JSON data
    thumbImageData: {
      name: string;
      data: Blob;
    } | null;
    imageData: Map<string, Blob>;
  } | null;
}

const SaveMaterialModal = (props: SaveMaterialModalProps) => {
  const { visible, onCancel, onSuccess, materialData } = props;

  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);

  const [materialName, setMaterialName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Fetch folders when modal opens
  useEffect(() => {
    if (visible) {
      fetchFolders();
      // Set default material name from thumbImageData
      if (materialData?.thumbImageData?.name) {
        setMaterialName(materialData.thumbImageData.name);
      }
    }
  }, [visible, materialData]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const result = await getMaterialFolders();
      setFolders(result);

      // Auto-select default folder if only one folder exists
      if (result.length === 1) {
        setSelectedFolderId(result[0].id);
      } else {
        // Select default folder
        const defaultFolder = result.find(f => f.is_default);
        if (defaultFolder) {
          setSelectedFolderId(defaultFolder.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch folders:', err);
      message.error(err?.message || '获取文件夹列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!materialName.trim()) {
      message.warning('请输入材质名称');
      return;
    }

    if (!materialData) {
      message.error('材质数据为空');
      return;
    }

    // If only one folder, use it directly; otherwise require selection
    let targetFolderId = selectedFolderId;
    if (folders.length === 1) {
      targetFolderId = folders[0].id;
    } else if (!targetFolderId) {
      message.warning('请选择目标文件夹');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Prepare upload data
      const uploadData: UploadMaterialData = {
        name: materialName.trim(),
        folderId: targetFolderId,
        config: materialData.materialData,
        thumbnail: materialData.thumbImageData?.data,
        textures: {},
      };

      // Convert Map to object
      if (materialData.imageData) {
        materialData.imageData.forEach((blob, filename) => {
          uploadData.textures[filename] = blob;
        });
      }

      await uploadMaterial(uploadData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setMaterialName('');
        setSelectedFolderId('');
        onSuccess();
      }, 300);
    } catch (err: any) {
      clearInterval(progressInterval);
      const isLimitError = ['MATERIAL_LIMIT_REACHED', 'STORAGE_QUOTA_EXCEEDED'].includes(err?.code);
      if (isLimitError) {
        setLimitError(err.message);
      } else {
        message.error(err?.message || '保存失败');
      }
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    if (!uploading) {
      setMaterialName('');
      setSelectedFolderId('');
      setUploadProgress(0);
      setLimitError(null);
      onCancel();
    }
  };

  return (
    <Modal
      title={'保存材质'}
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      okText={uploading ? `上传中 ${uploadProgress}%` : '保存'}
      cancelText={'取消'}
      confirmLoading={uploading}
      maskClosable={!uploading}
      closable={!uploading}
      centered
      width={400}
      className={styles.saveModal}
    >
      <div className={styles.formItem}>
        <div className={styles.label}>{'材质名称'}</div>
        <Input
          placeholder={'请输入材质名称'}
          value={materialName}
          onChange={e => setMaterialName(e.target.value)}
          maxLength={100}
          disabled={uploading}
        />
      </div>

      {/* Show folder selector */}
      {folders.length >= 1 && (
        <div className={styles.formItem}>
          <div className={styles.label}>{'目标文件夹'}</div>
          <Select
            style={{ width: '100%' }}
            placeholder={'请选择文件夹'}
            value={selectedFolderId}
            onChange={setSelectedFolderId}
            loading={loading}
            disabled={uploading}
            popupClassName={styles.selectDropdown}
            options={folders.map(folder => ({
              label: (
                <span>
                  <FolderOutlined style={{ marginRight: 8 }} />
                  {folder.name}
                  {folder.is_default && (
                    <span className={styles.defaultBadge}>
                      {'默认'}
                    </span>
                  )}
                </span>
              ),
              value: folder.id,
            }))}
          />
        </div>
      )}

      {uploading && (
        <Progress percent={uploadProgress} status="active" />
      )}

      {limitError && (
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: 'rgba(245, 166, 35, 0.1)',
          border: '1px solid rgba(245, 166, 35, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: '#f5a623',
        }}>
          <ExclamationCircleFilled style={{ fontSize: 16, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{limitError}</span>
          <a
            onClick={() => window.open('./home.html#pricing', '_blank')}
            style={{ flexShrink: 0, color: '#f5a623', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {'去升级'}
          </a>
        </div>
      )}
    </Modal>
  );
};

export default SaveMaterialModal;
