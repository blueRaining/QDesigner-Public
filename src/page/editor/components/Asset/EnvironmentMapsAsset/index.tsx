import { useEffect, useState, useCallback } from "react";
import { connect } from "react-redux";
import { Upload, Empty, Spin, message, Modal, Segmented, Tabs, Input, Slider, InputNumber, Checkbox, Button } from "antd";
import {
  CloudUploadOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  getPublicEnvironmentMaps,
  getUserEnvironmentMaps,
  uploadEnvironmentMap,
  deleteEnvironmentMap,
  renameEnvironmentMap,
  dataUrlToBlob,
  type EnvironmentMap,
} from '/@/api/local';
import { Editor3D } from "/@/3D/Editor";
import styles from "./index.module.less";

const PAGE_SIZE = 50;

interface EnvironmentMapsAssetProps {
  editorInit?: boolean;
}

const EnvironmentMapsAsset: React.FC<EnvironmentMapsAssetProps> = ({ editorInit }) => {
  // Tab state: 'assets' for resources, 'upload' for upload area only
  const [activeTab, setActiveTab] = useState<'assets' | 'upload'>('assets');
  // Sub-tab state for assets: 'public' or 'personal'
  const [assetsTab, setAssetsTab] = useState<'public' | 'personal'>('public');

  // Current environment preview state
  const [currentEnvUrl, setCurrentEnvUrl] = useState<string>('');
  const [currentEnvThumbnail, setCurrentEnvThumbnail] = useState<string>('');

  // Environment intensity and rotation state
  const [envIntensity, setEnvIntensity] = useState<number>(1);
  const [envRotation, setEnvRotation] = useState<number>(0);

  // Upload tab state (personal environment maps)
  const [personalMaps, setPersonalMaps] = useState<EnvironmentMap[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [personalPage, setPersonalPage] = useState(1);
  const [personalHasMore, setPersonalHasMore] = useState(false);

  // Public environment maps state
  const [publicMaps, setPublicMaps] = useState<EnvironmentMap[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicPage, setPublicPage] = useState(1);
  const [publicHasMore, setPublicHasMore] = useState(false);

  // Rename state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingMap, setRenamingMap] = useState<EnvironmentMap | null>(null);
  const [renamingIsPublic, setRenamingIsPublic] = useState(false);
  const [newName, setNewName] = useState("");

  // Applying environment map loading state
  const [applyingEnvId, setApplyingEnvId] = useState<string | null>(null);

  // Batch operation states
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch personal environment maps
  const fetchPersonalMaps = useCallback(async (pageNum: number = 1, append = false) => {
    setPersonalLoading(true);
    try {
      const result = await getUserEnvironmentMaps(pageNum, PAGE_SIZE);
      if (append) {
        setPersonalMaps((prev) => [...prev, ...result.data]);
      } else {
        setPersonalMaps(result.data);
      }
      setPersonalPage(pageNum);
      setPersonalHasMore(result.meta.hasMore);
    } catch (err: any) {
      console.error('Failed to fetch personal environment maps:', err);
      message.error(err?.message || '获取环境球列表失败');
    } finally {
      setPersonalLoading(false);
    }
  }, []);

  // Fetch public environment maps
  const fetchPublicMaps = useCallback(async (pageNum: number = 1, append = false) => {
    setPublicLoading(true);
    try {
      const result = await getPublicEnvironmentMaps(pageNum, PAGE_SIZE);
      if (append) {
        setPublicMaps((prev) => [...prev, ...result.data]);
      } else {
        setPublicMaps(result.data);
      }
      setPublicPage(pageNum);
      setPublicHasMore(result.meta.hasMore);
    } catch (err: any) {
      console.error('Failed to fetch public environment maps:', err);
      message.error(err?.message || '获取公共环境球失败');
    } finally {
      setPublicLoading(false);
    }
  }, []);

  // Handle upload
  const handleUpload = async (file: File) => {
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      Modal.warning({
        title: <span style={{ color: '#fff' }}>{'文件过大'}</span>,
        content: <span style={{ color: '#aaa' }}>{'环境球文件大小不能超过 50MB'}</span>,
        okText: '知道了',
        centered: true,
        styles: { body: { background: '#1e1e1e' }, mask: { background: 'rgba(0,0,0,0.6)' } },
        className: 'dark-confirm-modal',
      });
      return false;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 50) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    try {
      // Get file extension
      const ext = file.name.split('.').pop()?.toLowerCase() || 'hdr';

      // Generate thumbnail using Editor3D
      let thumbnailBlob: Blob | null = null;
      try {
        setUploadProgress(50);
        const thumbnailBase64 = await Editor3D.instance.parseEnvirmentImage(file, ext);
        if (thumbnailBase64) {
          thumbnailBlob = dataUrlToBlob(thumbnailBase64);
        }
        setUploadProgress(80);
      } catch (thumbErr) {
        console.warn('Failed to generate thumbnail:', thumbErr);
      }

      const result = await uploadEnvironmentMap(file, thumbnailBlob);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const envUrl = result.hdr_url.includes('#')
        ? result.hdr_url
        : `${result.hdr_url}#envirment.${result.file_type}`;
      await Editor3D.instance.setEnvirment(envUrl);

      setTimeout(() => {
        message.success('上传成功');
        // Add to list
        const newEnvMap: EnvironmentMap = {
          id: result.id,
          name: result.name,
          description: result.description,
          thumbnail_url: result.thumbnail_url,
          hdr_url: result.hdr_url,
          file_type: result.file_type as EnvironmentMap['file_type'],
          file_size_bytes: result.file_size_bytes,
          download_count: 0,
          created_at: result.created_at,
        };
        setPersonalMaps((prev) => [newEnvMap, ...prev]);
    
        setUploading(false);
        setUploadProgress(0);
      }, 300);
    } catch (err: any) {
      clearInterval(progressInterval);
      const limitCodes = ['HDR_LIMIT_REACHED', 'STORAGE_QUOTA_EXCEEDED'];
      if (limitCodes.includes(err?.code)) {
        Modal.confirm({
          icon: <ExclamationCircleOutlined style={{ color: '#f5a623' }} />,
          title: <span style={{ color: '#fff' }}>{err.code === 'STORAGE_QUOTA_EXCEEDED' ? '存储空间不足' : '环境贴图数量已达上限'}</span>,
          content: <span style={{ color: '#aaa' }}>{err.message}</span>,
          okText: '去升级',
          cancelText: '取消',
          centered: true,
          onOk: () => window.open('./home.html#pricing', '_blank'),
          styles: { body: { background: '#1e1e1e' }, mask: { background: 'rgba(0,0,0,0.6)' } },
          className: 'dark-confirm-modal',
        });
      } else if (err?.code === 'FILE_TOO_LARGE') {
        Modal.warning({
          title: <span style={{ color: '#fff' }}>{'文件过大'}</span>,
          content: <span style={{ color: '#aaa' }}>{err.message}</span>,
          okText: '知道了',
          centered: true,
          styles: { body: { background: '#1e1e1e' }, mask: { background: 'rgba(0,0,0,0.6)' } },
          className: 'dark-confirm-modal',
        });
      } else {
        message.error(err?.message || '上传失败');
      }
      setUploading(false);
      setUploadProgress(0);
    }
    return false; // Prevent default upload
  };

  // Handle delete
  const handleDelete = (envMap: EnvironmentMap, isPublic: boolean) => {
    Modal.confirm({
      title: '删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除环境球「${envMap.name}」？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'confirmModal',
      centered: true,
      onOk: async () => {
        try {
          await deleteEnvironmentMap(envMap.id, isPublic);
          message.success('删除成功');
          setPublicMaps((prev) => prev.filter((m) => m.id !== envMap.id));
          setPersonalMaps((prev) => prev.filter((m) => m.id !== envMap.id));
        } catch (err: any) {
          message.error(err?.message || '删除失败');
        }
      },
    });
  };

  // Open rename modal
  const openRenameModal = (envMap: EnvironmentMap, isPublic: boolean) => {
    setRenamingMap(envMap);
    setRenamingIsPublic(isPublic);
    setNewName(envMap.name);
    setRenameModalVisible(true);
  };

  // Handle rename
  const handleRename = async () => {
    if (!renamingMap || !newName.trim()) {
      message.warning('名称不能为空');
      return;
    }

    try {
      await renameEnvironmentMap(renamingMap.id, newName.trim(), renamingIsPublic);
      message.success('重命名成功');

      // Update local state
      const updateName = (m: EnvironmentMap) =>
        m.id === renamingMap.id ? { ...m, name: newName.trim() } : m;
      setPublicMaps((prev) => prev.map(updateName));
      setPersonalMaps((prev) => prev.map(updateName));

      setRenameModalVisible(false);
      setRenamingMap(null);
      setNewName("");
    } catch (err: any) {
      message.error(err?.message || '重命名失败');
    }
  };

  // Toggle batch mode
  const toggleBatchMode = () => {
    setBatchMode(prev => !prev);
    setSelectedIds(new Set());
  };

  // Toggle select a single environment map
  const toggleSelectEnvMap = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all / deselect all personal maps
  const selectAllEnvMaps = () => {
    if (selectedIds.size === personalMaps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(personalMaps.map(m => m.id)));
    }
  };

  // Batch delete
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      message.warning('请先选择环境球');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要永久删除选中的 ${selectedIds.size} 个环境球？删除后无法恢复！`,
      okText: '永久删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'confirmModal',
      centered: true,
      onOk: async () => {
        let successCount = 0;
        for (const id of selectedIds) {
          try {
            await deleteEnvironmentMap(id, false);
            successCount++;
          } catch { /* skip */ }
        }
        setPersonalMaps(prev => prev.filter(m => !selectedIds.has(m.id)));
        setPublicMaps(prev => prev.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        message.success(`已删除 ${successCount} 个环境球`);
      },
    });
  };

  // Get environment URL with file extension hint
  const getEnvMapUrl = (envMap: EnvironmentMap) => {
    return envMap.hdr_url.includes('#')
      ? envMap.hdr_url
      : `${envMap.hdr_url}#envirment.${envMap.file_type}`;
  };

  // Apply environment map to scene
  const applyEnvironmentMap = async (envMap: EnvironmentMap) => {
    if (!Editor3D.instance) {
      message.warning('编辑器未初始化');
      return;
    }

    setApplyingEnvId(envMap.id);
    try {
      const url = getEnvMapUrl(envMap);
      await Editor3D.instance.setEnvirment(url);
      message.success('环境球已应用');
    } catch (err: any) {
      console.error('Failed to apply environment map:', err);
      message.error('应用环境球失败');
    } finally {
      setApplyingEnvId(null);
    }
  };

  // Drag start handler for environment map
  const onEnvMapDragStart = (envMap: EnvironmentMap) => (e: React.DragEvent) => {
    const dragData = {
      hdrUrl: getEnvMapUrl(envMap),
      name: envMap.name,
      thumbnailUrl: envMap.thumbnail_url,
    };
    e.dataTransfer.setData('environmentMapData', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Load more
  const loadMorePersonal = () => {
    if (!personalLoading && personalHasMore) {
      fetchPersonalMaps(personalPage + 1, true);
    }
  };

  const loadMorePublic = () => {
    if (!publicLoading && publicHasMore) {
      fetchPublicMaps(publicPage + 1, true);
    }
  };

  // Tab change handler
  const handleTabChange = (value: string | number) => {
    const key = value as 'assets' | 'upload';
    setActiveTab(key);
    // Load data when switching to assets tab
    if (key === 'assets') {
      if (assetsTab === 'public' && publicMaps.length === 0) {
        fetchPublicMaps(1);
      } else if (assetsTab === 'personal' && personalMaps.length === 0) {
        fetchPersonalMaps(1);
      }
    }
  };

  // Assets sub-tab change handler
  const handleAssetsTabChange = (key: string) => {
    setAssetsTab(key as 'public' | 'personal');
    if (key === 'personal' && personalMaps.length === 0) {
      fetchPersonalMaps(1);
    } else if (key === 'public' && publicMaps.length === 0) {
      fetchPublicMaps(1);
    }
  };

  // Initial load
  useEffect(() => {
    if (editorInit) {
      // Load public maps by default
      fetchPublicMaps(1);
    }
  }, [editorInit, fetchPublicMaps]);

  useEffect(() => {
    if (!editorInit || !Editor3D.instance) return;

    const currentEnv = Editor3D.instance.getCurrentEnvironment();
    if (currentEnv.thumbnail) {
      setCurrentEnvThumbnail(currentEnv.thumbnail);
    }

    setEnvIntensity(Editor3D.instance.getEnvironmentIntensity());
    setEnvRotation(Editor3D.instance.getEnvironmentRotation());
  }, [editorInit]);

  // undo/redo 时同步环境球亮度和旋转
  useEffect(() => {
    if (!editorInit || !Editor3D.instance) return;

    const handleEnvironmentSettingsChanged = () => {
      if (Editor3D.instance) {
        setEnvIntensity(Editor3D.instance.getEnvironmentIntensity());
        setEnvRotation(Editor3D.instance.getEnvironmentRotation());
      }
    };

    Editor3D.instance.addEventListener('environmentSettingsChanged', handleEnvironmentSettingsChanged);
    return () => {
      Editor3D.instance?.removeEventListener('environmentSettingsChanged', handleEnvironmentSettingsChanged);
    };
  }, [editorInit]);

  useEffect(() => {
    if (!editorInit || !Editor3D.instance) return;

    const handleEnvironmentChanged = (data: { hdrUrl: string; thumbnailUrl?: string }) => {
      setApplyingEnvId(null);
      setCurrentEnvUrl(data.hdrUrl || '');
      if (data.thumbnailUrl) {
        setCurrentEnvThumbnail(data.thumbnailUrl);
      } else {
        const allMaps = [...publicMaps, ...personalMaps];
        const matchedMap = allMaps.find(m => {
          const url = m.hdr_url.includes('#') ? m.hdr_url : `${m.hdr_url}#envirment.${m.file_type}`;
          return url === data.hdrUrl;
        });
        setCurrentEnvThumbnail(matchedMap?.thumbnail_url || '');
      }
    };

    Editor3D.instance.addEventListener('environmentChanged', handleEnvironmentChanged);
    return () => {
      Editor3D.instance?.removeEventListener('environmentChanged', handleEnvironmentChanged);
    };
  }, [editorInit, publicMaps, personalMaps]);

  // Render environment map card
  const renderEnvMapCard = (envMap: EnvironmentMap, isPublic: boolean) => {
    const inBatch = !isPublic && batchMode;
    const isSelected = inBatch && selectedIds.has(envMap.id);
    const isApplying = applyingEnvId === envMap.id;

    return (
      <div
        key={envMap.id}
        className={`${styles.envMapCard} ${isSelected ? styles.envMapSelected : ''}`}
        onClick={inBatch ? () => toggleSelectEnvMap(envMap.id) : () => applyEnvironmentMap(envMap)}
        draggable={!inBatch}
        onDragStart={!inBatch ? onEnvMapDragStart(envMap) : undefined}
      >
        <div className={styles.envMapWrapper}>
          {inBatch && (
            <div className={styles.envMapCheckbox}>
              <Checkbox checked={isSelected} />
            </div>
          )}
          {envMap.thumbnail_url ? (
            <img
              src={envMap.thumbnail_url}
              alt={envMap.name}
              className={styles.envMapImage}
              draggable={false}
            />
          ) : (
            <div className={styles.noThumbnail}>
              <span>HDR</span>
            </div>
          )}
          {isApplying && (
            <div className={styles.envMapLoading}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#ff9500' }} spin />} />
            </div>
          )}
          {/* Only show action buttons for personal maps when not in batch mode */}
          {!isPublic && !batchMode && (
            <div className={styles.actionBtns}>
              <div className={styles.editBtn} onClick={(e) => {
                e.stopPropagation();
                openRenameModal(envMap, isPublic);
              }}>
                <EditOutlined />
              </div>
              <div className={styles.deleteBtn} onClick={(e) => {
                e.stopPropagation();
                handleDelete(envMap, isPublic);
              }}>
                <DeleteOutlined />
              </div>
            </div>
          )}
        </div>
        <div className={styles.itemName} title={envMap.name}>
          <span>{envMap.name}</span>
        </div>
      </div>
    );
  };

  const handleClearEnvironment = async () => {
    if (!Editor3D.instance) return;
    try {
      await Editor3D.instance.setEnvirment(null);
      setCurrentEnvThumbnail('');
      message.success('已清除环境球');
    } catch (err) {
      console.error('Failed to clear environment:', err);
    }
  };

  const handleIntensityChange = (value: number | null, finished = false) => {
    const v = value ?? 1;
    setEnvIntensity(v);
    Editor3D.instance?.setEnvironmentIntensity(v, finished);
  };

  const handleRotationChange = (value: number | null, finished = false) => {
    const v = value ?? 0;
    setEnvRotation(v);
    Editor3D.instance?.setEnvironmentRotation(v, finished);
  };

  const renderUploadContent = () => {
    return (
    <div className={styles.uploadPanel}>
      <div className={styles.envUploadSection}>
        <div className={styles.uploadContainer}>
          <div className={styles.envUploadBox}>
            {currentEnvThumbnail ? (
              <>
                <img
                  src={currentEnvThumbnail}
                  alt={'当前环境球'}
                  className={styles.envPreviewImg}
                  draggable={false}
                />
                {!uploading && (
                  <div className={styles.uploadHoverOverlay}>
                    <Upload
                      accept=".hdr,.env,.basis,.dds"
                      showUploadList={false}
                      beforeUpload={handleUpload}
                      disabled={uploading}
                    >
                      <div className={styles.hoverBtn}>
                        <CloudUploadOutlined />
                        <span>{'上传'}</span>
                      </div>
                    </Upload>
                    <div
                      className={`${styles.hoverBtn} ${styles.hoverDeleteBtn}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearEnvironment();
                      }}
                    >
                      <DeleteOutlined />
                      <span>{'删除'}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Upload
                accept=".hdr,.env,.basis,.dds"
                showUploadList={false}
                beforeUpload={handleUpload}
                disabled={uploading}
              >
                <div className={styles.envUploadPlaceholder}>
                  {uploading ? (
                    <>
                      <LoadingOutlined className={styles.uploadingIcon} />
                      <span>{uploadProgress}%</span>
                    </>
                  ) : (
                    <CloudUploadOutlined className={styles.uploadIcon} />
                  )}
                </div>
              </Upload>
            )}
            {uploading && currentEnvThumbnail && (
              <div className={styles.uploadingOverlay}>
                <LoadingOutlined />
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentEnvThumbnail && (
        <>
          <div className={styles.sliderRow}>
            <span className={styles.sliderLabel}>{'环境球亮度'}</span>
            <Slider
              className={styles.slider}
              min={0}
              max={5}
              step={0.01}
              value={envIntensity}
              onChange={handleIntensityChange}
              onChangeComplete={(v: number) => handleIntensityChange(v, true)}
            />
            <InputNumber
              className={styles.sliderInput}
              min={0}
              max={5}
              step={0.01}
              value={envIntensity}
              onChange={(v) => handleIntensityChange(v, true)}
              controls={false}
            />
          </div>

          <div className={styles.sliderRow}>
            <span className={styles.sliderLabel}>{'旋转'}</span>
            <Slider
              className={styles.slider}
              min={-180}
              max={180}
              step={0.1}
              value={envRotation}
              onChange={handleRotationChange}
              onChangeComplete={(v: number) => handleRotationChange(v, true)}
            />
            <InputNumber
              className={styles.sliderInput}
              min={-180}
              max={180}
              step={0.1}
              value={envRotation}
              onChange={(v) => handleRotationChange(v, true)}
              controls={false}
            />
          </div>
        </>
      )}
    </div>
  );
  }

  // Render personal environment maps content
  const renderPersonalContent = () => (
    <div className={styles.content}>
      {personalLoading && personalMaps.length === 0 ? (
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      ) : personalMaps.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={'暂无上传的环境球'}
          className={styles.empty}
        />
      ) : (
        <>
          {/* Batch toggle button */}
          {personalMaps.length > 0 && (
            <div className={styles.batchToggle} onClick={toggleBatchMode}>
              {batchMode ? <CloseOutlined /> : <CheckOutlined />}
              <span>{batchMode ? '取消' : '批量'}</span>
            </div>
          )}

          {/* Batch action bar */}
          {batchMode && (
            <div className={styles.batchBar}>
              <Checkbox
                checked={selectedIds.size === personalMaps.length && personalMaps.length > 0}
                indeterminate={selectedIds.size > 0 && selectedIds.size < personalMaps.length}
                onChange={selectAllEnvMaps}
              >
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                  {`全选 (${selectedIds.size}/${personalMaps.length})`}
                </span>
              </Checkbox>
              <div className={styles.batchActions}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchDelete}
                >
                  {'删除'}
                </Button>
              </div>
            </div>
          )}

          <div className={styles.envMapGrid}>
            {personalMaps.map((envMap) => renderEnvMapCard(envMap, false))}
          </div>

          {personalHasMore && (
            <div className={styles.loadMore} onClick={loadMorePersonal}>
              {personalLoading ? <Spin size="small" /> : '加载更多'}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Render public environment maps content
  const renderPublicContent = () => (
    <div className={styles.content}>
      {publicLoading && publicMaps.length === 0 ? (
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      ) : publicMaps.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={'暂无公共环境球'}
          className={styles.empty}
        />
      ) : (
        <>
          <div className={styles.envMapGrid}>
            {publicMaps.map((envMap) => renderEnvMapCard(envMap, true))}
          </div>

          {publicHasMore && (
            <div className={styles.loadMore} onClick={loadMorePublic}>
              {publicLoading ? <Spin size="small" /> : '加载更多'}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Tab switch */}
      <Segmented
        options={[
          { label: '资源', value: 'assets' },
          { label: '上传', value: 'upload' }
        ]}
        value={activeTab}
        onChange={handleTabChange}
        block
        className={styles.tabSegmented}
      />

      {activeTab === 'assets' && (
        <div className={styles.assetsPanel}>
          <Tabs
            activeKey={assetsTab}
            onChange={handleAssetsTabChange}
            className={styles.assetsTabs}
            size="small"
            items={[
              {
                key: 'public',
                label: '公共资源',
                children: (
                  <div className={styles.tabContent}>
                    {renderPublicContent()}
                  </div>
                ),
              },
              {
                key: 'personal',
                label: '我的环境球',
                children: (
                  <div className={styles.tabContent}>
                    {renderPersonalContent()}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {activeTab === 'upload' && renderUploadContent()}

      {/* Rename Modal */}
      <Modal
        title={'重命名'}
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setRenamingMap(null);
          setNewName("");
        }}
        okText={'确定'}
        cancelText={'取消'}
        centered
        width={360}
        className="envMapRenameModal"
      >
        <Input
          placeholder={'请输入新名称'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default connect((state: any) => state.editor)(EnvironmentMapsAsset);
