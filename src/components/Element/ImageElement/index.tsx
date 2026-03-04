import React, { useCallback, useEffect, useState } from 'react';
import { Image, Upload } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import styles from "./index.module.less"
import { Editor3D } from '/@/3D/Editor';

const ImageElement = (props: any) => {
    const [isRawTexture, setIsRawTexture] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const { name = "图片", uiElement, accetType = ".png, .jpg, .jpeg , .svg" } = props;
    const [hide, setHide] = useState(false);
    //可以上传图片到3d
    let canUpload = true;

    useEffect(() => {
         
        const uiElementUpdate = () => {
            canUpload = true
            if (uiElement) {
                let value = uiElement.getValue();
                 
                if (value) {
                    setFileList([
                        {
                            uid: value,
                            name: '纹理',
                            status: 'done',
                            url: value,
                        },
                    ])
                } else {
                    setFileList([])
                }
                setHide(uiElement.hidden)
            }
        };
        if (uiElement) {
            let value = uiElement.getValue();
            if (value) {
                setFileList([
                    {
                        uid: value,
                        name: '纹理',
                        status: 'done',

                        url: value,
                    },
                ])
            } else {
                setFileList([])
            }
            uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
            setHide(uiElement.hidden)
        }
         
        setIsRawTexture(uiElement.isRawTexture)
        return () => {
            uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement])
    const handleChange: UploadProps['onChange'] = useCallback((data: any) => {
            
        if (canUpload) {
            let { fileList } = data;
            setFileList(fileList);
            if (fileList.length) {
                if (uiElement) {
                    uiElement.setValue(fileList[0].originFileObj)
                }

            } else {
                if (uiElement) {

                    uiElement.setValue()
                }
            }
        }



    }, [])
    const handleBeforeUpload = useCallback((data: any) => {
        return false;
    }, [])
    const onDrop = useCallback((ev: any) => {

     
        var fromImageID = ev.dataTransfer.getData('imageId');
        if (fromImageID && Editor3D.instance) {
            Editor3D.instance.setImage2Image(uiElement, fromImageID);
            canUpload = true
        }
    }, [])
    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setFileList([]);
        if (uiElement) {
            uiElement.setValue();
        }
    }, [uiElement]);
    return (
        <div className={styles.ImageElement} style={{
            display: hide ? "none" : "flex"
        }} onDrop={onDrop}>

            <span className={styles.name}>{name}</span>
            <Upload
                maxCount={1}
                accept={accetType}
                showUploadList={false}
                fileList={fileList}
                listType="picture-card"
                onChange={handleChange}
                beforeUpload={handleBeforeUpload}
            >
                {fileList.length > 0 ? (
                    <div style={{ position: "relative", height: "100%", width:"100%"}}>
                        <div className={styles.imageContainer}>
                            <Image preview={false} src={fileList[0].url} width={"100px"} />
                          { !isRawTexture&&(  <DeleteOutlined
                                className={styles.deleteIcon}
                                onClick={handleDelete}
                            />)
                          }
                        </div>

                    </div>
                ) : (
                    <div className={styles.uploadBg}></div>
                )}
            </Upload>

        </div>

    );
};

export default ImageElement;