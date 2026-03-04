import { useState, useEffect, useCallback, useRef } from 'react';
import { ColorPicker, Select, InputNumber, Segmented, Switch, Upload, Empty, Spin, message, Modal, Tabs, Input } from 'antd';
import {
    DeleteOutlined,
    LoadingOutlined,
    ExclamationCircleOutlined,
    EditOutlined,
    PictureOutlined,
} from '@ant-design/icons';
import { Editor3D } from '/@/3D/Editor';
import { connect } from 'react-redux';
import type { Color } from 'antd/es/color-picker';
import {
    getPublicBackgroundImages,
    getUserBackgroundImages,
    uploadBackgroundImage,
    deleteBackgroundImage,
    renameBackgroundImage,
    type BackgroundImage,
} from '/@/api/local';
import styles from './index.module.less';

const PAGE_SIZE = 50;

// Gradient type enum
enum GradientType {
    Solid = 0,
    Linear = 1,
    Radial = 2
}

// Gradient preset config
interface GradientPreset {
    id: string;
    startColor: string;
    endColor: string;
}

// 20 gradient presets for product display
const gradientPresets: GradientPreset[] = [
    // Classic gray-white
    { id: 'g1', startColor: '#f5f5f5', endColor: '#d0d0d0' },
    { id: 'g2', startColor: '#ffffff', endColor: '#e8e8e8' },
    { id: 'g3', startColor: '#f0f0f0', endColor: '#a0a0a0' },
    { id: 'g4', startColor: '#e8e8e8', endColor: '#b8b8b8' },
    // Warm tones
    { id: 'g5', startColor: '#fff5eb', endColor: '#ffd9b3' },
    { id: 'g6', startColor: '#fff8f0', endColor: '#ffe4c4' },
    { id: 'g7', startColor: '#fffaf5', endColor: '#ffecd9' },
    { id: 'g8', startColor: '#fff0e6', endColor: '#ffcc99' },
    // Cool tones
    { id: 'g9', startColor: '#f0f8ff', endColor: '#b8d4e8' },
    { id: 'g10', startColor: '#f5f9fc', endColor: '#cde0f0' },
    { id: 'g11', startColor: '#e8f4fc', endColor: '#a8c8e8' },
    { id: 'g12', startColor: '#f0f5fa', endColor: '#b0c8e0' },
    // Purple tones
    { id: 'g13', startColor: '#faf5ff', endColor: '#e0c8f0' },
    { id: 'g14', startColor: '#f8f0ff', endColor: '#d8b8f0' },
    { id: 'g15', startColor: '#f5f0fa', endColor: '#c8a8e0' },
    // Green tones
    { id: 'g16', startColor: '#f5fff5', endColor: '#c8e8c8' },
    { id: 'g17', startColor: '#f0fff0', endColor: '#b8e0b8' },
    // Premium business
    { id: 'g18', startColor: '#f8f8f8', endColor: '#2c2c2c' },
    { id: 'g19', startColor: '#ffffff', endColor: '#404040' },
    { id: 'g20', startColor: '#f0f0f0', endColor: '#1a1a1a' },
];

