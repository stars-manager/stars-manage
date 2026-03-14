import React from 'react';
import { Select, Tag } from 'tdesign-react';
import { Label } from '../types';

// 特殊 ID：表示"未设标签"
export const NO_LABEL_ID = '__no_label__';

interface LabelSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  labels: Label[];
  placeholder?: string;
  style?: React.CSSProperties;
  showNoLabelOption?: boolean; // 是否显示"未设标签"选项
}

export const LabelSelect: React.FC<LabelSelectProps> = ({
  value,
  onChange,
  labels,
  placeholder = '请选择标签',
  style,
  showNoLabelOption = false, // 默认不显示
}) => {
  // 根据 showNoLabelOption 决定是否添加"未设标签"选项
  const options = [
    ...(showNoLabelOption
      ? [
          {
            label: '未设标签',
            value: NO_LABEL_ID,
          },
        ]
      : []),
    ...labels.map((label) => ({
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              backgroundColor: label.color,
              borderRadius: '2px',
              flexShrink: 0,
            }}
          />
          <span>
            {label.type === 'generated' && '✨ '}{label.name}
          </span>
        </div>
      ),
      value: label.id,
    })),
  ];

  // 分离"未设标签"选项和普通标签
  const hasNoLabel = value.includes(NO_LABEL_ID);
  const regularLabelIds = value.filter((id) => id !== NO_LABEL_ID);
  const selectedLabels = labels.filter((label) => regularLabelIds.includes(label.id));

  return (
    <Select
      value={value}
      onChange={(val) => {
        const newValue = Array.isArray(val) ? val : [val];
        onChange(newValue as string[]);
      }}
      placeholder={placeholder}
      multiple
      clearable
      filterable
      style={style}
      options={options}
      valueDisplay={() => {
        if (value.length === 0) return null;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {/* 显示"未设标签"标签 */}
            {hasNoLabel && (
              <Tag
                closable
                onClose={() => onChange(value.filter((id) => id !== NO_LABEL_ID))}
                style={{
                  backgroundColor: '#999',
                  color: '#fff',
                  border: 'none',
                }}
              >
                未设标签
              </Tag>
            )}
            {selectedLabels.map((label) => (
              <Tag
                key={label.id}
                closable
                onClose={() => onChange(value.filter((id) => id !== label.id))}
                style={{
                  backgroundColor: label.color,
                  color: '#fff',
                  border: 'none',
                }}
              >
                {label.type === 'generated' && '✨ '}{label.name}
              </Tag>
            ))}
          </div>
        );
      }}
    />
  );
};
