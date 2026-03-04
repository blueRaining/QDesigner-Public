import { connect } from "react-redux"
import {
    Editor3D,
} from "/@/3D/Editor";
import { ReactElement, useEffect, useState } from "react";
import { ParseUIElement } from "/@/utils/ElementuiUtil"
import styles from "./index.module.less"
const AnimationSider = (props: any) => {
    const { editorInit } = props;
    const [element, setElement] = useState<ReactElement | null>(null)
    useEffect(() => {
        if (editorInit) { 
            let config = Editor3D.instance.getAnimationUiConfig();
            if (config) {
                let uiElement = config.UIElement;
                let element = ParseUIElement(uiElement);
                if (element)
                    setElement(element)
            }


        }
        return () => {
            setElement(null)
        }
    }, [editorInit])

    return <div className={styles.animationWrapper}>
        {element}
    </div>
}
export default connect((state: any) => state.editor)(AnimationSider)