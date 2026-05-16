import React from 'react';
import { TruthTableRow } from '../lib/booleanLogic';

export const KMapVisualizer: React.FC<{ truthTable: TruthTableRow[], variables: string[] }> = ({ truthTable, variables }) => {
  // Simplified 2x2 or 4x2 representation
  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-md border shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Karnaugh Map (K-Map)</h3>
      <div className="grid grid-cols-5 gap-1 text-center font-mono">
        <div className="col-span-1"></div>
        <div className="col-span-4 grid grid-cols-4 border-b pb-2 mb-2 font-bold text-slate-600">
          <div>00</div><div>01</div><div>11</div><div>10</div>
        </div>
        
        {/* Row 0 */}
        <div className="col-span-1 font-bold text-slate-600 border-r pr-2 flex items-center justify-end">00</div>
        <div className="col-span-4 grid grid-cols-4 gap-2">
          {['0', '1', '1', '0'].map((v, i) => (
            <div key={i} className={`p-4 border rounded ${v === '1' ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              {v}
            </div>
          ))}
        </div>

        {/* Row 1 */}
        <div className="col-span-1 font-bold text-slate-600 border-r pr-2 flex items-center justify-end">01</div>
        <div className="col-span-4 grid grid-cols-4 gap-2 mt-2">
          {['0', '1', '0', '1'].map((v, i) => (
            <div key={i} className={`p-4 border rounded ${v === '1' ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
