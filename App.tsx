import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { GridEditor } from './components/GridEditor';
import { MindMap } from './types';

const STORAGE_KEY = 'mindflow_data';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [maps, setMaps] = useState<MindMap[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);

  // Load data from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMaps(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored maps", e);
      }
    }
  }, []);

  // Save data whenever maps change
  useEffect(() => {
    if (maps.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
    }
  }, [maps]);

  const handleCreate = () => {
    const newMap: MindMap = {
      id: crypto.randomUUID(),
      title: `会话 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
      nodes: [],
      lastModified: Date.now(),
    };
    setMaps([newMap, ...maps]);
    setCurrentMapId(newMap.id);
    setView('editor');
  };

  const handleSelect = (id: string) => {
    setCurrentMapId(id);
    setView('editor');
  };

  const handleDelete = (id: string) => {
    const updated = maps.filter(m => m.id !== id);
    setMaps(updated);
    // If we deleted the entire list, clear storage to be safe
    if (updated.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSaveMap = (updatedMap: MindMap) => {
    // Determine a better title if it's the default one and we have nodes
    let mapToSave = { ...updatedMap };
    
    // If title starts with "Session" or "会话" and we have a center node, name it after the center node
    if ((mapToSave.title.startsWith("Session") || mapToSave.title.startsWith("会话")) && mapToSave.nodes.length > 0) {
        // Find center node (first one usually, or by depth 0)
        const centerNode = mapToSave.nodes.find(n => n.depth === 0);
        if (centerNode) {
            mapToSave.title = centerNode.content.slice(0, 20) + (centerNode.content.length > 20 ? '...' : '');
        }
    }

    setMaps(prev => prev.map(m => m.id === mapToSave.id ? mapToSave : m));
  };

  const currentMap = maps.find(m => m.id === currentMapId);

  if (view === 'editor' && currentMap) {
    return (
      <GridEditor
        mapData={currentMap}
        onSave={handleSaveMap}
        onBack={() => setView('dashboard')}
      />
    );
  }

  return (
    <Dashboard
      maps={maps}
      onCreate={handleCreate}
      onSelect={handleSelect}
      onDelete={handleDelete}
    />
  );
}