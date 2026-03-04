import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CameraOutlined, BulbOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Tree, Dropdown, Button } from 'antd';
import {
    Editor3D,
} from "/@/3D/Editor";
import ModelSvg from './icons/model.svg?react';
import GroupSvg from './icons/group.svg?react';
import styles from "./index.module.less"
import { connect } from 'react-redux';
import Icon from '@ant-design/icons';
import GlobalModal from '/@/components/GlobalModal';

import { DataNode } from 'antd/es/tree';

const parseTreeNode = (treeNode: any, parent?: any) => {
    let { uuid, name, type, children = [], isHelperObject, isDeferredLight, isPathMesh, isDecalRoot, isDecal } = treeNode;
    let icon: any = null;
    let nodeType = ""
    switch (type) {
        case "Camera":
            nodeType = "Camera"
            icon = <CameraOutlined />
            break;
        case "Light":
            nodeType = "Light"
            icon = <BulbOutlined />
            break;
        case "Node":
            //GroupSvg
            nodeType = "Node"
            icon = <Icon component={GroupSvg} />
            break;
        case "Mesh":
            nodeType = "Mesh"
            icon = <Icon component={ModelSvg} />
            break;
    }
    let config = {
        title: name,
        key: uuid,
        icon: icon,
        treeNode: treeNode,
        children: [],
        nodeType: nodeType,
        isHelperObject: isHelperObject,
        isDeferredLight,
        isPathMesh,
        isDecal,
        isDecalRoot
    };
    if (parent) {
        parent.children.push(config);
    }
    for (let i = 0; i < children.length; i++) {
        parseTreeNode(children[i], config)
    }
    return config
}
const findChildKeys = (node: any, keys: string[]) => {
    if (node.key) {
        keys.push(node.key)
    }
    if (node.children.length) {
        for (let i = 0; i < node.children.length; i++) {
            findChildKeys(node.children[i], keys)
        }
    }
}
const LeftSider = (props: any) => {
    const { editorInit, isInPanel = false } = props;
    const [treeData, setTreeData] = useState<any>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [instanceButtonShow, seInstanceButtonShow] = useState<boolean>(true);
    const [selectedKeys, setSelectedKeys] = useState<any>([]);

    const STORAGE_KEY = "BabylonEditorPro.LeftSider.TreeWidth";
    const MIN_TREE_WIDTH = 160;
    const DEFAULT_TREE_WIDTH = 180;
    const COLLAPSED_WIDTH = 24;
    const getMaxTreeWidth = () => {
        // 避免把左侧面板拖得过宽影响主视图；上限取窗口宽度的 60%，并限制在 800 以内
        const win = typeof window !== "undefined" ? window.innerWidth : 1200;
        return Math.max(MIN_TREE_WIDTH, Math.min(800, Math.floor(win * 0.6)));
    };

    const [treeWidth, setTreeWidth] = useState<number>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const val = raw ? Number(raw) : NaN;
            if (Number.isFinite(val) && val >= MIN_TREE_WIDTH) {
                return Math.min(val, getMaxTreeWidth());
            }
        } catch { }
        return DEFAULT_TREE_WIDTH;
    });
    const [collapsed, setCollapsed] = useState<boolean>(false);

    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; node: any }>({
        visible: false,
        x: 0,
        y: 0,
        node: null
    });
    const [deleteModal, setDeleteModal] = useState<{ visible: boolean; node: any }>({
        visible: false,
        node: null
    });

    const treeRef = useRef<any>();
    const treeWrapperRef = useRef<any>();
    const siderElRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef<{ dragging: boolean; startX: number; startWidth: number; latestWidth: number }>({
        dragging: false,
        startX: 0,
        startWidth: DEFAULT_TREE_WIDTH,
        latestWidth: DEFAULT_TREE_WIDTH
    });
    const applyWidthRafRef = useRef<number | null>(null);
    const resizeRafRef = useRef<number | null>(null);

    const applySiderWidth = useCallback((width: number) => {
        const wrapper = treeWrapperRef.current as HTMLElement | null;
        const sider = siderElRef.current ?? (wrapper?.closest?.(".ant-layout-sider") as HTMLElement | null);
        if (!sider) return;
        siderElRef.current = sider;
        const w = Math.max(MIN_TREE_WIDTH, Math.min(width, getMaxTreeWidth()));
        sider.style.width = `${w}px`;
        sider.style.flex = `0 0 ${w}px`;
        sider.style.maxWidth = `${w}px`;
        sider.style.minWidth = `${w}px`;
    }, []);

    useEffect(() => {
        // treeWidth 只会在初始化/拖拽结束时更新；这里触发一次 resize 保证画布尺寸正确
        const effectiveWidth = collapsed ? COLLAPSED_WIDTH : treeWidth;
        if (collapsed) {
            // 收起时允许宽度小于 MIN_TREE_WIDTH
            const wrapper = treeWrapperRef.current as HTMLElement | null;
            const sider = siderElRef.current ?? (wrapper?.closest?.(".ant-layout-sider") as HTMLElement | null);
            if (sider) {
                siderElRef.current = sider;
                sider.style.width = `${COLLAPSED_WIDTH}px`;
                sider.style.flex = `0 0 ${COLLAPSED_WIDTH}px`;
                sider.style.maxWidth = `${COLLAPSED_WIDTH}px`;
                sider.style.minWidth = `${COLLAPSED_WIDTH}px`;
            }
        } else {
            applySiderWidth(effectiveWidth);
        }
        if (resizeRafRef.current != null) {
            window.cancelAnimationFrame(resizeRafRef.current);
        }
        resizeRafRef.current = window.requestAnimationFrame(() => {
            resizeRafRef.current = null;
            // (Editor3D.instance as any)?.resize?.();
        });
    }, [applySiderWidth, collapsed, treeWidth]);

    const clampTreeWidth = useCallback((w: number) => {
        return Math.max(MIN_TREE_WIDTH, Math.min(w, getMaxTreeWidth()));
    }, []);

    const stopDragging = useCallback((finalWidth?: number) => {
        if (collapsed) return;
        if (!dragRef.current.dragging) return;
        dragRef.current.dragging = false;

        const body = document.body;
        body.style.userSelect = "";
        body.style.cursor = "";

        const w = clampTreeWidth(finalWidth ?? dragRef.current.latestWidth ?? treeWidth);
        dragRef.current.latestWidth = w;
        applySiderWidth(w);
        setTreeWidth(w);
        try {
            localStorage.setItem(STORAGE_KEY, String(w));
        } catch { }

        // 拖拽结束再 resize 一次即可（避免拖拽过程中卡顿）
        if (resizeRafRef.current != null) {
            window.cancelAnimationFrame(resizeRafRef.current);
        }
        resizeRafRef.current = window.requestAnimationFrame(() => {
            resizeRafRef.current = null;
            // (Editor3D.instance as any)?.resize?.();
        });
    }, [applySiderWidth, clampTreeWidth, treeWidth]);

    const onSplitterPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (collapsed) return;
        e.preventDefault();
        e.stopPropagation();

        // 用 pointer capture 抢占后续 move/up，避免被 canvas/全局事件“吞掉”
        e.currentTarget.setPointerCapture(e.pointerId);

        dragRef.current.dragging = true;
        dragRef.current.startX = e.clientX;
        // 以实际 Sider 宽度为准（避免 state 还没同步导致“慢一拍/跳一下”）
        const wrapper = treeWrapperRef.current as HTMLElement | null;
        const sider = wrapper?.closest?.(".ant-layout-sider") as HTMLElement | null;
        dragRef.current.startWidth = sider?.getBoundingClientRect?.().width ?? treeWidth;
        dragRef.current.latestWidth = dragRef.current.startWidth;

        const body = document.body;
        body.style.userSelect = "none";
        body.style.cursor = "col-resize";
    }, [treeWidth]);

    const onSplitterPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (collapsed) return;
        if (!dragRef.current.dragging) return;
        const next = clampTreeWidth(dragRef.current.startWidth + (e.clientX - dragRef.current.startX));
        dragRef.current.latestWidth = next;
        // 拖拽过程按帧合并更新，避免高频写样式导致明显延迟/卡顿
        if (applyWidthRafRef.current == null) {
            applyWidthRafRef.current = window.requestAnimationFrame(() => {
                applyWidthRafRef.current = null;
                applySiderWidth(dragRef.current.latestWidth);
            });
        }
        // 拖拽过程中不要实时调用 Editor3D.resize（会导致 RenderCanvas 卡顿）
    }, [applySiderWidth, clampTreeWidth]);

    const onSplitterPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch { }
        stopDragging(dragRef.current.latestWidth);
    }, [stopDragging]);

    const toggleCollapsed = useCallback(() => {
        // 关闭右键菜单，避免收起后遗留在屏幕上
        setContextMenu((prev) => ({ ...prev, visible: false }));
        setCollapsed((v) => !v);
    }, []);

    useEffect(() => {
        return () => {
            if (applyWidthRafRef.current != null) {
                window.cancelAnimationFrame(applyWidthRafRef.current);
                applyWidthRafRef.current = null;
            }
            if (resizeRafRef.current != null) {
                window.cancelAnimationFrame(resizeRafRef.current);
                resizeRafRef.current = null;
            }
            const wrapper = treeWrapperRef.current as HTMLElement | null;
            const sider = wrapper?.closest?.(".ant-layout-sider") as HTMLElement | null;
            if (sider) {
                sider.style.width = "";
                sider.style.flex = "";
                sider.style.maxWidth = "";
                sider.style.minWidth = "";
            }
            siderElRef.current = null;
        };
    }, []);
    const updateExtends = (key: string) => {
        setExpandedKeys((prevExpandedKeys) => {
            if (!prevExpandedKeys.includes(key)) {

                return [...prevExpandedKeys, key];
            }
            return prevExpandedKeys;
        });
    }

    useEffect(() => {
        const onModelSelected = (data: any) => {
            if (data && data.key) {
                setSelectedKeys([data.key])
                updateExtends(data.key)
            } else {
                setSelectedKeys([])
            }
        }
        const onSceneTreeUpdate = () => {
            let treeDatas = [];
            let config = {
                title: '场景',
                key: "root",
                selectable: false,
                icon: <Icon component={GroupSvg} />,
                treeNode: null,
                children: []
            };
            treeDatas.push(config);
            // debugger
            let sceneTrees = Editor3D.instance.getSceneTree();
            if (sceneTrees)
                for (let i = 0; i < sceneTrees.length; i++) {
                    parseTreeNode(sceneTrees[i], config);

                }

            setTreeData(treeDatas)
        }
        if (editorInit) {
            let sceneTrees = Editor3D.instance.getSceneTree();
            let treeDatas = [];
            let config = {
                title: '场景',
                key: "root",
                selectable: false,
                icon: <Icon component={GroupSvg} />,
                treeNode: null,
                children: [],

            };
            treeDatas.push(config);
            if (sceneTrees)
                for (let i = 0; i < sceneTrees.length; i++) {
                    parseTreeNode(sceneTrees[i], config);

                }
            (Editor3D.instance as any)?.addEventListener?.("sceneTreeUpdated", onSceneTreeUpdate);
            (Editor3D.instance as any)?.addEventListener?.("selectedModel", onModelSelected);
            if (treeDatas && treeDatas.length > 0) {
                setExpandedKeys([treeDatas[0].key])

            }

            setTreeData(treeDatas)

        }

        return () => {
            if (editorInit) {
                (Editor3D.instance as any)?.removeEventListener?.("sceneTreeUpdated", onSceneTreeUpdate)
            }
            (Editor3D.instance as any)?.removeEventListener?.("selectedModel", onModelSelected)
        }
    }, [editorInit])
    const onExpand = useCallback((keys: any, info: any) => {
        let _expandedKeys = [...expandedKeys];

        let { expanded, node } = info;
        if (expanded) {
            if (!_expandedKeys.includes(node.key)) {
                _expandedKeys.push(node.key)
            }
        } else {
            //关闭
            let keys: string[] = []
            findChildKeys(node, keys);
            keys.forEach(key => {
                if (_expandedKeys.includes(key)) {
                    let index = _expandedKeys.indexOf(key);
                    _expandedKeys.splice(index, 1)
                }
            })
        }
        setExpandedKeys(_expandedKeys)
    }, [expandedKeys])
    const onSelect = useCallback((selectedKeys: React.Key[], info: any) => {

        let { node } = info;
        if (node.treeNode) {
            if (Editor3D.instance) {
                Editor3D.instance.selectByNodeInfo(node.treeNode)
            }
        }

        setSelectedKeys([node.key])

    }, []);

    const onDrop = useCallback((key: string) => {
        // 
        // debugger
        return (ev: any) => {
            var materialId = ev.dataTransfer.getData('materialId');
            if (materialId) {
                let nodeid = key;
                if (Editor3D.instance) {
                    Editor3D.instance.setNodeMaterialById(nodeid, materialId)
                }
            }


        }
    }, [])
    const onTreeDrop = useCallback((info: any) => {

        // let { dragNode, dragNodesKeys, dropPosition, node } = info;
        //目标节点的key值
        const dropKey = info.node.key;
        //拖拽节点的key值
        const dragKey = info.dragNode.key;
        const dropPos = info.node.pos.split('-');
        //拖拽放置的位置

        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
        const loop = (
            data: DataNode[],
            key: React.Key,
            callback: (node: DataNode, i: number, data: DataNode[]) => void,
        ) => {
            for (let i = 0; i < data.length; i++) {
                if (data[i].key === key) {
                    return callback(data[i], i, data);
                }
                if (data[i].children) {
                    loop(data[i].children!, key, callback);
                }
            }
        };
        const data = [...treeData];
        let dragObj: DataNode | undefined;
        //查询被拖拽的节点，并且先从原UI数组剥离
        loop(data, dragKey, (item, index, arr) => {
            arr.splice(index, 1);
            dragObj = item;
        });
        if (!dragObj) {
            return
        }
        if (!info.dropToGap) {
            //拖拽到节点，加入该节点并且作为子节点
            loop(data, dropKey, item => {

                item.children = item.children || [];
                //默认添加到头部
                item.children.unshift(dragObj as any);
                // debugger
                if (Editor3D.instance) {
                    Editor3D.instance.dragSelectNodeToTargetNodes((dragObj as any).treeNode, (item as any).treeNode, true)
                }

            });
        }

        else {
            let ar: DataNode[] = [];
            let i: number;
            let targetNode = null;
            loop(data, dropKey, (_item, index, arr) => {
                ar = arr;
                targetNode = _item;
                //目标key的下标
                i = index;

            });
            if (dropPosition === -1) {
                //插入到当前节点之前
                if (!dragObj) {
                    return
                }
                if (!(ar[i!] as any).treeNode) {
                    return;
                }
                ar.splice(i!, 0, dragObj!);

                if (Editor3D.instance) {

                    Editor3D.instance.dragSelectNodeToTargetNodes((dragObj! as any).treeNode, (targetNode! as any).treeNode, false, true)
                }
            } else {
                //插入到当前节点之后
                if (!(ar[i!] as any).treeNode) {
                    return;
                }
                ar.splice(i! + 1, 0, dragObj!);
                // debugger
                if (Editor3D.instance) {

                    Editor3D.instance.dragSelectNodeToTargetNodes((dragObj! as any).treeNode, (ar[i!] as any).treeNode, false, false)
                }
            }
        }
        setTreeData(data)
    }, [treeData])
    const handleContextMenu = useCallback((e: React.MouseEvent, node: any) => {
        e.preventDefault();

        if (node?.isHelperObject && !node?.isDeferredLight && !node?.isPathMesh) {
            return;
        }
        if (node?.isDecalRoot ||
            node?.isDecal) {
            return;
        }
        if (node) {
            if (node.nodeType != "Light" &&
                node.nodeType != "Camera" &&
                !node?.isDeferredLight &&
                !node?.isPathMesh
            ) {
                seInstanceButtonShow(true)
            } else {
                seInstanceButtonShow(false)
            }
        }

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            node: node
        });
    }, []);

    const handleCopy = useCallback(() => {
         
        if (contextMenu.node && contextMenu.node.treeNode) {
            if (contextMenu.node?.treeNode?.isDeferredLight) {
                let lightUUid = Editor3D.instance?.getDeferredLightUUid(contextMenu.node?.treeNode?.node);
                Editor3D.instance?.cloneDeferredLightByUUid(lightUUid);
            } else if (contextMenu.node?.treeNode?.isPathMesh) {
                let { pathType, pathId } = Editor3D.instance?.getPathTypeAndUUid(contextMenu.node?.treeNode?.node);
                if (!pathType || !pathId) {
                    return
                }
                Editor3D.instance?.coyPathByUUid(pathId, pathType);
            } else {
                if (contextMenu.node?.treeNode?.isHelperObject) {
                    return;
                }
                Editor3D.instance?.copyModelById(contextMenu.node?.treeNode?.node.id);

            }

        }
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, [contextMenu.node]);

    const handleDelete = useCallback(() => {
        if (contextMenu.node && contextMenu.node.treeNode) {

            if (!Editor3D.instance?.hasInstanceNode(contextMenu.node?.treeNode?.node.id)) {
                if (contextMenu.node?.treeNode?.isDeferredLight) {
                    let lightUUid = Editor3D.instance?.getDeferredLightUUid(contextMenu.node?.treeNode?.node);
                    Editor3D.instance?.removeDeferredLightByUUid(lightUUid);

                } else if (contextMenu.node?.treeNode?.isPathMesh) {
                    let { pathType, pathId } = Editor3D.instance?.getPathTypeAndUUid(contextMenu.node?.treeNode?.node);
                    if (!pathType || !pathId) {
                        return
                    }
                    Editor3D.instance?.removePathByUUid(pathId, pathType);
                } else {
                    if (contextMenu.node?.treeNode?.isHelperObject) {
                        return;
                    }
                    Editor3D.instance?.deleteNodeById(contextMenu.node?.treeNode?.node.id);

                }

            } else {
                setDeleteModal({
                    visible: true,
                    node: contextMenu.node
                });
            }

        }
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, [contextMenu.node]);

    const confirmDelete = useCallback(() => {
        if (deleteModal.node && deleteModal.node.treeNode) {

            Editor3D.instance?.deleteNodeById(deleteModal.node?.treeNode?.node.id);

        }
        setDeleteModal({ visible: false, node: null });
    }, [deleteModal.node]);

    const cancelDelete = useCallback(() => {
        setDeleteModal({ visible: false, node: null });
    }, []);

 

    // 监听全局点击事件，点击其他地方关闭菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenu.visible) {
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };

        if (contextMenu.visible) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [contextMenu.visible]);

    return (
        <div
            className={styles.treeWrapper}
            ref={treeWrapperRef}
            onContextMenu={(e) => e.preventDefault()}
        >
            {!collapsed && (
                <div className={styles.treeScroll}>
                <Tree
                    onDrop={onTreeDrop}
                    draggable={true}
                    ref={treeRef}
                    blockNode={true}

                    expandedKeys={expandedKeys}
                    selectedKeys={selectedKeys}
                    className={styles.treeMenu}
                    showLine={true}
                    showIcon={true}
                    virtual={false}
                    autoExpandParent={true}

                    onSelect={onSelect}
                    treeData={treeData}
                    titleRender={(node) => (
                        <span
                            onDrop={onDrop((node.key as string))}
                            onContextMenu={(e) => handleContextMenu(e, node)}
                            style={{ cursor: 'pointer' }}
                        >
                            {node.title as string}
                        </span>
                    )}
                    onExpand={onExpand}

                >
                </Tree>
                {contextMenu.visible && (
                    <div
                        style={{
                            position: 'fixed',
                            left: contextMenu.x,
                            top: contextMenu.y,
                            zIndex: 1000,
                        background: 'var(--editor-pop-bg, #2a2a2a)',
                        border: '1px solid var(--editor-border, #444)',
                            borderRadius: '4px',
                            padding: '4px 0',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        <Button
                            type="text"
                            // icon={<CopyOutlined />}
                            onClick={handleCopy}
                            style={{ display: 'block', width: '100%', textAlign: 'left', color: '#fff', border: 'none', background: 'transparent', padding: '8px 16px' }}
                        >
                            {'复制'}
                        </Button>
                        <Button
                            type="text"
                            // icon={<DeleteOutlined />}
                            onClick={handleDelete}
                        style={{ display: 'block', width: '100%', textAlign: 'left', color: '#ff4d4f', border: 'none', background: 'transparent', padding: '8px 16px' }}
                        >
                            {'删除'}
                        </Button>
                    </div>
                )}

                <GlobalModal
                    visible={deleteModal.visible}
                    title={'确认删除'}
                    content={`${deleteModal.node?.title || '选中项'}带有实例，确认删除吗？此操作不可撤销。`}
                    onOk={confirmDelete}
                    onCancel={cancelDelete}
                    okText={'确定删除'}
                    cancelText={'取消'}
                />
                </div>
            )}

            {/* Splitter：拖拽调整左侧树面板宽度（面板模式下不显示） */}
            {!collapsed && !isInPanel && (
                <div
                    className={styles.splitter}
                    onPointerDown={onSplitterPointerDown}
                    onPointerMove={onSplitterPointerMove}
                    onPointerUp={onSplitterPointerUp}
                    onPointerCancel={onSplitterPointerUp}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={'调整树面板宽度'}
                />
            )}

            {/* 收起/展开按钮：位于组件中间（面板模式下不显示） */}
            {!isInPanel && (
                <div
                    className={styles.collapseBtn}
                    onClick={toggleCollapsed}
                    role="button"
                    aria-label={collapsed ? '展开左侧树面板' : '收起左侧树面板'}
                >
                    {collapsed ? <RightOutlined /> : <LeftOutlined />}
                </div>
            )}
        </div>
    );
};

export default connect((state: any) => state.editor)(LeftSider)
