import { useCallback, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { HomeOutlined, AppstoreOutlined, BulbOutlined, GithubOutlined, FileTextOutlined } from '@ant-design/icons'

import styles from './index.module.less'
import { HomeContext } from './HomeContext'
import { getCachedUserInfo, type QDesignUser } from '/@/api/local/auth'

const Home = () => {
  const baseUrl = import.meta.env.BASE_URL
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/home', label: '首页', icon: <HomeOutlined style={{ marginRight: 4 }} /> },
    { path: '/resource-plaza', label: '资源广场', icon: <AppstoreOutlined style={{ marginRight: 4 }} /> },
    { path: '/features', label: '功能介绍', icon: <BulbOutlined style={{ marginRight: 4 }} /> },
    { path: '/api-docs', label: 'API 文档', icon: <FileTextOutlined style={{ marginRight: 4 }} /> },
  ]
  const [logoSrc, setLogoSrc] = useState(`${baseUrl}icons/logo.png`)
  const user = getCachedUserInfo() as QDesignUser

  const currentPath = '/' + (location.pathname.split('/').filter(Boolean)[0] || 'home')

  const onLogoError = useCallback(() => {
    setLogoSrc(`${baseUrl}icons/logo.png`)
  }, [baseUrl])

  const handleLogin = () => {}

  return (
    <HomeContext.Provider value={{ user, loading: false, viewMode: 'user', handleLogin }}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.brand} onClick={() => navigate('/home')}>
              <div className={styles.brandMark}>
                <img className={styles.brandMarkImg} src={logoSrc} alt="QDesign" draggable={false} onError={onLogoError} />
              </div>
              <div className={styles.brandText}>
                <div className={styles.brandName}>QDesign</div>
                <div className={styles.brandSlogan}>{'产品设计 · 3D 展示 · 在线协作'}</div>
              </div>
            </div>
            <nav className={styles.nav}>
              {navItems.map((item) => (
                <a
                  key={item.path}
                  className={`${styles.navItem} ${currentPath === item.path ? styles.navItemActive : ''}`}
                  onClick={() => navigate(item.path)}
                  style={{ cursor: 'pointer' }}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </nav>
            <div className={styles.headerActions}>
              <a
                className={styles.githubLink}
                href="https://github.com/blueRaining/QDesigner-PreView/tree/main#"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubOutlined />
              </a>
            </div>
          </div>
        </header>

        <Outlet />

        <section className={styles.contactSection}>
          <div className={styles.contactBg}>
            <span className={styles.contactShape1} />
            <span className={styles.contactShape2} />
            <span className={styles.contactShape3} />
          </div>
          <div className={styles.contactInner}>
            <h2 className={styles.contactTitle}>联系我们</h2>
            <p className={styles.contactDesc}>
              {'邮箱：'}
              <a href="mailto:2813123482@qq.com" className={styles.contactInlineLink}>2813123482@qq.com</a>
              {'　'}
              {'B站：'}
              <a href="https://space.bilibili.com/267093860" target="_blank" rel="noopener noreferrer" className={styles.contactInlineLink}>QDesign设计工具</a>
            </p>
            <div className={styles.contactQr}>
              <img src={`${baseUrl}icons/wechat-qr.jpg`} alt="WeChat QR" className={styles.contactQrImg} />
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerLeft}>
              <div className={styles.footerBrand}>
                <div className={styles.brandMark}>
                  <img className={styles.brandMarkImg} src={logoSrc} alt="QDesign" draggable={false} onError={onLogoError} />
                </div>
                <div>
                  <div className={styles.brandName}>QDesign</div>
                  <div className={styles.footerNote}>{'专注产品设计展示体验'}</div>
                </div>
              </div>
            </div>
            <div className={styles.footerRight}>
            </div>
          </div>
          <div className={styles.footerBeian}>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2024129003号-1</a>
          </div>
        </footer>
      </div>
    </HomeContext.Provider>
  )
}

export default Home
