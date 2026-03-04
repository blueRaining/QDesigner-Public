import { Card, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { Design } from '/@/api/local/designs';

import styles from './DesignCard.module.less';

const { Paragraph } = Typography;

interface DesignCardProps {
  design: Design;
  onClick?: (design: Design) => void;
}

const DesignCard: React.FC<DesignCardProps> = ({ design, onClick }) => {
  return (
    <Card
      className={styles.card}
      hoverable
      onClick={() => onClick?.(design)}
      cover={
        <div className={styles.cover}>
          {design.thumbnail_url ? (
            <img src={design.thumbnail_url} alt={design.name} className={styles.thumbnail} />
          ) : (
            <div className={styles.placeholder}>
              <span>暂无预览</span>
            </div>
          )}
        </div>
      }
    >
      <div className={styles.content}>
        <Paragraph className={styles.title} ellipsis={{ rows: 1 }}>
          {design.name}
        </Paragraph>
        <div className={styles.meta}>
          <div className={styles.author}>
            <div className={styles.avatar} />
            <span className={styles.authorName}>{design.user_name || 'QDesign'}</span>
          </div>
          <div className={styles.stats}>
            <span className={styles.views}>
              <EyeOutlined />
              <span>{design.view_count || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DesignCard;
