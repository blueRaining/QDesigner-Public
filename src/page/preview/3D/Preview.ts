import {
    Preview,
    EventDispatcher,

} from '/@/3D/RainViewer.js'
interface ViewerOptions {
    modelUrl: string,
    optimization?: boolean,

    environmentUrl?: string
}
export class Viewer3D extends EventDispatcher {
    preview: Preview
    static instance: Viewer3D;
    modelUrl: string
    environmentUrl?: string

    constructor(canvas: HTMLCanvasElement, options: ViewerOptions) {
        super()
        this.modelUrl = options.modelUrl;
        this.environmentUrl = options.environmentUrl;

        this.preview = new Preview({
            canvas: canvas,
            optimization: options.optimization,
            cdnBaseUrl: import.meta.env.VITE_PUBLIC_PATH || "./"
        });
        this.showGroundGride(false)
        Viewer3D.instance = this
    }
    async init() {
        await this.preview.init()
        this.initEvent()
        // 有环境球路径时优先加载环境球，再加载模型
        if (this.environmentUrl) {
            try {
                await this.preview.setEnvirment(this.environmentUrl);
            } catch (e) {
                console.warn('Failed to load environment:', e);
            }
        }
        await this.preview.loadModel(this.modelUrl);


    }
    showGroundGride(value: boolean) {
        this.preview.showGroundGride(value)
    }
    initEvent() {
        window.addEventListener('resize', () => {
            this.preview.viewer.resize()
        })
    }

    dispose() {
        this.preview.dispose()
    }
}
