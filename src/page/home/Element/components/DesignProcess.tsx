import { FC } from 'react'
import {
  SelectOutlined,
  RobotOutlined,
  ExportOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import styles from './DesignProcess.module.less'

interface Step {
  num: string
  icon: React.ReactNode
  title: string
  desc: string
  color: string
}

const DesignProcess: FC = () => {
  const steps: Step[] = [
    {
      num: '01',
      icon: <SelectOutlined />,
      title: '选择产品类型',
      desc: '从包装盒、瓶型、服装、瓷器、自定义设计等品类中选择',
      color: '#ff7a18'
    },
    {
      num: '02',
      icon: <RobotOutlined />,
      title: 'AI 辅助设计',
      desc: '使用 AI 生成设计方案，智能配色与图案推荐',
      color: '#667eea'
    },
    {
      num: '03',
      icon: <ExportOutlined />,
      title: '3D 预览导出',
      desc: '实时 3D 预览效果，一键导出高清渲染图',
      color: '#43e97b'
    }
  ]

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title}>{'简单三步，完成专业设计'}</h2>
          <p className={styles.subtitle}>
            {'从选择到出图，全程 AI 智能辅助，让设计更简单'}
          </p>
        </div>

        <div className={styles.timeline}>
          {steps.map((step, index) => (
            <div key={step.num} className={styles.step}>
              <div
                className={styles.stepCard}
                style={{ '--accent': step.color } as React.CSSProperties}
              >
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepIcon} style={{ background: step.color }}>
                  {step.icon}
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={styles.connector}>
                  <ArrowRightOutlined />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DesignProcess
