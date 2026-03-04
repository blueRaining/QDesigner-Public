import { Collapse } from "antd";
import type { CollapseProps } from 'antd';
import {  useEffect, useState } from "react";
 
import { ParseUIElement } from "/@/utils/ElementuiUtil";
const FolderElement = (props: any) => {
  const { name = "面板", uiElement = null } = props;
  const [hide, setHide] = useState(false);
  const [headVisible, setHeadVisible] = useState(true);
  const [child, setChild] = useState(props.children);
  const [activeKey,setActiveKey] = useState(uiElement.expanded?"folder":"none");
  useEffect(() => {
    const uiElementUpdate = () => {
      if (uiElement) {

        let element = ParseUIElement(uiElement);
        if (element) {
          setHeadVisible(!uiElement.hideInUI);
          setHide(uiElement.hidden);
          setChild(element.props.children)
        }

      }
      //  let config=
    };
    if (uiElement) {

      uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
      setHide(uiElement.hidden);
      setHeadVisible(!uiElement.hideInUI);

    }
    return () => {

      uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
    }
  }, [uiElement])

  let element = null;
  if (headVisible) {
    const onChange = (keys:string[]) => {
      if(keys.length){
        setActiveKey("folder");
        if(uiElement)
         uiElement.expanded=true
      }else{
        setActiveKey("");
        if(uiElement)
          uiElement.expanded=false
      }
    }
    const items: CollapseProps["items"] = [
      {
        key: "folder",
        label: name,
        children: child,

      }
    ];

    element = <Collapse onChange={onChange} activeKey={activeKey} items={items}></Collapse>

  } else {
    element = <div>{child}</div>
  }

  return <div style={{
    display: hide ? "none" : "block"
  }}>{element} </div>
}
export default FolderElement