// AutoTagger 相关工具函数
import { GitHubRepo } from '../types';

// 每批次处理的项目数（后端限制 20 个）
export const BATCH_SIZE = 20;

// Tree 节点类型
interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
}

// 构建树形数据
export const buildTreeData = (
  items: GitHubRepo[],
  itemToNode: (item: GitHubRepo) => TreeNode
): TreeNode[] => {
  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  const batches: TreeNode[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE + 1;
    const end = Math.min((i + 1) * BATCH_SIZE, items.length);
    const batchItems = items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    batches.push({
      value: `batch-${i}`,
      label: `第 ${i + 1} 组 (${start}-${end})`,
      children: batchItems.map(itemToNode),
    });
  }

  return [{
    value: 'all',
    label: `全部项目 (${items.length})`,
    children: batches,
  }];
};

// 计算 Tree 的 checked 值
export const calculateTreeChecked = (
  selectedItems: string[],
  allItems: GitHubRepo[],
  getItemKey: (item: GitHubRepo) => string
): string[] => {
  const selectedSet = new Set(selectedItems);

  // 检查是否全选
  const allSelected = allItems.length > 0 && allItems.every(item => selectedSet.has(getItemKey(item)));
  if (allSelected) {
    return ['all'];
  }

  const checked: string[] = [];
  const totalBatches = Math.ceil(allItems.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, allItems.length);
    const batchItems = allItems.slice(start, end);
    const allBatchSelected = batchItems.every(item => selectedSet.has(getItemKey(item)));

    if (allBatchSelected && batchItems.length > 0) {
      checked.push(`batch-${i}`);
    } else {
      batchItems.forEach(item => {
        const key = getItemKey(item);
        if (selectedSet.has(key)) {
          checked.push(key);
        }
      });
    }
  }

  return checked;
};

// 解析 Tree 的选中值
export const parseTreeValue = (
  value: string[],
  allItems: GitHubRepo[],
  getItemKey: (item: GitHubRepo) => string
): string[] => {
  if (!value || value.length === 0) return [];

  // 如果选中的包含 'all'，返回所有项目
  if (value.includes('all')) {
    return allItems.map(getItemKey);
  }

  const selected = new Set<string>();
  value.forEach((item: string) => {
    if (item.startsWith('batch-')) {
      // 分组节点：展开为该组的所有项目
      const batchIndex = parseInt(item.replace('batch-', ''), 10);
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, allItems.length);
      for (let i = start; i < end; i++) {
        selected.add(getItemKey(allItems[i]));
      }
    } else {
      // 叶子节点
      selected.add(item);
    }
  });

  return Array.from(selected);
};
