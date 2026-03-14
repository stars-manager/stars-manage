import React from 'react';
import { Loading, Dialog } from 'tdesign-react';
import { PendingTagChange } from '../stores/app';

interface AutoTaggerGeneratingProps {
  visible: boolean;
  onClose: () => void;
  _onGenerated?: (changes: PendingTagChange[]) => void;
  generatingProgress: { current: number; total: number };
}

// 每批次处理的项目数（后端限制 20 个）
// const BATCH_SIZE = 20;

export const AutoTaggerGenerating: React.FC<AutoTaggerGeneratingProps> = ({ visible, onClose, _onGenerated: _ignoreOnGenerated, generatingProgress }) => {
  // const { stars, repos } = useAppStore();

  return (
    <Dialog
      header="生成标签中"
      visible={visible}
      onClose={onClose}
      width="600px"
      footer={null}
    >
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Loading text="正在生成标签..." size="large" />
        <div style={{ marginTop: '16px', color: '#666' }}>
          已处理 {Math.min(generatingProgress.current, generatingProgress.total)} / {generatingProgress.total} 个项目
        </div>
        <div style={{ 
          marginTop: '12px', 
          width: '400px', 
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
    </Dialog>
  );
};
