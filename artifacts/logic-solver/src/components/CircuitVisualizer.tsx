import React from 'react';

type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

interface GateProps {
  type: GateType;
  x: number;
  y: number;
  inputs?: { x: number; y: number; val: number }[];
  outputVal?: number;
}

export const LogicGate: React.FC<GateProps> = ({ type, x, y, inputs = [], outputVal = 0 }) => {
  const color = outputVal ? "#22c55e" : "#475569";
  
  const drawGate = () => {
    switch (type) {
      case 'AND':
        return (
          <g transform={`translate(${x}, ${y})`}>
            <path d="M 0,0 L 20,0 A 20,20 0 0,1 20,40 L 0,40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
          </g>
        );
      case 'OR':
        return (
          <g transform={`translate(${x}, ${y})`}>
            <path d="M 0,0 Q 10,20 0,40 Q 20,40 40,20 Q 20,0 0,0" fill="none" stroke="currentColor" strokeWidth="2" />
          </g>
        );
      case 'NOT':
        return (
          <g transform={`translate(${x}, ${y})`}>
            <path d="M 0,10 L 20,20 L 0,30 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="24" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          </g>
        );
      default:
        return (
          <g transform={`translate(${x}, ${y})`}>
            <rect width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" />
            <text x="20" y="25" textAnchor="middle" fill="currentColor" fontSize="12">{type}</text>
          </g>
        );
    }
  };

  return (
    <g className="text-slate-800 dark:text-slate-200">
      {drawGate()}
      <line x1={x + 40} y1={y + 20} x2={x + 60} y2={y + 20} stroke={color} strokeWidth="3" />
    </g>
  );
};

export const CircuitVisualizer: React.FC<{ expression: string }> = ({ expression }) => {
  return (
    <div className="w-full h-96 bg-slate-50 dark:bg-slate-900 border rounded-md overflow-hidden relative flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 600 400">
        <LogicGate type="AND" x={100} y={100} outputVal={1} />
        <LogicGate type="OR" x={200} y={150} outputVal={0} />
        <text x={300} y={200} fill="currentColor" className="text-slate-500">
          Circuit layout generation for "{expression}"
        </text>
      </svg>
    </div>
  );
};
