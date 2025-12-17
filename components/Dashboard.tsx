import React, { useState } from 'react';
import { Plus, ChevronRight, Brain, Clock, Trash2 } from 'lucide-react';
import { MindMap } from '../types';

interface DashboardProps {
  maps: MindMap[];
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ maps, onCreate, onSelect, onDelete }) => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] text-gray-800 p-6 md:p-12 max-w-4xl mx-auto">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-900 text-white rounded-lg">
             <Brain size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">MindFlow</h1>
        </div>
        <p className="text-gray-500 font-light text-lg">
          捕捉你的非线性思维。呼吸，专注，扩展。
        </p>
      </header>

      <div className="grid gap-6">
        <button
          onClick={onCreate}
          className="group relative flex items-center justify-center w-full p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="font-medium text-gray-600">开始新会话</span>
          </div>
        </button>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider ml-1">最近会话</h2>
          
          {maps.length === 0 && (
            <div className="text-center py-12 text-gray-400 font-light">
              暂无会话。清空大脑，重新开始。
            </div>
          )}

          {maps.map((map) => (
            <div
              key={map.id}
              className="group bg-white border border-gray-100 shadow-sm hover:shadow-md rounded-xl p-5 transition-all duration-200 flex justify-between items-center cursor-pointer"
              onClick={() => onSelect(map.id)}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">
                  {map.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(map.lastModified).toLocaleDateString('zh-CN')}
                  </span>
                  <span>{map.nodes.length} 个想法</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(map.id); }}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="删除"
                 >
                   <Trash2 size={18} />
                 </button>
                 <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};