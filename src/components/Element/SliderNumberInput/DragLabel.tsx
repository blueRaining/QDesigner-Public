import { useCallback, useEffect, useState } from "react";
import {
    VerticalAlignMiddleOutlined 
  } from '@ant-design/icons';
  import styles from "./index.module.less"
//<ColumnWidthOutlined />
const DragLabel = (props: any) => {
    const { value, setValue,step=0.01 } = props;
 
    const [snapshot, setSnapshot] = useState(value);
 
    const [startVal, setStartVal] = useState(0);

    // Start the drag to change operation when the mouse button is down.
    const onStart = useCallback(
        (event: any) => {
            setStartVal(event.clientY);
            setSnapshot(parseFloat(value));
        },
        [value]
    );
 
    useEffect(() => {
        // Only change the value if the drag was actually started.
        const onUpdate = (event: any) => {
            if (startVal) {
                setValue(snapshot+(event.clientY - startVal)*step);
            }
        };

        // Stop the drag operation now.
        const onEnd = () => {
            setStartVal(0);
        };

        document.addEventListener("mousemove", onUpdate);
        document.addEventListener("mouseup", onEnd);
        return () => {
            document.removeEventListener("mousemove", onUpdate);
            document.removeEventListener("mouseup", onEnd);
        };
    }, [startVal, setValue, snapshot]);

    return (
        <span
            onMouseDown={onStart}
            className={styles.DragLabel}
        >
           <VerticalAlignMiddleOutlined  />
        </span>
    );
}
export default DragLabel;