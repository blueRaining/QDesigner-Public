import { connect } from "react-redux"
import {
    Editor3D,
} from "/@/3D/Editor";
import { ReactElement, useEffect, useState } from "react";
import { ParseUIElement } from "/@/utils/ElementuiUtil"
import styles from "./index.module.less"
const PostProcessSider = (props: any) => {
    const { editorInit, selectedConfig, rightSiderContent } = props;
    const [element, setElement] = useState<ReactElement | null>(null)
    const [selectedElements, setSelectedElements] = useState<ReactElement[]>([])
    useEffect(() => {
        if (editorInit) {
            let config = Editor3D.instance.getPostProcessUIConfig();
            if (config) {
                let uiElement = config.UIElement;
                let element = ParseUIElement(uiElement);

                if (element)
                    setElement(element)

            } else {
                setElement(null)
            }

        }
        return () => {
            setElement(null)
        }
    }, [editorInit])

    // 监听 selectedConfig 变化，当前 Tab 为 postProcess 时解析并渲染
    useEffect(() => {
        if (rightSiderContent === 'postProcess' && selectedConfig && selectedConfig.length) {
            let elements: ReactElement[] = [];
            for (let i = 0; i < selectedConfig.length; i++) {
                let config = selectedConfig[i];
                let uiElement = config.UIElement;
                let el = ParseUIElement(uiElement);
                if (el) {
                    elements.push(el);
                }
            }
            setSelectedElements(elements);
        } else {
            setSelectedElements([]);
        }
    }, [rightSiderContent, selectedConfig])

    return <div className={styles.postProcessWrapper}>
        {element}
        {selectedElements}
    </div>
}
export default connect((state: any) => ({
    ...state.editor,
    rightSiderContent: state.menu.rightSiderContent
}))(PostProcessSider)