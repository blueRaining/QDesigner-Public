import React, { useState, useCallback } from 'react'
import {
    ApartmentOutlined,
    AppstoreOutlined,
    BgColorsOutlined,
    CloseOutlined,
    BulbOutlined,
    BorderOuterOutlined,
    GlobalOutlined
} from '@ant-design/icons'
import LeftSider from "../LeftSider"
import MaterialAsset from "../Asset/MaterialAsset"
import UserMaterialsAsset from "../Asset/UserMaterialsAsset"
import EnvironmentMapsAsset from "../Asset/EnvironmentMapsAsset"
import LightingSider from "../RightSider/lightingSider"
import BackgroundSider from "../RightSider/backgroundSider"
import './index.less'

interface TabItem {
    key: string
    icon: React.ReactNode
    label: string
    content: React.ReactNode
}

/**
 * DesignSidebar - 与 EditorSidebar 功能对齐
 * 竖直 tab 列表，点击展开对应内容面板
 */
const DesignSidebar: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string | null>(null)

    const tabs: TabItem[] = [
        {
            key: 'scene',
            icon: <ApartmentOutlined />,
            label: '场景',
            content: <LeftSider isInPanel={true} />
        },
        {
            key: 'material',
            icon: <AppstoreOutlined />,
            label: '场景材质',
            content: <MaterialAsset />
        },
        {
            key: 'userMaterials',
            icon: <BgColorsOutlined />,
            label: '材质库',
            content: <UserMaterialsAsset />
        },
        {
            key: 'environmentMaps',
            icon: <GlobalOutlined />,
            label: '环境球',
            content: <EnvironmentMapsAsset />
        },
        {
            key: 'lighting',
            icon: <BulbOutlined />,
            label: '灯光',
            content: <LightingSider />
        },
        {
            key: 'background',
            icon: <BorderOuterOutlined />,
            label: '背景',
            content: <BackgroundSider />
        }
    ]

    const handleTabClick = useCallback((key: string) => {
        setActiveTab(prev => prev === key ? null : key)
    }, [])

    const handleClose = useCallback(() => {
        setActiveTab(null)
    }, [])

    const activeTabData = tabs.find(tab => tab.key === activeTab)

    return (
        <div className="design-sidebar">
            {/* 左侧 tab 栏 */}
            <div className="design-sidebar-tabs">
                {tabs.map(tab => (
                    <div
                        key={tab.key}
                        className={`design-sidebar-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.key)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </div>
                ))}
            </div>

            {/* 展开的内容面板 */}
            {activeTab && activeTabData && (
                <div className="design-sidebar-panel">
                    <div className="panel-header">
                        <span className="panel-title">{activeTabData.label}</span>
                        <CloseOutlined className="panel-close" onClick={handleClose} />
                    </div>
                    <div className="panel-content">
                        {activeTabData.content}
                    </div>
                </div>
            )}
        </div>
    )
}

export default DesignSidebar
