import { useEffect } from 'react';
import { Form, Input, Select } from 'antd';
import { Editor3D } from '/@/3D/Editor';

import styles from './index.module.less';

const { TextArea } = Input;

const categoryOptions = [
  { value: 'box', label: '包装盒设计' },
  { value: 'bottle', label: '瓶型标签设计' },
  { value: 'clothing', label: '服装外观设计' },
  { value: 'ceramic', label: '瓷器表面设计' },
  { value: 'others', label: '其他' },
  { value: 'customDesign', label: '自定义设计' },
];

const ProductInfoSider: React.FC = () => {
  const [form] = Form.useForm();

  // 初始化：从 Editor3D 读取已有元信息
  useEffect(() => {
    if (!Editor3D.instance) return;
    const meta = Editor3D.instance.getProductMeta();
    form.setFieldsValue({
      name: meta.name || '',
      description: meta.description || '',
      category: meta.category || 'box',
      category_name: meta.category_name || '',
    });
  }, [form]);

  // 表单变更实时写入 Editor3D
  const handleValuesChange = (_: any, allValues: any) => {
    if (!Editor3D.instance) return;
    Editor3D.instance.setProductMeta({
      name: allValues.name || '',
      description: allValues.description || '',
      category: allValues.category || '',
      category_name: allValues.category_name || '',
    });
  };

  // 分类变更时自动填充分类名称
  const handleCategoryChange = (value: string) => {
    const option = categoryOptions.find(o => o.value === value);
    if (option) {
      form.setFieldValue('category_name', option.label);
      // 手动触发一次同步（setFieldValue 不会触发 onValuesChange）
      if (Editor3D.instance) {
        Editor3D.instance.setProductMeta({ category: value, category_name: option.label });
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>产品信息</h3>
      </div>

      <Form
        form={form}
        layout="vertical"
        className={styles.form}
        onValuesChange={handleValuesChange}
      >
        <Form.Item name="name" label="名称">
          <Input placeholder="请输入名称" maxLength={100} />
        </Form.Item>

        <Form.Item name="description" label="描述" className={styles.descriptionItem}>
          <TextArea
            placeholder="请输入描述"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item name="category" label="分类">
          <Select
            options={categoryOptions}
            placeholder="请选择分类"
            onChange={handleCategoryChange}
          />
        </Form.Item>

        <Form.Item name="category_name" label="分类名称">
          <Input placeholder="分类显示名称" maxLength={50} />
        </Form.Item>
      </Form>
    </div>
  );
};

export default ProductInfoSider;
