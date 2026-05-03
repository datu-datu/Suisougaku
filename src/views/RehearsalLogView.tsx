import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../store/AppStateContext';
import { Plus, Trash2, Save, Download, Upload, Settings, X, FileJson, Music, Edit2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { PieceLog, PracticeMark, Piece } from '../types';

export const RehearsalLogView = () => {
  const { selectedDate, logs, setLogs, pieces: masterPieces, setPieces: setMasterPieces } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pieceFileInputRef = useRef<HTMLInputElement>(null);
  
  const existingLog = logs[selectedDate];
  let initialPieces: PieceLog[] = [];
  if (existingLog?.pieces) {
    initialPieces = existingLog.pieces;
  } else if (existingLog?.pieceTitle || existingLog?.marks) {
    initialPieces = [{
      id: Date.now().toString() + '-legacy',
      pieceTitle: existingLog.pieceTitle || '',
      marks: existingLog.marks || []
    }];
  }

  const [pieces, setPieces] = useState<PieceLog[]>(initialPieces);
  const [notes, setNotes] = useState(existingLog?.overallNotes || '');
  const [savedMessage, setSavedMessage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePieceIndex, setActivePieceIndex] = useState(0);

  const prevDate = useRef(selectedDate);
  const isFirstRender = useRef(true);

  // When selected date changes, we must reset state
  useEffect(() => {
    if (prevDate.current !== selectedDate) {
      const existing = logs[selectedDate];
      let initial: PieceLog[] = [];
      if (existing?.pieces) {
        initial = existing.pieces;
      } else if (existing?.pieceTitle || existing?.marks) {
        initial = [{
          id: Date.now().toString() + '-legacy',
          pieceTitle: existing.pieceTitle || '',
          marks: existing.marks || []
        }];
      }
      setPieces(initial);
      setNotes(existing?.overallNotes || '');
      setActivePieceIndex(0);
      prevDate.current = selectedDate;
      isFirstRender.current = true;
    }
  }, [selectedDate, logs]);

  // Auto-save effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setLogs(prev => {
        if (pieces.length === 0 && !notes.trim() && !prev[selectedDate]) {
          return prev;
        }
        return {
          ...prev,
          [selectedDate]: {
            ...prev[selectedDate],
            date: selectedDate,
            pieces,
            overallNotes: notes
          }
        };
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [pieces, notes, selectedDate, setLogs]);

  const handleAddPiece = () => {
    const newPiece = { id: Date.now().toString(), pieceTitle: '', marks: [] };
    setPieces([...pieces, newPiece]);
    setActivePieceIndex(pieces.length);
  };

  const removePiece = (id: string) => {
    if(confirm('この曲の記録を削除しますか？')) {
      const newPieces = pieces.filter(p => p.id !== id);
      setPieces(newPieces);
      if (activePieceIndex >= newPieces.length) {
        setActivePieceIndex(Math.max(0, newPieces.length - 1));
      }
    }
  };

  const updatePieceTitle = (id: string, title: string) => {
    setPieces(pieces.map(p => p.id === id ? { ...p, pieceTitle: title } : p));
  };

  const handleAddMark = (pieceId: string) => {
    setPieces(pieces.map(p => {
      if (p.id === pieceId) {
        return { ...p, marks: [...p.marks, { id: Date.now().toString(), markName: '', guidance: '', remainingTasks: '' }] };
      }
      return p;
    }));
  };

  const updateMark = (pieceId: string, markId: string, field: keyof PracticeMark, value: string) => {
    setPieces(pieces.map(p => {
      if (p.id === pieceId) {
        return {
          ...p,
          marks: p.marks.map(m => m.id === markId ? { ...m, [field]: value } : m)
        };
      }
      return p;
    }));
  };

  const removeMark = (pieceId: string, markId: string) => {
    setPieces(pieces.map(p => {
      if (p.id === pieceId) {
        return { ...p, marks: p.marks.filter(m => m.id !== markId) };
      }
      return p;
    }));
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "rehearsal_logs.json";
    a.click();
  };

  const handleImportLogs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (typeof json === 'object' && json !== null) {
          if (confirm('現在のすべての合奏記録を上書きしますか？（元に戻せません）')) {
            setLogs(json);
            const newLog = json[selectedDate];
            let initial: PieceLog[] = [];
            if (newLog?.pieces) {
              initial = newLog.pieces;
            } else if (newLog?.pieceTitle || newLog?.marks) {
              initial = [{ id: Date.now().toString() + '-legacy', pieceTitle: newLog.pieceTitle || '', marks: newLog.marks || [] }];
            }
            setPieces(initial);
            setNotes(newLog?.overallNotes || '');
            setActivePieceIndex(0);
            alert('合奏記録を読み込みました');
          }
        }
      } catch (err) {
        alert('無効なJSONファイルです');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearDay = () => {
    if (confirm('この日の記録をすべて削除しますか？')) {
      setPieces([]);
      setNotes('');
      setLogs(prev => {
        const newLogs = { ...prev };
        delete newLogs[selectedDate];
        return newLogs;
      });
      setIsMenuOpen(false);
    }
  };

  // Master Piece Management
  const [isEditingPieces, setIsEditingPieces] = useState(false);
  const [newMasterPiece, setNewMasterPiece] = useState('');
  const [newMasterPieceId, setNewMasterPieceId] = useState('');

  const handleAddMasterPiece = () => {
    if (newMasterPiece.trim()) {
      const id = newMasterPieceId.trim() || Date.now().toString();
      setMasterPieces([...masterPieces, { id, title: newMasterPiece.trim() }]);
      setNewMasterPiece('');
      setNewMasterPieceId('');
    }
  };

  const handleRemoveMasterPiece = (id: string) => {
    if (confirm('この曲をマスターリストから削除しますか？')) {
      setMasterPieces(masterPieces.filter(p => p.id !== id));
    }
  };

  const handleExportPieces = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(masterPieces, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "piece_list.json";
    a.click();
  };

  const handleImportPieces = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.every(m => m.id && m.title)) {
          if (confirm('曲リストを上書きしますか？')) {
            setMasterPieces(json);
            alert('曲リストを読み込みました');
          }
        } else {
           alert('曲リストの形式が正しくありません');
        }
      } catch (err) {
        alert('無効なJSONファイルです');
      }
      if (pieceFileInputRef.current) pieceFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const activePiece = pieces[activePieceIndex];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <div className="bg-blue-700 text-white px-4 py-3 shadow-md sticky top-0 z-10 flex justify-between items-center shrink-0">
        <div>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Rehearsal Log</p>
          <h2 className="text-lg font-bold leading-tight">{format(new Date(selectedDate), 'yyyy年M月d日')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 bg-blue-800/50 px-2 py-1 rounded-full transition-opacity duration-500 ${savedMessage ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 size={12} className="text-blue-200" />
            <span className="text-blue-100 text-[10px] font-bold">Saved</span>
          </div>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-blue-600 rounded-full transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Tabs - Horizontal Scrollable */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 p-3 overflow-x-auto hide-scrollbar">
          {pieces.map((p, i) => {
            const shortTitle = p.pieceTitle
              ? (p.pieceTitle.length > 8 ? p.pieceTitle.substring(0, 8) + '...' : p.pieceTitle)
              : `曲 ${i + 1}`;
            const isActive = i === activePieceIndex;
            return (
              <button
                key={p.id}
                onClick={() => setActivePieceIndex(i)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                }`}
              >
                {shortTitle}
              </button>
            );
          })}
          <button
            onClick={handleAddPiece}
            className="px-4 py-2 rounded-full text-sm font-bold bg-blue-50 text-blue-600 border-2 border-blue-100 border-dashed hover:bg-blue-100 transition flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus size={16} /> 追加
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-6">
        {pieces.length === 0 && (
          <div className="text-center py-10 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-100">
            <Music size={40} className="mx-auto text-blue-200 mb-3" />
            <p className="font-bold mb-2">記録された曲がありません</p>
            <button 
              onClick={handleAddPiece}
              className="mt-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition"
            >
              曲を追加する
            </button>
          </div>
        )}

        {activePiece && (
          <div className="bg-white rounded-2xl shadow-md p-5 mb-6 border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-start mb-6 gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 ml-1">Practice Piece</label>
                <div className="space-y-2">
                  <select
                    value={masterPieces.some(mp => mp.title === activePiece.pieceTitle) ? activePiece.pieceTitle : (activePiece.pieceTitle ? 'custom' : '')}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        // Keep current or empty
                      } else if (e.target.value === '') {
                        updatePieceTitle(activePiece.id, '');
                      } else {
                        updatePieceTitle(activePiece.id, e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition appearance-none cursor-pointer"
                  >
                    <option value="">-- 曲を選択 --</option>
                    {masterPieces.map(mp => (
                      <option key={mp.id} value={mp.title}>{mp.title}</option>
                    ))}
                    <option value="custom">その他 (直接入力)</option>
                  </select>

                  {(!masterPieces.some(mp => mp.title === activePiece.pieceTitle) && activePiece.pieceTitle !== '') || masterPieces.length === 0 ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={activePiece.pieceTitle}
                        onChange={e => updatePieceTitle(activePiece.id, e.target.value)}
                        placeholder="曲名を直接入力..."
                        className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-xl p-3 font-bold text-blue-900 outline-none focus:border-blue-500 focus:bg-white transition"
                      />
                      <Edit2 size={16} className="absolute right-3 top-3.5 text-blue-300" />
                    </div>
                  ) : null}
                </div>
              </div>
              <button 
                onClick={() => removePiece(activePiece.id)}
                className="mt-6 p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0 border border-transparent hover:border-red-100"
                title="この曲の記録を削除"
              >
                <Trash2 size={22} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <h3 className="font-black text-slate-800 text-sm tracking-tight">練習番号ごとの記録</h3>
                </div>
                <button 
                  onClick={() => handleAddMark(activePiece.id)}
                  className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-blue-200 active:scale-95"
                >
                  <Plus size={14} strokeWidth={3} /> 追加
                </button>
              </div>

              {activePiece.marks.length === 0 && (
                <div
                  onClick={() => handleAddMark(activePiece.id)}
                  className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all group"
                >
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={24} className="text-slate-300" />
                  </div>
                  <p className="text-xs font-bold">練習番号を追加して記録しましょう</p>
                </div>
              )}

              <div className="space-y-6">
                {activePiece.marks.map((mark) => (
                  <div key={mark.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md hover:border-blue-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 max-w-[140px]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mark / Bar</label>
                        <input 
                          type="text" 
                          value={mark.markName}
                          onChange={e => updateMark(activePiece.id, mark.id, 'markName', e.target.value)}
                          placeholder="例: A, [15]~"
                          className="w-full bg-white border-2 border-slate-100 rounded-lg p-2 font-black text-sm outline-none focus:border-blue-500 transition shadow-sm"
                        />
                      </div>
                      <button 
                        onClick={() => removeMark(activePiece.id, mark.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          指導内容
                        </label>
                        <textarea
                          value={mark.guidance}
                          onChange={e => updateMark(activePiece.id, mark.id, 'guidance', e.target.value)}
                          placeholder="ピッチを合わせる、クレッシェンドの方向性..."
                          rows={3}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-blue-500 resize-none transition shadow-sm placeholder:text-slate-300"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          今後の課題
                        </label>
                        <textarea
                          value={mark.remainingTasks}
                          onChange={e => updateMark(activePiece.id, mark.id, 'remainingTasks', e.target.value)}
                          placeholder="木管の連符がまだ合っていない、金管のスタミナ持続"
                          rows={3}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-blue-500 resize-none transition shadow-sm placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-5 mb-10 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
            <label className="block text-sm font-black text-slate-800 tracking-tight">全体を通した特記事項・所感</label>
          </div>
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="本番に向けて全体のテンポ感は掴めてきたが、細かいアーティキュレーションがまだ甘い。"
            rows={5}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 focus:bg-white transition resize-none whitespace-pre-wrap shadow-inner"
          />
        </div>
      </div>

      <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImportLogs} />
      <input type="file" accept=".json" ref={pieceFileInputRef} className="hidden" onChange={handleImportPieces} />

      {isMenuOpen && (
        <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b pb-2 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg text-slate-800">
                {isEditingPieces ? '曲リスト管理' : '設定メニュー'}
              </h3>
              <button onClick={() => { setIsEditingPieces(false); setIsMenuOpen(false); }} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            
            {!isEditingPieces ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-500">曲リスト一元管理</p>
                  <button onClick={() => setIsEditingPieces(true)} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition border border-blue-100">
                    <Edit2 size={18} />
                    <span className="font-medium text-sm">マスター曲リストを編集する</span>
                  </button>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-500">すべての合奏記録データ (JSON)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200">
                      <Upload className="text-blue-500" size={18} />
                      <span className="font-medium text-sm">読込</span>
                    </button>
                    <button onClick={handleExportLogs} className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200">
                      <FileJson className="text-indigo-500" size={18} />
                      <span className="font-medium text-sm">保存</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-500">今日の記録</p>
                  <button onClick={handleClearDay} className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition border border-red-100">
                    <Trash2 size={18} />
                    <span className="font-medium text-sm">この日の記録をすべて削除</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    value={newMasterPieceId}
                    onChange={e => setNewMasterPieceId(e.target.value)}
                    placeholder="ID (省略可)"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newMasterPiece}
                      onChange={e => setNewMasterPiece(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddMasterPiece()}
                      placeholder="新しい曲名を追加"
                      className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                    />
                    <button onClick={handleAddMasterPiece} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm shrink-0">追加</button>
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  {masterPieces.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm">曲が登録されていません</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {masterPieces.map(mp => (
                        <li key={mp.id} className="p-2 px-3 flex justify-between items-center hover:bg-slate-50">
                          <span className="font-medium text-sm text-slate-700">
                            {mp.title} <span className="text-xs text-slate-400 ml-2">({mp.id})</span>
                          </span>
                          <button onClick={() => handleRemoveMasterPiece(mp.id)} className="text-slate-400 hover:text-red-500 p-1">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => pieceFileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition border border-slate-200 text-xs">
                    <Upload className="text-blue-500" size={14} /> 読込
                  </button>
                  <button onClick={handleExportPieces} className="flex items-center justify-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition border border-slate-200 text-xs">
                    <FileJson className="text-indigo-500" size={14} /> 保存
                  </button>
                </div>

                <button onClick={() => setIsEditingPieces(false)} className="w-full mt-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition">
                  戻る
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

