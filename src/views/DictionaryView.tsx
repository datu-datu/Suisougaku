import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, X } from 'lucide-react';
import { useAppState } from '../store/AppStateContext';
import { DictionaryTerm } from '../types';

export const DictionaryView = () => {
  const { dictionary, setDictionary } = useAppState();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<DictionaryTerm>({
    term: '', reading: '', meaning: '', category: 'other'
  });

  const categories = [
    { id: 'all', label: 'すべて' }, { id: 'tempo', label: '速度' },
    { id: 'dynamics', label: '強弱' }, { id: 'expression', label: '発想' },
    { id: 'articulation', label: 'アーティキュレーション' }, { id: 'other', label: 'その他' }
  ];

  const filteredTerms = useMemo(() => {
    return dictionary.filter(term => {
      const matchQuery = term.term.toLowerCase().includes(query.toLowerCase()) || 
                         term.reading.includes(query) || 
                         term.meaning.includes(query);
      const matchCategory = activeCategory === 'all' || term.category === activeCategory;
      return matchQuery && matchCategory;
    });
  }, [query, activeCategory, dictionary]);

  const handleSave = () => {
    if (!form.term) return;
    if (editingTerm) {
      setDictionary(prev => prev.map(t => t.term === editingTerm ? form : t));
    } else {
      if (dictionary.some(t => t.term === form.term)) {
         alert('すでに登録されています'); return;
      }
      setDictionary(prev => [...prev, form]);
    }
    closeModal();
  };

  const handleDelete = (term: string) => {
    if (confirm('削除しますか？')) setDictionary(prev => prev.filter(t => t.term !== term));
  };

  const openModal = (term?: DictionaryTerm) => {
    if (term) {
      setForm({...term}); setEditingTerm(term.term);
    } else {
      setForm({ term: '', reading: '', meaning: '', category: 'other' }); setEditingTerm(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dictionary, null, 2));
    const a = document.createElement('a');
    a.href = dataStr; a.download = "dictionary.json"; a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) { setDictionary(json); alert('辞書を読み込みました'); }
      } catch (err) { alert('無効なJSONファイルです'); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-indigo-700 text-white p-4 shadow-md sticky top-0 z-10 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">音楽用語辞典</h2>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full" title="JSON読込">
              <Upload size={16} />
            </button>
            <button onClick={handleExport} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full" title="JSON保存">
              <Download size={16} />
            </button>
            <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImport} />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
          <input 
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="用語、読み、意味で検索..."
            className="w-full bg-indigo-800 text-white placeholder-indigo-300 border-none rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex overflow-x-auto p-3 gap-2 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="p-4 pt-0 pb-24 md:pb-8">
          <div className="flex justify-end mb-4">
            <button onClick={() => openModal()} className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-sm transition-all active:scale-95">
              <Plus size={18} /> 用語を追加
            </button>
          </div>

          {filteredTerms.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200">
              <p>見つかりませんでした</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredTerms.map((term, index) => (
                <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start hover:shadow-md transition-all group">
                  <div className="flex-1 pr-2 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-bold text-xl text-indigo-900 truncate">{term.term}</h3>
                      <span className="text-sm text-indigo-400 font-medium">{term.reading}</span>
                    </div>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">{term.meaning}</p>
                    <div className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-md">
                      {categories.find(c => c.id === term.category)?.label}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(term)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="編集"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(term.term)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="削除"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg">{editingTerm ? '用語を編集' : '用語を追加'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">用語 (必須)</label>
                <input type="text" value={form.term} onChange={e => setForm({...form, term: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">読み</label>
                <input type="text" value={form.reading} onChange={e => setForm({...form, reading: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">意味 (必須)</label>
                <textarea value={form.meaning} onChange={e => setForm({...form, meaning: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500 resize-none h-20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">カテゴリー</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500">
                  {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="pt-4 border-t mt-4 flex justify-end">
              <button onClick={handleSave} disabled={!form.term || !form.meaning} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold disabled:bg-slate-300">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
