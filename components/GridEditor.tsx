import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MindMap, MindNode, GRID_SIZE, CENTER_COORD } from '../types';
import { NodeInput } from './NodeInput';
import { fadeColor, getContrastColor, adjustHue, BASE_COLORS } from '../utils/colorUtils';

interface GridEditorProps {
  mapData: MindMap;
  onSave: (updatedMap: MindMap) => void;
  onBack: () => void;
}

export const GridEditor: React.FC<GridEditorProps> = ({ mapData, onSave, onBack }) => {
  const [nodes, setNodes] = useState<MindNode[]>(mapData.nodes);
  const [activeInput, setActiveInput] = useState<{ x: number; y: number; parentId?: string } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Drag state
  const [dragState, setDragState] = useState<{
    sourceNodeId: string;
    currentPos: { x: number; y: number }; // Percentage 0-100 relative to container
  } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Dynamic grid calculations
  const CELL_PERCENT = 100 / GRID_SIZE;
  const HALF_CELL = CELL_PERCENT / 2;

  // Helper to find a node at specific coords
  const getNodeAt = (x: number, y: number) => nodes.find(n => n.x === x && n.y === y);

  // Check if a cell is valid for input (only used for visual feedback now)
  const isCellAvailable = (x: number, y: number) => {
    // Center is always available if empty
    if (x === CENTER_COORD && y === CENTER_COORD && nodes.length === 0) return true;
    if (getNodeAt(x, y)) return false;
    // Must be adjacent to an existing node
    return nodes.some(n => Math.abs(n.x - x) <= 1 && Math.abs(n.y - y) <= 1);
  };

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection
    
    // Only primary button
    if (e.button !== 0) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Start drag from the node center
    setDragState({
      sourceNodeId: nodeId,
      currentPos: { 
        x: (node.x * CELL_PERCENT) + HALF_CELL, 
        y: (node.y * CELL_PERCENT) + HALF_CELL 
      }
    });
    isDraggingRef.current = false;
    
    // Capture pointer to ensure we track movement outside the node
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (!dragState || !containerRef.current) return;

    // If we move more than a tiny bit, it's a drag
    isDraggingRef.current = true;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDragState(prev => prev ? ({ ...prev, currentPos: { x, y } }) : null);
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    
    const sourceNode = nodes.find(n => n.id === dragState.sourceNodeId);

    // If we dragged, attempt to drop
    if (isDraggingRef.current && sourceNode && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Check if inside grid bounds
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
             const xPct = (clientX - rect.left) / rect.width;
             const yPct = (clientY - rect.top) / rect.height;
             
             // Map to grid coordinates
             const gridX = Math.floor(xPct * GRID_SIZE);
             const gridY = Math.floor(yPct * GRID_SIZE);
             
             handleAttemptDrop(gridX, gridY, sourceNode);
        }
    } else if (!isDraggingRef.current) {
        // Was just a click on the node
        setSelectedNodeId(dragState.sourceNodeId);
        setActiveInput(null);
    }

    setDragState(null);
    isDraggingRef.current = false;
  };

  const handleAttemptDrop = (x: number, y: number, sourceNode: MindNode) => {
    // Boundary check
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const targetNode = getNodeAt(x, y);
    if (targetNode) return; // Occupied

    // Check adjacency
    const dx = Math.abs(sourceNode.x - x);
    const dy = Math.abs(sourceNode.y - y);

    // Must be neighbor (dx/dy <= 1) and not self (dx+dy > 0)
    if (dx <= 1 && dy <= 1 && (dx > 0 || dy > 0)) {
        setActiveInput({ x, y, parentId: sourceNode.id });
        setSelectedNodeId(null);
    }
  };

  const handleCreateRoot = () => {
    if (nodes.length === 0) {
        setActiveInput({ x: CENTER_COORD, y: CENTER_COORD });
    }
  };

  const handleSaveNode = (content: string, color: string) => {
    if (!activeInput) return;

    const parent = activeInput.parentId ? nodes.find(n => n.id === activeInput.parentId) : undefined;
    
    let finalColor = color;
    let depth = 0;

    if (parent) {
      depth = parent.depth + 1;
      
      // Check if parent already has children (branching logic)
      const siblings = nodes.filter(n => n.parentId === parent.id);
      
      if (siblings.length > 0) {
        // This is a new branch! 
        // We shift the hue to separate it from the existing branch(es)
        // Shift by 45 degrees for each subsequent branch to create distinct streams
        const branchIndex = siblings.length;
        // Use the parent's base color but shifted
        const shiftedColor = adjustHue(parent.color, 45 * branchIndex);
        finalColor = fadeColor(shiftedColor, 0.15);
      } else {
        // Continuation of the same thought stream
        finalColor = fadeColor(parent.color, 0.15); 
      }
    }

    const newNode: MindNode = {
      id: crypto.randomUUID(),
      x: activeInput.x,
      y: activeInput.y,
      content,
      color: finalColor,
      parentId: activeInput.parentId || null,
      depth,
      timestamp: Date.now(),
    };

    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    onSave({ ...mapData, nodes: newNodes, lastModified: Date.now() });
    setActiveInput(null);
    setSelectedNodeId(newNode.id);
  };

  // Render SVG Lines
  const renderConnections = useMemo(() => {
    return nodes.map(node => {
      if (!node.parentId) return null;
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return null;

      const x1 = (parent.x * CELL_PERCENT) + HALF_CELL;
      const y1 = (parent.y * CELL_PERCENT) + HALF_CELL;
      const x2 = (node.x * CELL_PERCENT) + HALF_CELL;
      const y2 = (node.y * CELL_PERCENT) + HALF_CELL;

      return (
        <line
          key={`${parent.id}-${node.id}`}
          x1={`${x1}%`}
          y1={`${y1}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          stroke={parent.color}
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />
      );
    });
  }, [nodes, CELL_PERCENT, HALF_CELL]);

  // Render Drag Line
  const renderDragLine = useMemo(() => {
    if (!dragState) return null;
    const source = nodes.find(n => n.id === dragState.sourceNodeId);
    if (!source) return null;

    const x1 = (source.x * CELL_PERCENT) + HALF_CELL;
    const y1 = (source.y * CELL_PERCENT) + HALF_CELL;
    const x2 = dragState.currentPos.x;
    const y2 = dragState.currentPos.y;

    return (
      <line
        x1={`${x1}%`}
        y1={`${y1}%`}
        x2={`${x2}%`}
        y2={`${y2}%`}
        stroke={source.color}
        strokeWidth="2"
        strokeOpacity="0.6"
        strokeLinecap="round"
        strokeDasharray="5,5"
        className="animate-pulse"
      />
    );
  }, [dragState, nodes, CELL_PERCENT, HALF_CELL]);

  // Grid Cells
  const gridCells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const node = getNodeAt(x, y);
      const isCenter = x === CENTER_COORD && y === CENTER_COORD;
      
      // Determine if this cell is a valid drop target (visual feedback)
      let isValidDropTarget = false;
      if (dragState && !node) {
          const source = nodes.find(n => n.id === dragState.sourceNodeId);
          if (source) {
              const dx = Math.abs(source.x - x);
              const dy = Math.abs(source.y - y);
              if (dx <= 1 && dy <= 1 && (dx > 0 || dy > 0)) {
                  isValidDropTarget = true;
              }
          }
      }

      const isSelected = node && node.id === selectedNodeId;
      const isDraggingSource = dragState?.sourceNodeId === node?.id;

      gridCells.push(
        <div
          key={`${x}-${y}`}
          className={`
            relative w-full h-full flex items-center justify-center
            transition-all duration-300 ease-out rounded-xl
            ${isValidDropTarget ? 'bg-blue-50/50 scale-105 ring-2 ring-blue-100' : ''}
            ${!node && isCenter && nodes.length === 0 ? 'cursor-pointer hover:bg-gray-50' : ''}
          `}
          onClick={(!node && isCenter && nodes.length === 0) ? handleCreateRoot : undefined}
        >
          {/* Dot Representation */}
          <div
            className={`
              rounded-full transition-all duration-300 flex items-center justify-center
              shadow-sm select-none
              ${node ? 'cursor-grab active:cursor-grabbing w-8 h-8 md:w-12 md:h-12' : ''}
              ${!node && isCenter && nodes.length === 0 ? 'w-4 h-4 border-2 border-gray-300 hover:border-gray-400' : ''}
              ${!node && !isCenter ? 'w-1 h-1 bg-gray-100' : ''}
              ${isSelected ? 'ring-4 ring-offset-2 ring-blue-100 scale-110' : ''}
              ${isDraggingSource ? 'scale-90 opacity-80' : ''}
            `}
            style={{
              backgroundColor: node ? node.color : (!node && isCenter && nodes.length === 0) ? 'transparent' : undefined,
              borderColor: (!node && isCenter && nodes.length === 0) ? undefined : 'transparent',
              touchAction: 'none'
            }}
            onPointerDown={node ? (e) => handlePointerDown(e, node.id) : undefined}
          >
            {node && (isSelected) && (
              <span 
                className="text-[9px] md:text-[10px] text-center px-1 font-medium truncate max-w-full animate-in fade-in"
                style={{ color: getContrastColor(node.color) }}
              >
                {node.content.length > 6 ? '..' : node.content}
              </span>
            )}
          </div>

          {/* Input Popover Position Anchor */}
          {activeInput?.x === x && activeInput?.y === y && (
             <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-auto">
               <NodeInput
                 allNodes={nodes}
                 parentNode={activeInput.parentId ? nodes.find(n => n.id === activeInput.parentId) : undefined}
                 initialColor={activeInput.parentId ? getNodeAt(x,y)?.color || BASE_COLORS[0] : BASE_COLORS[Math.floor(Math.random()*BASE_COLORS.length)]}
                 onSave={handleSaveNode}
                 onCancel={() => setActiveInput(null)}
               />
             </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 select-none overflow-hidden overscroll-none">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-100 z-10 bg-white/80 backdrop-blur-md">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-light tracking-wide text-gray-700">{mapData.title}</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        <div 
          ref={containerRef}
          className="relative w-full max-w-2xl aspect-square touch-none"
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          onPointerLeave={handleContainerPointerUp}
        >
          {/* SVG Layer for Lines (Behind) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
             {renderConnections}
             {renderDragLine}
          </svg>

          {/* Grid Layer */}
          <div 
             className="grid w-full h-full z-10 gap-1 md:gap-3 pointer-events-none"
             style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
             }}
          >
             {/* Make grid items pointer-events-auto so we can interact with them */}
             {gridCells.map(cell => React.cloneElement(cell, { 
                className: `${cell.props.className} pointer-events-auto`
             }))}
          </div>
        </div>
      </main>

      {/* Selected Node Details Footer */}
      <div className="h-32 border-t border-gray-100 p-6 bg-gray-50/50 backdrop-blur flex flex-col justify-center">
         {selectedNodeId ? (
           <div className="animate-in slide-in-from-bottom-4 duration-300">
              <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-semibold">当前想法</p>
              <p className="text-lg text-gray-800 font-light">
                {nodes.find(n => n.id === selectedNodeId)?.content}
              </p>
           </div>
         ) : dragState ? (
            <div className="text-center text-blue-500 flex flex-col items-center animate-pulse">
             <span className="text-sm font-medium">拖拽到附近的空白处以扩展</span>
           </div>
         ) : (
           <div className="text-center text-gray-400 flex flex-col items-center">
             <span className="text-sm">
                {nodes.length === 0 ? "点击中心圆点开始" : "拖拽圆点到空白处进行连接"}
             </span>
           </div>
         )}
      </div>
    </div>
  );
};