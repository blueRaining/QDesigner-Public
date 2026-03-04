import { useCallback, useEffect, useState } from "react";
import DragLabel from "./DragLabel"
import styles from "./index.module.less"
const SliderNumberInput = (props: any) => {
    const { step = 0.01, width, onValueChanged = () => { }, inputValue = 0 } = props;
    const [value, setValue] = useState(0);
    useEffect(() => {
        setValue(parseFloat(inputValue));
    }, [inputValue])
    const onInputChange = (ev: any) => {
        if (value != ev.target.value)
            setValue(ev.target.value);
    };
    const onInputBlurChange = useCallback(
        (ev: any) => {

            onValueChanged(parseFloat(ev.target.value))
        },
        [value]
    );
    const _handleKeyDown = useCallback((e: any) => {
        if (e.key === 'Enter') {
            onValueChanged(parseFloat(e.target.value))
        }
    }, [value])
    const onDragChanged = useCallback((resValue: any) => {

        setValue(resValue);
        onValueChanged(parseFloat(resValue))

    }, [value])
    return (
        <div className={styles.SliderNumberInput}
            style={
                {
                    width: width ?? '100%',
                    display: "flex"
                }
            } >
            <input
                value={value}
                onBlur={onInputBlurChange}
                onChange={onInputChange}
                className={styles.input}
                onKeyDown={_handleKeyDown}
            />
            <DragLabel value={value} setValue={onDragChanged} step={step} />
        </div>
    );
}
export default SliderNumberInput