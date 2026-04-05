import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GitHubRepo, Label, Repos } from '../types';
import { fetchAllStars, getFile, createOrUpdateFile, getFileContent } from '../api/github-proxy';
import { logout as logoutAPI, getCurrentUser } from '../api/auth';
import { generateId } from '../utils/storage';
import { generateReadme, generateJson } from '../utils/markdown';
import { mergeStarsData, parseSyncData, MergeStats } from '../utils/dataMerge';

// 待确认的标签变更
export interface PendingTagChange {
  repoFullName: string;
  repoName: string;
  description: string | null;
  language: string | null;
  suggestedTags: string[];
  currentLabelIds: string[];
}

interface AppState {
  // State
  isAuthenticated: boolean;
  user: { login: string; avatar_url: string } | null;
  stars: GitHubRepo[];
  loadingStars: boolean;
  labels: Label[];
  repos: Repos;
  syncRepo: string;
  showFetchStarsModal: boolean;
  activeTab: 'stars' | 'labels';
  syncing: boolean;
  lastSyncTime: number;
  // 批量操作相关状态
  selectedRepos: string[];
  batchMode: boolean;

  // Actions
  checkAuth: () => Promise<void>;
  fetchStars: () => Promise<MergeStats | void>;
  addLabel: (name: string, color: string, type?: 'custom' | 'generated') => void;
  updateLabel: (id: string, name: string, color: string) => void;
  deleteLabel: (id: string) => void;
  setRepoLabels: (repoFullName: string, labelIds: string[], labelType?: 'custom' | 'generated') => void;
  getRepoLabels: (repoFullName: string) => string[];
  getRepoCustomLabels: (repoFullName: string) => string[];
  getRepoGeneratedLabels: (repoFullName: string) => string[];
  setRepoRemark: (repoFullName: string, remark: string) => void;
  getRepoRemark: (repoFullName: string) => string;
  setSyncRepo: (repo: string) => void;
  setShowFetchStarsModal: (show: boolean) => void;
  setActiveTab: (tab: 'stars' | 'labels') => void;
  syncToRepo: () => Promise<void>;
  logout: () => Promise<void>;
  findOrCreateLabelByName: (name: string, type: 'custom' | 'generated') => string;
  // 批量操作
  toggleBatchMode: () => void;
  toggleRepoSelection: (repoFullName: string) => void;
  selectAllRepos: (repoFullNames: string[]) => void;
  clearSelection: () => void;
  batchAddLabels: (labelIds: string[]) => void;
  batchRemoveLabels: (labelIds: string[]) => void;
  batchDeleteRepos: () => void;
  batchExportRepos: () => string;
}

