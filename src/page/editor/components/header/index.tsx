import { Layout, Menu, MenuProps } from 'antd'
import './index.less'

import { updateRightSiderType } from '/@/redux/modules/menu/action';
import { updateActiveView } from '/@/redux/modules/editor/action';
import { connect, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { Editor3D } from '/@/3D/Editor';
import { closeUVShowWindow } from '../UVShow/openUVShowWindow';
import SaveButton from '../SaveButton';
import UploadModelButton from '../UploadModelButton';

const LayoutHeader = (props: any) => {
    const { Header } = Layout;
    const { rightSiderContent, updateRightSiderType, style } = props;
    const dispatch = useDispatch();
    const items: MenuProps['items'] = [
        {
            label: '渲染器设置',
            key: 'render',
        },
        {
            label: '后处理设置',
            key: 'postProcess'
        },
        {
            label: '包装设计',
            key: 'uvShow'
        },
        {
            label: 'AI背景设计',
            key: 'aiBackground'
        },
        {
            label: '产品信息',
            key: 'productInfo'
        },
  
    ];
    const onReturnClick = useCallback(() => {
        closeUVShowWindow();
        dispatch(updateActiveView('editor'));
        Editor3D.instance.dispose()
        window.open("./home.html", "_self")
    }, [dispatch])

    const onClick: MenuProps['onClick'] = e => {
       if(e.key === 'uvShow'){
        dispatch(updateActiveView('uvshow'));
       }else if(e.key === 'preview'){
        closeUVShowWindow();
        dispatch(updateActiveView('editor'));
        const search = window.location.search || '';
        window.open(`./preview.html${search}`, '_blank', 'noopener,noreferrer');
       }else{
        closeUVShowWindow();
        dispatch(updateActiveView('editor'));
        updateRightSiderType(e.key);
      };
    }
    return (
        <Header style={style}>
            <div className="header-left">
                <img onClick={onReturnClick} src={`${import.meta.env.BASE_URL}icons/logo.png`} className='editorLogo'></img>
                <UploadModelButton />
            </div>
            <div className='headerMenu'>
                <Menu onClick={onClick} inlineIndent={24} selectedKeys={[rightSiderContent]} mode="horizontal" items={items} />
            </div>
            <div className="header-ri">
                <SaveButton />
            </div>
        </Header>
    )
}
const mapStateToProps = (state: any) => state.menu
export default connect(mapStateToProps, { updateRightSiderType })(LayoutHeader)
