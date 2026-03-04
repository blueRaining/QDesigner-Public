import SliderNumberInput from "../SliderNumberInput/index"
import styles from "./index.module.less"
import { useCallback, useEffect, useState } from "react";
const Vector2Element = (props: any) => {
    const { name = "偏移", uiElement = null } = props;
    const [hide, setHide] = useState(false);
    const [vector, setVector] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const uiElementUpdate = () => {
            if (uiElement) {
                let { x, y } = uiElement.getValue()

                setVector({ x, y })
                setHide(uiElement.hidden)
            }
        };
        if (uiElement) {
            let { x, y } = uiElement.getValue()
            setVector({ x, y })
            uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
            setHide(uiElement.hidden)
        }
        return () => {
            uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement]);
    const onXChanged = useCallback((value: number) => {

        if (uiElement) {
            let { x, y } = uiElement.getValue();
            if (value != x) {
                uiElement.setValue({ x: value, y });
            }
        }
    }, [])
    const onYChanged = useCallback((value: number) => {

        if (uiElement) {
            let { x, y } = uiElement.getValue();
            if (value != y) {
                uiElement.setValue({ x, y:value });
            }

        }
    }, [])
    return (
        <div style={{
            display: hide ? "none" : "block"
        }}>
            <div className={styles.row}>
                <span className={styles.name}>{name}</span>
                <div className={styles.inputs}>
                    <SliderNumberInput onValueChanged={onXChanged} inputValue={vector.x} />
                    <SliderNumberInput onValueChanged={onYChanged} inputValue={vector.y} />
                </div>
            </div>
        </div>
    )
}
export default Vector2Element