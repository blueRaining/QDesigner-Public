import produce from 'immer'
import { AnyAction } from 'redux'

import * as types from '/@/redux/constant'
import { MenuData } from '/@/redux/interface'
const menuData: MenuData = {
    rightSiderContent:"render"
}

// menu reducer
//菜单reducer
const editor = (state: MenuData = menuData, action: AnyAction) =>
    //produce,解决数据不可变的问题
    produce(state, (draftState) => {
        
        switch (action.type) {
            case types.UPDATE_RIGHTSIDERTYPE:
                draftState.rightSiderContent=action.rightSiderContent
                break
            default:
                return draftState
        }
    })

export default editor
