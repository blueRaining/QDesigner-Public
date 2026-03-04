import SliderNumberInput from "../SliderNumberInput/index"
import styles from "./index.module.less"
import { useCallback, useEffect, useState } from "react";
const Vector3Element = (props: any) => {
    const { name = "移动", uiElement = null } = props;
    const [hide, setHide] = useState(false);

    const [vector, setVector] = useState({ x: 0, y: 0, z: 0 });

    useEffect(() => {
        const uiElementUpdate = () => {
            if (uiElement) {

                let { x, y, z } = uiElement.getValue();
                let value = { x, y, z };
                setVector(value)
                setHide(uiElement.hidden)

            }
        };
        if (uiElement) {
            let { x, y, z } = uiElement.getValue();
            let value = { x, y, z };
            setVector(value)
            uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
            setHide(uiElement.hidden)
        }
        return () => {
            uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
        }
    }, [uiElement]);

    const onXChanged = useCallback((value: number) => {
        if (uiElement) {
            let { x, y, z } = uiElement.getValue();
            if (value != x) {

                uiElement.setValue({ x: value, y, z });
            }
        }

    }, []);
    const onYChanged = useCallback(((value: number) => {
        if (uiElement) {

            let { x, y, z } = uiElement.getValue();
            if (value != y)
                uiElement.setValue({ x: x, y: value, z });
        }

    }), [])
    const onZChanged = useCallback(((value: number) => {
        if (uiElement) {
            let { x, y, z } = uiElement.getValue();
            if (value != z)
                uiElement.setValue({ x, y, z: value });
        }

    }), [])
    return (
        <div style={{
            display: hide ? "none" : "block"
        }}>
            <div className={styles.row}>
                <span className={styles.name}>{name}</span>
                <div className={styles.inputs}>
                    <SliderNumberInput onValueChanged={onXChanged} inputValue={vector.x} />
                    <SliderNumberInput onValueChanged={onYChanged} inputValue={vector.y} />
                    <SliderNumberInput onValueChanged={onZChanged} inputValue={vector.z} />
                </div>
            </div>
        </div>
    )
}
export default Vector3Element