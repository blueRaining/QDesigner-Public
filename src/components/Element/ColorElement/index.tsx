import React, { useCallback, useEffect, useState } from 'react';
import { ColorPicker } from 'antd';
import type { ColorPickerProps, GetProp } from 'antd';
import styles from "./index.module.less"

type Color = Extract<GetProp<ColorPickerProps, 'value'>, string | { cleared: any }>;
type Format = GetProp<ColorPickerProps, 'format'>;
const ColorElement = (props: any) => {
    const { name = "颜色", uiElement = null } = props
    const [colorHex, setColorHex] = useState<Color>('#ffffff');
    const [formatHex, setFormatHex] = useState<Format | undefined>('hex');
    const hexString = React.useMemo<string>(
        () => (typeof colorHex === 'string' ? colorHex : colorHex?.toHexString()),
        [colorHex],
    );
    const [hide, setHide] = useState(false);

    //AggregationColor2
    const onChanged = useCallback((value: any) => {
        let color = value.toHexString();

        setColorHex(color);
        if (uiElement) {
            uiElement.setValue(color);

        }
    }, [])
    const onChangedComplete = useCallback((value: any) => {
        let color = value.toHexString();

        setColorHex(color);
        if (uiElement) {
            uiElement.setValue(color,true);

        }
    }, [])
    useEffect(() => {
        const uiElementUpdate = () => {
            if (uiElement) {
                setColorHex(uiElement.getValue());
                setHide(uiElement.hidden);

            }
        };
        if (uiElement) {
            uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
            uiElementUpdate()
        }
        return () => {
            uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement])
    return (
        <div className={styles.colorElement}
            style={{
                display: hide ? 'none' : "flex"
            }}
        >
            <span className={styles.colorName}>{name}</span>
            <div className={styles.colorWrapper}>
                <ColorPicker
                    format={formatHex}
                    value={colorHex}
                    onChange={onChanged}
                    onChangeComplete={onChangedComplete}
                    onFormatChange={setFormatHex}
                    className={styles.colorPicker}
                />
            </div>
            <span > {hexString}</span>

        </div>

    );
}
export default ColorElement