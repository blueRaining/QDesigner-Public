import { useState } from 'react'
import { Button, Tabs } from 'antd'
import styles from './index.module.less'
import ProjectGallery from './sections/ProjectGallery'
import DesignProcess from './components/DesignProcess'
import AITopology from './components/AITopology'
import type { TemplateCategory } from '/@/api/local/templates'

type TabKey = TemplateCategory | 'freeCreate'

const HomeContent = () => {
  const [activeCategory, setActiveCategory] = useState<TabKey>('box')

  // 从模板开始产品设计
  const handleStartProductDesign = (templateId: string) => {
    window.location.href = `./editor.html?templateId=${templateId}&mode=design#/design`
  }

  // 自由创作
  const handleStartDesign = async () => {
    const designId = `local_${Date.now()}`
    window.location.href = `./editor.html?designId=${designId}&mode=design#/design`
  }

  // 创建模板的分类卡片数据 — 已移除

  // 产品设计分类（Tab 展示）
  const designCategories = [
    { title: '包装盒设计', type: 'box' as const },
    { title: '瓶型标签设计', type: 'bottle' as const },
    { title: '服装外观设计', type: 'clothing' as const },
    { title: '瓷器表面设计', type: 'ceramic' as const },
    { title: '其他', type: 'others' as const },
  ]

  // 自由创作 Tab 内容
  const FreeCreateContent = () => (
    <div className={styles.freeCreatePanel}>
      <div className={styles.freeCreateIcon}>{'\u{1F3A8}'}</div>
      <h3 className={styles.freeCreateTitle}>{'自由创作'}</h3>
      <p className={styles.freeCreateDesc}>{'从空白场景开始，自由导入模型，打造个性化产品设计'}</p>
      <Button
        type="primary"
        size="large"
        className={styles.primaryBtnLg}
        onClick={handleStartDesign}
      >
        {'开始创作'}
      </Button>
    </div>
  )

  const tabItems = [
    ...designCategories.map((c) => ({
      key: c.type,
      label: c.title,
      children: <ProjectGallery category={c.type as TemplateCategory} onSelectTemplate={handleStartProductDesign} />,
    })),
    {
      key: 'freeCreate',
      label: '自由创作',
      children: <FreeCreateContent />,
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <div className={styles.badge}>{'不一样的产品设计体验'}</div>
            <h1 className={styles.h1}>{'面向产品设计的 3D 在线展示与编辑工作台'}</h1>
            <p className={styles.sub}>
              {'专注化妆品、包装盒、服装与自定义产品等展示场景。更快出图、更好沟通、更稳交付。'}
            </p>
            <div className={styles.heroCtas}>
              <Button type="primary" size="large" className={styles.primaryBtnLg} onClick={() => {
                const templateSection = document.getElementById('templates')
                if (templateSection) {
                  templateSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}>
                {'立即开始'}
              </Button>
            </div>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <div className={styles.metricNum}>4+</div>
                <div className={styles.metricLabel}>{'核心品类模板'}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricNum}>PBR</div>
                <div className={styles.metricLabel}>{'真实材质表现'}</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricNum}>{'一键'}</div>
                <div className={styles.metricLabel}>{'预览与编辑切换'}</div>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <AITopology />
          </div>
        </div>
      </section>

      {/* 模板中心 */}
      <section className={styles.sectionAlt} id="templates">
        <div className={styles.sectionInner}>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.h2}>{'模板中心'}</h2>
            <div className={styles.sectionHint}>{'选择模板快速开始产品设计'}</div>
          </div>
          <Tabs
            activeKey={activeCategory}
            onChange={(key) => setActiveCategory(key as TabKey)}
            items={tabItems}
          />
        </div>
      </section>

      {/* 设计流程 */}
      <DesignProcess />
    </>
  )
}

export default HomeContent
