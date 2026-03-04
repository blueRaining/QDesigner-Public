import { useEffect, useState, useCallback, useRef } from "react";
import { connect } from "react-redux";
import {
  Empty,
  Spin,
  message,
  Modal,
  Input,
  Dropdown,
  Button,
  Tabs,
  Checkbox,
} from "antd";
import {
  FolderOutlined,
  FolderFilled,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  getMaterialFolders,
  getPublicMaterialFolders,
  getUserMaterials,
  getPublicMaterials,
  createMaterialFolder,
  renameMaterialFolder,
  renamePublicMaterialFolder,
  deleteMaterialFolder,
  deletePublicMaterialFolder,
  deleteMaterial,
  deletePublicMaterial,
  moveMaterial,
  renameMaterial,
  renamePublicMaterial,
  type MaterialFolder,
  type UserMaterial,
} from '/@/api/local';
import styles from "./index.module.less";

const PAGE_SIZE = 50;

const UserMaterialsAsset = (props: any) => {
  const { editorInit } = props;

  // Tab state
  const [activeTab, setActiveTab] = useState<'public' | 'personal'>('public');

  // === Personal materials state ===
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [materials, setMaterials] = useState<UserMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'folders' | 'materials'>('folders');
  const [currentFolder, setCurrentFolder] = useState<MaterialFolder | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // === Public materials state ===
  const [publicFolders, setPublicFolders] = useState<MaterialFolder[]>([]);
  const [publicMaterials, setPublicMaterials] = useState<UserMaterial[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicMaterialsLoading, setPublicMaterialsLoading] = useState(false);
  const [publicCurrentView, setPublicCurrentView] = useState<'folders' | 'materials'>('folders');
  const [publicCurrentFolder, setPublicCurrentFolder] = useState<MaterialFolder | null>(null);
  const [publicSelectedFolderId, setPublicSelectedFolderId] = useState<string | null>(null);
  const [publicHasMore, setPublicHasMore] = useState(false);
  const [publicPage, setPublicPage] = useState(1);

  // Modal states
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [renameFolderVisible, setRenameFolderVisible] = useState(false);
  const [moveMaterialVisible, setMoveMaterialVisible] = useState(false);
  const [renameMaterialVisible, setRenameMaterialVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<MaterialFolder | null>(null);
  const [renamingFolderIsPublic, setRenamingFolderIsPublic] = useState(false);
  const [renamingMaterial, setRenamingMaterial] = useState<UserMaterial | null>(null);
  const [renamingMaterialIsPublic, setRenamingMaterialIsPublic] = useState(false);
  const [movingMaterial, setMovingMaterial] = useState<UserMaterial | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // Batch operation states
  const [batchMode, setBatchMode] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [batchMoveVisible, setBatchMoveVisible] = useState(false);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState<string>("");

  // Fetch personal folders
  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMaterialFolders();
      setFolders(result);
    } catch (err: any) {
      console.error('Failed to fetch folders:', err);
      message.error(err?.message || '获取文件夹列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch public folders
  const fetchPublicFolders = useCallback(async () => {
    setPublicLoading(true);
    try {
      const result = await getPublicMaterialFolders();
      setPublicFolders(result);
    } catch (err: any) {
      console.error('Failed to fetch public folders:', err);
      message.error(err?.message || '获取公共文件夹列表失败');
    } finally {
      setPublicLoading(false);
    }
  }, []);

  // Fetch materials for a specific folder
  const fetchMaterialsForFolder = useCallback(async (folderId: string) => {
    setMaterialsLoading(true);
    try {
      const result = await getUserMaterials(folderId);
      setMaterials(result);
    } catch (err: any) {
      console.error('Failed to fetch materials:', err);
      message.error(err?.message || '获取材质列表失败');
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  // Fetch public materials for a specific folder
  const fetchPublicMaterialsForFolder = useCallback(async (folderId: string, page = 1, append = false) => {
    setPublicMaterialsLoading(true);
    try {
      const result = await getPublicMaterials(folderId, page, PAGE_SIZE);
      if (append) {
        setPublicMaterials(prev => [...prev, ...result.items]);
      } else {
        setPublicMaterials(result.items);
      }
      setPublicHasMore(result.hasMore);
      setPublicPage(page);
    } catch (err: any) {
      console.error('Failed to fetch public materials:', err);
      message.error(err?.message || '获取公共材质失败');
    } finally {
      setPublicMaterialsLoading(false);
    }
  }, []);

  // Enter folder (personal)
  const enterFolder = (folder: MaterialFolder) => {
    setCurrentFolder(folder);
    setSelectedFolderId(folder.id);
    setCurrentView('materials');
    fetchMaterialsForFolder(folder.id);
  };

  // Enter folder (public)
  const enterPublicFolder = (folder: MaterialFolder) => {
    setPublicCurrentFolder(folder);
    setPublicSelectedFolderId(folder.id);
    setPublicCurrentView('materials');
    fetchPublicMaterialsForFolder(folder.id);
  };

  // Go back to folders view (personal)
  const goBackToFolders = () => {
    setCurrentView('folders');
    setCurrentFolder(null);
    setSelectedFolderId(null);
    setMaterials([]);
  };

  // Go back to folders view (public)
  const goBackToPublicFolders = () => {
    setPublicCurrentView('folders');
    setPublicCurrentFolder(null);
    setPublicSelectedFolderId(null);
    setPublicMaterials([]);
    setPublicHasMore(false);
    setPublicPage(1);
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      message.warning('请输入文件夹名称');
      return;
    }

    try {
      const folder = await createMaterialFolder(newFolderName.trim());
      setFolders(prev => [...prev, folder]);
      setCreateFolderVisible(false);
      setNewFolderName("");
      message.success('创建成功');
    } catch (err: any) {
      message.error(err?.message || '创建失败');
    }
  };

  // Rename folder
  const handleRenameFolder = async () => {
    if (!renamingFolder || !newFolderName.trim()) {
      message.warning('请输入文件夹名称');
      return;
    }

    try {
      if (renamingFolderIsPublic) {
        await renamePublicMaterialFolder(renamingFolder.id, newFolderName.trim());
        setPublicFolders(prev =>
          prev.map(f =>
            f.id === renamingFolder.id ? { ...f, name: newFolderName.trim() } : f
          )
        );
        if (publicCurrentFolder?.id === renamingFolder.id) {
          setPublicCurrentFolder({ ...publicCurrentFolder, name: newFolderName.trim() });
        }
      } else {
        await renameMaterialFolder(renamingFolder.id, newFolderName.trim());
        setFolders(prev =>
          prev.map(f =>
            f.id === renamingFolder.id ? { ...f, name: newFolderName.trim() } : f
          )
        );
        if (currentFolder?.id === renamingFolder.id) {
          setCurrentFolder({ ...currentFolder, name: newFolderName.trim() });
        }
      }
      setRenameFolderVisible(false);
      setRenamingFolder(null);
      setNewFolderName("");
      message.success('重命名成功');
    } catch (err: any) {
      message.error(err?.message || '重命名失败');
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder: MaterialFolder, isPublic: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const folderId = folder.id;
    const folderName = folder.name;
    const materialCount = folder.material_count;
    const isPermanent = !isPublic;

    Modal.confirm({
      title: isPermanent ? '永久删除' : '删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要永久删除文件夹「${folderName}」？该文件夹包含 ${materialCount} 个材质，删除后无法恢复！`,
      okText: isPermanent ? '永久删除' : '删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'confirmModal',
      centered: true,
      onOk: async () => {
        try {
          if (isPublic) {
            await deletePublicMaterialFolder(folderId);
            setPublicFolders(prev => prev.filter(f => f.id !== folderId));
          } else {
            await deleteMaterialFolder(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
          }
          message.success('删除成功');
        } catch (err: any) {
          message.error(err?.message || '删除失败');
          if (isPublic) {
            fetchPublicFolders();
          } else {
            fetchFolders();
          }
        }
      },
    });
  };

  // Delete material
  const handleDeleteMaterial = async (material: UserMaterial, isPublic: boolean) => {
    const materialId = material.id;
    const materialName = material.name;
    const isPermanent = !isPublic;

    Modal.confirm({
      title: isPermanent ? '永久删除' : '删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要永久删除材质「${materialName}」？删除后无法恢复！`,
      okText: isPermanent ? '永久删除' : '删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'confirmModal',
      centered: true,
      onOk: async () => {
        try {
          if (isPublic) {
            await deletePublicMaterial(materialId);
            setPublicMaterials((prev) => prev.filter((m) => m.id !== materialId));
            // Update folder material count
            if (publicCurrentFolder) {
              setPublicFolders(prev =>
                prev.map(f =>
                  f.id === publicCurrentFolder.id
                    ? { ...f, material_count: Math.max(0, f.material_count - 1) }
                    : f
                )
              );
              setPublicCurrentFolder({
                ...publicCurrentFolder,
                material_count: Math.max(0, publicCurrentFolder.material_count - 1)
              });
            }
          } else {
            await deleteMaterial(materialId);
            setMaterials(prev => prev.filter(m => m.id !== materialId));
            // Update folder material count
            if (currentFolder) {
              setFolders(prev =>
                prev.map(f =>
                  f.id === currentFolder.id
                    ? { ...f, material_count: Math.max(0, f.material_count - 1) }
                    : f
                )
              );
              setCurrentFolder({
                ...currentFolder,
                material_count: Math.max(0, currentFolder.material_count - 1)
              });
            }
          }
          message.success('删除成功');
        } catch (err: any) {
          message.error(err?.message || '删除失败');
        }
      },
    });
  };

  // Move material
  const handleMoveMaterial = async () => {
    if (!movingMaterial || !targetFolderId) {
      message.warning('请选择目标文件夹');
      return;
    }

    if (movingMaterial.folder_id === targetFolderId) {
      message.warning('材质已在该文件夹中');
      return;
    }

    try {
      await moveMaterial(movingMaterial.id, targetFolderId);
      setMaterials(prev => prev.filter(m => m.id !== movingMaterial.id));

      const oldFolderId = movingMaterial.folder_id;
      setFolders(prev =>
        prev.map(f => {
          if (f.id === oldFolderId) {
            return { ...f, material_count: Math.max(0, f.material_count - 1) };
          }
          if (f.id === targetFolderId) {
            return { ...f, material_count: f.material_count + 1 };
          }
          return f;
        })
      );

      if (currentFolder) {
        setCurrentFolder({
          ...currentFolder,
          material_count: Math.max(0, currentFolder.material_count - 1)
        });
      }

      setMoveMaterialVisible(false);
      setMovingMaterial(null);
      setTargetFolderId("");
      message.success('移动成功');
    } catch (err: any) {
      message.error(err?.message || '移动失败');
    }
  };

  // === Batch operations ===
  const toggleBatchMode = () => {
    setBatchMode(prev => !prev);
    setSelectedMaterialIds(new Set());
  };

  const toggleSelectMaterial = (id: string) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllMaterials = () => {
    if (selectedMaterialIds.size === materials.length) {
      setSelectedMaterialIds(new Set());
    } else {
      setSelectedMaterialIds(new Set(materials.map(m => m.id)));
    }
  };

  const handleBatchDelete = () => {
    if (selectedMaterialIds.size === 0) {
      message.warning('请先选择材质');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要永久删除选中的 ${selectedMaterialIds.size} 个材质？删除后无法恢复！`,
      okText: '永久删除',
      okType: 'danger',
      cancelText: '取消',
      className: 'confirmModal',
      centered: true,
      onOk: async () => {
        let successCount = 0;
        for (const id of selectedMaterialIds) {
          try {
            await deleteMaterial(id);
            successCount++;
          } catch { /* skip */ }
        }
        setMaterials(prev => prev.filter(m => !selectedMaterialIds.has(m.id)));
        if (currentFolder) {
          setCurrentFolder({
            ...currentFolder,
            material_count: Math.max(0, currentFolder.material_count - successCount),
          });
          setFolders(prev =>
            prev.map(f =>
              f.id === currentFolder.id
                ? { ...f, material_count: Math.max(0, f.material_count - successCount) }
                : f
            )
          );
        }
        setSelectedMaterialIds(new Set());
        message.success(`已删除 ${successCount} 个材质`);
      },
    });
  };

  const handleBatchMove = async () => {
    if (!batchTargetFolderId || selectedMaterialIds.size === 0) {
      message.warning('请选择目标文件夹');
      return;
    }
    let successCount = 0;
    for (const id of selectedMaterialIds) {
      try {
        await moveMaterial(id, batchTargetFolderId);
        successCount++;
      } catch { /* skip */ }
    }
    setMaterials(prev => prev.filter(m => !selectedMaterialIds.has(m.id)));
    const movedCount = successCount;
    if (currentFolder) {
      setFolders(prev =>
        prev.map(f => {
          if (f.id === currentFolder.id) return { ...f, material_count: Math.max(0, f.material_count - movedCount) };
          if (f.id === batchTargetFolderId) return { ...f, material_count: f.material_count + movedCount };
          return f;
        })
      );
      setCurrentFolder({
        ...currentFolder,
        material_count: Math.max(0, currentFolder.material_count - movedCount),
      });
    }
    setSelectedMaterialIds(new Set());
    setBatchMoveVisible(false);
    setBatchTargetFolderId("");
    message.success(`已移动 ${successCount} 个材质`);
  };

  // 拖拽预览元素 ref
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  // 创建拖拽预览容器
  useEffect(() => {
    if (!dragPreviewRef.current) {
      const div = document.createElement('div');
      div.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: 80px;
        height: 80px;
        border-radius: 8px;
        overflow: hidden;
        background: #1a1a1a;
        pointer-events: none;
      `;
      const img = document.createElement('img');
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
      `;
      div.appendChild(img);
      document.body.appendChild(div);
      dragPreviewRef.current = div;
    }
    return () => {
      if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
    };
  }, []);

  // Drag start handler for applying material to 3D model
  const onDragStart = (material: UserMaterial) => (e: React.DragEvent) => {
    const dragData = {
      materialPath: material.config_url,
      name: material.name,
    };
    e.dataTransfer.setData('serviceMaterialData', JSON.stringify(dragData));

    if (material.thumbnail_url && dragPreviewRef.current) {
      const img = dragPreviewRef.current.querySelector('img');
      if (img) {
        img.src = material.thumbnail_url;
      }
      e.dataTransfer.setDragImage(dragPreviewRef.current, 40, 40);
    }
  };

  // Open rename folder modal
  const openRenameFolderModal = (folder: MaterialFolder, isPublic: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingFolder(folder);
    setRenamingFolderIsPublic(isPublic);
    setNewFolderName(folder.name);
    setRenameFolderVisible(true);
  };

  // Open move modal
  const openMoveModal = (material: UserMaterial) => {
    setMovingMaterial(material);
    setTargetFolderId("");
    setMoveMaterialVisible(true);
  };

  // Open rename material modal
  const openRenameMaterialModal = (material: UserMaterial, isPublic: boolean) => {
    setRenamingMaterial(material);
    setRenamingMaterialIsPublic(isPublic);
    setNewMaterialName(material.name);
    setRenameMaterialVisible(true);
  };

  // Handle rename material
  const handleRenameMaterial = async () => {
    if (!renamingMaterial || !newMaterialName.trim()) {
      message.warning('请输入材质名称');
      return;
    }

    try {
      if (renamingMaterialIsPublic) {
        await renamePublicMaterial(renamingMaterial.id, newMaterialName.trim());
        setPublicMaterials(prev =>
          prev.map(m =>
            m.id === renamingMaterial.id ? { ...m, name: newMaterialName.trim() } : m
          )
        );
      } else {
        await renameMaterial(renamingMaterial.id, newMaterialName.trim());
        setMaterials(prev =>
          prev.map(m =>
            m.id === renamingMaterial.id ? { ...m, name: newMaterialName.trim() } : m
          )
        );
      }
      setRenameMaterialVisible(false);
      setRenamingMaterial(null);
      setNewMaterialName("");
      message.success('重命名成功');
    } catch (err: any) {
      message.error(err?.message || '重命名失败');
    }
  };

  // Tab change handler
  const handleTabChange = (key: string) => {
    setActiveTab(key as 'public' | 'personal');
    if (key === 'personal' && folders.length === 0) {
      fetchFolders();
    } else if (key === 'public' && publicFolders.length === 0) {
      fetchPublicFolders();
    }
  };

  // Initial load
  useEffect(() => {
    if (editorInit) {
      fetchPublicFolders();
    }
  }, [editorInit, fetchPublicFolders]);

  // Folder dropdown menu (personal)
  const getPersonalFolderMenu = (folder: MaterialFolder) => ({
    items: folder.is_default
      ? []
      : [
          {
            key: 'rename',
            icon: <EditOutlined />,
            label: '重命名',
            onClick: (info: any) => {
              info.domEvent.stopPropagation();
              openRenameFolderModal(folder, false);
            },
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: (info: any) => {
              info.domEvent.stopPropagation();
              handleDeleteFolder(folder, false);
            },
          },
        ],
  });

  // Folder dropdown menu (public)
  const getPublicFolderMenu = (folder: MaterialFolder) => ({
    items: folder.is_default
      ? []
      : [
          {
            key: 'rename',
            icon: <EditOutlined />,
            label: '重命名',
            onClick: (info: any) => {
              info.domEvent.stopPropagation();
              openRenameFolderModal(folder, true);
            },
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: (info: any) => {
              info.domEvent.stopPropagation();
              handleDeleteFolder(folder, true);
            },
          },
        ],
  });

  // Material dropdown menu (personal)
  const getPersonalMaterialMenu = (material: UserMaterial) => ({
    items: [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: () => openRenameMaterialModal(material, false),
      },
      {
        key: 'move',
        icon: <FolderOutlined />,
        label: '移动到...',
        onClick: () => openMoveModal(material),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDeleteMaterial(material, false),
      },
    ],
  });

  // Material dropdown menu (public)
  const getPublicMaterialMenu = (material: UserMaterial) => ({
    items: [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: '重命名',
        onClick: () => openRenameMaterialModal(material, true),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDeleteMaterial(material, true),
      },
    ],
  });

  // Render folder card
  const renderFolderCard = (folder: MaterialFolder, isPublic: boolean) => (
    <div
      key={folder.id}
      className={`${styles.folderCard} ${(isPublic ? publicSelectedFolderId : selectedFolderId) === folder.id ? styles.selected : ''}`}
      onClick={() => isPublic ? enterPublicFolder(folder) : enterFolder(folder)}
    >
      <div className={styles.folderIconWrapper}>
        <FolderFilled className={styles.folderIcon} />
      </div>
      <div className={styles.folderName} title={folder.name}>
        {folder.name}
      </div>
      {folder.is_default && <div className={styles.defaultBadge}>{'默认'}</div>}
      {/* Only show menu for personal folders */}
      {!isPublic && !folder.is_default && (
        <Dropdown menu={getPersonalFolderMenu(folder)} trigger={['click']}>
          <div
            className={styles.folderMenuBtn}
            onClick={e => e.stopPropagation()}
          >
            <MoreOutlined />
          </div>
        </Dropdown>
      )}
    </div>
  );

  // Render material card
  const renderMaterialCard = (material: UserMaterial, isPublic: boolean) => (
    <div
      key={material.id}
      className={styles.materialCard}
    >
      <div className={styles.materialWrapper}>
        {material.thumbnail_url ? (
          <img
            src={material.thumbnail_url}
            alt={material.name}
            className={styles.materialImage}
            draggable
            onDragStart={onDragStart(material)}
          />
        ) : (
          <div
            className={styles.noThumbnail}
            draggable
            onDragStart={onDragStart(material)}
          >
            <FolderOutlined />
          </div>
        )}
        {/* Only show menu for personal materials */}
        {!isPublic && (
          <Dropdown menu={getPersonalMaterialMenu(material)} trigger={['click']}>
            <div className={styles.materialMenuBtn} onClick={e => e.stopPropagation()}>
              <MoreOutlined />
            </div>
          </Dropdown>
        )}
      </div>
      <div className={styles.materialName} title={material.name}>
        <span>{material.name}</span>
      </div>
    </div>
  );

  // Render folders view (personal)
  const renderPersonalFoldersView = () => (
    <div className={styles.foldersContainer}>
      <div className={styles.header}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setCreateFolderVisible(true)}
          className={styles.createFolderBtn}
        >
          {'新建文件夹'}
        </Button>
      </div>
      <div className={styles.foldersGrid}>
        {folders.map(f => renderFolderCard(f, false))}
      </div>
    </div>
  );

  // Render folders view (public)
  const renderPublicFoldersView = () => (
    <div className={styles.foldersContainer}>
      {publicFolders.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={'暂无公共材质'}
          className={styles.empty}
        />
      ) : (
        <div className={styles.foldersGrid}>
          {publicFolders.map(f => renderFolderCard(f, true))}
        </div>
      )}
    </div>
  );

  // Render materials view (personal)
  const renderPersonalMaterialsView = () => (
    <div className={styles.materialsContainer}>
      <div className={styles.materialsHeader}>
        <div className={styles.backButton} onClick={() => { goBackToFolders(); setBatchMode(false); setSelectedMaterialIds(new Set()); }}>
          <ArrowLeftOutlined />
          <span>{'返回'}</span>
        </div>
        <div className={styles.currentFolderName}>
          <FolderFilled className={styles.headerFolderIcon} />
          <span>{currentFolder?.name}</span>
          <span className={styles.materialCount}>({Number.isFinite(currentFolder?.material_count) ? currentFolder!.material_count : materials.length})</span>
        </div>
        {materials.length > 0 && (
          <div className={styles.batchToggle} onClick={toggleBatchMode}>
            {batchMode ? <CloseOutlined /> : <CheckOutlined />}
            <span>{batchMode ? '取消' : '批量'}</span>
          </div>
        )}
      </div>

      {batchMode && (
        <div className={styles.batchBar}>
          <Checkbox
            checked={selectedMaterialIds.size === materials.length && materials.length > 0}
            indeterminate={selectedMaterialIds.size > 0 && selectedMaterialIds.size < materials.length}
            onChange={selectAllMaterials}
          >
            {`全选 (${selectedMaterialIds.size}/${materials.length})`}
          </Checkbox>
          <div className={styles.batchActions}>
            <Button
              size="small"
              icon={<FolderOutlined />}
              disabled={selectedMaterialIds.size === 0}
              onClick={() => { setBatchTargetFolderId(""); setBatchMoveVisible(true); }}
            >
              {'移动'}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedMaterialIds.size === 0}
              onClick={handleBatchDelete}
            >
              {'删除'}
            </Button>
          </div>
        </div>
      )}

      {materialsLoading ? (
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      ) : materials.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={'暂无材质'}
          className={styles.empty}
        />
      ) : (
        <div className={styles.materialsGrid}>
          {materials.map((m) => (
            <div key={m.id} className={`${styles.materialCard} ${batchMode && selectedMaterialIds.has(m.id) ? styles.materialSelected : ''}`}
              onClick={batchMode ? () => toggleSelectMaterial(m.id) : undefined}
            >
              <div className={styles.materialWrapper}>
                {batchMode && (
                  <div className={styles.materialCheckbox}>
                    <Checkbox checked={selectedMaterialIds.has(m.id)} />
                  </div>
                )}
                {m.thumbnail_url ? (
                  <img
                    src={m.thumbnail_url}
                    alt={m.name}
                    className={styles.materialImage}
                    draggable={!batchMode}
                    onDragStart={!batchMode ? onDragStart(m) : undefined}
                  />
                ) : (
                  <div
                    className={styles.noThumbnail}
                    draggable={!batchMode}
                    onDragStart={!batchMode ? onDragStart(m) : undefined}
                  >
                    <FolderOutlined />
                  </div>
                )}
                {!batchMode && (
                  <Dropdown menu={getPersonalMaterialMenu(m)} trigger={['click']}>
                    <div className={styles.materialMenuBtn} onClick={e => e.stopPropagation()}>
                      <MoreOutlined />
                    </div>
                  </Dropdown>
                )}
              </div>
              <div className={styles.materialName} title={m.name}>
                <span>{m.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Load more public materials
  const loadMorePublicMaterials = useCallback(() => {
    if (publicSelectedFolderId && publicHasMore && !publicMaterialsLoading) {
      fetchPublicMaterialsForFolder(publicSelectedFolderId, publicPage + 1, true);
    }
  }, [publicSelectedFolderId, publicHasMore, publicMaterialsLoading, publicPage, fetchPublicMaterialsForFolder]);

  // Scroll handler for public materials
  const publicMaterialsScrollRef = useRef<HTMLDivElement>(null);
  const handlePublicMaterialsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
      loadMorePublicMaterials();
    }
  }, [loadMorePublicMaterials]);

  // Render materials view (public)
  const renderPublicMaterialsView = () => (
    <div className={styles.materialsContainer}>
      <div className={styles.materialsHeader}>
        <div className={styles.backButton} onClick={goBackToPublicFolders}>
          <ArrowLeftOutlined />
          <span>{'返回'}</span>
        </div>
        <div className={styles.currentFolderName}>
          <FolderFilled className={styles.headerFolderIcon} />
          <span>{publicCurrentFolder?.name}</span>
          <span className={styles.materialCount}>({Number.isFinite(publicCurrentFolder?.material_count) ? publicCurrentFolder!.material_count : publicMaterials.length})</span>
        </div>
      </div>

      {publicMaterialsLoading && publicMaterials.length === 0 ? (
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      ) : publicMaterials.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={'暂无材质'}
          className={styles.empty}
        />
      ) : (
        <div className={styles.materialsGrid} onScroll={handlePublicMaterialsScroll} ref={publicMaterialsScrollRef}>
          {publicMaterials.map((m) => renderMaterialCard(m, true))}
          {publicMaterialsLoading && (
            <div className={styles.loadingMore}><Spin size="small" /></div>
          )}
          {publicHasMore && !publicMaterialsLoading && (
            <div className={styles.loadMoreBtn} onClick={loadMorePublicMaterials}>
              {'加载更多'}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render personal materials content
  const renderPersonalContent = () => (
    <div className={styles.content}>
      {loading && folders.length === 0 ? (
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      ) : currentView === 'folders' ? (
        renderPersonalFoldersView()
      ) : (
        renderPersonalMaterialsView()
      )}
    </div>
  );

  // Render public materials content
  const renderPublicContent = () => (
    <div className={styles.content}>
      {publicLoading && publicFolders.length === 0 ? (
        <div className={styles.loadingContainer}>
          <Spin />
        </div>
      ) : publicCurrentView === 'folders' ? (
        renderPublicFoldersView()
      ) : (
        renderPublicMaterialsView()
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className={styles.tabs}
        items={[
          {
            key: 'public',
            label: '公共材质',
            children: renderPublicContent(),
          },
          {
            key: 'personal',
            label: '我的材质',
            children: renderPersonalContent(),
          },
        ]}
      />

      {/* Create Folder Modal */}
      <Modal
        title={'新建文件夹'}
        open={createFolderVisible}
        onOk={handleCreateFolder}
        onCancel={() => {
          setCreateFolderVisible(false);
          setNewFolderName("");
        }}
        okText={'创建'}
        cancelText={'取消'}
        centered
        width={400}
        className={styles.folderModal}
      >
        <Input
          placeholder={'请输入文件夹名称'}
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          maxLength={100}
          onPressEnter={handleCreateFolder}
        />
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        title={'重命名文件夹'}
        open={renameFolderVisible}
        onOk={handleRenameFolder}
        onCancel={() => {
          setRenameFolderVisible(false);
          setRenamingFolder(null);
          setNewFolderName("");
        }}
        okText={'确定'}
        cancelText={'取消'}
        centered
        width={400}
        className={styles.folderModal}
      >
        <Input
          placeholder={'请输入新名称'}
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          maxLength={100}
          onPressEnter={handleRenameFolder}
        />
      </Modal>

      {/* Move Material Modal */}
      <Modal
        title={'移动材质'}
        open={moveMaterialVisible}
        onOk={handleMoveMaterial}
        onCancel={() => {
          setMoveMaterialVisible(false);
          setMovingMaterial(null);
          setTargetFolderId("");
        }}
        okText={'移动'}
        cancelText={'取消'}
        centered
        width={400}
        className={styles.folderModal}
      >
        <div className={styles.moveFolderList}>
          {folders
            .filter(f => f.id !== movingMaterial?.folder_id)
            .map(folder => (
              <div
                key={folder.id}
                className={`${styles.moveFolderItem} ${targetFolderId === folder.id ? styles.selected : ''}`}
                onClick={() => setTargetFolderId(folder.id)}
              >
                <FolderFilled />
                <span>{folder.name}</span>
                {folder.is_default && <span className={styles.defaultBadge}>{'默认'}</span>}
              </div>
            ))}
        </div>
      </Modal>

      {/* Rename Material Modal */}
      <Modal
        title={'重命名材质'}
        open={renameMaterialVisible}
        onOk={handleRenameMaterial}
        onCancel={() => {
          setRenameMaterialVisible(false);
          setRenamingMaterial(null);
          setNewMaterialName("");
        }}
        okText={'确定'}
        cancelText={'取消'}
        centered
        width={400}
        className={styles.folderModal}
      >
        <Input
          placeholder={'请输入新名称'}
          value={newMaterialName}
          onChange={e => setNewMaterialName(e.target.value)}
          maxLength={100}
          onPressEnter={handleRenameMaterial}
        />
      </Modal>

      {/* Batch Move Modal */}
      <Modal
        title={`批量移动 (${selectedMaterialIds.size} 个材质)`}
        open={batchMoveVisible}
        onOk={handleBatchMove}
        onCancel={() => {
          setBatchMoveVisible(false);
          setBatchTargetFolderId("");
        }}
        okText={'移动'}
        cancelText={'取消'}
        centered
        width={400}
        className={styles.folderModal}
      >
        <div className={styles.moveFolderList}>
          {folders
            .filter(f => f.id !== currentFolder?.id)
            .map(folder => (
              <div
                key={folder.id}
                className={`${styles.moveFolderItem} ${batchTargetFolderId === folder.id ? styles.selected : ''}`}
                onClick={() => setBatchTargetFolderId(folder.id)}
              >
                <FolderFilled />
                <span>{folder.name}</span>
                {folder.is_default && <span className={styles.defaultBadge}>{'默认'}</span>}
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
};

export default connect((state: any) => state.editor)(UserMaterialsAsset);
