import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux'

import reduxThunk from 'redux-thunk'

import editor from './modules/editor/reducer'
import menu from './modules/menu/reducer'

// Reducer function resolution
//合并reducer educers，
const reducer = combineReducers({
    editor,
    menu
})

//创建store，reduxThunk：redux增强，支持异步操作，主要用于创建action
// Solve the problem that the same function supports multiple dispatches and asynchronous actions in React development
let store = createStore(reducer, applyMiddleware(reduxThunk))

export { store }