const stateCreator: StateCreator<AppState> = (set, get) => ({
  // Initial State
  isAuthenticated: false,
  user: null,
  stars: [],
  loadingStars: false,
  labels: [],
  repos: {},
  syncRepo: '',
  showFetchStarsModal: false,
  activeTab: 'stars',
  syncing: false,
  lastSyncTime: 0,
  selectedRepos: [],
  batchMode: false,

  // Actions
  checkAuth: async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        set({
          isAuthenticated: true,
          user: { login: userData.login, avatar_url: userData.avatar_url },
        });
      }
    } catch {
      set({ isAuthenticated: false, user: null });
    }
  },

  fetchStars: async () => {
    const { user, repos, labels, syncRepo } = get();
    if (!user) return;

    set({ loadingStars: true });
    try {
      // 1. 从后端代理获取最新 Stars
      const allStars = await fetchAllStars(user.login);
      
      // 2. 如果配置了同步仓库，尝试从仓库读取 JSON 数据
      let localRepos = repos;
      let localLabels = labels;
      
      if (syncRepo) {
        try {
          const [owner, repo] = syncRepo.split('/');
          const fileData = await getFileContent(owner, repo, 'stars.json');
          
          if (fileData) {
            const syncData = parseSyncData(fileData.content);
            
            if (syncData) {
              // 使用远程数据作为本地数据
              if (syncData.repos) {
                localRepos = syncData.repos;
              }
              if (syncData.labels) {
                localLabels = syncData.labels;
              }
            }
          }
        } catch (error) {
          // 如果读取失败，继续使用本地数据
          console.warn('Failed to read sync data from repo:', error);
        }
      }
      
      // 3. 合并 GitHub Stars 和本地数据
      const mergeResult = mergeStarsData(allStars, localRepos, localLabels);
      
      // 4. 更新状态
      set({ 
        stars: mergeResult.stars, 
        repos: mergeResult.repos,
        labels: mergeResult.labels,
        lastSyncTime: Date.now(),
      });
      
      // 5. 返回合并统计信息
      return mergeResult.stats;
    } finally {
      set({ loadingStars: false });
    }
  },

  addLabel: (name: string, color: string, type: 'custom' | 'generated' = 'custom') => {
    const newLabel: Label = { id: generateId(), name, color, type };
    set((state) => ({
      labels: [...state.labels, newLabel],
    }));
  },

  updateLabel: (id: string, name: string, color: string) => {
    set((state) => ({
      labels: state.labels.map((l) =>
        l.id === id ? { ...l, name, color } : l
      ),
    }));
  },

  deleteLabel: (id: string) => {
    set((state) => {
      const newRepos: Repos = {};
      Object.entries(state.repos).forEach(([repoFullName, repoInfo]) => {
        newRepos[repoFullName] = {
          ...repoInfo,
          customLabels: repoInfo.customLabels.filter((labelId) => labelId !== id),
          generatedLabels: repoInfo.generatedLabels.filter((labelId) => labelId !== id),
        };
      });
      return {
        labels: state.labels.filter((l) => l.id !== id),
        repos: newRepos,
      };
    });
  },

  setRepoLabels: (repoFullName: string, labelIds: string[], labelType: 'custom' | 'generated' = 'custom') => {
    set((state) => {
      const existingRepo = state.repos[repoFullName] || {
        customLabels: [],
        generatedLabels: [],
        description: null,
        language: null,
      };

      return {
        repos: {
          ...state.repos,
          [repoFullName]: {
            ...existingRepo,
            customLabels: labelType === 'custom' ? labelIds : existingRepo.customLabels,
            generatedLabels: labelType === 'generated' ? labelIds : existingRepo.generatedLabels,
          },
        },
      };
    });
  },

  getRepoLabels: (repoFullName: string) => {
    const repoInfo = get().repos[repoFullName];
    if (!repoInfo) return [];
    // 返回合并后的标签ID数组（自定义标签在前，AI生成标签在后）
    return [...(repoInfo.customLabels || []), ...(repoInfo.generatedLabels || [])];
  },

  getRepoCustomLabels: (repoFullName: string) => {
    return get().repos[repoFullName]?.customLabels || [];
  },

  getRepoGeneratedLabels: (repoFullName: string) => {
    return get().repos[repoFullName]?.generatedLabels || [];
  },

  setRepoRemark: (repoFullName: string, remark: string) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [repoFullName]: {
          ...state.repos[repoFullName],
          remark,
        },
      },
    }));
  },

  getRepoRemark: (repoFullName: string) => {
    return get().repos[repoFullName]?.remark || '';
  },

  setSyncRepo: (repo: string) => {
    set({ syncRepo: repo });
  },

  setShowFetchStarsModal: (show: boolean) => {
    set({ showFetchStarsModal: show });
  },

  setActiveTab: (tab: 'stars' | 'labels') => {
    set({ activeTab: tab });
  },

  syncToRepo: async () => {
    const { syncRepo, stars, labels, repos, isAuthenticated } = get();
    
    if (!isAuthenticated) {
      throw new Error('请先登录');
    }
    
    if (!syncRepo) {
      throw new Error('请先选择同步仓库');
    }
    
    if (stars.length === 0) {
      throw new Error('暂无 Stars 数据可同步');
    }
    
    set({ syncing: true });
    
    try {
      const [owner, repo] = syncRepo.split('/');
      const timestamp = new Date().toLocaleString('zh-CN');
      
      const jsonContent = generateJson(stars, labels, repos);
      
      const existingJson = await getFile(owner, repo, 'stars.json');
      const jsonSha = existingJson?.sha;
      
      await createOrUpdateFile(
        owner,
        repo,
        'stars.json',
        jsonContent,
        `Update data: ${timestamp}`,
        jsonSha
      );
      
      const readmeContent = generateReadme(stars, labels, repos);
      
      const existingReadme = await getFile(owner, repo, 'README.md');
      const readmeSha = existingReadme?.sha;
      
      await createOrUpdateFile(
        owner,
        repo,
        'README.md',
        readmeContent,
        `Update README: ${timestamp}`,
        readmeSha
      );
    } catch (error: unknown) {
      const err = error as Error;
      const message = err.message || '推送失败，请检查网络或登录状态';
      // 使用扩展 Error 类来保留 cause
      class SyncError extends Error {
        constructor(msg: string, public cause?: unknown) {
          super(msg);
          this.name = 'SyncError';
        }
      }
      throw new SyncError(message, error);
    } finally {
      set({ syncing: false });
    }
  },

  logout: async () => {
    await logoutAPI();
    set({ isAuthenticated: false, user: null, stars: [] });
  },

  // 查找或创建标签（根据名称）
  // 修复竞态条件：在 set 回调内部再次检查，确保原子性操作
  findOrCreateLabelByName: (name: string, type: 'custom' | 'generated'): string => {
    let existingLabelId: string | undefined;
    
    set((state) => {
      // 在 set 回调内部检查，避免竞态条件
      const existingLabel = state.labels.find(l => l.name === name);
      
      if (existingLabel) {
        existingLabelId = existingLabel.id;
        return state; // 不做任何修改
      }
      
      // 创建新标签
      const id = generateId();
      const colors = [
        '#0052D9', '#2BA47D', '#E37318', '#E34D59', '#ED7B2F',
        '#8E4EC6', '#0594FA', '#29B4BA', '#C45F9E', '#6E5FAD'
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      existingLabelId = id;
      
      return {
        labels: [...state.labels, { id, name, color, type }]
      };
    });
    
    return existingLabelId!;
  },

  // 切换批量选择模式
  toggleBatchMode: () => {
    set((state) => ({
      batchMode: !state.batchMode,
      selectedRepos: [],
    }));
  },

  // 切换单个项目选中状态
  toggleRepoSelection: (repoFullName: string) => {
    set((state) => {
      const isSelected = state.selectedRepos.includes(repoFullName);
      return {
        selectedRepos: isSelected
          ? state.selectedRepos.filter((name) => name !== repoFullName)
          : [...state.selectedRepos, repoFullName],
      };
    });
  },

  // 全选指定项目
  selectAllRepos: (repoFullNames: string[]) => {
    set({ selectedRepos: repoFullNames });
  },

  // 清空选择
  clearSelection: () => {
    set({ selectedRepos: [] });
  },

  // 批量添加标签
  batchAddLabels: (labelIds: string[]) => {
    const { selectedRepos } = get();
    if (selectedRepos.length === 0) return;

    set((state) => {
      const newRepos = { ...state.repos };
      selectedRepos.forEach((repoFullName) => {
        const existingRepo = state.repos[repoFullName] || {
          customLabels: [],
          generatedLabels: [],
          description: null,
          language: null,
        };
        const newCustomLabels = [...new Set([...existingRepo.customLabels, ...labelIds])];
        newRepos[repoFullName] = {
          ...existingRepo,
          customLabels: newCustomLabels,
        };
      });
      return { repos: newRepos };
    });
  },

  // 批量移除标签
  batchRemoveLabels: (labelIds: string[]) => {
    const { selectedRepos } = get();
    if (selectedRepos.length === 0) return;

    set((state) => {
      const newRepos = { ...state.repos };
      selectedRepos.forEach((repoFullName) => {
        const existingRepo = state.repos[repoFullName];
        if (!existingRepo) return;
        newRepos[repoFullName] = {
          ...existingRepo,
          customLabels: existingRepo.customLabels.filter((id) => !labelIds.includes(id)),
          generatedLabels: existingRepo.generatedLabels.filter((id) => !labelIds.includes(id)),
        };
      });
      return { repos: newRepos };
    });
  },

  // 批量删除项目
  batchDeleteRepos: () => {
    const { selectedRepos } = get();
    if (selectedRepos.length === 0) return;

    set((state) => {
      const newRepos = { ...state.repos };
      const newStars = state.stars.filter(
        (repo) => !selectedRepos.includes(repo.full_name)
      );
      selectedRepos.forEach((repoFullName) => {
        delete newRepos[repoFullName];
      });
      return {
        repos: newRepos,
        stars: newStars,
        selectedRepos: [],
      };
    });
  },

  // 批量导出选中项目
  batchExportRepos: (): string => {
    const { selectedRepos, stars, repos } = get();
    if (selectedRepos.length === 0) return '[]';

    const exportedData = selectedRepos.map((repoFullName) => {
      const repo = stars.find((s) => s.full_name === repoFullName);
      const repoInfo = repos[repoFullName];
      return {
        repo,
        info: repoInfo,
      };
    });

    return JSON.stringify(exportedData, null, 2);
  },
});

