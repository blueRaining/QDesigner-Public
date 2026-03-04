/**
 * @descriptionimg url to base64
 */
export function urlToBase64(url: string, mineType?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let canvas = document.createElement('CANVAS') as Nullable<HTMLCanvasElement>
        const ctx = canvas!.getContext('2d')

        const img = new Image()
        img.crossOrigin = ''
        img.onload = function () {
            if (!canvas || !ctx) {
                return reject()
            }
            canvas.height = img.height
            canvas.width = img.width
            ctx.drawImage(img, 0, 0)
            const dataURL = canvas.toDataURL(mineType || 'image/png')
            canvas = null
            resolve(dataURL)
        }
        img.src = url
    })
}

/**
 * @description: base64 to blob
 */
function dataURLtoBlob(base64Buf: string): Blob {
    const arr = base64Buf.split(',')
    const typeItem = arr[0]
    const mime = typeItem.match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
}

// 下载文件Buf
export function downloadByData(data: BlobPart, filename: string, mime?: string, bom?: BlobPart) {
    const blobData = typeof bom !== 'undefined' ? [bom, data] : [data]
    const blob = new Blob(blobData, { type: mime || 'application/octet-stream' })
    if (typeof window.navigator.msSaveBlob !== 'undefined') {
        window.navigator.msSaveBlob(blob, filename)
    } else {
        const blobURL = window.URL.createObjectURL(blob)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = blobURL
        tempLink.setAttribute('download', filename)
        if (typeof tempLink.download === 'undefined') {
            tempLink.setAttribute('target', '_blank')
        }
        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(blobURL)
    }
}

// 下载base64格式
export function downloadByBase64(buf: string, filename: string, mime?: string, bom?: BlobPart) {
    const base64Buf = dataURLtoBlob(buf)
    downloadByData(base64Buf, filename, mime, bom)
}

// 下载在线图片
export function downloadByOnlineUrl(url: string, filename: string, mime?: string, bom?: BlobPart) {
    urlToBase64(url).then((base64) => {
        downloadByBase64(base64, filename, mime, bom)
    })
}

/**
 * 将 base64 dataUrl 转为 Uint8Array
 */
export function base64ToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(',')[1]
    const bstr = atob(base64)
    const u8arr = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i)
    }
    return u8arr
}

/**
 * 从 AIConfig 中提取图片并替换为文件路径引用，返回提取的图片列表
 */
function extractAIConfigImages(aiConfig: any): { cleaned: any; images: Array<{ path: string; data: Uint8Array }> } {
    const cleaned = JSON.parse(JSON.stringify(aiConfig))
    const images: Array<{ path: string; data: Uint8Array }> = []

    // 提取 layers 中的图片
    if (Array.isArray(cleaned.layers)) {
        cleaned.layers.forEach((layer: any, i: number) => {
            // 离线版不需要 sourceUrl（指向线上 R2），清掉避免无效网络请求
            delete layer.sourceUrl
            if (layer.imgDataUrl && layer.imgDataUrl.startsWith('data:')) {
                images.push({ path: `images/layer_${i}.png`, data: base64ToUint8Array(layer.imgDataUrl) })
                layer.imgDataUrl = `images/layer_${i}.png`
            }
            if (layer.maskDataUrl && layer.maskDataUrl.startsWith('data:')) {
                images.push({ path: `images/layer_${i}_mask.png`, data: base64ToUint8Array(layer.maskDataUrl) })
                layer.maskDataUrl = `images/layer_${i}_mask.png`
            }
        })
    }

    // 提取 uvImageDataUrl
    if (cleaned.uvImageDataUrl && cleaned.uvImageDataUrl.startsWith('data:')) {
        images.push({ path: 'images/uv_image.png', data: base64ToUint8Array(cleaned.uvImageDataUrl) })
        cleaned.uvImageDataUrl = 'images/uv_image.png'
    }

    // 提取 uploadedStyleRefImage
    if (cleaned.uploadedStyleRefImage?.dataUrl && cleaned.uploadedStyleRefImage.dataUrl.startsWith('data:')) {
        images.push({ path: 'images/style_ref.png', data: base64ToUint8Array(cleaned.uploadedStyleRefImage.dataUrl) })
        cleaned.uploadedStyleRefImage.dataUrl = 'images/style_ref.png'
    }

    // 提取 maskSourceImageDataUrl
    if (cleaned.maskSourceImageDataUrl && cleaned.maskSourceImageDataUrl.startsWith('data:')) {
        images.push({ path: 'images/mask_source.png', data: base64ToUint8Array(cleaned.maskSourceImageDataUrl) })
        cleaned.maskSourceImageDataUrl = 'images/mask_source.png'
    }

    return { cleaned, images }
}

/**
 * 根据文件扩展名推断 MIME 类型
 */
function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'png': return 'image/png'
        case 'jpg':
        case 'jpeg': return 'image/jpeg'
        case 'gif': return 'image/gif'
        case 'webp': return 'image/webp'
        default: return 'image/png'
    }
}

