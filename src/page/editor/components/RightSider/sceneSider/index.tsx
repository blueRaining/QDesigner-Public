import { connect } from "react-redux"

import { ReactElement, useEffect, useState } from "react";
import { ParseUIElement } from "/@/utils/ElementuiUtil"
import { Editor3D } from "/@/3D/Editor";
import styles from "./index.module.less"
const SceneSider = (props: any) => {
  const { selectedConfig, editorInit, rightSiderContent } = props;
  const [elements, setElements] = useState<ReactElement[]>([])
  const [constElements, setConstElements] = useState<ReactElement[]>([])
  useEffect(() => {
    if (editorInit) {
      let elements = [];
      let lightConfig = Editor3D.instance.getLightUIConfig();
      if (lightConfig) {
        let lightElement = ParseUIElement(lightConfig.UIElement);
        if (lightElement) {
          elements.push(lightElement)
        }
      }
      let baseObjectConfig = Editor3D.instance.getBaseObjectGeneratorUIConfig();
      if (baseObjectConfig) {
        let baseObjectElement = ParseUIElement(baseObjectConfig.UIElement);
        if (baseObjectElement) {
          elements.push(baseObjectElement)
        }
      }
 
 
      setConstElements(elements)
    }
  }, [editorInit])
  useEffect(() => {
    if (rightSiderContent === 'scene' && selectedConfig && selectedConfig.length) {
      let elements = [];
      for (let i = 0; i < selectedConfig.length; i++) {
        let config = selectedConfig[i];
        let uiElement = config.UIElement;
        let element = ParseUIElement(uiElement);

        if (element) {
          elements.push(element)
        }

      }
      setElements(elements);
    } else {
      setElements([]);
    }
  }, [rightSiderContent, selectedConfig])
  return <div className={styles.sceneWrapper}>{...constElements}{...elements}</div>
}
export default connect((state: any) => ({
  ...state.editor,
  rightSiderContent: state.menu.rightSiderContent
}))(SceneSider)