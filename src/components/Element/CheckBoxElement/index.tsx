import { Checkbox } from 'antd';
import styles from "./index.module.less"
import { useCallback, useEffect, useState } from 'react';
const CheckBoxElement = (props: any) => {
  const { name = "启动", uiElement = null  } = props
  const [checked, setChecked] = useState(false);
  const [hide, setHide] = useState(false);
 
  const onChange = useCallback((e: any) => {
    setChecked(e.target.checked);
    if (uiElement) {
      uiElement.setValue(e.target.checked);
    }
  }, [])

  useEffect(() => {
    const uiElementUpdate = () => {
      if (uiElement) {
        setChecked(uiElement.getValue());
        setHide(uiElement.hidden)
      }
    };
    if (uiElement) {
      setChecked(uiElement.getValue());
      uiElement.addEventListener("ElementUIUpdate", uiElementUpdate)
      setHide(uiElement.hidden)
    }
    return () => {
      uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
    }
  }, [uiElement])
  return <div className={styles.CheckBoxElement} style={{
    display: hide ? "none" : "block"
  }}>
    <span className={styles.name}>{name}</span>
    <Checkbox className={styles.checkBox} checked={checked} onChange={onChange}></Checkbox>
  </div>
}
export default CheckBoxElement