/**
 * 将 Uint8Array 转为 base64 dataUrl（base64ToUint8Array 的逆操作）
 */
export function uint8ArrayToDataUrl(data: Uint8Array, mimeType: string): string {
    let binary = ''
    for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i])
    }
    return `data:${mimeType};base64,${btoa(binary)}`
}

/**
 * 从 ZIP 中读取图片文件并转为 base64 dataUrl，文件不存在则返回 null
 */
async function readImageFromZip(zip: any, path: string): Promise<string | null> {
    const file = zip.file(path)
    if (!file) return null
    const data: Uint8Array = await file.async('uint8array')
    return uint8ArrayToDataUrl(data, getMimeType(path))
}

/**
 * 从远程 URL fetch 图片并转为 base64 dataUrl
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
    try {
        const resp = await fetch(url)
        if (!resp.ok) return null
        const blob = await resp.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

/**
 * 将 CDN 加载的 aiConfig 中的相对图片路径还原为 data URL
 * @param aiConfig - 从 CDN 加载的原始 aiConfig 对象
 * @param baseUrl - aiconfig.json 所在目录的基础 URL（不含文件名）
 */
export async function resolveAIConfigImages(aiConfig: any, baseUrl: string): Promise<any> {
    if (!aiConfig) return aiConfig

    // 确保 baseUrl 以 / 结尾
    const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'

    // 判断是否为需要还原的相对路径（非 data URL、非 http(s) 绝对路径）
    const isRelativePath = (val: string) => val && !val.startsWith('data:') && !val.startsWith('http:') && !val.startsWith('https:') && !val.startsWith('blob:') && !val.startsWith('__')

    // 还原 layers 中的图片
    if (Array.isArray(aiConfig.layers)) {
        for (const layer of aiConfig.layers) {
            if (layer.imgDataUrl && isRelativePath(layer.imgDataUrl)) {
                const dataUrl = await fetchImageAsDataUrl(base + layer.imgDataUrl)
                if (dataUrl) layer.imgDataUrl = dataUrl
            }
            if (layer.maskDataUrl && isRelativePath(layer.maskDataUrl)) {
                const dataUrl = await fetchImageAsDataUrl(base + layer.maskDataUrl)
                if (dataUrl) layer.maskDataUrl = dataUrl
            }
        }
    }

    // 还原 uvImageDataUrl
    if (aiConfig.uvImageDataUrl && isRelativePath(aiConfig.uvImageDataUrl)) {
        const dataUrl = await fetchImageAsDataUrl(base + aiConfig.uvImageDataUrl)
        if (dataUrl) aiConfig.uvImageDataUrl = dataUrl
    }

    // 还原 uploadedStyleRefImage
    if (aiConfig.uploadedStyleRefImage?.dataUrl && isRelativePath(aiConfig.uploadedStyleRefImage.dataUrl)) {
        const dataUrl = await fetchImageAsDataUrl(base + aiConfig.uploadedStyleRefImage.dataUrl)
        if (dataUrl) aiConfig.uploadedStyleRefImage.dataUrl = dataUrl
    }

    // 还原 maskSourceImageDataUrl
    if (aiConfig.maskSourceImageDataUrl && isRelativePath(aiConfig.maskSourceImageDataUrl)) {
        const dataUrl = await fetchImageAsDataUrl(base + aiConfig.maskSourceImageDataUrl)
        if (dataUrl) aiConfig.maskSourceImageDataUrl = dataUrl
    }

    return aiConfig
}

/**
 * 解析导出的 ZIP 文件，恢复模型、AIConfig 和缩略图
 */
