export interface Point {
  x: number;
  y: number;
}

export interface MindNode {
  id: string;
  x: number; // Grid coordinate 0-GRID_SIZE
  y: number; // Grid coordinate 0-GRID_SIZE
  content: string;
  color: string; // Hex code
  parentId: string | null; // ID of the node this connects FROM
  depth: number; // How far from center
  timestamp: number;
}

export interface MindMap {
  id: string;
  title: string;
  nodes: MindNode[];
  lastModified: number;
}

// Fixed grid size
export const GRID_SIZE = 7;
export const CENTER_COORD = 3; // (3,3) is center of 7x7