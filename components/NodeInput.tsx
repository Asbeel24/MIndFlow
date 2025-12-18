import React, { useState } from 'react';
import { X, Check, Sparkles, Loader2 } from 'lucide-react';
import { BASE_COLORS } from '../utils/colorUtils';
import { getSuggestedThoughts } from '../services/geminiService';
import { MindNode } from '../types';

interface NodeInputProps {
  onSave: (content: string, color: string) => void;
  onCancel: () => void;
  initialColor: string;
  initialContent?: string;
  isEditing?: boolean;
  parentNode?: MindNode;
  allNodes: MindNode[];
}

export const NodeInput: React.FC<NodeInputProps> = ({ 
  onSave, 
  onCancel, 
  initialColor, 
  initialContent = '',
  isEditing = false,
  parentNode,
  allNodes
}) => {
  const [content, setContent] = useState(initialContent);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (content.trim()) {
      onSave(content, selectedColor);
    }
  };

  const handleAiSuggest = async () => {
    const contextNode = isEditing ? parentNode : parentNode; // Simplification
    const targetContent = isEditing ? content : (parentNode?.content || '');
    
    setIsLoadingAi(true);
    const results = await getSuggestedThoughts(targetContent, allNodes);
    setSuggestions(results);
    setIsLoadingAi(false);
  };

  return (
    <div className="absolute z-50 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {isEditing ? '修改想法' : '新想法'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="此刻在想什么？"
          className="w-full p-3 bg-gray-50 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none h-20 mb-3"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        {/* AI Suggestions Area */}
        {(parentNode || isEditing) && (
          <div className="mb-3">
             {suggestions.length > 0 ? (
               <div className="flex flex-col gap-2">
                 <span className="text-xs text-gray-400">建议：</span>
                 {suggestions.map((s, i) => (
                   <button
                    key={i}
                    type="button"
                    onClick={() => setContent(s)}
                    className="text-left text-xs p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors"
                   >
                    {s}
                   </button>
                 ))}
               </div>
             ) : (
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={isLoadingAi}
                  className="flex items-center gap-1.5 text-xs text-purple-600 font-medium hover:text-purple-700 transition-colors"
                >
                  {isLoadingAi ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  卡住了？获取 AI 灵感
                </button>
             )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={16} />
            {isEditing ? '更新' : '放置'}
          </button>
        </div>
      </form>
      
      <div className="absolute w-3 h-3 bg-white border-l border-b border-gray-100 transform -rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
    </div>
  );
};