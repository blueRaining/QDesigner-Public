import { connect } from 'react-redux';
import ScenePanel from "./sceneSider/index"
import RenderPanel from "./renderSider/index"
import PostProcessPanel from "./postProcessSider/index"

import AnimationPanel from "./animationSider/index"

import AIBackgroundPanel from "./aiBackgroundSider/index"

import LightingSider from "./lightingSider/index"
import ProductInfoSider from "./productInfoSider/index"
import AIConfigSider from "./aiConfigSider/index"

import styles from "./index.module.less"

const panels = [
    { key: "scene", Component: ScenePanel },
    { key: "render", Component: RenderPanel, props: (p: any) => ({ isDesign: p.isDesign }) },
    { key: "postProcess", Component: PostProcessPanel },
    { key: "animation", Component: AnimationPanel },

    { key: "aiBackground", Component: AIBackgroundPanel },
    { key: "lighting", Component: LightingSider },
    { key: "productInfo", Component: ProductInfoSider },
    { key: "aiConfig", Component: AIConfigSider },
] as const;

const RightSider = (props: any) => {
    const { rightSiderContent, isDesign = false } = props;
    return <div className={styles.wrapper}>
        {panels.map(({ key, Component, props: getProps }) => (
            <div
                key={key}
                className={styles.content}
                style={{ display: rightSiderContent === key ? undefined : 'none' }}
            >
                <Component {...(getProps ? (getProps as any)({ isDesign }) : {})} />
            </div>
        ))}
    </div>
}
const mapStateToProps = (state: any) => state.menu
export default connect(mapStateToProps, {})(RightSider)
