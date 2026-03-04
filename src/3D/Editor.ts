
import {
  Editor,
  EventDispatcher,
 
  AbstractMesh
} from "./RainViewer.js";
export interface EditorOptions {
  modelUrl?: string;
  isDesignModel?: boolean;
  isEnglish?: boolean;
}
export interface AIDesignItem {
  id: string;
  dataUrl: string;
  prompt?: string;
  timestamp: number;
}

export interface AIVideoItem {
  id: string;
  blobUrl: string;
  prompt?: string;
  thumbnail?: string;
  timestamp: number;
}

export class Editor3D extends EventDispatcher {
  editor: Editor;
  static instance: Editor3D;
  sceneUrl?: string;

  selectedNode?: AbstractMesh;
  private _lastSelectedUVImage: HTMLImageElement | null = null;
  private _lastSelectedUVAlbedoImage: HTMLImageElement | null = null;
  private _lastSelectedUVAIConfig: any = null;

  // 产品元信息（用于导出 config.json）
  private _productMeta: {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    category_name?: string;
  } = {};

  // 环境球 URL 跟踪
  private _currentEnvUrl: string | null = null;
  private _currentEnvObjectUrl: string | null = null;

  // AI设计图存储
  private _aiDesignImages: AIDesignItem[] = [];
 
  constructor(canvas: HTMLCanvasElement, options?: EditorOptions) {
    super();
    this.editor = new Editor({
      canvas: canvas,
      isDesignModel: options?.isDesignModel || false,
      isEnglish: options?.isEnglish || false,
      cdnBaseUrl: import.meta.env.VITE_PUBLIC_PATH || "./"
    });
    this.sceneUrl = options?.modelUrl;

    Editor3D.instance = this;
  }
  async init() {
    await this.editor.init();

    await this.editor.setBackground(null);
    if (!this.sceneUrl) {
      await this.setEnvirment("./envirment/environment2.env");
    } else {
      await this.editor.loadModel(this.sceneUrl);

      this.dispatchEvent({
        type: "modelLoaded",

      });
    }
    this.editor.clearHistory();
    this.initEvent();

  }
  async loadModel(url: string | File) {
    await this.editor.loadModel(url, {
      autoUpdateCamera: false,
      clearSceneObjects: false,
    });

  }
  async setEnvirment(path: string | null) {
    // 释放旧的 Object URL
    if (this._currentEnvObjectUrl && this._currentEnvObjectUrl !== path) {
      URL.revokeObjectURL(this._currentEnvObjectUrl);
      this._currentEnvObjectUrl = null;
    }
    // 记录新的环境球 URL
    if (path) {
      if (path.startsWith('blob:')) {
        this._currentEnvObjectUrl = path.split('#')[0];
      } else {
        this._currentEnvObjectUrl = null;
      }
      this._currentEnvUrl = path;
    } else {
      this._currentEnvUrl = null;
      this._currentEnvObjectUrl = null;
    }
    await this.editor.setEnvirment(path);
  }

  // 获取当前环境球信息
  getCurrentEnvironment() {
    return {
      thumbnail: this.editor.getEnvirmentPreView() ?? ''
    };
  }

  // 获取当前环境球 URL
  getCurrentEnvUrl(): string | null {
    return this._currentEnvUrl;
  }

