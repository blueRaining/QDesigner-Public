
import * as types from '/@/redux/constant'
import { RightSiderType } from '../../interface'
//action creator
//action创建器
//更新Collapseaction
export const updateRightSiderType = (rightSiderContent: RightSiderType) => ({
    type: types.UPDATE_RIGHTSIDERTYPE,
    rightSiderContent
})
