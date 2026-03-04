
import * as types from '/@/redux/constant'
import type { EditorMode, ActiveView } from '/@/redux/interface'

export const updateEditorStatus = (editorInit: boolean) => ({
    type: types.UPDATE_EDITOR_STATUS,
    editorInit
})
export const updateSceneSelected = (config: any) => ({
    type: types.UPDATE_SCENE_SELECTED,
    selectedConfig:config
})
export const updateCurrentDesign = (design: any)=>({
    type:types.UPDATE_CURRENT_DESIGN,
    currentDesign:design
})
export const updateEditorMode = (mode: EditorMode)=>({
    type:types.UPDATE_EDITOR_MODE,
    editorMode:mode
})
export const updateCurrentTemplate = (template: any)=>({
    type:types.UPDATE_CURRENT_TEMPLATE,
    currentTemplate:template
})
export const updateCurrentPreset = (preset: any)=>({
    type:types.UPDATE_CURRENT_PRESET,
    currentPreset:preset
})
export const updateHasUnsavedChanges = (hasChanges: boolean)=>({
    type:types.UPDATE_HAS_UNSAVED_CHANGES,
    hasUnsavedChanges:hasChanges
})
export const updateActiveView = (view: ActiveView)=>({
    type:types.UPDATE_ACTIVE_VIEW,
    activeView:view
})
export const updateUserSubscription = (subscription: any)=>({
    type:types.UPDATE_USER_SUBSCRIPTION,
    userSubscription:subscription
})
