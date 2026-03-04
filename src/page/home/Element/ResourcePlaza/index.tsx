import { useState, useEffect, useCallback } from 'react';
import { Tabs, Select, Spin, Empty } from 'antd';
import { getPublicDesigns, type Design, type DesignCategory } from '/@/api/local/designs';
import DesignCard from './components/DesignCard';
import PreviewModal from '../components/PreviewModal';

import styles from './index.module.less';

type CategoryKey = DesignCategory | 'all';

/**
 * 资源广场页面
 * 展示所有 CDN 资源作品
 */
const ResourcePlaza: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [previewDesignId, setPreviewDesignId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');

  const categories: { key: CategoryKey; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'box', label: '包装盒' },
    { key: 'bottle', label: '瓶型' },
    { key: 'clothing', label: '服装' },
    { key: 'ceramic', label: '瓷器' },
    { key: 'others', label: '其他' },
  ];

  const sortOptions = [
    { value: 'latest', label: '最新' },
    { value: 'popular', label: '最热' },
  ];

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPublicDesigns({
        category: category === 'all' ? undefined : category,
        sort,
        limit: 50,
      });
      setDesigns(result.items);
    } catch (error) {
      console.error('Failed to load designs:', error);
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const handleCategoryChange = (key: string) => {
    setCategory(key as CategoryKey);
  };

  const handleSortChange = (value: string) => {
    setSort(value as 'latest' | 'popular');
  };

  const handleDesignClick = (design: Design) => {
    setPreviewDesignId(design.id);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>资源广场</h1>
        <p className={styles.subtitle}>探索精选的 3D 模板作品，快速开始产品设计</p>
      </div>

      <div className={styles.filters}>
        <Tabs
          activeKey={category}
          onChange={handleCategoryChange}
          items={categories.map((cat) => ({
            key: cat.key,
            label: cat.label,
          }))}
        />
        <div className={styles.sortWrapper}>
          <span className={styles.sortLabel}>排序:</span>
          <Select
            value={sort}
            onChange={handleSortChange}
            options={sortOptions}
            style={{ width: 100 }}
          />
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <Spin size="large" />
          </div>
        ) : designs.length === 0 ? (
          <Empty description="暂无作品" />
        ) : (
          <div className={styles.grid}>
            {designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onClick={handleDesignClick}
              />
            ))}
          </div>
        )}
      </div>
      <PreviewModal
        open={!!previewDesignId}
        designId={previewDesignId || undefined}
        onClose={() => setPreviewDesignId(null)}
      />
    </div>
  );
};

export default ResourcePlaza;
