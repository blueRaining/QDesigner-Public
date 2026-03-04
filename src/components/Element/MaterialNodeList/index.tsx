import { useEffect, useState, useCallback } from "react";
import { Button } from 'antd';
import { MinusOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import './index.css';
import { Editor3D } from "/@/3D/Editor";


interface MaterialItemList {
  name: string,
  color: string,
  uuid: string
}
const MaterialNodeList = (props: any) => {
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState<MaterialItemList[]>([]);
  const { uiElement = null } = props;
  const [hide, setHide] = useState(false);

  const onAddNode = useCallback(() => {
    // 空方法，后续可扩展

    uiElement?.create()
  }, []);
  const onDrop = useCallback((ev: any) => {

    var materialId = ev.dataTransfer.getData('materialId');
    let material = Editor3D.instance.getSceneMaterialById(materialId)
    uiElement?.addMaterialNodeByNodeMaterial(material)
  }, [])
  const onNodeSelected = useCallback((uuid: string) => {
    setSelected(uuid);
    uiElement?.setValue(uuid);
  }, [uiElement]);
  const onDeleteNode = useCallback((uuid: string) => {
    uiElement?.remove(uuid);
  }, [uiElement]);
  const onMoveUp = useCallback((uuid: string) => {
    uiElement?.moveUp(uuid);
  }, [uiElement]);
  const onMoveDown = useCallback((uuid: string) => {
    uiElement?.moveDown(uuid);
  }, [uiElement]);
  useEffect(() => {
    const uiElementUpdate = () => {
      if (uiElement) {

        let list = uiElement.getValue();
        let selectedUUid = uiElement.getSelected();
        setSelected(selectedUUid);
        setHide(uiElement.hidden);
        if (list)
          setItems(list)
      }
    };
    if (uiElement) {
      let list = uiElement.getValue();
      uiElement.addEventListener("ElementUIUpdate", uiElementUpdate);
      setHide(uiElement.hidden);
      let selectedUUid = uiElement.getSelected();
      setSelected(selectedUUid);
      if (list)
        setItems(list)
    }
    return () => {
      uiElement && uiElement.removeEventListener("ElementUIUpdate", uiElementUpdate)
    }
  }, [uiElement])
  return (
    <div className="material-node-list"
      style={{
        display: hide ? "none" : "block"
      }}
      onDrop={onDrop}
    >
      {items.map((item, idx) => (
        <div
          key={item.name}
          className={`material-node-item${selected === item.uuid ? ' selected' : ''}`}
          onClick={() => onNodeSelected(item.uuid)}
        >
          <div className="material-node-content">
            <span
              className="material-node-dot"
              style={{ background: "#fff", border: '1px solid #888' }}
            />
            <span className="material-node-label">{item.name}</span>
          </div>
          <div className="material-node-actions">
            {idx > 0 && (
              <ArrowUpOutlined
                className="material-node-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(item.uuid);
                }}
              />
            )}
            {idx < items.length - 1 && (
              <ArrowDownOutlined
                className="material-node-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(item.uuid);
                }}
              />
            )}
            {items.length > 1 && (
              <MinusOutlined
                className="material-node-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(item.uuid);
                }}
              />
            )}
          </div>
        </div>
      ))}
      <Button type="dashed" className="material-node-add-btn" block onClick={onAddNode}>
        添加节点
      </Button>
    </div>
  );
};

export default MaterialNodeList;
