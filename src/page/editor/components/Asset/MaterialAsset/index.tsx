import { useEffect, useState, useCallback } from "react";
import { connect } from "react-redux"
import {
    Editor3D,
} from "/@/3D/Editor";
import { Image, message } from "antd";
import SaveMaterialModal from "../../SaveMaterialModal";
import styles from "./index.module.less"

interface MaterialExportData {
    materialData: any;
    thumbImageData: {
        name: string;
        data: Blob;
    } | null;
    imageData: Map<string, Blob>;
}

let MaterialAsset = (props: any) => {
    const { editorInit } = props;
    const [element, setElement] = useState<any>([])
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [exportedMaterialData, setExportedMaterialData] = useState<MaterialExportData | null>(null);
    const [exporting, setExporting] = useState(false);

    // 拖拽已禁用
    // const onDragStart = (data: any) => {
    //     return (e: any) => {
    //         e.dataTransfer.setData('materialId', data);
    //     }
    // }
    const onClick = (data: any) => {
        return (e: any) => {
            Editor3D.instance.getMaterialUIById(data);
            setSelectedMaterialId(data);
            if (element) {
                element.forEach((child: any) => {
                    child.actived = false;
                    if (child.id == data) {
                        child.actived = true;
                    }
                });
                setElement([...element])
            }
        }
    }

    // Handle export start event
    const handleExportStart = useCallback(() => {
        setExporting(true);
    }, []);

    // Handle export complete event
    const handleExportComplete = useCallback((event: any) => {
        debugger
        setExporting(false);
        const detail = event.detail;

        // If detail is null, don't upload
        if (!detail) {
            message.info('没有可导出的材质数据');
            return;
        }

        setExportedMaterialData(detail);
        setSaveModalVisible(true);
    }, []);

    // Handle save modal success
    const handleSaveSuccess = useCallback(() => {
        setSaveModalVisible(false);
        setExportedMaterialData(null);
    }, []);

    // Handle save modal cancel
    const handleSaveCancel = useCallback(() => {
        setSaveModalVisible(false);
        setExportedMaterialData(null);
    }, []);

    useEffect(() => {
        let onImageDataChanged = () => {
            let imageData = Editor3D.instance.getAllMaterialImages() as Map<any, any>;
            if (imageData) {
                let datas: any = [];
                imageData.forEach((value, info) => {
                    datas.push({
                        id: info.id,
                        url: value,
                        actived: info.metadata?.selected ?? false,
                        name: info.name
                    })
                });

                setElement(datas)

            }
        }

        if (editorInit) {
            Editor3D.instance.addEventListener("materialThumbChanged", onImageDataChanged);
            Editor3D.instance.addEventListener("startExportMaterial", handleExportStart);
            Editor3D.instance.addEventListener("endExportMaterial", handleExportComplete);

            onImageDataChanged()

        }
        return () => {
            Editor3D.instance.removeEventListener("materialThumbChanged", onImageDataChanged);
            Editor3D.instance.removeEventListener("startExportMaterial", handleExportStart);
            Editor3D.instance.removeEventListener("endExportMaterial", handleExportComplete);

        }
    }, [editorInit, handleExportStart, handleExportComplete])

    return <div className={styles.MaterialAsset}>
        {/* Material Grid */}
        <div className={styles.materialGrid}>
            {
                element.map((item: any, index: number) => {
                    return <div className={styles.imageContainer} key={index}>
                        <Image
                            style={{
                                backgroundColor: item.actived ? "rgba(255, 138, 0, 0.1)" : "transparent",
                                border: item.actived ? "2px solid #ff8a00" : "1px solid rgba(255, 255, 255, 0.06)",
                                backgroundImage: `url("./images/bg3.png")`,
                                backgroundSize: "cover",
                                objectFit: 'cover',
                                aspectRatio: '1 / 1'
                            }}
                            onClick={onClick(item.id)}
                            draggable={false}
                            preview={false}
                            width="100%"
                            src={item.url}
                        />
                        <div className={styles.itemName} title={item.name}>
                            <span>{item.name}</span>
                        </div>
                    </div>
                })
            }
        </div>

        {/* Save Material Modal */}
        <SaveMaterialModal
            visible={saveModalVisible}
            onCancel={handleSaveCancel}
            onSuccess={handleSaveSuccess}
            materialData={exportedMaterialData}
        />
    </div>
}
export default connect((state: any) => state.editor)(MaterialAsset)