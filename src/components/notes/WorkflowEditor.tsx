import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeProps,
  Handle,
  Position,
  NodeResizer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, Image, Palette, Unlink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslations } from '@/hooks/useTranslations';

interface WorkflowData {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowEditorProps {
  initialData?: string;
  onSave: (data: string) => void;
}

interface CardNodeData extends Record<string, unknown> {
  label: string;
  content: string;
  color: string;
  image?: string;
  width?: number;
  height?: number;
  onDataChange?: (id: string, data: Partial<CardNodeData>) => void;
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280',
];

function CardNode({ data, id, selected }: NodeProps<Node<CardNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'Novo Card');
  const [content, setContent] = useState(data.content || '');
  const [color, setColor] = useState(data.color || '#3b82f6');
  const [image, setImage] = useState(data.image || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as HTMLElement)) {
        setIsEditing(false);
        data.onDataChange?.(id, { label, content, color, image });
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, id, label, content, color, image, data]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = reader.result as string;
        setImage(newImage);
        data.onDataChange?.(id, { label, content, color, image: newImage });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    data.onDataChange?.(id, { label, content, color: newColor, image });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const hasTitle = label && label.trim().length > 0;
  const hasContent = content && content.trim().length > 0;
  const isCompact = (!hasTitle || !hasContent) && !isEditing && !image;

  return (
    <div
      ref={cardRef}
      className="rounded-lg shadow-lg overflow-hidden transition-all group"
      style={{
        backgroundColor: color,
        minWidth: isCompact ? 140 : 180,
        minHeight: isCompact ? 48 : 80,
        width: '100%',
        height: '100%',
        border: selected ? '2px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <NodeResizer
        color="hsl(var(--primary))"
        isVisible={selected}
        minWidth={120}
        minHeight={40}
      />
      {/* Handles: visible only when editing/selected, but always functional */}
      <Handle type="target" position={Position.Top} id="top"
        className={`!w-3 !h-3 !border-2 !border-white/80 !bg-white transition-opacity ${isEditing || selected ? '!opacity-100' : '!opacity-0 group-hover:!opacity-60'}`}
      />
      <Handle type="target" position={Position.Left} id="left"
        className={`!w-3 !h-3 !border-2 !border-white/80 !bg-white transition-opacity ${isEditing || selected ? '!opacity-100' : '!opacity-0 group-hover:!opacity-60'}`}
      />

      <div className={`${isCompact ? 'p-2' : 'p-3'} space-y-1.5 h-full flex flex-col`}>
        {/* Header */}
        <div className="flex items-start gap-2">
          {isEditing ? (
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  data.onDataChange?.(id, { label, content, color, image });
                }
              }}
              autoFocus
              className="h-6 text-sm font-semibold bg-white/20 border-white/30 text-white placeholder:text-white/60 nodrag"
            />
          ) : hasTitle ? (
            <h3
              className="flex-1 text-sm font-semibold text-white cursor-pointer truncate"
              onDoubleClick={handleDoubleClick}
              title={label}
            >
              {label}
            </h3>
          ) : null}

          {selected && (
            <div className="flex gap-1 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20">
                    <Palette className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="grid grid-cols-4 gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => handleColorChange(c)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-3 w-3" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Image */}
        {image && (
          <div className="rounded overflow-hidden">
            <img src={image} alt="" className="w-full h-20 object-cover" />
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
                data.onDataChange?.(id, { label, content, color, image });
              }
            }}
            placeholder="Add a description..."
            className="flex-1 text-xs bg-white/20 border-white/30 text-white placeholder:text-white/60 min-h-[40px] resize-none nodrag"
          />
        ) : hasContent ? (
          <p
            className="flex-1 text-xs text-white/90 cursor-pointer leading-relaxed"
            onDoubleClick={handleDoubleClick}
          >
            {content}
          </p>
        ) : !hasTitle && !isEditing ? (
          <p
            className="text-xs text-white/50 italic cursor-pointer"
            onDoubleClick={handleDoubleClick}
          >
            Double-click to edit...
          </p>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom"
        className={`!w-3 !h-3 !border-2 !border-white/80 !bg-white transition-opacity ${isEditing || selected ? '!opacity-100' : '!opacity-0 group-hover:!opacity-60'}`}
      />
      <Handle type="source" position={Position.Right} id="right"
        className={`!w-3 !h-3 !border-2 !border-white/80 !bg-white transition-opacity ${isEditing || selected ? '!opacity-100' : '!opacity-0 group-hover:!opacity-60'}`}
      />
    </div>
  );
}

const nodeTypes = {
  card: CardNode,
};

