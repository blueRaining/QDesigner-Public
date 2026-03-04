import style from "./index.module.less"
import { useState, useEffect, useRef, useCallback, ReactElement } from 'react';
import { Viewer3D } from "../../3D/Preview"
import queryString from 'query-string';
import Loading from "../loading/index"
import { LeftOutlined } from "@ant-design/icons";
import { Tabs, Image } from "antd";
import { getDesign } from '/@/api/local';
import { getTemplate } from '/@/api/local/templates';
const Content = () => {
    const [InteractiveElement, setInteractiveElement] = useState<ReactElement | null>(null)
    const [showLoading, setShowLoading] = useState(true);
    const canvasElement = useRef<HTMLCanvasElement>(null);
    const onReturnClick = useCallback(() => {
        Viewer3D.instance.dispose()
        window.open("./home.html", "_self")
    }, [])
 
    const isMobile = useCallback(() => {
        // 获取用户代理字符串
        const ua = navigator.userAgent;

        // 检测移动设备特征
        const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileDevice = mobileRegex.test(ua);

        // 检测平板设备
        // 检测屏幕尺寸
        const isSmallScreen = window.innerWidth <= 768;

        // 返回是否为移动设备
        return isMobileDevice || isSmallScreen;
    }, [])
    useEffect(() => {
        // 通过接口获取后台返回的路由
        let viewer: Viewer3D | null = null;
        const createEditor = async () => {
            if (canvasElement?.current) {
                const values = queryString.parse(window.location.search);
                let designId = values.designId as string | undefined;
                let templateId = values.templateId as string | undefined;
                let modelUrl = "";
            
                const urlParams = new URLSearchParams(window.location.search);
                modelUrl = urlParams.get('modelUrl') || "";

                // 通过 designId 从 API 获取模型地址（公开设计不需要登录）
                if (!modelUrl && designId) {
                    try {
                        const design = await getDesign(designId);
                        if (design.model_url) {
                            modelUrl = design.model_url;
                        }
                    } catch (error) {
                        console.error('Failed to load design:', error);
                    }
                }

                // 通过 templateId 从 API 获取模型地址（模板为公开资源，不需要登录）
                if (!modelUrl && templateId) {
                    try {
                        const template = await getTemplate(templateId);
                        if (template.model_url) {
                            modelUrl = template.model_url;
                        }
                    } catch (error) {
                        console.error('Failed to load template:', error);
                    }
                }

                if (modelUrl) {

                    viewer = new Viewer3D(canvasElement?.current, {
                        modelUrl: modelUrl,
 
                        optimization: isMobile()
                    });
                    await viewer.init();
 
                    setShowLoading(false)

                }



            }
        }
        if (canvasElement?.current) {
            createEditor()
        }

        return () => {
            if (viewer) {
                viewer.dispose()
            }
        }
    }, [])

    //<LeftOutlined />
    return (
        <div className={style.Wrapper}>
            {<div className={style.toList} onClick={onReturnClick}><LeftOutlined />{'返回'}</div>}
            <div className={style.RenderCanvasContainer} >
                <canvas className={style.renderCanvas} id="renderCanvas" ref={canvasElement}></canvas>
                {InteractiveElement}
            </div>
            {showLoading && <Loading></Loading>}
        </div>
    )
}
export default Content