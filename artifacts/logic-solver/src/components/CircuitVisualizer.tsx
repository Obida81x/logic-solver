import React, { useMemo, useState } from 'react';
import { GateNode, parseToGateTree, layoutCircuit, annotateLayout } from '../lib/gateTree';

type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';

interface GateProps {
  type: GateType;
  x: number;
  y: number;
}

const GateShape: React.FC<GateProps> = ({ type, x, y }) => {
  const drawGate = () => {
    switch (type) {
      case 'AND':
        return (
          <path d="M 0,0 L 25,0 A 20,20 0 0,1 25,40 L 0,40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        );
      case 'NAND':
        return (
          <>
            <path d="M 0,0 L 25,0 A 20,20 0 0,1 25,40 L 0,40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="49" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        );
      case 'OR':
        return (
          <path d="M 0,0 Q 15,20 0,40 Q 25,40 50,20 Q 25,0 0,0 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        );
      case 'NOR':
        return (
          <>
            <path d="M 0,0 Q 15,20 0,40 Q 25,40 45,20 Q 25,0 0,0 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="49" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        );
      case 'XOR':
        return (
          <>
            <path d="M -5,0 Q 10,20 -5,40" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 0,0 Q 15,20 0,40 Q 25,40 50,20 Q 25,0 0,0 Z" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        );
      case 'XNOR':
        return (
          <>
            <path d="M -5,0 Q 10,20 -5,40" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 0,0 Q 15,20 0,40 Q 25,40 45,20 Q 25,0 0,0 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="49" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        );
      case 'NOT':
        return (
          <>
            <path d="M 0,5 L 35,20 L 0,35 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="39" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          </>
        );
      default:
        return <rect width="50" height="40" fill="none" stroke="currentColor" strokeWidth="2" />;
    }
  };

  return (
    <g transform={`translate(${x}, ${y})`} className="text-slate-800 dark:text-slate-200 bg-white">
      <rect width="50" height="40" fill="white" className="dark:fill-slate-900" opacity="0.8" />
      {drawGate()}
      <text x="25" y="24" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5" className="pointer-events-none font-mono">
        {type}
      </text>
    </g>
  );
};

export const CircuitVisualizer: React.FC<{ expression: string; variables: string[] }> = ({ expression, variables }) => {
  const [inputs, setInputs] = useState<Record<string, number>>({});

  const layout = useMemo(() => {
    try {
      const tree = parseToGateTree(expression);
      return layoutCircuit(tree);
    } catch(e) {
      return null;
    }
  }, [expression]);

  const annotatedLayout = useMemo(() => {
    if (!layout) return null;
    return annotateLayout(layout, inputs);
  }, [layout, inputs]);

  const toggleInput = (variable: string) => {
    setInputs(prev => ({
      ...prev,
      [variable]: prev[variable] === 1 ? 0 : 1
    }));
  };

  if (!annotatedLayout) {
    return (
      <div className="w-full h-96 bg-slate-50 border rounded-md flex items-center justify-center text-slate-400">
        Could not parse expression into a circuit
      </div>
    );
  }

  // Find final output value from the out pin wire
  const outWire = annotatedLayout.wires.find(w => w.toId === 'out');
  const finalOutput = outWire?.value ?? 0;

  return (
    <div className="w-full h-[500px] bg-white dark:bg-slate-950 border rounded-md overflow-hidden relative flex flex-col">
      <div className="p-3 bg-slate-50 border-b flex justify-between items-center text-sm text-slate-600">
        <span>Click input pins on the left to toggle values and see signal propagation</span>
        <span className="font-mono bg-white px-2 py-1 rounded border">F = {expression}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <svg width={annotatedLayout.width} height={annotatedLayout.height} className="min-w-full min-h-full">
          {/* Draw wires */}
          {annotatedLayout.wires.map((wire, idx) => {
            const color = wire.value === 1 ? '#22c55e' : '#64748b'; // Green or Slate
            
            // Calculate path
            let startX = 0, startY = 0, endX = 0, endY = 0;
            
            // Find start
            const fromNode = annotatedLayout.nodes.find(n => n.id === wire.fromId);
            if (fromNode) {
              startX = fromNode.x + fromNode.outputPort.x;
              startY = fromNode.y + fromNode.outputPort.y;
              if (fromNode.gateNode.type === 'NOT' || fromNode.gateNode.type === 'NAND' || fromNode.gateNode.type === 'NOR' || fromNode.gateNode.type === 'XNOR') {
                 startX += 4; // adjust for bubble
              }
            } else {
              const inPin = annotatedLayout.inputPins.find(p => p.id === wire.fromId);
              if (inPin) {
                startX = inPin.x + 10;
                startY = inPin.y;
              }
            }
            
            // Find end
            const toNode = annotatedLayout.nodes.find(n => n.id === wire.toId);
            if (toNode) {
              const port = toNode.inputPorts[wire.toPort] || { x:0, y: 20 };
              endX = toNode.x + port.x;
              endY = toNode.y + port.y;
              if (toNode.gateNode.type === 'XOR' || toNode.gateNode.type === 'XNOR') {
                endX -= 5;
              }
            } else if (wire.toId === 'out') {
              endX = annotatedLayout.outputPin.x;
              endY = annotatedLayout.outputPin.y;
            }

            // Draw polyline with 90deg bend
            const midX = startX + (endX - startX) / 2;
            const pathD = `M ${startX},${startY} L ${midX},${startY} L ${midX},${endY} L ${endX},${endY}`;

            return (
              <path key={`wire_${idx}`} d={pathD} fill="none" stroke={color} strokeWidth="3" className="transition-colors duration-300" />
            );
          })}

          {/* Draw gates */}
          {annotatedLayout.nodes.map(node => (
            <GateShape key={node.id} type={node.gateNode.type as GateType} x={node.x} y={node.y} />
          ))}

          {/* Draw Input Pins */}
          {annotatedLayout.inputPins.map(pin => {
            const val = inputs[pin.variable] || 0;
            const color = val === 1 ? '#22c55e' : '#64748b';
            return (
              <g key={pin.id} transform={`translate(${pin.x}, ${pin.y})`} className="cursor-pointer" onClick={() => toggleInput(pin.variable)}>
                <rect x="-20" y="-12" width="30" height="24" rx="4" fill={color} className="transition-colors duration-300" />
                <text x="-5" y="4" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" className="font-mono">{val}</text>
                <text x="-25" y="4" textAnchor="end" fill="currentColor" fontSize="14" fontWeight="bold" className="font-mono text-slate-700 dark:text-slate-300">{pin.variable}</text>
                <circle cx="10" cy="0" r="3" fill={color} />
              </g>
            );
          })}
          
          {/* Draw Output Pin */}
          <g transform={`translate(${annotatedLayout.outputPin.x}, ${annotatedLayout.outputPin.y})`}>
            <circle cx="0" cy="0" r="10" fill={finalOutput ? '#22c55e' : '#64748b'} className="transition-colors duration-300" />
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" className="font-mono">{finalOutput}</text>
            <text x="15" y="4" textAnchor="start" fill="currentColor" fontSize="14" fontWeight="bold" className="font-mono text-slate-700 dark:text-slate-300">F</text>
          </g>

        </svg>
      </div>
    </div>
  );
};
