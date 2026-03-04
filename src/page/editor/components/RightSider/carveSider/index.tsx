import { connect } from "react-redux"
import {
    Editor3D,
} from "/@/3D/Editor";
import { ReactElement, useEffect, useState } from "react";
import { ParseUIElement } from "/@/utils/ElementuiUtil"
import styles from "./index.module.less"
const carveSider = (props: any) => {
    const { editorInit } = props;
    const [element, setElement] = useState<ReactElement | null>(null)
    const [imageElement, setImageElement] = useState<ReactElement | null>(null)
    const [displacementElement, setDisplacementElement] = useState<ReactElement | null>(null)

    useEffect(() => {
        if (editorInit) {

            let config = Editor3D.instance.getCarveUiConfig();
            if (config) {
                let uiElement = config.UIElement;
                let element = ParseUIElement(uiElement);

                if (element)
                    setElement(element)
            }
            let imageEditorConfig = Editor3D.instance.getImageEditorUiConfig();
            if (imageEditorConfig) {
                let uiElement = imageEditorConfig.UIElement;
                let element = ParseUIElement(uiElement);

                if (element)
                    setImageElement(element)
            }

            let displacementConfig = Editor3D.instance.getDisplacementUIConfig();
            if (displacementConfig) {
                let uiElement = displacementConfig.UIElement;
                let element = ParseUIElement(uiElement);

                if (element)
                    setDisplacementElement(element)
            }
        }
        return () => {
            setElement(null)
            setImageElement(null)
        }
    }, [editorInit])

    return <div className={styles.aiWrapper}>
        {element}
        {imageElement}
        {displacementElement}
    </div>
}
export default connect((state: any) => state.editor)(carveSider)