export function WorkflowEditor({ initialData, onSave }: WorkflowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CardNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [initialized, setInitialized] = useState(false);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const { t } = useTranslations();

  const handleNodeDataChange = useCallback((nodeId: string, newData: Partial<CardNodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, [setNodes]);

  // Initialize from data
  useEffect(() => {
    if (!initialized) {
      if (initialData) {
        try {
          const data: WorkflowData = JSON.parse(initialData);
          const nodesWithCallback = (data.nodes || []).map((node) => ({
            ...node,
            data: {
              ...node.data,
              onDataChange: handleNodeDataChange,
            },
          })) as Node<CardNodeData>[];
          setNodes(nodesWithCallback);
          setEdges(data.edges || []);
        } catch {
          // Invalid data, start fresh
        }
      }
      setInitialized(true);
    }
  }, [initialized, initialData, setNodes, setEdges, handleNodeDataChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        animated: true,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        type: 'smoothstep',
      }, eds));
    },
    [setEdges]
  );

  const onPaneClick = useCallback(() => {
    setNodeContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setNodeContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
  }, []);

  // Auto-save on changes
  const saveWorkflow = useCallback(() => {
    const nodesForSave = nodes.map(({ data, ...rest }) => ({
      ...rest,
      data: {
        label: data.label,
        content: data.content,
        color: data.color,
        image: data.image,
        width: data.width,
        height: data.height,
      },
    }));
    const data: WorkflowData = { nodes: nodesForSave as Node[], edges };
    onSave(JSON.stringify(data));
  }, [nodes, edges, onSave]);

  const addNode = useCallback(() => {
    const newNode: Node<CardNodeData> = {
      id: `node-${Date.now()}`,
      type: 'card',
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      data: {
        label: t('newNote') || 'Novo Card',
        content: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        onDataChange: handleNodeDataChange,
      },
      style: { width: 200, height: 150 },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, handleNodeDataChange, t]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  const disconnectSelected = useCallback(() => {
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
    const hasSelectedEdges = edges.some(e => e.selected);

    if (hasSelectedEdges || selectedNodeIds.length > 0) {
      setEdges((eds) => eds.filter(e => {
        if (e.selected) return false;
        if (selectedNodeIds.includes(e.source) || selectedNodeIds.includes(e.target)) return false;
        return true;
      }));
    }
  }, [nodes, edges, setEdges]);

  const duplicateNode = useCallback((nodeId: string) => {
    const originalNode = nodes.find(n => n.id === nodeId);
    if (!originalNode) return;
    const newNode: Node<CardNodeData> = {
      id: `node-${Date.now()}`,
      type: 'card',
      position: { x: originalNode.position.x + 50, y: originalNode.position.y + 50 },
      data: {
        label: `${originalNode.data.label} (${t('copy')})`,
        content: originalNode.data.content,
        color: originalNode.data.color,
        image: originalNode.data.image,
        onDataChange: handleNodeDataChange,
      },
      style: originalNode.style ? { ...originalNode.style } : { width: 200, height: 150 },
    };
    setNodes(nds => [...nds, newNode]);
    setNodeContextMenu(null);
  }, [nodes, setNodes, handleNodeDataChange, t]);

  const disconnectNode = useCallback((nodeId: string) => {
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setNodeContextMenu(null);
  }, [setEdges]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setNodeContextMenu(null);
  }, [setNodes, setEdges]);

  // Style edges based on selection
  const styledEdges = edges.map((edge) => ({
    ...edge,
    type: edge.type || 'smoothstep',
    style: {
      ...edge.style,
      stroke: edge.selected ? 'hsl(var(--primary))' : '#94a3b8',
      strokeWidth: edge.selected ? 3 : 2,
    },
  }));

  const hasSelection = nodes.some(n => n.selected) || edges.some(e => e.selected);

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Button size="sm" onClick={addNode}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addCard')}
        </Button>
        <Button size="sm" variant="outline" onClick={deleteSelected}>
          <Trash2 className="h-4 w-4 mr-1" />
          {t('delete')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={disconnectSelected}
          disabled={!hasSelection}
        >
          <Unlink className="h-4 w-4 mr-1" />
          {t('disconnect')}
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={saveWorkflow}>
          {t('save')}
        </Button>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 workflow-container relative">
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodesDelete={saveWorkflow}
          onEdgesDelete={saveWorkflow}
          onNodeDragStop={saveWorkflow}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Controls className="workflow-controls" />
          <MiniMap
            nodeStrokeColor={() => '#888'}
            nodeColor={(n) => (n.data as CardNodeData)?.color || '#888'}
            className="workflow-minimap"
          />
          <Background gap={16} size={1} />
        </ReactFlow>

        {/* Node Context Menu */}
        {nodeContextMenu && (
          <div
            className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            style={{ top: nodeContextMenu.y, left: nodeContextMenu.x }}
          >
            <button
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => duplicateNode(nodeContextMenu.nodeId)}
            >
              <Copy className="h-4 w-4 mr-2" />
              {t('duplicateCard')}
            </button>
            <button
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => disconnectNode(nodeContextMenu.nodeId)}
            >
              <Unlink className="h-4 w-4 mr-2" />
              {t('disconnectAll')}
            </button>
            <div className="h-px bg-border my-1" />
            <button
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => deleteNode(nodeContextMenu.nodeId)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteCard')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
