import React, { useState, useMemo, useCallback } from 'react';
import { Button, Space, Tag, Input, Tree } from 'tdesign-react';
import { ConfigStepProps } from './types';
import { GitHubRepo } from '../../types';
import { buildTreeData, calculateTreeChecked, parseTreeValue } from '../../utils/autoTaggerUtils';
import { useAppStore } from '../../stores/app';

// 内部使用的 Props，包含更多状态
interface ConfigStepInternalProps extends Omit<ConfigStepProps, 'selectedRepos' | 'onSelectionChange'> {
  selectedRepos: string[];
  onSelectionChange: (repos: string[]) => void;
}

export const ConfigStep: React.FC<ConfigStepInternalProps> = ({
  repoTagStats,
  stars,
  selectedRepos,
  onSelectionChange,
  onGenerate,
  isGenerating,
  onCancel,
}) => {
  const { repos } = useAppStore();
  const [searchKeyword, setSearchKeyword] = useState('');

  // 获取未设置标签的项目
  const untaggedRepos = (stars || []).filter(repo => {
    const repoInfo = repos[repo.full_name];
    const customLabels = repoInfo?.customLabels || [];
    const generatedLabels = repoInfo?.generatedLabels || [];
    return customLabels.length === 0 && generatedLabels.length === 0;
  });

  // 过滤后的未设置标签项目
  const filteredUntaggedRepos = useMemo(() => {
    if (!searchKeyword || !searchKeyword.trim()) return untaggedRepos;
    const keyword = searchKeyword.toLowerCase();
    return untaggedRepos.filter(repo =>
      repo.full_name.toLowerCase().includes(keyword) ||
      repo.name.toLowerCase().includes(keyword) ||
      (repo.description && repo.description.toLowerCase().includes(keyword)) ||
      (repo.language && repo.language.toLowerCase().includes(keyword))
    );
  }, [untaggedRepos, searchKeyword]);

  // 构建树形数据
  const untaggedTreeData = useMemo(() => {
    const repos = filteredUntaggedRepos || [];
    return buildTreeData(repos, (repo: GitHubRepo) => ({
      value: repo.full_name,
      label: repo.language ? `${repo.full_name} (${repo.language})` : repo.full_name,
      repo,
    }));
  }, [filteredUntaggedRepos]);

  // Tree 的 checked 值
  const untaggedTreeChecked = useMemo(() => {
    return calculateTreeChecked(selectedRepos, filteredUntaggedRepos || [], (repo: GitHubRepo) => repo.full_name);
  }, [selectedRepos, filteredUntaggedRepos]);

  // 处理 Tree 的选中变化
  const handleUntaggedCheck = useCallback((value: (string | number)[], _context: unknown) => {
    const repos = filteredUntaggedRepos || [];
    const stringValue = value.map(v => String(v));
    const parsed = parseTreeValue(stringValue, repos, (repo: GitHubRepo) => repo.full_name);
    onSelectionChange(parsed);
  }, [filteredUntaggedRepos, onSelectionChange]);

  // 实际选中的项目数量
  const actualSelectedCount = selectedRepos.length;

  // 判断当前过滤结果是否全部选中
  const isAllFilteredSelected = (filteredUntaggedRepos || []).length > 0 &&
    (filteredUntaggedRepos || []).every(r => selectedRepos.includes(r.full_name));

  // 判断"未设置标签"按钮是否应该高亮
  const isAllUntaggedSelected = searchKeyword && searchKeyword.trim()
    ? isAllFilteredSelected
    : untaggedRepos.length > 0 && untaggedRepos.every(r => selectedRepos.includes(r.full_name));

  // 批量选择操作
  const handleBatchSelect = useCallback((type: 'untagged') => {
    if (type === 'untagged') {
      const targetRepos = searchKeyword && searchKeyword.trim() ? filteredUntaggedRepos : untaggedRepos;
      const targetSet = new Set(targetRepos.map(r => r.full_name));
      const allTargetSelected = targetRepos.length > 0 &&
        targetRepos.every(r => selectedRepos.includes(r.full_name));

      if (allTargetSelected) {
        onSelectionChange(selectedRepos.filter(id => !targetSet.has(id)));
      } else {
        onSelectionChange(Array.from(new Set([...selectedRepos, ...targetSet])));
      }
    }
  }, [searchKeyword, filteredUntaggedRepos, untaggedRepos, selectedRepos, onSelectionChange]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    const filteredRepos = filteredUntaggedRepos || [];
    const allFilteredSelected = filteredRepos.length > 0 &&
      filteredRepos.every(r => selectedRepos.includes(r.full_name));

    if (allFilteredSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(Array.from(new Set(filteredRepos.map(r => r.full_name))));
    }
  }, [filteredUntaggedRepos, selectedRepos, onSelectionChange]);

  return (
    <div style={{ padding: '12px 0' }}>
      {/* 统计信息 */}
      <div style={{
        padding: '16px',
        background: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '14px', color: '#333', marginBottom: '12px' }}>
          统计信息
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#666' }}>总项目数：</span>
            <span style={{ fontWeight: 500 }}>{stars?.length || 0}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>未设置标签：</span>
            <span style={{ fontWeight: 500, color: '#E37318' }}>{repoTagStats.withoutTags ?? 0}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>自定义标签：</span>
            <span style={{ fontWeight: 500, color: '#0052D9' }}>{repoTagStats.withCustomTags ?? 0}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>AI 生成标签：</span>
            <span style={{ fontWeight: 500, color: '#2BA47D' }}>{repoTagStats.withGeneratedTags ?? 0}</span>
          </div>
        </div>
      </div>

      {repoTagStats.withoutTags === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          所有项目都已设置标签，无需生成
        </div>
      ) : (
        <>
          {/* 搜索框 + 工具栏 */}
          <div style={{ marginBottom: '12px' }}>
            <Input
              placeholder="搜索项目名称、描述或语言..."
              value={searchKeyword}
              onChange={setSearchKeyword}
              clearable
              style={{ marginBottom: '12px' }}
            />
            <div style={{
              padding: '12px',
              background: '#e3f2fd',
              borderRadius: '4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#1565c0', fontWeight: 500 }}>
                  选择要生成标签的项目
                </span>
                <Space>
                  <Button
                    size="small"
                    theme={isAllUntaggedSelected ? 'primary' : 'default'}
                    variant={isAllUntaggedSelected ? 'base' : 'outline'}
                    onClick={() => handleBatchSelect('untagged')}
                  >
                    未设置标签
                  </Button>
                  <Button
                    size="small"
                    theme={isAllFilteredSelected ? 'primary' : 'default'}
                    variant={isAllFilteredSelected ? 'base' : 'outline'}
                    onClick={handleSelectAll}
                  >
                    {isAllFilteredSelected ? '取消全选' : '全选'}
                  </Button>
                </Space>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>已选择：</span>
                <span style={{ color: '#0052D9', fontWeight: 500, fontSize: '16px' }}>{actualSelectedCount}</span>
                <span style={{ color: '#999' }}> 个项目</span>
                {filteredUntaggedRepos.length < untaggedRepos.length && (
                  <Tag size="small" theme="warning" variant="light">
                    筛选显示 {filteredUntaggedRepos.length} / {untaggedRepos.length}
                  </Tag>
                )}
              </div>
            </div>
          </div>

          {/* Tree 选择器 */}
          <div style={{
            marginBottom: '16px',
            border: '1px solid #e7e7e7',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            <Tree
              data={untaggedTreeData}
              checkable
              expandAll
              value={untaggedTreeChecked}
              onChange={handleUntaggedCheck}
              activeMultiple
            />
          </div>

          <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
            提示：点击分组节点可一次性选择该组内 20 个项目
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button
              theme="primary"
              onClick={onGenerate}
              loading={isGenerating}
              disabled={actualSelectedCount === 0}
            >
              开始生成标签 ({actualSelectedCount})
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