export async function importFromZip(file: File): Promise<{
    modelBlob: Blob
    aiConfig: any | null
    thumbnailDataUrl: string | null
    envBlob: Blob | null
    config: any | null
}> {
    const JSZip = (window as any).JSZip
    if (!JSZip) {
        throw new Error('JSZip 未加载')
    }

    const zip = await new JSZip().loadAsync(file)

    // 读取 config.json（如果存在）
    let config: any | null = null
    const configFile = zip.file('config.json')
    if (configFile) {
        const configStr: string = await configFile.async('string')
        config = JSON.parse(configStr)
    }

    // 提取 model.rain
    const modelFile = zip.file('model.rain')
    if (!modelFile) {
        throw new Error('ZIP 中未找到 model.rain')
    }
    const modelData: Uint8Array = await modelFile.async('uint8array')
    const modelBlob = new Blob([modelData], { type: 'application/octet-stream' })

    // 提取缩略图
    let thumbnailDataUrl: string | null = null
    const thumbFile = zip.file('thumbnail.jpg')
    if (thumbFile) {
        const thumbData: Uint8Array = await thumbFile.async('uint8array')
        thumbnailDataUrl = uint8ArrayToDataUrl(thumbData, 'image/jpeg')
    }

    // 提取环境球文件
    let envBlob: Blob | null = null
    const envFileName = config?.environment
    if (envFileName) {
        const envFile = zip.file(envFileName)
        if (envFile) {
            const envData: Uint8Array = await envFile.async('uint8array')
            envBlob = new Blob([envData], { type: 'application/octet-stream' })
        }
    }

    // 提取并还原 AIConfig
    let aiConfig: any | null = null
    const aiConfigFile = zip.file('aiconfig.json')
    if (aiConfigFile) {
        const aiConfigStr: string = await aiConfigFile.async('string')
        aiConfig = JSON.parse(aiConfigStr)

        // 还原 layers 中的图片（extractAIConfigImages 的逆操作）
        if (Array.isArray(aiConfig.layers)) {
            for (let i = 0; i < aiConfig.layers.length; i++) {
                const layer = aiConfig.layers[i]
                if (layer.imgDataUrl && !layer.imgDataUrl.startsWith('data:')) {
                    const dataUrl = await readImageFromZip(zip, layer.imgDataUrl)
                    if (dataUrl) layer.imgDataUrl = dataUrl
                }
                if (layer.maskDataUrl && !layer.maskDataUrl.startsWith('data:')) {
                    const dataUrl = await readImageFromZip(zip, layer.maskDataUrl)
                    if (dataUrl) layer.maskDataUrl = dataUrl
                }
            }
        }

        // 还原 uvImageDataUrl
        if (aiConfig.uvImageDataUrl && !aiConfig.uvImageDataUrl.startsWith('data:')) {
            const dataUrl = await readImageFromZip(zip, aiConfig.uvImageDataUrl)
            if (dataUrl) aiConfig.uvImageDataUrl = dataUrl
        }

        // 还原 uploadedStyleRefImage
        if (aiConfig.uploadedStyleRefImage?.dataUrl && !aiConfig.uploadedStyleRefImage.dataUrl.startsWith('data:')) {
            const dataUrl = await readImageFromZip(zip, aiConfig.uploadedStyleRefImage.dataUrl)
            if (dataUrl) aiConfig.uploadedStyleRefImage.dataUrl = dataUrl
        }

        // 还原 maskSourceImageDataUrl
        if (aiConfig.maskSourceImageDataUrl && !aiConfig.maskSourceImageDataUrl.startsWith('data:')) {
            const dataUrl = await readImageFromZip(zip, aiConfig.maskSourceImageDataUrl)
            if (dataUrl) aiConfig.maskSourceImageDataUrl = dataUrl
        }
    }

    return { modelBlob, aiConfig, thumbnailDataUrl, envBlob, config }
}

/**
 * 将场景数据、AIConfig、缩略图打包为 ZIP 并触发下载
 */
export interface ZipMetadata {
    id?: string
    name?: string
    description?: string
    category?: string
    category_name?: string
}

export async function downloadAsZip(
    sceneBlob: Blob | ArrayBuffer,
    aiConfig: any | null,
    thumbnailDataUrl: string | null,
    envUrl: string | null = null,
    envFileType: string = 'env',
    metadata: ZipMetadata = {},
) {
    const JSZip = (window as any).JSZip
    if (!JSZip) {
        throw new Error('JSZip 未加载')
    }

    const zip = new JSZip()

    // 添加 model.rain
    zip.file('model.rain', sceneBlob)

    // 添加缩略图
    if (thumbnailDataUrl) {
        zip.file('thumbnail.jpg', base64ToUint8Array(thumbnailDataUrl))
    }

    // 添加 AIConfig（提取图片）
    if (aiConfig) {
        const { cleaned, images } = extractAIConfigImages(aiConfig)
        zip.file('aiconfig.json', JSON.stringify(cleaned, null, 2))
        for (const img of images) {
            zip.file(img.path, img.data)
        }
    }

    // 添加环境球文件
    let envFileName: string | null = null
    if (envUrl) {
        try {
            const fetchUrl = envUrl.split('#')[0]
            const resp = await fetch(fetchUrl)
            if (resp.ok) {
                const envData = await resp.arrayBuffer()
                envFileName = `environment.${envFileType}`
                zip.file(envFileName, envData)
            }
        } catch (e) {
            console.warn('Failed to fetch environment map for ZIP:', e)
        }
    }

    // 生成 config.json 配置清单
    const config = {
        version: 1,
        id: metadata.id || null,
        name: metadata.name || null,
        description: metadata.description || null,
        category: metadata.category || null,
        category_name: metadata.category_name || null,
        model: 'model.rain',
        thumbnail: thumbnailDataUrl ? 'thumbnail.jpg' : null,
        aiconfig: aiConfig ? 'aiconfig.json' : null,
        environment: envFileName,
    }
    zip.file('config.json', JSON.stringify(config, null, 2))

    // 生成 ZIP 并下载
    const blob = await zip.generateAsync({ type: 'blob' })
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    downloadByData(blob, `design_${date}.zip`, 'application/zip')
}

/**
 * 从远程 ZIP URL 加载模板，复用 importFromZip 逻辑
 */
export async function importFromRemoteZip(zipUrl: string) {
    const resp = await fetch(zipUrl)
    if (!resp.ok) throw new Error(`下载模板失败: HTTP ${resp.status}`)
    const file = new File([await resp.arrayBuffer()], 'template.zip')
    return importFromZip(file)
}
