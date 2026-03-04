/**
 * 3D Model Converter - 使用 threepipe 将各种 3D 格式转换为 GLB
 * 支持: glb, gltf, fbx, obj, stl, 3ds, 3dm, zip 等
 */

// GLB 格式不需要转换
const GLB_EXTENSIONS = ['glb']
// 需要转换的格式
const CONVERTIBLE_EXTENSIONS = ['gltf', 'fbx', 'obj', 'stl', '3ds', '3dm', '3mf', 'dae', 'ply', 'wrl', 'vtk', 'amf']
// 所有支持的格式
export const SUPPORTED_EXTENSIONS = [...GLB_EXTENSIONS, ...CONVERTIBLE_EXTENSIONS, 'zip', 'rain']

let viewer: any = null
let initPromise: Promise<void> | null = null

/**
 * 懒加载初始化 threepipe viewer（动态 import 避免影响首屏加载）
 */
async function ensureViewer() {
    if (viewer) return viewer

    if (initPromise) {
        await initPromise
        return viewer
    }

    initPromise = (async () => {
        const threepipe = await import('threepipe')
        const { extraImportPlugins } = await import('@threepipe/plugins-extra-importers')

        // 创建隐藏的 canvas
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        canvas.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;'
        document.body.appendChild(canvas)

        viewer = new threepipe.ThreeViewer({
            canvas,
            renderScale: 1,
            dropzone: false,
        })
       viewer.renderEnabled=false;
        await viewer.addPlugins([
            threepipe.AnimationObjectPlugin,
            threepipe.KTX2LoadPlugin,
            threepipe.KTXLoadPlugin,
            threepipe.PLYLoadPlugin,
            threepipe.Rhino3dmLoadPlugin,
            threepipe.STLLoadPlugin,
            new threepipe.GLTFMeshOptDecodePlugin(true, document.head),
            ...extraImportPlugins,
        ])
        viewer.addPluginSync(new threepipe.DropzonePlugin())
    })()

    await initPromise
    return viewer
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * 判断文件是否需要转换
 */
export function needsConversion(file: File): boolean {
    const ext = getFileExtension(file.name)
    if (GLB_EXTENSIONS.includes(ext) || ext === 'rain') return false
    if (ext === 'zip') return true
    return CONVERTIBLE_EXTENSIONS.includes(ext)
}

/**
 * 判断文件格式是否支持
 */
export function isFormatSupported(file: File): boolean {
    const ext = getFileExtension(file.name)
    return SUPPORTED_EXTENSIONS.includes(ext)
}

/**
 * 将模型文件转换为 GLB blob URL
 * @param files 文件列表（支持多文件如 obj+mtl）
 * @returns blob URL string（带 #model.glb 后缀）+ cleanup 函数
 */
export async function convertToGlb(files: File[]): Promise<{ url: string; cleanup: () => void }> {
    const v = await ensureViewer()
    const manager = v.assetManager

    // 构建 Map<string, File>
    const filesMap = new Map<string, File>()
    for (const file of files) {
        filesMap.set(file.name, file)
    }

    // 导入文件
    const imported = await manager.importer.importFiles(filesMap, {
        importConfig:false
    })

    // 展平结果
    const toAdd = [...imported.values()].flat(2).filter((v: any) => !!v)

    if (toAdd.length === 0) {
        throw new Error('无法解析模型文件，请检查文件格式是否正确')
    }

 
    await manager.loadImported(toAdd, {
        autoScale: false,
        autoCenter: false,
        importConfig:false,
        clearSceneObjects:true,
        // addToRoot:true,
        centerGeometries:false
    })

    // 导出为 GLB
    const blob = await v.exportScene({ viewerConfig: false })
    if (!blob || blob.ext !== 'glb') {
        throw new Error('GLB 导出失败')
    }

    // 创建 blob URL
    const blobUrl = URL.createObjectURL(blob)
    const url = `${blobUrl}#model.glb`

    return {
        url,
        cleanup: () => URL.revokeObjectURL(blobUrl),
    }
}
