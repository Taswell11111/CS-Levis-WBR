import React, { useState } from 'react';
import { Sparkles, X, Plus, Edit2, Check, MessageSquare } from 'lucide-react';

export interface HighlightItem {
  id: string;
  title: string;
  text: string;
  category: 'commercial' | 'operations' | 'returns' | 'fulfillment';
}

interface KeyHighlightsOverlayProps {
  highlights: HighlightItem[];
  onAddHighlight: (highlight: HighlightItem) => void;
  onUpdateHighlight: (id: string, text: string) => void;
  onDeleteHighlight: (id: string) => void;
}

export const KeyHighlightsOverlay: React.FC<KeyHighlightsOverlayProps> = ({
  highlights,
  onAddHighlight,
  onUpdateHighlight,
  onDeleteHighlight
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<HighlightItem['category']>('commercial');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    onAddHighlight({
      id: `hl-${Date.now()}`,
      title: newTitle.trim(),
      text: newText.trim(),
      category: newCategory
    });
    setNewTitle('');
    setNewText('');
    setIsAdding(false);
  };

  return (
    <div className="absolute top-4 right-4 z-30 no-export">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-[#003876] hover:bg-blue-900 text-amber-300 font-bold px-3 py-1.5 rounded-lg shadow-md border border-blue-800 flex items-center gap-1.5 text-xs cursor-pointer transition-all"
          title="Add Executive Key Highlights annotation overlay to this report section"
        >
          <Sparkles size={14} className="text-amber-300 animate-pulse" />
          <span>Key Highlights ({highlights.length})</span>
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl border border-slate-300 p-4 w-80 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <div className="flex items-center gap-1.5 font-black text-[#003876] uppercase tracking-wider">
              <MessageSquare size={14} className="text-[#C41230]" />
              <span>Executive Key Highlights</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 mb-3">
            Add manual executive commentary annotations over the weekly review. Included in HTML exports.
          </p>

          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {highlights.length === 0 ? (
              <div className="text-center py-4 text-slate-400 italic text-[11px]">
                No key highlights added yet. Click below to add commentary.
              </div>
            ) : (
              highlights.map((h) => (
                <div key={h.id} className="bg-slate-50 rounded p-2 border border-slate-200 relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#003876] text-[11px]">{h.title}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === h.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateHighlight(h.id, editText);
                            setEditingId(null);
                          }}
                          className="text-emerald-600 hover:text-emerald-800 p-0.5"
                        >
                          <Check size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(h.id);
                            setEditText(h.text);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-0.5"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteHighlight(h.id)}
                        className="text-rose-600 hover:text-rose-800 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  {editingId === h.id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full border border-blue-300 rounded p-1 text-[11px] bg-white text-slate-800"
                      rows={2}
                    />
                  ) : (
                    <p className="text-[10.5px] text-slate-700 leading-relaxed">{h.text}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full bg-[#003876] hover:bg-blue-900 text-white font-bold py-1.5 px-3 rounded flex items-center justify-center gap-1 text-xs cursor-pointer transition-colors"
            >
              <Plus size={13} />
              <span>Add New Highlight Commentary</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-2 border-t border-slate-200 pt-2.5">
              <input
                type="text"
                placeholder="Highlight Title (e.g. Demand Surge)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-slate-300 rounded p-1.5 text-xs"
                required
              />
              <textarea
                placeholder="Executive commentary detail..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full border border-slate-300 rounded p-1.5 text-xs"
                rows={2}
                required
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#C41230] hover:bg-red-800 text-white font-bold px-2.5 py-1 rounded text-xs cursor-pointer"
                >
                  Save Highlight
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
