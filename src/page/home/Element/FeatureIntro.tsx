import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import {
  EyeOutlined,
  EditOutlined,
  ThunderboltOutlined,
  BgColorsOutlined,
  SlidersOutlined,
  PlayCircleOutlined,
  AppstoreOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import styles from './FeatureIntro.module.less'

const features = [
  {
    icon: <EyeOutlined />,
    title: '3D 产品展示',
    desc: '支持包装盒、瓶型、服装、瓷器等多品类模型实时预览，基于 PBR 材质渲染，还原真实产品质感。',
    tags: ['多品类模型', '实时预览', 'PBR 渲染'],
  },
  {
    icon: <EditOutlined />,
    title: 'UV 贴图编辑',
    desc: '在 3D 模型表面直接编辑文字、图形、图片图层，所见即所得，实时映射到模型上。',
    tags: ['文字图层', '图形编辑', '实时映射'],
  },
  {
    icon: <ThunderboltOutlined />,
    title: 'AI 智能设计',
    desc: 'AI 生成贴图纹理、背景生成、智能配色，大幅提升设计效率与创意探索空间。',
    tags: ['AI 生图', '背景生成', '智能配色'],
  },
  {
    icon: <BgColorsOutlined />,
    title: '材质与光照',
    desc: 'PBR 材质编辑器，支持金属度、粗糙度、法线等参数调节，多光源与环境球配置。',
    tags: ['PBR 材质', '环境球'],
  },
  {
    icon: <SlidersOutlined />,
    title: '后处理效果',
    desc: 'TAA、Bloom、SSAO、色差，暗角等后处理管线，为产品展示增添专业画面质感。',
    tags: ['TAA', 'Bloom','SSAO','色差','暗角'],
  },
  // {
  //   icon: <PlayCircleOutlined />,
  //   title: '动画系统',
  //   desc: '支持模型旋转展示、展开动画等，为产品展示增加动态表现力。',
  //   tags: ['旋转展示', '展开动画', '关键帧'],
  // },
  {
    icon: <AppstoreOutlined />,
    title: '模板中心',
    desc: '涵盖包装盒、瓶型、服装、瓷器等多品类预设模板，选择即用，快速启动设计。',
    tags: ['包装盒', '瓶型', '服装', '瓷器'],
  },
  {
    icon: <ExportOutlined />,
    title: '预览与导出',
    desc: '一键导出设计成果，支持高清截图导出，预览界面离线部署。',
    tags: ['导出', '高清截图', '离线预览部署'],
  },
]

const FeatureIntro = () => {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>{'平台功能总览'}</h1>
          <p className={styles.subtitle}>
            {'QDesign 提供从 3D 建模展示、UV 贴图编辑到 AI 辅助设计的一站式产品设计工作台，助力高效出图与团队协作。'}
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <div className={styles.grid}>
        {features.map((f, i) => (
          <div
            key={f.title}
            className={styles.card}
            style={{ '--delay': `${0.1 + i * 0.06}s` } as React.CSSProperties}
          >
            <div className={styles.cardIcon}>{f.icon}</div>
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardDesc}>{f.desc}</p>
            <div className={styles.tags}>
              {f.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className={styles.cta}>
        <Button
          type="primary"
          size="large"
          className={styles.ctaBtn}
          onClick={() => navigate('/home')}
        >
          {'返回首页，开始设计'}
        </Button>
      </div>
    </div>
  )
}

export default FeatureIntro
