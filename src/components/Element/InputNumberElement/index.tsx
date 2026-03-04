import React, { useCallback, useEffect, useState } from 'react';
import type { InputNumberProps } from 'antd';
import { InputNumber } from 'antd';

import styles from "./index.module.less"

const InputNumberElement = (props: any) => {
    const { name = "强度", uiElement = null, min = -1e7, max = 1e7, step = 0.01, width = 160,disabled=false } = props;
    const [inputValue, setInputValue] = useState(0);
    const [hide, setHide] = useState(false);

    useEffect(() => {
        const uiElementUpdate = () => {
            if (uiElement) {
                let precision = uiElement.precision ?? 3;
                setInputValue(parseFloat(uiElement.getValue().toFixed(precision)));
                setHide(uiElement.hidden)
            }
        };
        if (uiElement) {
            let precision = uiElement.precision ?? 3;
            setInputValue(parseFloat(uiElement.getValue().toFixed(precision)));
            uiElement.addEventListener("ElementUIUpdate", uiElementUpdate);
            setHide(uiElement.hidden)
        }
        return () => {
            uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement])
    const onChange: InputNumberProps['onChange'] = useCallback((value: any) => {
        setInputValue(value);
        if (uiElement) {
            uiElement.setValue(value);
        }
    }, [])
    return <div className={styles.InputNumberElement} style={{
        display: hide ? "none" : "flex"
    }}>
        <span className={styles.name}>{name}</span>
        <InputNumber
            style={{ width: width }}
            defaultValue={0}
            min={min}
            max={max}
            step={step}
            value={inputValue}
            disabled={disabled}
            onChange={onChange}

        />
    </div>
}
export default InputNumberElement