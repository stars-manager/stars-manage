import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Radio, Select, Input, Button, MessagePlugin } from 'tdesign-react';
import { useAppStore } from '../stores/app';
import { getUserRepos, createRepo, RepoInfo } from '../api/github';

interface SyncSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({ visible, onClose }) => {
  const { token, syncRepo, setSyncRepo } = useAppStore();
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>(syncRepo);
  const [newRepoName, setNewRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // 加载用户仓库列表
  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const userRepos = await getUserRepos(token);
      setRepos(userRepos);
    } catch {
      MessagePlugin.error('获取仓库列表失败');
    } finally {
      setLoadingRepos(false);
    }
  }, [token]);

  useEffect(() => {
    if (visible && token) {
      loadRepos();
    }
  }, [visible, token, loadRepos]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (mode === 'select') {
        if (!selectedRepo) {
          MessagePlugin.error('请选择一个仓库');
          setLoading(false);
          return;
        }
        setSyncRepo(selectedRepo);
        MessagePlugin.success('同步仓库设置成功');
        onClose();
      } else {
        // 创建新仓库
        if (!newRepoName.trim()) {
          MessagePlugin.error('请输入仓库名称');
          setLoading(false);
          return;
        }
        
        const repo = await createRepo(token, newRepoName.trim(), isPrivate);
        MessagePlugin.success(`仓库 ${repo.full_name} 创建成功`);
        
        // 重新加载仓库列表
        await loadRepos();
        
        // 设置选中新创建的仓库
        setSelectedRepo(repo.full_name);
        setSyncRepo(repo.full_name);
        
        // 切换到选择已有仓库模式
        setMode('select');
        
        // 清空输入框
        setNewRepoName('');
        
        // 不关闭弹窗，让用户看到新创建的仓库已被选中
      }
    } catch (error) {
      const err = error as Error;
      MessagePlugin.error(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      header="同步设置"
      visible={visible}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmBtn={{ 
        content: '确定', 
        loading,
        disabled: mode === 'create' && !newRepoName.trim()
      }}
      cancelBtn="取消"
      width="500px"
    >
      <div style={{ padding: '12px 0' }}>
        <p style={{ marginBottom: '16px', color: '#666' }}>
          选择一个已存在的仓库或创建新仓库来同步你的 Stars 数据
        </p>

        <Radio.Group value={mode} onChange={(value) => setMode(value as 'select' | 'create')} style={{ marginBottom: '16px' }}>
          <Radio value="select">选择已有仓库</Radio>
          <Radio value="create">创建新仓库</Radio>
        </Radio.Group>

        {mode === 'select' ? (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: repos.length === 0 && !loadingRepos ? '8px' : '0' }}>
              <Select
                value={selectedRepo}
                onChange={(value) => setSelectedRepo(value as string)}
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
              <Button 
                variant="outline" 
                onClick={loadRepos}
                loading={loadingRepos}
                title="刷新仓库列表"
              >
                刷新
              </Button>
            </div>
            {repos.length === 0 && !loadingRepos && (
              <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                暂无仓库，请切换到"创建新仓库"
              </p>
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                仓库名称：
              </div>
              <Input
                value={newRepoName}
                onChange={(value) => setNewRepoName(value)}
                placeholder="输入仓库名称"
                style={{ width: '100%' }}
              />
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

        {syncRepo && mode === 'select' && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '8px' }}>
              当前同步仓库：<strong>{syncRepo}</strong>
            </p>
            <a
              href={`https://github.com/${syncRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#0052cc' }}
            >
              → 查看仓库
            </a>
          </div>
        )}
      </div>
    </Dialog>
  );
};
