import React, { useState, useCallback, useMemo } from 'react';
import { Button, Space, Dialog, Tag, Loading, Tree, Input, MessagePlugin } from 'tdesign-react';
import { useAppStore, PendingTagChange } from '../stores/app';
import { generateStarsTags, ProjectInfoForTags } from '../api/server';
import { buildTreeData, calculateTreeChecked, parseTreeValue, BATCH_SIZE } from '../utils/autoTaggerUtils';
import { GitHubRepo } from '../types';

interface AutoTaggerProps {
  visible: boolean;
  onClose: () => void;
}

export const AutoTagger: React.FC<AutoTaggerProps> = ({ visible, onClose }) => {
  const { stars, repos, findOrCreateLabelByName, setRepoLabels, getRepoLabels } = useAppStore();

  // 状态
  const [step, setStep] = useState<'config' | 'generating' | 'confirm'>('config');
  const [pendingChanges, setPendingChanges] = useState<PendingTagChange[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]); // 配置步骤选中的项目
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]); // 确认步骤选中的项目
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键字
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // 统计项目标签情况（同时考虑自定义标签和 AI 生成标签）
  const repoTagStats = useMemo(() => {
    let withCustomTags = 0;
    let withGeneratedTags = 0;
    let withoutTags = 0;

    (stars || []).forEach(repo => {
      const repoInfo = (repos || {})[repo.full_name];
      const customLabels = repoInfo?.customLabels || [];
      const generatedLabels = repoInfo?.generatedLabels || [];
      const hasLabels = customLabels.length > 0 || generatedLabels.length > 0;

      if (!hasLabels) {
        withoutTags++;
      } else {
        const hasCustom = customLabels.length > 0;
        const hasGenerated = generatedLabels.length > 0;

        if (hasCustom) withCustomTags++;
        if (hasGenerated) withGeneratedTags++;
      }
    });

    return { withCustomTags, withGeneratedTags, withoutTags };
  }, [stars, repos]);

  // 获取未设置标签的项目（没有任何标签）
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

  // 构建未设置标签项目的树形数据（使用工具函数）
  const untaggedTreeData = useMemo(() => {
    const repos = filteredUntaggedRepos || [];
    return buildTreeData(repos, (repo: GitHubRepo) => ({
      value: repo.full_name,
      label: repo.language ? `${repo.full_name} (${repo.language})` : repo.full_name,
      repo,
    }));
  }, [filteredUntaggedRepos]);

  // 获取 Tree 的 checked 值（使用工具函数）
  const untaggedTreeChecked = useMemo(() => {
    return calculateTreeChecked(selectedRepos, filteredUntaggedRepos || [], (repo: GitHubRepo) => repo.full_name);
  }, [selectedRepos, filteredUntaggedRepos]);

  // 处理 Tree 的选中变化（使用工具函数）
  const handleUntaggedCheck = useCallback((value: (string | number)[], _context: unknown) => {
    const repos = filteredUntaggedRepos || [];
    const stringValue = value.map(v => String(v));
    const parsed = parseTreeValue(stringValue, repos, (repo: GitHubRepo) => repo.full_name);
    setSelectedRepos(parsed);
  }, [filteredUntaggedRepos]);

  // 获取实际选中的项目数量（基于原始数据）
  const actualSelectedCount = selectedRepos.length;

  // 判断当前过滤结果是否全部选中
  const isAllFilteredSelected = (filteredUntaggedRepos || []).length > 0 &&
    (filteredUntaggedRepos || []).every(r => selectedRepos.includes(r.full_name));

  // 判断"未设置标签"按钮是否应该高亮
  // 如果有搜索关键字,判断当前搜索结果是否全部选中;否则判断所有未设置标签的项目是否全部选中
  const isAllUntaggedSelected = searchKeyword && searchKeyword.trim()
    ? isAllFilteredSelected  // 有搜索关键字时,基于当前搜索结果
    : untaggedRepos.length > 0 && untaggedRepos.every(r => selectedRepos.includes(r.full_name));  // 无搜索关键字时,基于所有未设置标签的项目

  // 批量选择操作（配置步骤）
  const handleBatchSelect = useCallback((type: 'untagged') => {
    if (type === 'untagged') {
      // 如果有搜索关键字,操作当前搜索结果;否则操作所有未设置标签的项目
      const targetRepos = searchKeyword && searchKeyword.trim() ? filteredUntaggedRepos : untaggedRepos;
      const targetSet = new Set(targetRepos.map(r => r.full_name));

      // 判断目标项目是否全部选中
      const allTargetSelected = targetRepos.length > 0 &&
        targetRepos.every(r => selectedRepos.includes(r.full_name));

      if (allTargetSelected) {
        // 已经全选,取消选中目标项目
        setSelectedRepos(prev => prev.filter(id => !targetSet.has(id)));
      } else {
        // 未全选,选中目标项目(保留其他已选中的项目)
        setSelectedRepos(prev => {
          const newSet = new Set(prev);
          targetSet.forEach(id => newSet.add(id));
          return Array.from(newSet);
        });
      }
    }
  }, [searchKeyword, filteredUntaggedRepos, untaggedRepos, selectedRepos]);

  // 全选/取消全选（基于当前过滤结果）
  const handleSelectAll = useCallback(() => {
    const filteredRepos = filteredUntaggedRepos || [];

    // 使用函数式更新来获取最新的 selectedRepos
    setSelectedRepos(prevSelected => {
      const currentFilteredSet = new Set(filteredRepos.map(r => r.full_name));

      // 检查当前过滤结果是否全部已选中
      const allFilteredSelected = filteredRepos.length > 0 &&
        filteredRepos.every(r => prevSelected.includes(r.full_name));

      if (allFilteredSelected) {
        // 取消全选：清空所有选中
        return [];
      } else {
        // 全选：选中所有当前过滤后的项目
        return Array.from(currentFilteredSet);
      }
    });
  }, [filteredUntaggedRepos]);

  // 生成标签（只为选中的项目生成）
  const handleGenerate = useCallback(async () => {
    if (selectedRepos.length === 0) {
      MessagePlugin.warning('请先选择要生成标签的项目');
      return;
    }

    setIsGenerating(true);
    setStep('generating');
    setGeneratingProgress({ current: 0, total: selectedRepos.length });

    const changes: PendingTagChange[] = [];
    const selectedReposList = untaggedRepos.filter(r => selectedRepos.includes(r.full_name));
    const totalBatches = Math.ceil(selectedReposList.length / BATCH_SIZE);

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = selectedReposList.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        const projects: ProjectInfoForTags[] = batch.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || undefined,
          language: repo.language || undefined,
          url: repo.html_url,
          stars: repo.stargazers_count,
        }));

        try {
          const response = await generateStarsTags({ projects });

          // 构建项目名称到标签的映射
          const projectTagsMap = new Map<string, string[]>();
          if (response.data?.projects && Array.isArray(response.data.projects)) {
            response.data.projects.forEach(p => {
              projectTagsMap.set(p.name, Array.isArray(p.tags) ? p.tags : ['未分类']);
            });
          }

          batch.forEach(repo => {
            const tags = projectTagsMap.get(repo.name) || ['未分类'];
            const currentLabels = getRepoLabels(repo.full_name);
            changes.push({
              repoFullName: repo.full_name,
              repoName: repo.name,
              description: repo.description,
              language: repo.language,
              suggestedTags: tags,
              currentLabelIds: currentLabels,
            });
          });
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          if (i === 0) {
            MessagePlugin.error('无法连接到后端服务，请确保后端服务正在运行（http://localhost:8080）');
          }
          batch.forEach(repo => {
            const currentLabels = getRepoLabels(repo.full_name);
            changes.push({
              repoFullName: repo.full_name,
              repoName: repo.name,
              description: repo.description,
              language: repo.language,
              suggestedTags: ['未分类'],
              currentLabelIds: currentLabels,
            });
          });
        }

        setGeneratingProgress({ current: (i + 1) * BATCH_SIZE, total: selectedReposList.length });

        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setPendingChanges(changes);
      setSelectedChanges(changes.map(c => c.repoFullName));
      setStep('confirm');
    } catch {
      MessagePlugin.error('标签生成失败');
      setStep('config');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedRepos, untaggedRepos, getRepoLabels]);

  // 重置状态
  const resetState = useCallback(() => {
    setStep('config');
    setPendingChanges([]);
    setSelectedRepos([]);
    setSelectedChanges([]);
    setSearchKeyword('');
    setGeneratingProgress({ current: 0, total: 0 });
  }, []);

  // 应用选中的标签变更
  const handleApply = useCallback(async () => {
    if (selectedChanges.length === 0) {
      MessagePlugin.warning('请至少选择一个项目');
      return;
    }

    setIsApplying(true);

    try {
      let appliedCount = 0;

      for (const change of pendingChanges) {
        if (!selectedChanges.includes(change.repoFullName)) continue;

        // 确保 suggestedTags 存在且是数组
        const tags = Array.isArray(change.suggestedTags) ? change.suggestedTags : [];

        // 为每个建议的标签创建或查找标签
        const labelIds = tags.map(tagName => {
          const labelId = findOrCreateLabelByName(tagName, 'generated');
          return labelId;
        }).filter(id => id); // 过滤掉可能的 undefined

        if (labelIds.length > 0) {
          setRepoLabels(change.repoFullName, labelIds, 'generated');
          appliedCount++;
        }
      }

      MessagePlugin.success(`已为 ${appliedCount} 个项目应用标签`);
      onClose();
      resetState();
    } catch {
      MessagePlugin.error('应用标签失败');
    } finally {
      setIsApplying(false);
    }
  }, [pendingChanges, selectedChanges, findOrCreateLabelByName, setRepoLabels, onClose, resetState]);

  // 关闭时重置
  const handleClose = useCallback(() => {
    onClose();
    resetState();
  }, [onClose, resetState]);

  return (
    <Dialog
      header="自动标签生成"
      visible={visible}
      onClose={handleClose}
      width="800px"
      footer={null}
    >
      {/* 配置步骤：选择项目 */}
      {step === 'config' && (
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
                <Button variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button
                  theme="primary"
                  onClick={handleGenerate}
                  loading={isGenerating}
                  disabled={actualSelectedCount === 0}
                >
                  开始生成标签 ({actualSelectedCount})
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 生成中步骤 */}
      {step === 'generating' && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Loading text="正在生成标签..." />
          <div style={{ marginTop: '16px', color: '#666' }}>
            已处理 {Math.min(generatingProgress.current, generatingProgress.total)} / {generatingProgress.total} 个项目
          </div>
          <div style={{ 
            marginTop: '12px', 
            width: '300px', 
            height: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            margin: '12px auto'
          }}>
            <div style={{
              width: `${(generatingProgress.current / generatingProgress.total) * 100}%`,
              height: '100%',
              background: '#0052D9',
              borderRadius: '4px',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* 确认步骤：查看生成的标签并确认应用 */}
      {step === 'confirm' && (
        <div style={{ padding: '12px 0' }}>
          {/* 工具栏 */}
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#e8f5e9',
            borderRadius: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#2e7d32', fontWeight: 500 }}>
                已生成 {pendingChanges.length} 个项目的标签建议
              </span>
              <Space>
                <Button
                  size="small"
                  theme={selectedChanges.length === pendingChanges.length ? 'primary' : 'default'}
                  variant={selectedChanges.length === pendingChanges.length ? 'base' : 'outline'}
                  onClick={() => selectedChanges.length === pendingChanges.length ? setSelectedChanges([]) : setSelectedChanges(pendingChanges.map(c => c.repoFullName))}
                >
                  {selectedChanges.length === pendingChanges.length ? '取消全选' : '全选'}
                </Button>
              </Space>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>已选择应用：</span>
              <span style={{ color: '#0052D9', fontWeight: 500, fontSize: '16px' }}>{selectedChanges.length}</span>
              <span style={{ color: '#999' }}> / {pendingChanges.length} 个项目</span>
            </div>
          </div>

          {/* 项目列表 - 可选择 */}
          <div style={{
            maxHeight: '400px',
            overflow: 'auto',
            border: '1px solid #e7e7e7',
            borderRadius: '4px',
            background: '#fff'
          }}>
            {pendingChanges.map(change => {
              const isSelected = selectedChanges.includes(change.repoFullName);
              return (
                <div
                  key={change.repoFullName}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedChanges(prev => prev.filter(id => id !== change.repoFullName));
                    } else {
                      setSelectedChanges(prev => [...prev, change.repoFullName]);
                    }
                  }}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: isSelected ? '#e3f2fd' : '#fff',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: `2px solid ${isSelected ? '#0052D9' : '#d9d9d9'}`,
                      background: isSelected ? '#0052D9' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <Tag size="small" theme="primary" variant="outline">
                      {change.repoFullName}
                    </Tag>
                    {change.language && (
                      <Tag size="small" theme="default" variant="light">
                        {change.language}
                      </Tag>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '24px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#999', fontSize: '12px' }}>→</span>
                    {change.suggestedTags.map((tag, idx) => (
                      <Tag key={idx} size="small" theme="success" variant="light">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部操作栏 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#999' }}>
              点击项目可切换选中状态
            </div>
            <Space>
              <Button variant="outline" onClick={() => {
                setStep('config');
                setPendingChanges([]); // 清空已生成的标签
                setSelectedChanges([]); // 清空选中的变更
              }}>
                重新选择
              </Button>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                theme="primary"
                onClick={handleApply}
                loading={isApplying}
                disabled={selectedChanges.length === 0}
              >
                应用选中标签 ({selectedChanges.length})
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Dialog>
  );
};
