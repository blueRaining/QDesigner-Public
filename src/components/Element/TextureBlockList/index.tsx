import { useCallback, useEffect, useState } from "react";
import { PlusOutlined, DeleteOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import './index.less';

interface TextureList {
  id: string,
  name: string,
  image: string
}
const TextureBlockList = (props: any) => {
  const [selected, setSelected] = useState("");
  const [images, setImages] = useState<TextureList[]>([]);
  const [hide, setHide] = useState(false);
  const { uiElement = null } = props;
  const onAddNode = useCallback(() => {
    // 空方法，后续可扩展
      
    uiElement?.create()
  }, []);
  const onNodeSelected = useCallback((id: string) => {
    setSelected(id);
    uiElement?.setValue(id);
  }, [uiElement]);
  const onDeleteNode = useCallback((id: string) => {
    uiElement?.remove(id);
  }, [uiElement]);
  const onMoveLeft = useCallback((id: string) => {
    uiElement?.moveLeft(id);
  }, [uiElement]);
  const onMoveRight = useCallback((id: string) => {
    uiElement?.moveRight(id);
  }, [uiElement]);
  useEffect(() => {
    const uiElementUpdate = () => {
      if (uiElement) {

        let list = uiElement.getValue();
        let selectedUUid = uiElement.getSelected();
        setSelected(selectedUUid);
        setHide(uiElement.hidden);
        if (list)
          setImages(list)
      }
    };
    if (uiElement) {
      let list = uiElement.getValue();
      uiElement.addEventListener("ElementUIUpdate", uiElementUpdate);
      setHide(uiElement.hidden);
      let selectedUUid = uiElement.getSelected();
      setSelected(selectedUUid);
      if (list)
        setImages(list)
    }
    return () => {
      uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
    }
  }, [uiElement])
  return (
    <div className="texture-block-list"
      style={{
        display: hide ? "none" : "block"
      }}>
      {images.map((img, idx) => (
        <div
          className={`texture-block-item${img.id === selected ? ' selected' : ''}`}
          key={idx}
          onClick={() => onNodeSelected(img.id)}
        >
          <img src={img.image} alt={img.name} className="texture-block-pic" />
          <DeleteOutlined
            className="texture-block-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(img.id);
            }}
          />
          <div className="texture-block-arrows">
            {idx > 0 && (
              <LeftOutlined
                className="texture-block-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveLeft(img.id);
                }}
              />
            )}
            {idx < images.length - 1 && (
              <RightOutlined
                className="texture-block-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveRight(img.id);
                }}
              />
            )}
          </div>
        </div>
      ))}
      <div className="texture-block-item texture-block-add" onClick={onAddNode}>
        <div className="texture-block-add-btn">
          <PlusOutlined style={{ fontSize: 28, color: '#aaa' }} />
        </div>
        <div className="texture-block-label" >添加</div>
      </div>
    </div>
  );
};

export default TextureBlockList;
