// components/BudgetRow.js
'use client';
import { Trash2, TrendingUp } from 'lucide-react';

export default function BudgetRow({ item, onUpdate, onDelete }) {
    const planned = item.plannedAmount || 0; 
    const spent = item.spentAmount || 0;
    const remaining = planned - spent;
    
    // Categories that carry over surplus (Savings, Investment)
    const isRolloverItem = item.categoryGroup === 'Savings' || item.categoryGroup === 'Investment';

    return (
        <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-white hover:bg-gray-50 transition">
            
            {/* Category Name and Rollover Status */}
            <div className="flex-1 flex items-center gap-2">
                <h4 className="font-semibold text-gray-800">{item.name}</h4>
                {/* Show rollover status only for savings/investment with a surplus */}
                {isRolloverItem && remaining > 0 && (
                    <span className="text-xs text-blue-500 font-medium flex items-center">
                        <TrendingUp size={12} className="mr-0.5" /> R {remaining.toFixed(2)} Rollover
                    </span>
                )}
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                    {item.categoryGroup}
                </span>
            </div>

            {/* Planned Amount (Editable) */}
            <div className="flex flex-col items-end mr-6">
                <input
                    type="number"
                    value={planned}
                    // When the user changes the number, update the state
                    onChange={(e) => onUpdate(item.id, 'plannedAmount', e.target.value)}
                    className="w-24 text-right font-mono text-lg font-medium text-gray-700 bg-gray-50 rounded border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-2 py-1"
                />
            </div>

            {/* Actual Spent Display (Fixed for now, should be separate input for actual tracking) */}
            <div className="flex flex-col items-end w-24">
                <span className={`font-mono text-lg font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    R {spent.toFixed(2)}
                </span>
            </div>
            
            {/* Action Button (Delete) */}
            <button onClick={() => onDelete(item.id)} className="ml-4 p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                <Trash2 size={16} />
            </button>
        </div>
    );
}
