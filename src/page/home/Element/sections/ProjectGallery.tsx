import { Button, Image, Spin, Empty, message } from 'antd'
import { EyeOutlined, CopyOutlined, RightOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { getTemplatesByCategory, toggleFavoriteTemplate, type Template, type TemplateCategory } from '/@/api/local/templates'
import PreviewModal from '../components/PreviewModal'
import styles from './ProjectGallery.module.less'

interface ProjectGalleryProps {
  category: TemplateCategory;
  onSelectTemplate?: (templateId: string) => void;
}

const ProjectGallery = ({ category, onSelectTemplate }: ProjectGalleryProps) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorited, setFavorited] = useState<Record<string, boolean>>({})
  const [togglingFav, setTogglingFav] = useState<Record<string, boolean>>({})
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await getTemplatesByCategory(category)
        setTemplates(items)
      } catch (err: any) {
        console.error('Failed to fetch templates:', err)
        setError(err.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [category])

  const openWith = useCallback((mode: 'preview' | 'editor', templateId: string) => {
    if (mode === 'preview') {
      setPreviewId(templateId)
    } else {
      // 延迟创建：直接带 templateId 进编辑器，首次保存时再创建 design
      window.open(`./editor.html?templateId=${templateId}&mode=design#/design`, '_blank', 'noopener,noreferrer')
    }
  }, [])

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation()
    if (togglingFav[templateId]) return

    setTogglingFav(prev => ({ ...prev, [templateId]: true }))
    try {
      const result = await toggleFavoriteTemplate(templateId)
      setFavorited(prev => ({ ...prev, [templateId]: result.favorited }))
      setTemplates(prev => prev.map(t =>
        t.id === templateId ? { ...t, favorite_count: result.favorite_count } : t
      ))
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setTogglingFav(prev => ({ ...prev, [templateId]: false }))
    }
  }, [togglingFav])

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingWrapper}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <Empty description={error} />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className={styles.wrapper}>
        <Empty description={'暂无模板'} />
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {templates.map((template) => (
          <div className={styles.item} key={template.id}>
            <div className={styles.thumb} onClick={() => openWith('preview', template.id)}>
              <Image
                preview={false}
                src={template.thumbnail_url || ''}
                className={styles.img}
                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E"
              />
              <div className={styles.hover}>
                <div className={styles.hoverInner}>
                  <Button
                    className={styles.hoverBtn}
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openWith('preview', template.id);
                    }}
                  >
                    {'预览'}
                  </Button>
                  <Button
                    className={styles.hoverBtnPrimary}
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectTemplate) {
                        onSelectTemplate(template.id);
                      } else {
                        openWith('editor', template.id);
                      }
                    }}
                  >
                    {'使用模板'} <RightOutlined />
                  </Button>
                </div>
              </div>
            </div>
            <div className={styles.meta}>
              <div className={styles.metaLeft}>
                <div className={styles.avatar} aria-hidden />
                <div className={styles.metaText}>
                  <div className={styles.user}>{(template.name || '模板中心').slice(0, 18)}</div>
                  <div className={styles.subLine}>QDesign</div>
                </div>
              </div>
              <div className={styles.metaRight}>
                <span className={styles.stat}>
                  <EyeOutlined />
                  {template.view_count || 0}
                </span>
                <span className={styles.stat}>
                  <CopyOutlined />
                  {template.use_count || 0}
                </span>
                <span
                  className={`${styles.stat} ${styles.favBtn} ${favorited[template.id] ? styles.favActive : ''}`}
                  onClick={(e) => handleToggleFavorite(e, template.id)}
                  role="button"
                  aria-label={favorited[template.id] ? '取消收藏' : '收藏'}
                >
                  {favorited[template.id] ? <StarFilled /> : <StarOutlined />}
                  {template.favorite_count || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <PreviewModal
        open={!!previewId}
        templateId={previewId || undefined}
        onClose={() => setPreviewId(null)}
      />
    </div>
  )
}

export default ProjectGallery
