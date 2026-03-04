import type { Design } from '/@/api/local/designs';
import type { Template } from '/@/api/local/templates';
import type { Preset } from '/@/api/local/types';
import type { UserSubscriptionInfo } from '/@/api/local/subscriptions';

// 编辑器模式: template=模板设计, preset=预设场景, design=产品设计
export type EditorMode = 'template' | 'preset' | 'design';

// 活动视图: editor=主编辑器视图, uvshow=UV包装设计视图
export type ActiveView = 'editor' | 'uvshow';

export interface EditorData{
   editorInit:boolean;
   selectedConfig:any;
   showLoading:boolean;
   editorMode: EditorMode;
   currentDesign: Design | null;
   currentTemplate: Template | null;
   currentPreset: Preset | null;
   hasUnsavedChanges: boolean;
   activeView: ActiveView;
   userSubscription: UserSubscriptionInfo | null;
}

export type RightSiderType="scene" |"render" |"postProcess" | "animation" |"carveModel"|"productInfo"|"aiConfig";
export interface MenuData{
    rightSiderContent:RightSiderType
}