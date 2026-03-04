import { useCallback, useEffect, useState } from 'react';
import { Select } from 'antd';
import styles from "./index.module.less"
const DropDownElement = (props: any) => {
  const { name = "选择",uiElement = null , options = []} = props
  const [select, setSelected] = useState();
  const [hide, setHide] = useState(false);
 
  useEffect(() => {
    const uiElementUpdate = () => {
      if (uiElement) {
        setSelected(uiElement.getValue());
        setHide(uiElement.hidden)
      }
    };
    if (uiElement) {
      setSelected(uiElement.getValue());
      uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
      setHide(uiElement.hidden)
    }
    return () => {
      uiElement &&uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
    }
  }, [uiElement])
  const onChange = useCallback((e: any) => {
    setSelected(e);
    if (uiElement) {
      uiElement.setValue(e);
    }
  }, [])
  return <div className={styles.selectWrapper}
    style={{
      display: hide ? "none" : "block"
    }}
  >

    <span className={styles.name}>{name}</span>
    <Select
      defaultValue={0}
      style={{ width: 140 }}
      value={select}
      onChange={onChange}
      options={options}
    />

  </div>
}
export default DropDownElement