  // 从环境球 URL 的 #envirment.{ext} 后缀解析文件类型
  getCurrentEnvFileType(): string {
    if (!this._currentEnvUrl) return 'env';
    const hashMatch = this._currentEnvUrl.match(/#envirment\.(\w+)/i);
    if (hashMatch) return hashMatch[1].toLowerCase();
    // 尝试从 URL 路径提取扩展名
    const urlWithoutHash = this._currentEnvUrl.split('#')[0].split('?')[0];
    const extMatch = urlWithoutHash.match(/\.(\w+)$/);
    if (extMatch) {
      const ext = extMatch[1].toLowerCase();
      if (['hdr', 'env', 'exr', 'dds'].includes(ext)) return ext;
    }
    return 'env';
  }

  // 产品元信息
  getProductMeta() {
    return { ...this._productMeta };
  }

  setProductMeta(meta: Partial<typeof this._productMeta>) {
    Object.assign(this._productMeta, meta);
  }

  // 获取环境球亮度 (0-5)
  getEnvironmentIntensity(): number {
 
    return  this.editor.getEnvironmentIntensity();
  }

  // 设置环境球亮度 (0-5)
  setEnvironmentIntensity(value: number, finished = false) {

    this.editor.setEnvironmentIntensity(value, finished);
  }

  // 获取环境球旋转 (-180 到 180)
  getEnvironmentRotation(): number {
 
    const rotation =this.editor.getEnvirmentRotation();
    // 底层是 0-360，转换为 -180 到 180
    return rotation > 180 ? rotation - 360 : rotation;
  }

  // 设置环境球旋转 (-180 到 180)
  setEnvironmentRotation(value: number, finished = false) {
    const rotation = value < 0 ? value + 360 : value;
    this.editor.setEnvirmentRotation(rotation, finished)
  }

  initEvent() {
    this.editor.addEventListener("startExportMaterial", () => {
      this.dispatchEvent({
        type: "startExportMaterial",
      })
    });
    this.editor.addEventListener("endExportMaterial", (event: any) => {

      this.dispatchEvent({
        type: "endExportMaterial",
        detail: event.detail

      });
    })
    this.editor.addEventListener("selectedModel", (data: any) => {
      if (data) {

        this.dispatchEvent({
          type: "selectedModel",
          config: data.uiConfigs ?? [],
          key: data.key,
        });
      } else {
        this.dispatchEvent({
          type: "selectedModel",
          config: [],
          key: null,
        });
      }

    });
    this.editor.addEventListener("selectedMaterial", (data: any) => {

      if (data) {

        this.dispatchEvent({
          type: "selectedMaterial",
          config: data.uiConfigs ?? [],
          key: data.key,
        });
      } else {
        this.dispatchEvent({
          type: "selectedMaterial",
          config: [],
          key: null,
        });
      }

    });
    this.editor.addEventListener("sceneTreeUpdated", (data: any) => {
      this.dispatchEvent({
        ...data,
      });
    });
 
    this.editor.addEventListener("materialThumbChanged", (data: any) => {
      this.dispatchEvent({
        type: "materialThumbChanged",
      });
    });
    this.editor.addEventListener("textureChanged", (data: any) => {
      this.dispatchEvent({
        type: "textureChanged",
      });
    });
    this.editor.addEventListener("environmentChanged", (data: any) => {
      // 同步更新环境球 URL（外部直接调用底层 editor 时也能跟踪）
      if (data.hdrUrl) {
        this._currentEnvUrl = data.hdrUrl;
        if (data.hdrUrl.startsWith('blob:')) {
          this._currentEnvObjectUrl = data.hdrUrl.split('#')[0];
        }
      }
      this.dispatchEvent({
        type: 'environmentChanged',
        hdrUrl: data.hdrUrl,
        thumbnailUrl: data.thumbnailUrl
      });
    });
    this.editor.addEventListener("backgroundImageChanged", (data: any) => {

      this.dispatchEvent({
        type: 'backgroundImageChanged',

        imageUrl: data.imageUrl
      });
    });
    this.editor.addEventListener("sceneLightChanged", () => {
      this.dispatchEvent({ type: 'sceneLightChanged' });
    });
    this.editor.addEventListener("environmentSettingsChanged", () => {
      this.dispatchEvent({ type: 'environmentSettingsChanged' });
    });
    this.editor.addEventListener("backgroundGradientChanged", () => {
      this.dispatchEvent({ type: 'backgroundGradientChanged' });
    });
    let resizeTimer: any = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.editor.resize();
      }, 100);
    });
  }

  getLastSelectedUVImage() {
    return this._lastSelectedUVImage;
  }
  async getScreenShot(transparent = true) {

    return await this.editor.getScreenShot(transparent);
  }
  setBackground(url: string | null) {

    this.editor.setBackground(url);
  }
  getLastSelectedUVAlbedoImage() {
    return this._lastSelectedUVAlbedoImage;
  }
  getLastSelectedUVAIConfig() {
    return this._lastSelectedUVAIConfig;
  }
  getMaterialUIById(materialId: string) {
    this.editor.getMaterialUIById(materialId);
  }
  resize() {
    this.editor.resize();
  }
  getAllAIImages() {
    return this.editor.getAllAIImages();
  }
  getCarveUiConfig() {
    return this.editor.getCarveUiConfig();
  }
  selectByNodeInfo(treeNode: any) {
    if (treeNode && treeNode.node) {
      treeNode.select();
    }
  }

  getAllMaterialImages() {
    return this.editor.getAllMaterialImages();
  }
  getPostProcessUIConfig() {
    return this.editor.getPostProcessUIConfig();
  }
  getSceneTree() {
    return this.editor.getSceneTree();
  }
  getLightUIConfig() {
    return this.editor.getLightUIConfig();
  }

  getBaseObjectGeneratorUIConfig() {
    return this.editor.getBaseObjectGeneratorUIConfig();
  }
 
  getDisplacementUIConfig() {
    return this.editor.getDisplaceMentUiConfig();
  }
  getEditorUiConfig(design = false) {
    return this.editor.getEditorUiConfig(design);
  }
  getAnimationUiConfig() {
    return this.editor.getAnimationUiConfig();
  }
  getAIUiConfig() {
    return this.editor.getAIUiConfig();
  }
  getImageEditorUiConfig() {
    return this.editor.getImageEditorUiConfig();
  }
  setImage2Image(elementUi: any, imageSrc: string) {
    elementUi.setValue(imageSrc);
  }
 
  setNodeMaterialById(nodeid: string, materialId: string) {
    this.editor.setNodeMaterialById(nodeid, materialId);
  }

  /**
   *
   * @param selectedNode 选中的节点
   * @param targetNode  目标节点
   * @param asChild 是否作为目标节点的子节点
   * @param before 作为兄弟节点时的位置 是否插入到当前节点之前
   */
  dragSelectNodeToTargetNodes(
    selectedNode: any,
    targetNode: any,
    asChild: boolean = true,
    before = false
  ) {
    this.editor.dragSelectNodeToTargetNodes(
      selectedNode,
      targetNode,
      asChild,
      before
    );
  }
  dispose() {
    this.editor.dispose();
  }
  onToolsClick(name: string) {
    switch (name) {
      case "translate":
        this.setTransformModel("translate");
        break;
      case "scale":
        this.setTransformModel("scale");
        break;
      case "rotation":
        this.setTransformModel("rotation");
        break;
      case "delete":
        this.editor.deleteSelectedNode();
        break;
      case "screenShot":
        this.editor.getScreenShot(false, true);
        break;
      case "undo":
        this.editor.undo();
        break;
      case "redo":
        this.editor.redo();
        break;
    }
  }
  hasInstanceNode(id: string) {
    return this.editor.hasInstanceNode(id);
  }
  deleteNodeById(id: string) {
    this.editor.deleteSelectedNode(id);
  }
  setTransformModel(model: "translate" | "scale" | "rotation") {
    this.editor.setTransformModel(model);
  }
  setMaterialFromServe(event: any, data: any) {
    this.editor.setMaterialFromServe(event, data);
  }
  setMaterialFromScene(event: any, materialId: string) {
    this.editor.setMaterialFromScene(event, materialId);
  }
 
  getSceneMaterialById(id: string) {
    return this.editor.getMaterialById(id);
  }

  getLastSelectedObject() {
    return this.editor.getLastSelectedObject();
  }
 
  copyModelById(id: string) {
    this.editor.copyModelById(id)

  }
 
 
  cloneDeferredLightByUUid(uuid: string) {
    this.editor.cloneDeferredLightByUUid(uuid);
  }
  removeDeferredLightByUUid(uuid: string) {
    if (!uuid) {
      return;
    }
    this.editor.removeDeferredLightByUUid(uuid);

  }
  getDeferredLightUUid(node: any) {
    return node?.metadata?.lightUUid
  }
  coyPathByUUid(uuid: string, type: string) {
    this.editor.coyPathByUUid(uuid, type)

  }
  removePathByUUid(uuid: string, type: string) {
    this.editor.removePathByUUid(uuid, type)

  }
  getPathTypeAndUUid(node: any) {
    let pathType = node?.metadata?.pathType;
    let pathId = node?.metadata?.pathId;
    return { pathType, pathId }
  }
  setUVTexture(url: string) {

    this.editor.setSelectedUVTexture(url)

  }

  setUVTextureByCanvas(albedo: HTMLCanvasElement|null) {

    this.editor.setSelectedUVTextureByCanvas(albedo)

  }
  saveLastSelectedMaterialAIConfig(data: any) {
    this.editor.saveLastSelectedMaterialAIConfig(data);
    // 同时更新缓存，确保下次打开窗口时能获取到最新配置

  }
  saveSelectedMaterialAIConfig(data: any) {
    this.editor.saveSelectedMaterialAIConfig(data);
    // 同时更新缓存，确保下次打开窗口时能获取到最新配置
    this._lastSelectedUVAIConfig = data;
  }

  // ========== AI设计图管理 ==========
  addAIDesignImage(dataUrl: string, prompt?: string): AIDesignItem {
    const item: AIDesignItem = {
      id: `ai-design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      prompt,
      timestamp: Date.now()
    };
    this._aiDesignImages.unshift(item);
    this.dispatchEvent({ type: 'aiDesignImageAdded', item });
    return item;
  }

  removeAIDesignImage(id: string): boolean {
    const index = this._aiDesignImages.findIndex(item => item.id === id);
    if (index !== -1) {
      this._aiDesignImages.splice(index, 1);
      this.dispatchEvent({ type: 'aiDesignImageRemoved', id });
      return true;
    }
    return false;
  }

  getAllAIDesignImages(): AIDesignItem[] {
    return [...this._aiDesignImages];
  }

  clearAIDesignImages(): void {
    this._aiDesignImages = [];
    this.dispatchEvent({ type: 'aiDesignImagesCleared' });
  }
 
  getDesignData() {
    const data = this.editor.getDesignData();
    if (data) {
      // 如果从材质获取不到 aiConfig，使用缓存的 aiConfig
      if (!data.aiConfig && this._lastSelectedUVAIConfig) {
        data.aiConfig = this._lastSelectedUVAIConfig;
      }
      return data;
    }
    // 如果没有 designData 但有缓存的 aiConfig，构造返回
    if (this._lastSelectedUVAIConfig) {
      return {
        albedoImage: this._lastSelectedUVAlbedoImage || null,
        aiConfig: this._lastSelectedUVAIConfig,
      };
    }
    return data;
  }
 
  async getSceneData() {
    return await this.editor.getSceneData();
  }

 
  getSceneLightPlugin() {
    return this.editor.getSceneLightPlugin();
  }
  //背景
  setBackgroundGradientType(gradientType: number) {
    this.editor.setBackgroundGradientType(gradientType);

  }
  getBackgroundGradientType() {
    return this.editor.getBackgroundGradientType();

  }
  getBackgroundGradientAngle() {
    return this.editor.getBackgroundGradientAngle();

  }
  setBackgroundGradientAngle(value: number, finished = false) {

    this.editor.setBackgroundGradientAngle(value, finished);

  }
  getBackgroundStartColor() {
    return this.editor.getBackgroundStartColor();

  }

  getBackgroundEndColor() {
    return this.editor.getBackgroundEndColor();
  }
  setGradientColors(startColor: string, endColor: string, finished = false, preview = false) {

    this.editor.setGradientColors(startColor, endColor, finished, preview);

  }
  async setBackgroundImageURL(path: string | null) {

    await this.editor.setBackgroundImageURL(path)

  }
  getBackgroundImageURL() {
    return this.editor.getBackgroundImageURL();

  }
  setBackgroundTransparent(transparent: boolean) {
    this.editor.setBackgroundTransparent(transparent);

  }
  getBackgroundTransparent() {
    return this.editor.getBackgroundTransparent();

  }
  createBaseObject(type: string) {
    return this.editor.createBaseObject(type);
  }
  async parseEnvirmentImage(blob: Blob, type: string) {
    return await this.editor.parseEnvirmentImage(blob, type);
  }
  setLightBrightness(value: number, finished = false) {
    this.editor.setSceneLightBrightness(value,finished)
  }
  setLightShadowDarkness(value: number, finished = false) {
    this.editor.setSceneLightShadowDarkness(value,finished)

  }
  setLightHeight(value: number, finished = false) {
    this.editor.setSceneLightHeight(value,finished)
     
  }
  setLightAngle(value: number, finished = false) {
    this.editor.setSceneLightAngle(value,finished)
  
  }
  setLightDiffuseColor(value: string, finished = false, preview = false) {
    this.editor.setSceneLightDiffuseColor(value, finished, preview)
 
  }
  updateDesignMaterial(albedo:string,metallic:string,roughness:string,normalMap:string|null){
    this.editor.updateDesignMaterial?.(albedo, metallic, roughness, normalMap)
  }
    updateDesignMaterialByCanvas(albedo:HTMLCanvasElement|null,metallic:HTMLCanvasElement|null,roughness:HTMLCanvasElement|null,normalMap:any){
    this.editor.updateDesignMaterialByCanvas?.(albedo, metallic, roughness, normalMap)
  }

  /************************ NormalMapPlugin ************************/
  setNormalMapHeightMap(canvas: HTMLCanvasElement) {
    this.editor.setNormalMapHeightMap?.(canvas)
  }
  setNormalMapParams(params: {
    strength?: number;
    level?: number;
    blur?: number;
    type?: "sobel" | "scharr";
    invertR?: boolean;
    invertG?: boolean;
  }) {
    this.editor.setNormalMapParams?.(params)
  }
  async renderNormalMap() {
    await this.editor.renderNormalMap?.()
  }
  getNormalMapTexture() {
    return this.editor.getNormalMapTexture?.()
  }
  async normalMapToCanvas(): Promise<HTMLCanvasElement | null> {
    return await this.editor.normalMapToCanvas?.() ?? null
  }

  /************************ NormalMap 多层合成 ************************/
  initNormalComposite(w: number, h: number) {
    this.editor.initNormalComposite?.(w, h)
  }
  renderNoiseNormalBase(params: {
    scale?: number;
    strength?: number;
  }) {
    this.editor.renderNoiseNormalBase?.(params)
  }
  compositeNormalLayer(
    maskCanvas: HTMLCanvasElement,
    cx: number, cy: number,
    cssW: number, cssH: number,
    layerW: number, layerH: number,
    scaleX: number, scaleY: number,
    rotation: number, opacity: number,
  ) {
    this.editor.compositeNormalLayer?.(maskCanvas, cx, cy, cssW, cssH, layerW, layerH, scaleX, scaleY, rotation, opacity)
  }
  getNormalCompositeTexture() {
    return this.editor.getNormalCompositeTexture?.()
  }
  async normalCompositeToCanvas(): Promise<HTMLCanvasElement | null> {
    return await this.editor.normalCompositeToCanvas?.() ?? null
  }
}
