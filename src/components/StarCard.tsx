import React, { useState, memo, useCallback, useMemo } from 'react';
import { Tag, Button } from 'tdesign-react';
import { GitHubRepo, Label } from '../types';
import { useAppStore } from '../stores/app';
import { LabelSelector } from './LabelSelector';

interface StarCardProps {
  repo: GitHubRepo;
}

// 使用 React.memo 优化性能，只在 repo 变化时重新渲染
export const StarCard: React.FC<StarCardProps> = memo(({ repo }) => {
  const [showLabelSelector, setShowLabelSelector] = useState(false);

  // 使用 Zustand 选择器直接获取计算后的标签数据，避免不必要的重渲染
  const repoLabels = useAppStore(
    useCallback(state => {
      const repoLabelIds = [
        ...(state.repos[repo.full_name]?.customLabels || []),
        ...(state.repos[repo.full_name]?.generatedLabels || [])
      ];
      return repoLabelIds.map(id => state.labels.find(l => l.id === id)).filter(Boolean) as Label[];
    }, [repo.full_name])
  );
  
  // 使用 Zustand 选择器获取备注，避免每次渲染都调用方法
  const remark = useAppStore(
    useCallback(state => state.repos[repo.full_name]?.remark || '', [repo.full_name])
  );

  // 使用 useMemo 缓存格式化函数的结果
  const formattedDate = useMemo(() => {
    const date = new Date(repo.updated_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    if (diff < 30) return `${Math.floor(diff / 7)}周前`;
    if (diff < 365) return `${Math.floor(diff / 30)}月前`;
    return `${Math.floor(diff / 365)}年前`;
  }, [repo.updated_at]);

  const formattedStars = useMemo(() => {
    if (repo.stargazers_count >= 1000) {
      return `${(repo.stargazers_count / 1000).toFixed(1)}k`;
    }
    return repo.stargazers_count.toString();
  }, [repo.stargazers_count]);

  return (
    <>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: '1px solid #e7e7e7',
        }}
        onClick={() => window.open(repo.html_url, '_blank')}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = '#0052cc';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#e7e7e7';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* 顶部：仓库名 + 头像 + 统计信息 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          />
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#0052cc',
              marginBottom: '4px'
            }}>
              {repo.full_name}
            </h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#666' }}>
              <span>⭐ {formattedStars} stars</span>
              {repo.language && <span>● {repo.language}</span>}
              <span>📅 {formattedDate}</span>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              variant="outline"
              onClick={() => setShowLabelSelector(true)}
              title="为该项目添加或管理标签"
              style={{ 
                borderRadius: '6px',
                minWidth: '100px'
              }}
            >
              {repoLabels.length > 0 ? `📌 ${repoLabels.length}` : '📌 添加标签'}
            </Button>
          </div>
        </div>

        {/* 中部：描述 */}
        <p style={{ 
          color: '#333', 
          fontSize: '14px', 
          marginBottom: '12px',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {repo.description || '暂无描述'}
        </p>

        {/* 底部：备注和标签 */}
        {(repoLabels.length > 0 || remark) && (
          <div style={{ 
            paddingTop: '12px',
            borderTop: '1px solid #f0f0f0',
          }}>
            {remark && (
              <div style={{ 
                fontSize: '13px', 
                color: '#666', 
                backgroundColor: '#f7f7f7',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '8px',
                fontStyle: 'italic',
                borderLeft: '3px solid #0052cc',
              }}>
                💭 {remark}
              </div>
            )}
            {repoLabels.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {repoLabels.map(label => (
                  <Tag
                    key={label.id}
                    style={{
                      backgroundColor: label.color,
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      padding: '4px 12px',
                      borderRadius: '12px',
                    }}
                  >
                    {label.type === 'generated' && '✨ '}{label.name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showLabelSelector && (
        <LabelSelector
          repoFullName={repo.full_name}
          onClose={() => setShowLabelSelector(false)}
        />
      )}
    </>
  );
});
