import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useFeedback } from './AppFeedback';
import { aiSearch } from '../services/ai';

interface AiSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AiSearchDialog({ open, onClose }: AiSearchDialogProps) {
  const { notify } = useFeedback();
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchAnswer, setAiSearchAnswer] = useState('');

  const aiSearchMutation = useMutation({
    mutationFn: aiSearch,
    onSuccess: (result) => {
      setAiSearchAnswer(result.answer);
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : 'AI搜索失败');
    },
  });

  const handleAiSearch = () => {
    const query = aiSearchQuery.trim();
    if (!query) {
      notify.warning('请输入AI搜索内容');
      return;
    }
    setAiSearchAnswer('');
    aiSearchMutation.mutate(query);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[86vh] w-[min(760px,96vw)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-950">AI搜索</h3>
            <p className="mt-1 text-sm text-slate-500">调用服务器本地AI大模型，辅助检索单据、商品、证照和业务流程。</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50" title="关闭">
            <X className="size-4 text-slate-500" />
          </button>
        </div>
        <div className="space-y-4 overflow-auto p-5">
          <textarea
            value={aiSearchQuery}
            onChange={(event) => setAiSearchQuery(event.target.value)}
            placeholder="例如：帮我找最近的采购订单、某个商品库存、即将过期的证照..."
            className="min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">模型服务：服务器本地大模型</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAiSearchQuery(''); setAiSearchAnswer(''); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition-colors hover:bg-slate-50">重置</button>
              <button type="button" disabled={aiSearchMutation.isPending} onClick={handleAiSearch} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                <Search className="size-4" />
                {aiSearchMutation.isPending ? '搜索中...' : '开始搜索'}
              </button>
            </div>
          </div>
          {(aiSearchMutation.isPending || aiSearchAnswer) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-sm font-medium text-slate-900">AI回答</div>
              <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {aiSearchMutation.isPending ? '本地AI大模型正在思考...' : aiSearchAnswer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
