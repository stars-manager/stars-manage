import React, { useEffect, useRef } from 'react';
import { Form, FormInstanceFunctions, Select, Button, Space, InputNumber } from 'tdesign-react';

const FormItem = Form.FormItem;

export interface AdvancedFilter {
  starsMin: number;     // Stars 最小值
  starsMax: number;     // Stars 最大值
  updatedDays: number;  // 更新天数
}

// 预设的时间筛选选项
export const UPDATED_OPTIONS = [
  { label: '今天', value: 0 },
  { label: '3天内', value: 3 },
  { label: '一周内', value: 7 },
  { label: '一个月内', value: 30 },
  { label: '三个月内', value: 90 },
  { label: '半年内', value: 180 },
  { label: '一年内', value: 365 },
];

const STORAGE_KEY = 'stars-manage-advanced-filter';

// 默认筛选条件
const DEFAULT_FILTER: AdvancedFilter = {
  starsMin: 0,
  starsMax: 100000,
  updatedDays: 365,
};

interface FilterPanelProps {
  visible: boolean;
  onClose: () => void;
  filter: AdvancedFilter | null;
  onFilterChange: (filter: AdvancedFilter) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  visible,
  onClose,
  onFilterChange,
}) => {
  const formRef = useRef<FormInstanceFunctions>(null);

  // 打开面板时从 localStorage 恢复筛选条件
  useEffect(() => {
    if (visible && formRef.current) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const savedFilter = JSON.parse(stored) as AdvancedFilter;
          formRef.current.setFieldsValue(savedFilter);
        } catch (e) {
          console.error('Failed to parse saved filter:', e);
          formRef.current.setFieldsValue(DEFAULT_FILTER);
        }
      } else {
        formRef.current.setFieldsValue(DEFAULT_FILTER);
      }
    }
  }, [visible]);

  // 表单验证规则
  const formRules = {
    starsMin: [{ required: true, message: '请输入最小值' }],
    starsMax: [{ required: true, message: '请输入最大值' }],
    updatedDays: [{ required: true, message: '请选择更新时间' }],
  };

  // 应用筛选
  const handleApply = async () => {
    const validateResult = await formRef.current?.validate();
    if (validateResult === true) {
      const formData = formRef.current?.getFieldsValue?.(true) as unknown as AdvancedFilter;
      
      // 验证最大值不能小于最小值
      if (formData.starsMax < formData.starsMin) {
        formRef.current?.setValidateMessage({
          starsMax: [{ type: 'error', message: '最大值不能小于最小值' }],
        });
        return;
      }
      
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      onFilterChange(formData);
      onClose();
    }
  };

  // 重置筛选
  const handleReset = () => {
    formRef.current?.reset();
    localStorage.removeItem(STORAGE_KEY);
    onFilterChange(DEFAULT_FILTER);
  };

  if (!visible) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* 筛选面板 */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 1001,
        }}
      >
        <h3 style={{ marginBottom: '20px', marginTop: 0 }}>高级筛选</h3>

        <Form
          ref={formRef}
          rules={formRules}
          labelAlign="right"
          labelWidth="100px"
          initialData={DEFAULT_FILTER}
        >
          <FormItem label="Stars 最小值" name="starsMin">
            <InputNumber
              min={0}
              placeholder="请输入最小值"
              style={{ width: '100%' }}
            />
          </FormItem>

          <FormItem label="Stars 最大值" name="starsMax">
            <InputNumber
              min={0}
              placeholder="请输入最大值"
              style={{ width: '100%' }}
            />
          </FormItem>

          <FormItem label="最后更新" name="updatedDays">
            <Select
              placeholder="请选择更新时间"
              style={{ width: '100%' }}
              options={UPDATED_OPTIONS}
            />
          </FormItem>
        </Form>

        {/* 操作按钮 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: '24px',
          }}
        >
          <Space>
            <Button variant="outline" onClick={handleReset}>
              重置
            </Button>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button theme="primary" onClick={handleApply}>
              应用
            </Button>
          </Space>
        </div>
      </div>
    </>
  );
};

// 导出辅助函数：在列表筛选中使用高级筛选
export const applyAdvancedFilter = (
  repos: { repo: { stargazers_count: number; description: string | null; updated_at: string } }[],
  filter: AdvancedFilter | null
): typeof repos => {
  if (!filter) return repos;
  
  return repos.filter(({ repo }) => {
    // Stars 数量筛选
    if (repo.stargazers_count < filter.starsMin) {
      return false;
    }
    if (repo.stargazers_count > filter.starsMax) {
      return false;
    }

    // 更新时间筛选
    const updatedDate = new Date(repo.updated_at);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > filter.updatedDays) {
      return false;
    }

    return true;
  });
};
