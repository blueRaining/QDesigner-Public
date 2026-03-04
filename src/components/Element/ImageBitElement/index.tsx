import React, { useCallback, useEffect, useState } from 'react';

import { Image, Upload } from 'antd';
import type { GetProp, UploadFile, UploadProps } from 'antd';
import styles from "./index.module.less"
import { Editor3D } from '/@/3D/Editor';
 
type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

const getBase64 = (file: FileType): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

const ImageBitElement = (props: any) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const { name = "图片", uiElement, accetType = ".png, .jpg, .jpeg , .svg" } = props;
    const [hide, setHide] = useState(false);
    //可以上传图片到3d
    let canUpload=true;

    useEffect(() => {
        const uiElementUpdate = () => {
            canUpload=true
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
        return () => {
            uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement])
    const handlePreview = useCallback(async (file: UploadFile) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj as FileType);
        }
        setPreviewImage(file.url || (file.preview as string));
        setPreviewOpen(true);
    }, [])
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
         
        var imageId = ev.dataTransfer.getData('imageId');
        if (imageId ) {
            Editor3D.instance.setImage2Image(uiElement, imageId);
            canUpload=true;
        }

    }, [])
    return (
        <div className={styles.ImageBitElement} style={{
            display: hide ? "none" : "flex"
        }} onDrop={onDrop}>

            <span className={styles.name}>{name}</span>
            <Upload

                maxCount={1}
                accept={accetType}
                showUploadList={true}
                fileList={fileList}
                listType="picture-card"
                onPreview={handlePreview}
                onChange={handleChange}
                beforeUpload={handleBeforeUpload}

            >
                {
                    fileList.length > 0 ? null :
                        <div className={styles.uploadBg}></div>
                }
            </Upload>
            {previewImage && (
                <Image
                    wrapperStyle={{ display: 'none' }}
                    preview={{
                        visible: previewOpen,
                        onVisibleChange: (visible) => setPreviewOpen(visible),
                        afterOpenChange: (visible) => !visible && setPreviewImage(''),
                    }}
                    src={previewImage}
                />
            )}
        </div>

    );
};

export default ImageBitElement;