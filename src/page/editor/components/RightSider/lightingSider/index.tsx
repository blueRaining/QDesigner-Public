import { useEffect, useState, useRef, useCallback } from 'react';
import { Slider, ColorPicker } from 'antd';
import { Editor3D } from '/@/3D/Editor';
import { connect } from 'react-redux';
import type { Color } from 'antd/es/color-picker';
import styles from './index.module.less';

const LightingSider = (props: any) => {
    const { editorInit } = props;

    // 基础属性
    const [brightness, setBrightness] = useState(1);
    const [shadowDarkness, setShadowDarkness] = useState(0);
    const [diffuseColor, setDiffuseColor] = useState('#ffffff');

    // Advanced 属性
    const [lightAngle, setLightAngle] = useState(315);
    const [lightHeight, setLightHeight] = useState(45);

    // Canvas refs
    const angleCanvasRef = useRef<HTMLCanvasElement>(null);
    const heightCanvasRef = useRef<HTMLCanvasElement>(null);

    // 拖拽状态
    const [isDraggingAngle, setIsDraggingAngle] = useState(false);
    const [isDraggingHeight, setIsDraggingHeight] = useState(false);

    // 初始化数据
    useEffect(() => {
        if (editorInit && Editor3D.instance) {
            const plugin = Editor3D.instance.getSceneLightPlugin();
            if (plugin) {
                setBrightness(plugin.intensity);
                setShadowDarkness(plugin.shadowdarkness);
                setDiffuseColor(plugin.diffuse);
                setLightAngle(plugin.lightAngle);
                setLightHeight(plugin.lightHeight);
            }
        }
    }, [editorInit]);

    // undo/redo 时同步 UI
    useEffect(() => {
        if (!editorInit || !Editor3D.instance) return;

        const handleSceneLightChanged = () => {
            const plugin = Editor3D.instance?.getSceneLightPlugin();
            if (plugin) {
                setBrightness(plugin.intensity);
                setShadowDarkness(plugin.shadowdarkness);
                setDiffuseColor(plugin.diffuse);
                setLightAngle(plugin.lightAngle);
                setLightHeight(plugin.lightHeight);
            }
        };

        Editor3D.instance.addEventListener('sceneLightChanged', handleSceneLightChanged);
        return () => {
            Editor3D.instance?.removeEventListener('sceneLightChanged', handleSceneLightChanged);
        };
    }, [editorInit]);

    // 绘制 Angle 圆形控制器
    const drawAngleControl = useCallback(() => {
        const canvas = angleCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制中心方块（虚线边框）
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 20, centerY - 20, 40, 40);
        ctx.setLineDash([]);

        // 绘制圆圈
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 计算光源位置（角度转弧度）
        const angleRad = (lightAngle - 90) * Math.PI / 180;
        const lightX = centerX + Math.cos(angleRad) * radius;
        const lightY = centerY + Math.sin(angleRad) * radius;

        // 绘制光源图标
        ctx.beginPath();
        ctx.arc(lightX, lightY, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ff8a00';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制光源内部图标
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☀', lightX, lightY);

    }, [lightAngle]);

    // 绘制 Height 曲线控制器（四分之一圆弧，0-90度）
    const drawHeightControl = useCallback(() => {
        const canvas = heightCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const radius = Math.min(width, height) - 40; // 动态计算圆弧半径

        // 圆心居中偏右下，整体下移
        const centerX = width / 2 + radius / 2 - 10;
        const centerY = height - 16;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 绘制底部水平线（从圆弧左端到地面方块）
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY);
        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制四分之一圆弧（从右边水平到顶部垂直，即从0度到90度）
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 1.5);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制地面方块（圆心位置）- 虚线边框
        const groundSize = 36;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            centerX - groundSize / 2,
            centerY - groundSize / 2,
            groundSize,
            groundSize
        );
        ctx.setLineDash([]);

        // 计算光源在圆弧上的位置（0-90度映射到圆弧）
        const angleRad = (180 + lightHeight) * Math.PI / 180;
        const x = centerX + Math.cos(angleRad) * radius;
        const y = centerY + Math.sin(angleRad) * radius;

        // 绘制光源图标
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ff8a00';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制光源内部图标
        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☀', x, y);

    }, [lightHeight]);

    // 重绘控制器
    useEffect(() => {
        drawAngleControl();
    }, [drawAngleControl]);

    useEffect(() => {
        drawHeightControl();
    }, [drawHeightControl]);

    // Angle 拖拽处理
    const handleAngleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDraggingAngle(true);
    }, []);

    const handleAngleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingAngle || !angleCanvasRef.current) return;

        const canvas = angleCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算角度
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (angle < 0) angle += 360;

        setLightAngle(Math.round(angle));

        if (Editor3D.instance) {
            Editor3D.instance.setLightAngle(angle);
        }
    }, [isDraggingAngle]);

    const handleAngleMouseUp = useCallback(() => {
        if (Editor3D.instance) {
            Editor3D.instance.setLightAngle(lightAngle, true);
        }
        setIsDraggingAngle(false);
    }, [lightAngle]);

    // Height 拖拽处理
    const handleHeightMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDraggingHeight(true);
    }, []);

    const handleHeightMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingHeight || !heightCanvasRef.current) return;

        const canvas = heightCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const radius = Math.min(canvas.width, canvas.height) - 40;

        // 圆心居中偏右下，整体下移（与绘制保持一致）
        const centerX = canvas.width / 2 + radius / 2 - 10;
        const centerY = canvas.height - 16;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算鼠标相对于圆心的角度
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        let angle = Math.atan2(-dy, -dx) * 180 / Math.PI;

        // 限制在0-90度范围内
        angle = Math.max(0, Math.min(90, angle));
        const height = Math.round(angle);

        setLightHeight(height);

        if (Editor3D.instance) {
            Editor3D.instance.setLightHeight(height);
        }
    }, [isDraggingHeight]);

    const handleHeightMouseUp = useCallback(() => {
        if (Editor3D.instance) {
            Editor3D.instance.setLightHeight(lightHeight, true);
        }
        setIsDraggingHeight(false);
    }, [lightHeight]);

    // 全局鼠标事件监听
    useEffect(() => {
        if (isDraggingAngle) {
            window.addEventListener('mousemove', handleAngleMouseMove);
            window.addEventListener('mouseup', handleAngleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleAngleMouseMove);
            window.removeEventListener('mouseup', handleAngleMouseUp);
        };
    }, [isDraggingAngle, handleAngleMouseMove, handleAngleMouseUp]);

    useEffect(() => {
        if (isDraggingHeight) {
            window.addEventListener('mousemove', handleHeightMouseMove);
            window.addEventListener('mouseup', handleHeightMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleHeightMouseMove);
            window.removeEventListener('mouseup', handleHeightMouseUp);
        };
    }, [isDraggingHeight, handleHeightMouseMove, handleHeightMouseUp]);

    // 属性变化处理
    const handleBrightnessChange = (value: number, finished = false) => {
        setBrightness(value);
        if (Editor3D.instance) {
            Editor3D.instance.setLightBrightness(value, finished);
        }
    };

    const handleShadowDarknessChange = (value: number, finished = false) => {
        setShadowDarkness(value);
        if (Editor3D.instance) {
            Editor3D.instance.setLightShadowDarkness(value, finished);
        }
    };

    const handleDiffuseColorChange = (color: Color) => {
        const hexColor = color.toHexString();
        setDiffuseColor(hexColor);
        if (Editor3D.instance) {
            Editor3D.instance.setLightDiffuseColor(hexColor, false, true);
        }
    };

    const latestDiffuseColorRef = useRef(diffuseColor);
    latestDiffuseColorRef.current = diffuseColor;

    const handleDiffuseColorPickerClose = useCallback((open: boolean) => {
        if (!open && Editor3D.instance) {
            Editor3D.instance.setLightDiffuseColor(latestDiffuseColorRef.current);
        }
    }, []);

    return (
        <div className={styles.lightingWrapper}>
            <div className={styles.advancedPanel}>
                <div className={styles.controlGroup}>
                    <div className={styles.controlLabel}>
                        <span>{'亮度'}</span>
                        <span>{Math.round(brightness * 100)}%</span>
                    </div>
                    <Slider
                        min={0}
                        max={2}
                        step={0.01}
                        value={brightness}
                        onChange={handleBrightnessChange}
                        onChangeComplete={(v: number) => handleBrightnessChange(v, true)}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <div className={styles.controlLabel}>
                        <span>{'阴影深度'}</span>
                        <span>{Math.round(shadowDarkness * 100)}%</span>
                    </div>
                    <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={shadowDarkness}
                        onChange={handleShadowDarknessChange}
                        onChangeComplete={(v: number) => handleShadowDarknessChange(v, true)}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <div className={styles.colorRow}>
                        <span>{'漫反射颜色'}</span>
                        <ColorPicker
                            value={diffuseColor}
                            onChange={handleDiffuseColorChange}
                            onOpenChange={handleDiffuseColorPickerClose}
                            size="small"
                        />
                    </div>
                </div>

                <div className={styles.controlGroup}>
                    <div className={styles.controlLabel}>
                        <span>{'角度'}</span>
                        <span>{lightAngle}°</span>
                    </div>
                    <canvas
                        ref={angleCanvasRef}
                        width={200}
                        height={200}
                        className={styles.angleCanvas}
                        onMouseDown={handleAngleMouseDown}
                    />
                </div>

                <div className={styles.controlGroup}>
                    <div className={styles.controlLabel}>
                        <span>{'高度'}</span>
                        <span>{lightHeight}°</span>
                    </div>
                    <canvas
                        ref={heightCanvasRef}
                        width={200}
                        height={140}
                        className={styles.heightCanvas}
                        onMouseDown={handleHeightMouseDown}
                    />
                </div>
            </div>
        </div>
    );
};

export default connect((state: any) => state.editor)(LightingSider);