// 使用类型断言解决 zustand persist 与 TypeScript strict mode 的兼容性问题
const persistedCreator = persist(stateCreator, {
  name: 'github-star-manager',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    labels: state.labels.map(l => ({
      ...l,
      type: l.type || 'custom', // 兼容旧数据
    })),
    repos: state.repos,
    stars: state.stars,
    syncRepo: state.syncRepo,
    lastSyncTime: state.lastSyncTime,
  }),
  // 数据迁移：将旧版本的 labels 字段迁移到 customLabels 和 generatedLabels
  migrate: (persistedState: unknown, _version: number) => {
    const state = persistedState as { repos?: Record<string, { labels?: string[]; customLabels?: string[]; generatedLabels?: string[]; description?: string | null; language?: string | null; remark?: string }> };
    // 如果 repos 中有任何 repo 使用旧的 labels 字段，进行迁移
    if (state.repos) {
      const migratedRepos: Record<string, { customLabels: string[]; generatedLabels: string[]; description: string | null; language: string | null; remark?: string }> = {};

      Object.entries(state.repos).forEach(([repoFullName, repoInfo]) => {
        // 检查是否使用旧的 labels 字段
        if (repoInfo.labels && !repoInfo.customLabels) {
          // 迁移：将所有旧标签视为自定义标签
          migratedRepos[repoFullName] = {
            customLabels: repoInfo.labels || [],
            generatedLabels: [],
            description: repoInfo.description ?? null,
            language: repoInfo.language ?? null,
            remark: repoInfo.remark,
          };
        } else {
          // 已经是新格式，直接使用
          migratedRepos[repoFullName] = {
            customLabels: repoInfo.customLabels || [],
            generatedLabels: repoInfo.generatedLabels || [],
            description: repoInfo.description ?? null,
            language: repoInfo.language ?? null,
            remark: repoInfo.remark,
          };
        }
      });

      state.repos = migratedRepos;
    }

    return state;
  },
  version: 2, // 版本号升级，token 和 username 已移除
});

export const useAppStore = create<AppState>()(persistedCreator as StateCreator<AppState>);
