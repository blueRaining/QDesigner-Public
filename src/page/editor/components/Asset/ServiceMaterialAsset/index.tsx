import { useEffect, useState, useCallback } from "react";
import { connect } from "react-redux";
import { Image, Button, Modal, Input, message, ConfigProvider, theme } from "antd";
import { FolderFilled, ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import "./index.less";
import { materialCategories } from '/@/page/editor/datas/materials';

const ServiceMaterialAsset = (props: any) => {
    // 材质分类数据
    const [categories, setCategories] = useState<any[]>(materialCategories);
    // 当前选中的分类，null 表示文件夹视图
    const [currentCategory, setCurrentCategory] = useState<any>(null);
    
    // 弹窗相关状态
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const onDragStart = (data: any) => {
        return (e: any) => {
            e.dataTransfer.setData('serviceMaterialData', JSON.stringify(data));
        };
    };

    const handleFolderClick = (category: any) => {
        setCurrentCategory(category);
    };

    const handleBack = () => {
        setCurrentCategory(null);
    };

    const showCreateModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNewFolderName("");
        setIsModalVisible(true);
    };

    const handleModalOk = () => {
        if (!newFolderName.trim()) {
            message.warning('请输入文件夹名称');
            return;
        }

        const newCategory = {
            class: `custom_${Date.now()}`,
            label: newFolderName.trim(),
            datas: []
        };

        setCategories([...categories, newCategory]);
        setIsModalVisible(false);
        message.success('文件夹创建成功');
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
    };

    // 渲染文件夹列表
    const renderFolderList = () => {
        return (
            <div className="folderGrid">
                {categories.map((category: any) => (
                    <div 
                        className="folderItem" 
                        key={category.class} 
                        onClick={() => handleFolderClick(category)}
                    >
                        <FolderFilled className="folderIcon" />
                        <span className="folderLabel">{category.label}</span>
                    </div>
                ))}
                {/* 创建文件夹按钮 */}
                <div className="folderItem addFolderItem" onClick={showCreateModal}>
                    <PlusOutlined className="folderIcon addIcon" />
                    <span className="folderLabel">{'新建文件夹'}</span>
                </div>
            </div>
        );
    };

    // 渲染特定分类下的素材列表
    const renderMaterialList = (category: any) => {
        return (
            <div className="detailView">
                <div className="detailHeader">
                    <Button 
                        size="small" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={handleBack}
                        className="backBtn"
                    >
                        {'返回'}
                    </Button>
                    <span className="categoryTitle">{category.label}</span>
                </div>
                <div className="materialGrid">
                    {category.datas.map((item: any, index: number) => (
                        <div className="imageContainer" key={index}>
                            <Image
                                style={{
                                    backgroundColor: item.actived ? "rgba(255, 138, 0, 0.1)" : "transparent",
                                    border: item.actived ? "2px solid #ff8a00" : "1px solid rgba(255, 255, 255, 0.06)",
                                    backgroundImage: `url("./images/bg3.png")`,
                                    backgroundSize: "cover",
                                    objectFit: 'contain'
                                }}
                                onDragStart={onDragStart(item)}
                                preview={false}
                                width="100%"
                                src={item.imagePath}
                            />
                            <div className="itemName" title={item.name}>
                                <span>{item.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="ServiceMaterialAsset">
            {currentCategory ? renderMaterialList(currentCategory) : renderFolderList()}

            <ConfigProvider
                theme={{
                    algorithm: theme.darkAlgorithm,
                    token: {
                        colorPrimary: 'rgba(255, 255, 255, 0.1)', // 彻底禁用橘色
                    },
                }}
            >
                <Modal
                    title={'新建文件夹'}
                    open={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={handleModalCancel}
                    okText={'确定'}
                    cancelText={'取消'}
                    centered
                    destroyOnClose
                    width={480}
                    rootClassName="customDarkModalRoot"
                    styles={{
                        content: { 
                            height: 360, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            padding: 0, 
                            backgroundColor: '#161616', 
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px' 
                        },
                        header: { padding: '20px 24px', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' },
                        body: { flex: 1, display: 'flex', alignItems: 'center', padding: '0 40px' },
                        footer: { padding: '20px 24px', margin: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }
                    }}
                >
                    <div style={{ width: '100%' }}>
                        <input
                            className="customInput"
                            placeholder={'请输入文件夹名称'}
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleModalOk()}
                            autoFocus
                            style={{
                                width: '100%',
                                height: '52px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                padding: '0 16px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'all 0.3s'
                            }}
                        />
                    </div>
                </Modal>
            </ConfigProvider>
        </div>
    );
};

export default connect((state: any) => state.editor)(ServiceMaterialAsset);
