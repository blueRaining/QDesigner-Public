import { Button } from 'antd';
import styles from "./index.module.less"
import { useCallback, useEffect, useState } from 'react';
const ButtonElement = (props: any) => {
   const { name = "按钮", uiElement = null } = props
   const [hide, setHide] = useState(false);
   useEffect(() => {
      const uiElementUpdate = () => {
         if (uiElement) {
            setHide(uiElement.hidden)
         }
      };
      if (uiElement) {
         uiElement.addEventListener("ElementUIUpdate", uiElementUpdate);
         setHide(uiElement.hidden)
      }
      return () => {
         uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
      }
   }, [uiElement])
   const onClick = useCallback(() => {
      if (uiElement) {
 
         uiElement.onClick()
      }
   }, [])
   return <Button type="primary"
      style={{
         display: hide ? "none" : "block"
      }}
      onClick={onClick}
      className={styles.buttonElement}
      size="small">{name}</Button>
}
export default ButtonElement;