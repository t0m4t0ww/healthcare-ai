// Search Bar Component
import React from "react";
import { Search, X } from "lucide-react";

export default function SearchBar({ searchQuery, setSearchQuery }) {
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
      <div className="relative group">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 dark:text-emerald-400 transition-all group-focus-within:scale-110" />
        <input
          type="text"
          placeholder="Tìm kiếm chức năng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all backdrop-blur-sm font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-all"
          >
            <X size={14} className="text-slate-500" />
          </button>
        )}
      </div>
    </div>
  );
}

