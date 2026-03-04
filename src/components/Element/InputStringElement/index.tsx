import React, { useCallback, useEffect, useState } from 'react';

import { Input } from 'antd';

import styles from "./index.module.less"
import { InputProps } from 'antd/lib';

const InputStringElement = (props: any) => {
    const { name = "名字", uiElement = null,  placeholder = "请输入文字", width = 160 ,disabled=false} = props;
    const [hide, setHide] = useState(false);
    const [inputValue, setInputValue] = useState("");
 
    useEffect(() => {
        const uiElementUpdate = () => {
            if (uiElement) {
                setInputValue(uiElement.getValue());
                setHide(uiElement.hidden)
            }
        };
        if (uiElement) {
            setInputValue(uiElement.getValue());
            uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
            setHide(uiElement.hidden)
        }
        return () => {
            uiElement &&uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement])
    const onChange: InputProps['onChange'] = useCallback((e: any) => {
        setInputValue(e.target.value);
        if (uiElement) {
            uiElement.setValue(e.target.value);
        }
    }, [])
    return <div className={styles.InputStringElement}
        style={{
            display: hide ? "none" : "flex"
        }}>
        <span className={styles.name}>{name}</span>
        <Input
            placeholder={placeholder}
            className={styles.input}
            value={inputValue}
            onChange={onChange}
            disabled={disabled}
            style={{
                width: width
            }}
        />
    </div>
}
export default InputStringElement