const BackgroundSider = (props: any) => {
    const { editorInit } = props;

    // Tab state: 'color' | 'assets' | 'upload'
    const [activeTab, setActiveTab] = useState<'color' | 'assets' | 'upload'>('color');

    // Gradient related state
    const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
    const [startColor, setStartColor] = useState('#ffffff');
    const [endColor, setEndColor] = useState('#e0e0e0');
    const [angle, setAngle] = useState(0);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

    // Transparent background
    const [transparent, setTransparent] = useState(false);

    // Background image related - local upload
    const [backgroundImage, setBackgroundImage] = useState<string>('');

    // Background images list state
    const [assetsTab, setAssetsTab] = useState<'public' | 'personal'>('public');
    const [publicImages, setPublicImages] = useState<BackgroundImage[]>([]);
    const [personalImages, setPersonalImages] = useState<BackgroundImage[]>([]);
    const [publicLoading, setPublicLoading] = useState(false);
    const [personalLoading, setPersonalLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [publicPage, setPublicPage] = useState(1);
    const [personalPage, setPersonalPage] = useState(1);
    const [publicHasMore, setPublicHasMore] = useState(false);
    const [personalHasMore, setPersonalHasMore] = useState(false);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

    // Rename modal state
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renamingImage, setRenamingImage] = useState<BackgroundImage | null>(null);
    const [renamingIsPublic, setRenamingIsPublic] = useState(false);
    const [newName, setNewName] = useState('');

    // Initialize data
    useEffect(() => {
        if (editorInit && Editor3D.instance) {
            const type = Editor3D.instance.getBackgroundGradientType?.();
            if (type === 1) {
                setGradientType('linear');
            } else if (type === 2) {
                setGradientType('radial');
            }

            const currentAngle = Editor3D.instance.getBackgroundGradientAngle?.();
            if (currentAngle !== undefined) {
                setAngle(currentAngle);
            }

            const start = Editor3D.instance.getBackgroundStartColor?.();
            const end = Editor3D.instance.getBackgroundEndColor?.();
            if (start) setStartColor(start);
            if (end) setEndColor(end);

            const imgUrl = Editor3D.instance.getBackgroundImageURL?.();
            if (imgUrl) setBackgroundImage(imgUrl);

            const trans = Editor3D.instance.getBackgroundTransparent?.();
            if (trans !== undefined) setTransparent(trans);
        }
    }, [editorInit]);

    useEffect(() => {
        if (!editorInit || !Editor3D.instance) return;

        const handleBackgroundImageChanged = (data: { imageUrl: string }) => {
            setBackgroundImage(data.imageUrl || '');
            setSelectedImageId(null);
        };

        Editor3D.instance.addEventListener('backgroundImageChanged', handleBackgroundImageChanged);
        return () => {
            Editor3D.instance?.removeEventListener('backgroundImageChanged', handleBackgroundImageChanged);
        };
    }, [editorInit]);

    // undo/redo 时同步渐变参数
    useEffect(() => {
        if (!editorInit || !Editor3D.instance) return;

        const handleBackgroundGradientChanged = () => {
            if (!Editor3D.instance) return;

            const type = Editor3D.instance.getBackgroundGradientType?.();
            if (type === 1) setGradientType('linear');
            else if (type === 2) setGradientType('radial');

            const currentAngle = Editor3D.instance.getBackgroundGradientAngle?.();
            if (currentAngle !== undefined) setAngle(currentAngle);

            const start = Editor3D.instance.getBackgroundStartColor?.();
            const end = Editor3D.instance.getBackgroundEndColor?.();
            if (start) setStartColor(start);
            if (end) setEndColor(end);

            setSelectedPreset(null);
        };

        Editor3D.instance.addEventListener('backgroundGradientChanged', handleBackgroundGradientChanged);
        return () => {
            Editor3D.instance?.removeEventListener('backgroundGradientChanged', handleBackgroundGradientChanged);
        };
    }, [editorInit]);

    // Fetch public background images
    const fetchPublicImages = useCallback(async (pageNum: number = 1, append = false) => {
        setPublicLoading(true);
        try {
            const result = await getPublicBackgroundImages(pageNum, PAGE_SIZE);
            if (append) {
                setPublicImages((prev) => [...prev, ...result.data]);
            } else {
                setPublicImages(result.data);
            }
            setPublicPage(pageNum);
            setPublicHasMore(result.meta.hasMore);
        } catch (err: any) {
            console.error('Failed to fetch public background images:', err);
            message.error(err?.message || '获取公共背景图失败');
        } finally {
            setPublicLoading(false);
        }
    }, []);

    // Fetch personal background images
    const fetchPersonalImages = useCallback(async (pageNum: number = 1, append = false) => {
        setPersonalLoading(true);
        try {
            const result = await getUserBackgroundImages(pageNum, PAGE_SIZE);
            if (append) {
                setPersonalImages((prev) => [...prev, ...result.data]);
            } else {
                setPersonalImages(result.data);
            }
            setPersonalPage(pageNum);
            setPersonalHasMore(result.meta.hasMore);
        } catch (err: any) {
            console.error('Failed to fetch personal background images:', err);
            message.error(err?.message || '获取背景图列表失败');
        } finally {
            setPersonalLoading(false);
        }
    }, []);

    // Load images when switching to assets tab
    useEffect(() => {
        if (activeTab === 'assets' && editorInit) {
            if (assetsTab === 'public' && publicImages.length === 0) {
                fetchPublicImages(1);
            } else if (assetsTab === 'personal' && personalImages.length === 0) {
                fetchPersonalImages(1);
            }
        }
    }, [activeTab, assetsTab, editorInit, fetchPublicImages, fetchPersonalImages, publicImages.length, personalImages.length]);

    // Refs to always hold the latest color values (avoid stale closures in onOpenChange)
    const latestStartColorRef = useRef(startColor);
    const latestEndColorRef = useRef(endColor);
    latestStartColorRef.current = startColor;
    latestEndColorRef.current = endColor;

    // Start color change (preview only, no undo record)
    const handleStartColorChange = useCallback((color: Color) => {
        const hex = color.toHexString();
        setStartColor(hex);
        setSelectedPreset(null);
        Editor3D.instance?.setGradientColors?.(hex, endColor, false, true);
    }, [endColor]);

    // End color change (preview only, no undo record)
    const handleEndColorChange = useCallback((color: Color) => {
        const hex = color.toHexString();
        setEndColor(hex);
        setSelectedPreset(null);
        Editor3D.instance?.setGradientColors?.(startColor, hex, false, true);
    }, [startColor]);

    // ColorPicker panel closed → record one undo
    const handleColorPickerClose = useCallback((open: boolean) => {
        if (!open) {
            Editor3D.instance?.setGradientColors?.(
                latestStartColorRef.current,
                latestEndColorRef.current
            );
        }
    }, []);

    // Select gradient preset
    const handlePresetSelect = useCallback((preset: GradientPreset) => {
        setSelectedPreset(preset.id);
        setStartColor(preset.startColor);
        setEndColor(preset.endColor);
        Editor3D.instance?.setGradientColors?.(preset.startColor, preset.endColor, true);
    }, []);

    // Gradient type change
    const handleGradientTypeChange = useCallback((value: string) => {
        const type = value as 'linear' | 'radial';
        setGradientType(type);
        setSelectedPreset(null);
        const gradientTypeEnum = type === 'radial' ? GradientType.Radial : GradientType.Linear;
        Editor3D.instance?.setBackgroundGradientType?.(gradientTypeEnum);
        Editor3D.instance?.setGradientColors?.(startColor, endColor, true);
        if (type === 'linear') {
            Editor3D.instance?.setBackgroundGradientAngle?.(angle, true);
        }
    }, [startColor, endColor, angle]);

    // Angle change
    const handleAngleChange = useCallback((value: number | null) => {
        const ang = value || 0;
        setAngle(ang);
        setSelectedPreset(null);
        Editor3D.instance?.setBackgroundGradientAngle?.(ang, true);
    }, []);

    // Angle shortcut buttons
    const angleShortcuts = [
        { angle: 315, icon: '↖' },
        { angle: 0, icon: '↑' },
        { angle: 45, icon: '↗' },
        { angle: 270, icon: '←' },
        { angle: -1, icon: '' },
        { angle: 90, icon: '→' },
        { angle: 225, icon: '↙' },
        { angle: 180, icon: '↓' },
        { angle: 135, icon: '↘' },
    ];

    // Generate gradient preview style
    const getPresetStyle = (preset: GradientPreset) => {
        return {
            background: `radial-gradient(circle, ${preset.startColor} 0%, ${preset.endColor} 100%)`
        };
    };

    // Handle upload
    const handleUpload = async (file: File) => {
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            Modal.warning({
                title: <span style={{ color: '#fff' }}>{'文件过大'}</span>,
                content: <span style={{ color: '#aaa' }}>{'背景图大小不能超过 5MB'}</span>,
                okText: '知道了',
                centered: true,
                styles: { body: { background: '#1e1e1e' }, mask: { background: 'rgba(0,0,0,0.6)' } },
                className: 'dark-confirm-modal',
            });
            return false;
        }

        setUploading(true);
        setUploadProgress(0);

        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return prev;
                }
                return prev + 10;
            });
        }, 200);

        try {
            const result = await uploadBackgroundImage(file);
            clearInterval(progressInterval);
            setUploadProgress(100);

            setTimeout(async () => {
                message.success('上传成功');
                setPersonalImages((prev) => [result, ...prev]);
                if (result.is_public) {
                    setPublicImages((prev) => [result, ...prev]);
                }

                setSelectedImageId(result.id);
                await Editor3D.instance?.setBackgroundImageURL?.(result.image_url);

                setBackgroundImage(result.image_url);

                setUploading(false);
                setUploadProgress(0);
            }, 300);
        } catch (err: any) {
            clearInterval(progressInterval);
            const limitCodes = ['BACKGROUND_LIMIT_REACHED', 'STORAGE_QUOTA_EXCEEDED'];
            if (limitCodes.includes(err?.code)) {
                Modal.confirm({
                    icon: <ExclamationCircleOutlined style={{ color: '#f5a623' }} />,
                    title: <span style={{ color: '#fff' }}>{err.code === 'STORAGE_QUOTA_EXCEEDED' ? '存储空间不足' : '背景图数量已达上限'}</span>,
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
        return false;
    };

    // Handle delete
    const handleDelete = (image: BackgroundImage, isPublic: boolean) => {
        Modal.confirm({
            title: '删除',
            icon: <ExclamationCircleOutlined />,
            content: `确定要删除背景图「${image.name}」？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            centered: true,
            className: styles.darkModal,
            onOk: async () => {
                try {
                    await deleteBackgroundImage(image.id, isPublic);
                    message.success('删除成功');
                    setPublicImages((prev) => prev.filter((m) => m.id !== image.id));
                    setPersonalImages((prev) => prev.filter((m) => m.id !== image.id));
                    if (selectedImageId === image.id) {
                        setSelectedImageId(null);
                    }
                } catch (err: any) {
                    message.error(err?.message || '删除失败');
                }
            },
        });
    };

    // Open rename modal
    const openRenameModal = (image: BackgroundImage, isPublic: boolean) => {
        setRenamingImage(image);
        setRenamingIsPublic(isPublic);
        setNewName(image.name);
        setRenameModalVisible(true);
    };

    // Handle rename
    const handleRename = async () => {
        if (!renamingImage || !newName.trim()) {
            message.warning('名称不能为空');
            return;
        }

        try {
            await renameBackgroundImage(renamingImage.id, newName.trim(), renamingIsPublic);
            message.success('重命名成功');

            const updateName = (m: BackgroundImage) =>
                m.id === renamingImage.id ? { ...m, name: newName.trim() } : m;
            setPublicImages((prev) => prev.map(updateName));
            setPersonalImages((prev) => prev.map(updateName));

            setRenameModalVisible(false);
            setRenamingImage(null);
            setNewName('');
        } catch (err: any) {
            message.error(err?.message || '重命名失败');
        }
    };

    // Apply background image to scene
    const applyBackgroundImage = (image: BackgroundImage) => {
        if (!Editor3D.instance) {
            message.warning('编辑器未初始化');
            return;
        }

        setSelectedImageId(image.id);
        setBackgroundImage(image.image_url);
        Editor3D.instance.setBackgroundImageURL?.(image.image_url);
        message.success('背景图已应用');
    };

    // Load more
    const loadMorePublic = () => {
        if (!publicLoading && publicHasMore) {
            fetchPublicImages(publicPage + 1, true);
        }
    };

    const loadMorePersonal = () => {
        if (!personalLoading && personalHasMore) {
            fetchPersonalImages(personalPage + 1, true);
        }
    };

    // Assets tab change
    const handleAssetsTabChange = (key: string) => {
        setAssetsTab(key as 'public' | 'personal');
        if (key === 'personal' && personalImages.length === 0) {
            fetchPersonalImages(1);
        } else if (key === 'public' && publicImages.length === 0) {
            fetchPublicImages(1);
        }
    };

    // Drag start handler for background image
    const onBgImageDragStart = (image: BackgroundImage) => (e: React.DragEvent) => {
        const dragData = {
            imageUrl: image.image_url,
            name: image.name,
        };
        e.dataTransfer.setData('backgroundImageData', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Render background image card
    const renderBgImageCard = (image: BackgroundImage, isPublic: boolean) => (
        <div
            key={image.id}
            className={`${styles.bgImageCard} ${selectedImageId === image.id ? styles.selected : ''}`}
            onClick={() => applyBackgroundImage(image)}
            draggable
            onDragStart={onBgImageDragStart(image)}
        >
            <div className={styles.bgImageWrapper}>
                {image.thumbnail_url || image.image_url ? (
                    <img
                        src={image.thumbnail_url || image.image_url}
                        alt={image.name}
                        className={styles.bgImage}
                        draggable={false}
                    />
                ) : (
                    <div className={styles.noThumbnail}>
                        <PictureOutlined />
                    </div>
                )}
                {/* Only show action buttons for personal images */}
                {!isPublic && (
                    <div className={styles.actionBtns}>
                        <div className={styles.editBtn} onClick={(e) => {
                            e.stopPropagation();
                            openRenameModal(image, isPublic);
                        }}>
                            <EditOutlined />
                        </div>
                        <div className={styles.deleteBtn} onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(image, isPublic);
                        }}>
                            <DeleteOutlined />
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.bgImageName} title={image.name}>
                {image.name}
            </div>
        </div>
    );

    // Render upload section (fixed at top)
    const renderUploadSection = () => (
        <div className={styles.uploadSection}>
            {/* Current background preview */}
            {backgroundImage && (
                <div className={styles.currentBgPreview}>
                    <img src={backgroundImage} alt={'当前背景'} />
                </div>
            )}
            <Upload
                accept=".jpg,.jpeg,.png,.svg"
                showUploadList={false}
                beforeUpload={handleUpload}
                disabled={uploading}
            >
                <div className={`${styles.uploadButton} ${uploading ? styles.uploading : ''}`}>
                    {uploading ? (
                        <>
                            <LoadingOutlined />
                            <span>{`上传中 ${uploadProgress}%`}</span>
                        </>
                    ) : (
                        <span>{'上传背景图'}</span>
                    )}
                </div>
            </Upload>
            <div className={styles.uploadHint}>JPG, PNG, SVG (max 5MB)</div>
            {backgroundImage && (
                <div
                    className={styles.clearButton}
                    onClick={() => {
                        setBackgroundImage('');
                        setSelectedImageId(null);
                        Editor3D.instance?.setBackgroundImageURL?.('');
                    }}
                >
                    {'清除背景图'}
                </div>
            )}
        </div>
    );

    // Render personal images list (scrollable)
    const renderPersonalImagesList = () => (
        <>
            {personalLoading && personalImages.length === 0 ? (
                <div className={styles.loadingContainer}>
                    <Spin />
                </div>
            ) : personalImages.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={'暂无上传的背景图'}
                    className={styles.empty}
                />
            ) : (
                <>
                    <div className={styles.bgImageGrid}>
                        {personalImages.map((img) => renderBgImageCard(img, false))}
                    </div>
                    {personalHasMore && (
                        <div className={styles.loadMore} onClick={loadMorePersonal}>
                            {personalLoading ? <Spin size="small" /> : '加载更多'}
                        </div>
                    )}
                </>
            )}
        </>
    );

    // Render public content
    const renderPublicContent = () => (
        <>
            {publicLoading && publicImages.length === 0 ? (
                <div className={styles.loadingContainer}>
                    <Spin />
                </div>
            ) : publicImages.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={'暂无公共背景图'}
                    className={styles.empty}
                />
            ) : (
                <>
                    <div className={styles.bgImageGrid}>
                        {publicImages.map((img) => renderBgImageCard(img, true))}
                    </div>
                    {publicHasMore && (
                        <div className={styles.loadMore} onClick={loadMorePublic}>
                            {publicLoading ? <Spin size="small" /> : '加载更多'}
                        </div>
                    )}
                </>
            )}
        </>
    );

    return (
        <div className={styles.backgroundWrapper}>
            {/* Tab switch */}
            <Segmented
                options={[
                    { label: '颜色', value: 'color' },
                    { label: '资源', value: 'assets' },
                    { label: '上传', value: 'upload' }
                ]}
                value={activeTab}
                onChange={(value) => setActiveTab(value as 'color' | 'assets' | 'upload')}
                block
                className={styles.tabSegmented}
            />

            {/* Color Tab */}
            {activeTab === 'color' && (
                <div className={styles.colorPanel}>
                    {/* Transparent background option */}
                    <div className={styles.transparentRow}>
                        <span>{'透明背景'}</span>
                        <Switch
                            checked={transparent}
                            onChange={(checked) => {
                                setTransparent(checked);
                                Editor3D.instance?.setBackgroundTransparent?.(checked);
                            }}
                            size="small"
                        />
                    </div>

                    {/* Gradient presets */}
                    {!transparent && (
                        <>
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>{'渐变预设'}</div>
                                <div className={styles.gradientGrid}>
                                    {gradientPresets.map((preset) => (
                                        <div
                                            key={preset.id}
                                            className={`${styles.gradientItem} ${selectedPreset === preset.id ? styles.selected : ''}`}
                                            style={getPresetStyle(preset)}
                                            onClick={() => handlePresetSelect(preset)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Custom gradient control */}
                            <div className={styles.section}>
                                <div className={styles.colorRow}>
                                    <div className={styles.colorInput}>
                                        <span>{'起始'}</span>
                                        <ColorPicker
                                            value={startColor}
                                            onChange={handleStartColorChange}
                                            onOpenChange={handleColorPickerClose}
                                            size="small"
                                        />
                                    </div>
                                    <div className={styles.colorInput}>
                                        <span>{'终止'}</span>
                                        <ColorPicker
                                            value={endColor}
                                            onChange={handleEndColorChange}
                                            onOpenChange={handleColorPickerClose}
                                            size="small"
                                        />
                                    </div>
                                </div>

                                <div className={styles.controlRow}>
                                    <Select
                                        value={gradientType}
                                        onChange={handleGradientTypeChange}
                                        options={[
                                            { label: '线性渐变', value: 'linear' },
                                            { label: '径向渐变', value: 'radial' }
                                        ]}
                                        className={styles.typeSelect}
                                    />
                                </div>

                                {gradientType === 'linear' && (
                                    <div className={styles.angleRow}>
                                        <InputNumber
                                            value={angle}
                                            onChange={handleAngleChange}
                                            min={0}
                                            max={360}
                                            formatter={(value) => `${value}°`}
                                            parser={(value) => parseInt(value?.replace('°', '') || '0')}
                                            className={styles.angleInput}
                                            controls={false}
                                        />
                                        <div className={styles.angleShortcuts}>
                                            {angleShortcuts.map((item, index) => (
                                                item.angle === -1 ? (
                                                    <div key="center" className={styles.angleCenter} />
                                                ) : (
                                                    <div
                                                        key={item.angle}
                                                        className={`${styles.angleBtn} ${angle === item.angle ? styles.active : ''}`}
                                                        onClick={() => handleAngleChange(item.angle)}
                                                    >
                                                        {item.icon}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Assets Tab */}
            {activeTab === 'assets' && (
                <div className={styles.assetsPanel}>
                    <Tabs
                        activeKey={assetsTab}
                        onChange={handleAssetsTabChange}
                        className={styles.bgTabs}
                        size="small"
                        items={[
                            {
                                key: 'public',
                                label: '公共背景',
                                children: (
                                    <div className={styles.imageListScroll}>
                                        {renderPublicContent()}
                                    </div>
                                ),
                            },
                            {
                                key: 'personal',
                                label: '我的背景',
                                children: (
                                    <div className={styles.imageListScroll}>
                                        {renderPersonalImagesList()}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className={styles.uploadPanel}>
                    {renderUploadSection()}
                </div>
            )}

            {/* Rename Modal */}
            <Modal
                title={'重命名'}
                open={renameModalVisible}
                onOk={handleRename}
                onCancel={() => {
                    setRenameModalVisible(false);
                    setRenamingImage(null);
                    setNewName('');
                }}
                okText={'确定'}
                cancelText={'取消'}
                centered
                width={360}
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

export default connect((state: any) => state.editor)(BackgroundSider);
