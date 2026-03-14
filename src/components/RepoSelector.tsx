import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Select, Input, Button, MessagePlugin } from 'tdesign-react';
import { useAppStore } from '../stores/app';
import { getUserRepos, createRepo, RepoInfo } from '../api/github';

interface RepoSelectorProps {
  value: string;
  onChange: (repo: string) => void;
  onModeChange?: (mode: 'select' | 'create') => void;
  confirmedValue?: string; // 已确认的仓库
  onConfirm?: (repo: string) => void; // 确认选择仓库的回调
  currentSyncRepo?: string; // 当前同步的仓库
}

export const RepoSelector: React.FC<RepoSelectorProps> = ({ 
  value, 
  onChange, 
  onModeChange,
  confirmedValue,
  onConfirm,
  currentSyncRepo 
}) => {
  const { token } = useAppStore();
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>(value);
  const [newRepoName, setNewRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // 加载用户仓库列表
  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const userRepos = await getUserRepos(token);
      setRepos(userRepos);

      // 刷新后恢复到已确认的仓库
      if (confirmedValue) {
        setSelectedRepo(confirmedValue);
        onChange(confirmedValue);
      }
    } catch {
      MessagePlugin.error('获取仓库列表失败');
    } finally {
      setLoadingRepos(false);
    }
  }, [token, confirmedValue, onChange]);

  useEffect(() => {
    if (token) {
      loadRepos();
    }
  }, [token, loadRepos]);

  useEffect(() => {
    setSelectedRepo(value);
  }, [value]);

  const handleModeChange = (newMode: 'select' | 'create') => {
    setMode(newMode);
    onModeChange?.(newMode);
    if (newMode === 'select' && selectedRepo) {
      onChange(selectedRepo);
    }
  };

  const handleSelectChange = (repo: string) => {
    setSelectedRepo(repo);
    onChange(repo);
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      MessagePlugin.error('请输入仓库名称');
      return;
    }

    try {
      const repo = await createRepo(token, newRepoName.trim(), isPrivate);
      MessagePlugin.success(`仓库 ${repo.full_name} 创建成功`);
      
      // 重新加载仓库列表
      await loadRepos();
      
      // 设置选中新创建的仓库
      setSelectedRepo(repo.full_name);
      onChange(repo.full_name);
      
      // 切换到选择已有仓库模式
      setMode('select');
      
      // 清空输入框
      setNewRepoName('');
    } catch (error) {
      const err = error as Error;
      MessagePlugin.error(err.message || '创建仓库失败');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Radio.Group value={mode} onChange={(value) => handleModeChange(value as 'select' | 'create')}>
          <Radio value="select">选择已有仓库</Radio>
          <Radio value="create">创建新仓库</Radio>
        </Radio.Group>
        {mode === 'select' && (
          <Button 
            variant="outline" 
            size="small"
            onClick={loadRepos}
            loading={loadingRepos}
            title="刷新仓库列表"
          >
            刷新
          </Button>
        )}
      </div>

      {mode === 'select' ? (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <Select
              value={selectedRepo}
              onChange={(value) => handleSelectChange(value as string)}
              placeholder={loadingRepos ? '加载中...' : '请选择仓库'}
              loading={loadingRepos}
              style={{ flex: 1 }}
              filterable
            >
              {repos.map((repo) => (
                <Select.Option key={repo.full_name} value={repo.full_name} label={repo.full_name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{repo.full_name}</span>
                    {repo.private && (
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>私有</span>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
            {onConfirm && (
              <Button
                onClick={() => selectedRepo && onConfirm(selectedRepo)}
                disabled={!selectedRepo || selectedRepo === currentSyncRepo}
                theme={selectedRepo && selectedRepo !== currentSyncRepo ? 'primary' : 'default'}
                title={
                  !selectedRepo 
                    ? '请先选择仓库' 
                    : selectedRepo === currentSyncRepo 
                      ? '已选择当前同步仓库' 
                      : '确认选择此仓库'
                }
              >
                确认选择
              </Button>
            )}
          </div>
          {confirmedValue && confirmedValue === selectedRepo && (
            <div style={{ 
              padding: '8px 12px', 
              background: '#e8f5e9', 
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '12px',
              color: '#2e7d32'
            }}>
              ✓ 已确认选择仓库：{confirmedValue}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
              仓库名称：
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                value={newRepoName}
                onChange={(value) => setNewRepoName(value)}
                placeholder="输入仓库名称"
                style={{ flex: 1 }}
              />
              <Button 
                onClick={handleCreateRepo} 
                disabled={!newRepoName.trim()}
                title="创建新的 GitHub 仓库"
              >
                创建
              </Button>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Radio.Group value={isPrivate} onChange={(value) => setIsPrivate(value as boolean)}>
              <Radio value={true}>私有仓库</Radio>
              <Radio value={false}>公共仓库</Radio>
            </Radio.Group>
          </div>
          <p style={{ fontSize: '12px', color: '#999' }}>
            {isPrivate ? '仅你和你授权的人可以访问' : '任何人都可以看到此仓库'}
          </p>
        </div>
      )}
    </div>
  );
};
