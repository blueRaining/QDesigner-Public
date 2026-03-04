import Icon, { CaretDownOutlined, PlusOutlined } from '@ant-design/icons';
import Rotate from './icons/rotate.svg?react';
import Translate from './icons/translate.svg?react';
import Scale from './icons/scale.svg?react';
import ScreenShot from './icons/screenShot.svg?react';
import Redo from './icons/redo.svg?react';
import Undo from './icons/undo.svg?react';
import Delete from './icons/delete.svg?react';
import styles from "./index.module.less"
import { Tooltip, Dropdown } from "antd"
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useReducer } from 'react';
import { connect } from 'react-redux';
import { Editor3D } from '/@/3D/Editor';

/**
 * ToolsBar - 底部悬浮工具栏
 * 水平排列，居中显示在页面底部
 */
const ToolsBar = (props: any) => {
    const { editorInit } = props;
    // 用于触发重新渲染，获取最新的 Editor3D 状态
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    // 监听 modelLoaded 事件，当模型加载完成时更新状态
    useEffect(() => {
        if (!editorInit) return;

        const handleModelLoaded = () => {
            // 延迟一帧确保 Editor3D 内部状态已完全初始化
            requestAnimationFrame(() => {
                forceUpdate();
            });
        };

        Editor3D.instance.addEventListener('modelLoaded', handleModelLoaded);

        return () => {
            Editor3D.instance?.removeEventListener('modelLoaded', handleModelLoaded);
        };
    }, [editorInit]);

    const onToolClick = useCallback((action: string) => {
        return () => {
            if (Editor3D.instance) {
                Editor3D.instance.onToolsClick(action)
            }
        }
    }, [])

    // 基本体菜单点击处理
    const handleCreateBaseObject = useCallback((type: string) => {
        if (Editor3D.instance) {
            Editor3D.instance.createBaseObject(type);
        }
    }, []);

    // 基本体下拉菜单项
    const baseObjectMenuItems: MenuProps['items'] = [
        ['空节点', "Node"],
        ['球体', "Sphere"],
        ['正方体', "Box"],
        ['圆柱', "Cylinder"],
        ['圆锥', "Cone"],
        ['胶囊体', "Capsule"],
        ['圆环', "Torus"],
        ['圆盘', "Disc"],
        ['平面', "Plane"],
        ['地面', "Ground"],
    ].map(([label, type]) => ({
        key: type,
        label: <span>{label}</span>,
        onClick: () => handleCreateBaseObject(type)
    }));

    return (
        <div className={styles.toolsBarContainer}>
            <div className={styles.toolsBarWrapper}>
                <Tooltip placement="top" title={'平移'}>
                    <div className={styles.toolIcon} onClick={onToolClick("translate")}>
                        <Icon component={Translate} />
                    </div>
                </Tooltip>
                <Tooltip placement="top" title={'旋转'}>
                    <div className={styles.toolIcon} onClick={onToolClick("rotation")}>
                        <Icon component={Rotate} />
                    </div>
                </Tooltip>
                <Tooltip placement="top" title={'缩放'}>
                    <div className={styles.toolIcon} onClick={onToolClick("scale")}>
                        <Icon component={Scale} />
                    </div>
                </Tooltip>
                <div className={styles.divider} />
                <Tooltip placement="top" title={'删除'}>
                    <div className={styles.toolIcon} onClick={onToolClick("delete")}>
                        <Icon component={Delete} />
                    </div>
                </Tooltip>
                <Tooltip placement="top" title={'截图'}>
                    <div className={styles.toolIcon} onClick={onToolClick("screenShot")}>
                        <Icon component={ScreenShot} />
                    </div>
                </Tooltip>
                <div className={styles.divider} />
                <Tooltip placement="top" title={'撤销'}>
                    <div className={styles.toolIcon} onClick={onToolClick("undo")}>
                        <Icon component={Undo} />
                    </div>
                </Tooltip>
                <Tooltip placement="top" title={'重做'}>
                    <div className={styles.toolIcon} onClick={onToolClick("redo")}>
                        <Icon component={Redo} />
                    </div>
                </Tooltip>
                <div className={styles.divider} />
                <Dropdown
                    menu={{ items: baseObjectMenuItems }}
                    placement="top"
                    trigger={['click']}
                    overlayClassName={styles.groundDropdown}
                >
                    <Tooltip placement="top" title={'创建基本体'}>
                        <div className={styles.toolIconWithBadge}>
                            <PlusOutlined style={{ fontSize: 18 }} />
                            <CaretDownOutlined className={styles.dropdownArrow} />
                        </div>
                    </Tooltip>
                </Dropdown>
            </div>
        </div>
    )
}

export default connect((state: any) => state.editor)(ToolsBar)