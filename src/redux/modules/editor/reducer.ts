import produce from "immer";
import { AnyAction } from "redux";

import * as types from "/@/redux/constant";
import { EditorData } from "/@/redux/interface";
//定义默认数据
const editorData: EditorData = {
  editorInit: false,
  selectedConfig: [],
  showLoading: false,
  editorMode: 'design',
  currentDesign: null,
  currentTemplate: null,
  currentPreset: null,
  hasUnsavedChanges: false,
  activeView: 'editor',
  userSubscription: null,
};

// menu reducer
//菜单reducer
const editor = (state: EditorData = editorData, action: AnyAction) =>
  //produce,解决数据不可变的问题
  produce(state, (draftState) => {
    switch (action.type) {
      case types.UPDATE_EDITOR_STATUS:
        draftState.editorInit = action.editorInit;
        break;
      case types.UPDATE_SCENE_SELECTED:
        draftState.selectedConfig = action.selectedConfig;
        break;
      case types.UPDATE_SHOWLOADING:
        draftState.showLoading = action.showLoading;
        break;
      case types.UPDATE_CURRENT_DESIGN:
        draftState.currentDesign = action.currentDesign;
        break;
      case types.UPDATE_EDITOR_MODE:
        draftState.editorMode = action.editorMode;
        break;
      case types.UPDATE_CURRENT_TEMPLATE:
        draftState.currentTemplate = action.currentTemplate;
        break;
      case types.UPDATE_CURRENT_PRESET:
        draftState.currentPreset = action.currentPreset;
        break;
      case types.UPDATE_HAS_UNSAVED_CHANGES:
        draftState.hasUnsavedChanges = action.hasUnsavedChanges;
        break;
      case types.UPDATE_ACTIVE_VIEW:
        draftState.activeView = action.activeView;
        break;
      case types.UPDATE_USER_SUBSCRIPTION:
        draftState.userSubscription = action.userSubscription;
        break;
      default:
        return draftState;
    }
  });

export default editor;
