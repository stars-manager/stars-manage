import React, { useState } from 'react';
import { Button, Space, Dialog, MessagePlugin } from 'tdesign-react';
import { useAppStore } from '../stores/app';
import { LabelSelect } from './LabelSelect';

interface BatchActionsProps {
  selectedCount: number;
}

export const BatchActions: React.FC<BatchActionsProps> = ({ selectedCount }) => {
  const {
    labels,
    selectedRepos,
    clearSelection,
    toggleBatchMode,
    batchAddLabels,
    batchRemoveLabels,
    batchDeleteRepos,
    batchExportRepos,
  } = useAppStore();

  const [showAddLabelDialog, setShowAddLabelDialog] = useState(false);
  const [showRemoveLabelDialog, setShowRemoveLabelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // 批量添加标签
  const handleBatchAddLabels = () => {
    if (selectedLabelIds.length === 0) {
      MessagePlugin.warning('请先选择要添加的标签');
      return;
    }
    batchAddLabels(selectedLabelIds);
    setShowAddLabelDialog(false);
    setSelectedLabelIds([]);
    MessagePlugin.success(`已为 ${selectedRepos.length} 个项目添加标签`);
  };

  // 批量移除标签
  const handleBatchRemoveLabels = () => {
    if (selectedLabelIds.length === 0) {
      MessagePlugin.warning('请先选择要移除的标签');
      return;
    }
    batchRemoveLabels(selectedLabelIds);
    setShowRemoveLabelDialog(false);
    setSelectedLabelIds([]);
    MessagePlugin.success(`已从 ${selectedRepos.length} 个项目移除标签`);
  };

  // 批量删除
  const handleBatchDelete = () => {
    batchDeleteRepos();
    setShowDeleteDialog(false);
    MessagePlugin.success(`已删除 ${selectedRepos.length} 个项目（本地数据）`);
  };

  // 批量导出
  const handleBatchExport = () => {
    const data = batchExportRepos();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stars-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    MessagePlugin.success(`已导出 ${selectedRepos.length} 个项目`);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <span style={{ fontWeight: 600, color: '#0052cc' }}>
          已选择 {selectedCount} 个项目
        </span>

        <Space>
          <Button theme="primary" onClick={() => setShowAddLabelDialog(true)}>
            添加标签
          </Button>
          <Button variant="outline" onClick={() => setShowRemoveLabelDialog(true)}>
            移除标签
          </Button>
          <Button variant="outline" onClick={handleBatchExport}>
            导出选中
          </Button>
          <Button variant="outline" theme="danger" onClick={() => setShowDeleteDialog(true)}>
            删除项目
          </Button>
          <Button variant="text" onClick={clearSelection}>
            取消选择
          </Button>
          <Button variant="text" onClick={toggleBatchMode}>
            退出批量模式
          </Button>
        </Space>
      </div>

      {/* 批量添加标签弹窗 */}
      <Dialog
        header="批量添加标签"
        visible={showAddLabelDialog}
        onConfirm={handleBatchAddLabels}
        onClose={() => {
          setShowAddLabelDialog(false);
          setSelectedLabelIds([]);
        }}
        confirmBtn="添加"
        cancelBtn="取消"
        width="480px"
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ marginBottom: '12px', color: '#666' }}>
            为 {selectedRepos.length} 个项目添加标签：
          </p>
          <LabelSelect
            value={selectedLabelIds}
            onChange={setSelectedLabelIds}
            labels={labels}
            placeholder="选择要添加的标签"
            style={{ width: '100%' }}
          />
        </div>
      </Dialog>

      {/* 批量移除标签弹窗 */}
      <Dialog
        header="批量移除标签"
        visible={showRemoveLabelDialog}
        onConfirm={handleBatchRemoveLabels}
        onClose={() => {
          setShowRemoveLabelDialog(false);
          setSelectedLabelIds([]);
        }}
        confirmBtn="移除"
        cancelBtn="取消"
        width="480px"
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ marginBottom: '12px', color: '#666' }}>
            从 {selectedRepos.length} 个项目移除标签：
          </p>
          <LabelSelect
            value={selectedLabelIds}
            onChange={setSelectedLabelIds}
            labels={labels}
            placeholder="选择要移除的标签"
            style={{ width: '100%' }}
          />
        </div>
      </Dialog>

      {/* 批量删除确认弹窗 */}
      <Dialog
        header="确认删除"
        visible={showDeleteDialog}
        onConfirm={handleBatchDelete}
        onClose={() => setShowDeleteDialog(false)}
        confirmBtn="删除"
        cancelBtn="取消"
        width="400px"
        theme="danger"
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: '#e34d59', fontWeight: 600 }}>
            警告：此操作不可恢复！
          </p>
          <p style={{ color: '#666', marginTop: '8px' }}>
            确定要从本地数据中删除这 {selectedRepos.length} 个项目吗？
            <br />
            <span style={{ fontSize: '12px', color: '#999' }}>
              （此操作仅删除本地记录，不会取消 GitHub Star）
            </span>
          </p>
        </div>
      </Dialog>
    </>
  );
};
