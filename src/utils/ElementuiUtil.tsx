import FolderElement from "/@/components/Element/FolderElement"
import ButtonElement from "/@/components/Element/ButtonElement"
import CheckBoxElement from "/@/components/Element/CheckBoxElement"
import ColorElement from "/@/components/Element/ColorElement"
import DropDownElement from "/@/components/Element/DropDownElement"
import InputNumberElement from "/@/components/Element/InputNumberElement"
import InputStringElement from "/@/components/Element/InputStringElement"
import SliderElement from "/@/components/Element/SliderElement"
import Vector2Element from "/@/components/Element/Vector2Element"
import Vector3Element from "/@/components/Element/Vector3Element"
import ImageElement from "/@/components//Element/ImageElement"
import uuid from "react-uuid"
import ImageBitElement from "../components/Element/ImageBitElement"
import MaterialNodeList from "../components/Element/MaterialNodeList"
import TextureBlockList from "../components/Element/TextureBlockList"

const ParseUIElement = function (uiElement: any, parent?: any) {
    let element = null;
    switch (uiElement.type) {
        case "folder":
            if (uiElement.children && uiElement.children.length) {
                let items: any = [];
                for (let i = 0; i < uiElement.children.length; i++) {
                    ParseUIElement(uiElement.children[i], items)
                }
                element = <FolderElement
                    uiElement={uiElement}

                    showHead={!uiElement.hideInUI}
                    name={uiElement.label}
                    key={uiElement.propertyName || uuid()}
                    propertyKey={uiElement.propertyName || uuid()}>
                    {items}
                </FolderElement>;

            }

            break;
        case "checkbox":
            element = <CheckBoxElement
                uiElement={uiElement}
                name={uiElement.label}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "slider":
            element = <SliderElement
                min={uiElement.bounds[0]}
                max={uiElement.bounds[1]}
                step={uiElement.stepSize}
                uiElement={uiElement}
                name={uiElement.label}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "vec2":
            element = <Vector2Element
                name={uiElement.label}
                uiElement={uiElement}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "vec3":
            element = <Vector3Element
                name={uiElement.label}
                key={uiElement.propertyName || uuid()}
                uiElement={uiElement}

            />
            break;
        case "input":
            if (uiElement.inputType == "string") {
                element = <InputStringElement
                    uiElement={uiElement}
                    name={uiElement.label}
                    disabled={uiElement.disabled}
                    key={uiElement.propertyName || uuid()}

                />
            } else {
                element = <InputNumberElement
                    name={uiElement.label}
                    uiElement={uiElement}
                    disabled={uiElement.disabled}
                    key={uiElement.propertyName || uuid()}

                />
            }

            break;
        case "image":
            element = <ImageElement
                uiElement={uiElement}
                name={uiElement.label}
                accetType={uiElement.format ?? null}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "imageBitMap":
            element = <ImageBitElement
                uiElement={uiElement}
                name={uiElement.label}
                accetType={uiElement.format ?? null}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "dropdown":
            element = <DropDownElement
                uiElement={uiElement}
                options={uiElement.options}
                name={uiElement.label}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "color":
            element = <ColorElement
                uiElement={uiElement}
                name={uiElement.label}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "button":
            element = <ButtonElement
                uiElement={uiElement}
                name={uiElement.label}
                key={uiElement.propertyName || uuid()}

            />
            break;
        case "MaterialList":
            element = <MaterialNodeList
                uiElement={uiElement}
                key={uiElement.propertyName || uuid()}
            />
            break;
        case "textureList":
            element = <TextureBlockList
                uiElement={uiElement}
                key={uiElement.propertyName || uuid()}
            />
            break;
    }
    if (parent && element) {
        parent.push(element)
    }
    return element
}
export { ParseUIElement }