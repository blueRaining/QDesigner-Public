import { useCallback, useEffect, useState } from "react";
import type { InputNumberProps } from 'antd';
import { InputNumber, Slider } from 'antd';
import styles from "./index.module.less"
const SliderElement = (props: any) => {
    const [inputValue, setInputValue] = useState(0);
    let { name = "强度",   min = 0, max = 1, step = 0.01, uiElement = null  } = props;
    const [hide, setHide] = useState(false);
 
    const onChange: InputNumberProps['onChange'] = useCallback((value: any) => {
        setInputValue(Number(value));

        if (uiElement) {

            uiElement.setValue(Number(value));
        }
    }, [])
    const onChangeComplete: InputNumberProps['onChange'] = useCallback((value: any) => {
        setInputValue(Number(value));

        if (uiElement) {

            uiElement.setValue(Number(value),true);
        }
    }, [])
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
    return (
        <div className={styles.SliderElement}
            style={{
                display: hide ? "none" : "flex"
            }}
        >
            <span className={styles.name}>{name}</span>
            <Slider
                min={min}
                max={max}
                onChange={onChange}
                className={styles.slider}
                onChangeComplete={onChangeComplete}
                value={inputValue}
                step={step}
            />
            <InputNumber
                min={min}
                max={max}
                className={styles.input}
                step={step}
                value={inputValue}
                onChange={onChangeComplete}
                
                stringMode
            />
        </div>
    );
}
export default SliderElement