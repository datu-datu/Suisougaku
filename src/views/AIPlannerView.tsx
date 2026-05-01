import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../store/AppStateContext';
import { Send, Bot, User, Sparkles, Settings as SettingsIcon, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useLocalStorage } from '../lib/useLocalStorage';

type AIProvider = 'gemini' | 'ollama';

interface AIConfig {
  provider: AIProvider;
  geminiApiKey: string;
  geminiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3',
};

interface Message {
  role: 'user' | 'model';
  content: string;
}

type TemplateField = {
  id: string;
  label: string;
  placeholder: string;
};

type PracticeTemplate = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  fields: TemplateField[];
  generatePrompt: (data: Record<string, string>) => string;
};

const PRACTICE_TEMPLATES: PracticeTemplate[] = [
  {
    id: 'concert_prep',
    label: '練習計画作成',
    icon: '📅',
    description: 'コンクールや定期演奏会に向けた中長期の練習計画を立てます。',
    fields: [
      { id: 'purpose', label: '目的・本番名', placeholder: '例：夏のコンクール、定期演奏会' },
      { id: 'duration', label: '本番までの期間', placeholder: '例：3ヶ月、半年' },
      { id: 'focus', label: '重点的に強化したい点', placeholder: '例：ハーモニーの精度、表現力' },
    ],
    generatePrompt: (d) => `【長期練習計画の作成】\n目的: ${d.purpose || '未指定'}\n期間: ${d.duration || '未指定'}\n重点課題: ${d.focus || '未指定'}\n\n上記の設定で、時期ごとの目標や具体的な練習メニューを提案してください。`
  },
  {
    id: 'sight_reading',
    label: '初見練習',
    icon: '👀',
    description: '初見演奏の力を上げるための短い練習メニューを提案します。',
    fields: [
      { id: 'target', label: '対象レベル・パート', placeholder: '例：中学生全体、金管セクション' },
      { id: 'time', label: '所要時間', placeholder: '例：5分、10分' },
    ],
    generatePrompt: (d) => `【初見練習メニューの作成】\n対象: ${d.target || '未指定'}\n時間: ${d.time || '未指定'}\n\n対象の初見演奏のレベルを効果的に上げるための、指定時間内でできる実践的な練習メニューを複数提案してください。`
  },
  {
    id: 'exam',
    label: '試験・オーディション',
    icon: '📝',
    description: '実技試験や部内オーディションに向けた個人練習のアドバイスをもらいます。',
    fields: [
      { id: 'instrument', label: '対象の楽器', placeholder: '例：クラリネット、トランペット' },
      { id: 'concerns', label: '悩みや不安な点', placeholder: '例：高音の安定感、緊張しやすい' },
    ],
    generatePrompt: (d) => `【実技試験・オーディション対策】\n対象楽器: ${d.instrument || '未指定'}\n悩み・不安: ${d.concerns || '特になし'}\n\n試験に向けた個人練習の具体的なルーティンと、指定された悩みに対する解決策、本番の緊張に打ち勝つためのメンタルアドバイスをください。`
  },
  {
    id: 'tuning',
    label: '基礎・チューニング',
    icon: '🎺',
    description: 'バンド全体のピッチや音程感を向上させるための指導方法のアドバイスをもらいます。',
    fields: [
      { id: 'target', label: '対象編成', placeholder: '例：全体、木管セクション' },
      { id: 'issue', label: '課題・悩み', placeholder: '例：ピッチが合わない、和音が濁る' },
    ],
    generatePrompt: (d) => `【基礎合奏・チューニングの改善】\n対象: ${d.target || '未指定'}\n具体的な課題: ${d.issue || '未指定'}\n\nピッチや音程感の課題を解決するための、基礎合奏やチューニング時の具体的な練習方法と指導のコツを教えてください。`
  }
];

export const AIPlannerView = () => {
  const { selectedDate, logs, aiLogs, setAiLogs } = useAppState();
  const messages = aiLogs[selectedDate] || [
    { role: 'model', content: '今後の練習計画や指導の悩みについて、なんでも相談してください！今日の合奏録のデータも踏まえてアドバイスできます。' }
  ];
  
  const setMessages = (setter: React.SetStateAction<Message[]>) => {
    setAiLogs(prev => {
      const current = prev[selectedDate] || [
        { role: 'model', content: '今後の練習計画や指導の悩みについて、なんでも相談してください！今日の合奏録のデータも踏まえてアドバイスできます。' }
      ];
      const next = typeof setter === 'function' ? (setter as any)(current) : setter;
      return { ...prev, [selectedDate]: next };
    });
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [aiConfig, setAiConfig] = useLocalStorage<AIConfig>('ai_planner_config', DEFAULT_AI_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [tempConfig, setTempConfig] = useState<AIConfig>(aiConfig);
  const [selectedTemplate, setSelectedTemplate] = useState<PracticeTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    setTempConfig(aiConfig);
  }, [aiConfig, isSettingsOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSaveSettings = () => {
    setAiConfig(tempConfig);
    setIsSettingsOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (aiConfig.provider === 'gemini' && !aiConfig.geminiApiKey) {
      setMessages(prev => [...prev, { role: 'model', content: 'Gemini APIキーが設定されていません。右上の設定から入力してください。' }]);
      setIsSettingsOpen(true);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context from logs
      const currentLog = logs[selectedDate];
      let systemContext = `あなたはプロの吹奏楽指導者をサポートするAIアシスタントです。今後の練習計画の提案や、指導方法のアドバイスを行います。\n\n`;
      
      const hasLegacyLog = currentLog && ((currentLog.marks && currentLog.marks.length > 0) || currentLog.pieceTitle);
      const hasModernLog = currentLog && (currentLog.pieces && currentLog.pieces.length > 0);
      
      if (hasModernLog || hasLegacyLog || (currentLog && currentLog.overallNotes)) {
        systemContext += `【${selectedDate}の合奏記録データ】\n`;
        
        if (hasModernLog) {
          currentLog!.pieces!.forEach(p => {
            systemContext += `曲名: ${p.pieceTitle || '不明'}\n`;
            p.marks?.forEach(m => {
              systemContext += `- 練習番号 ${m.markName}: 指導内容[${m.guidance}], 残りの課題[${m.remainingTasks}]\n`;
            });
          });
        } else if (hasLegacyLog) {
          systemContext += `曲名: ${currentLog!.pieceTitle || '不明'}\n`;
          currentLog!.marks?.forEach(m => {
            systemContext += `- 練習番号 ${m.markName}: 指導内容[${m.guidance}], 残りの課題[${m.remainingTasks}]\n`;
          });
        }
        
        if (currentLog?.overallNotes) {
          systemContext += `全体メモ: ${currentLog.overallNotes}\n\n`;
        } else {
          systemContext += `\n`;
        }
      } else {
        systemContext += `※${selectedDate}の合奏記録はまだ入力されていません。\n\n`;
      }
      systemContext += "上記の状況を踏まえ、ユーザーの質問に実践的かつ具体的に答えてください。長すぎず簡潔で読みやすい文章を心がけてください。";

      const prompt = `${systemContext}\n\nユーザー: ${userMessage}`;

      let responseText = '';

      if (aiConfig.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: aiConfig.geminiApiKey });
        const response = await ai.models.generateContent({
          model: aiConfig.geminiModel || 'gemini-2.5-flash',
          contents: prompt,
        });
        responseText = response.text || '申し訳ありません、回答を生成できませんでした。';
      } else if (aiConfig.provider === 'ollama') {
        const response = await fetch(`${aiConfig.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiConfig.ollamaModel || 'llama3',
            prompt: prompt,
            stream: false,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Ollamaサーバーに接続できませんでした。');
        }
        
        const data = await response.json();
        responseText = data.response;
      }

      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: error instanceof Error ? error.message : 'エラーが発生しました。設定とネットワーク接続を確認してください。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">AI練習プランナー</h2>
          <p className="text-purple-200 text-xs mt-0.5">{selectedDate.replace(/-/g, '/')} の記録を考慮</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-purple-200 hover:text-white hover:bg-purple-600 rounded-full transition-colors">
            <SettingsIcon size={20} />
          </button>
          <Sparkles className="text-purple-300" size={24} />
        </div>
      </div>

      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">AI設定</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">AIプロバイダー</label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center gap-2 border border-slate-200 p-2 rounded-lg cursor-pointer">
                    <input 
                      type="radio" 
                      name="provider" 
                      checked={tempConfig.provider === 'gemini'} 
                      onChange={() => setTempConfig({...tempConfig, provider: 'gemini'})}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">Gemini API</span>
                  </label>
                  <label className="flex-1 flex items-center gap-2 border border-slate-200 p-2 rounded-lg cursor-pointer">
                    <input 
                      type="radio" 
                      name="provider" 
                      checked={tempConfig.provider === 'ollama'} 
                      onChange={() => setTempConfig({...tempConfig, provider: 'ollama'})}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">Ollama (Local)</span>
                  </label>
                </div>
              </div>

              {tempConfig.provider === 'gemini' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">APIキー</label>
                    <input 
                      type="password" 
                      value={tempConfig.geminiApiKey} 
                      onChange={e => setTempConfig({...tempConfig, geminiApiKey: e.target.value})}
                      placeholder="AI Studio API Key"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-1">キーはブラウザにのみ保存されます。</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">モデル</label>
                    <input 
                      type="text" 
                      value={tempConfig.geminiModel} 
                      onChange={e => setTempConfig({...tempConfig, geminiModel: e.target.value})}
                      placeholder="例: gemini-2.5-flash"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {tempConfig.provider === 'ollama' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">エンドポイント</label>
                    <input 
                      type="text" 
                      value={tempConfig.ollamaEndpoint} 
                      onChange={e => setTempConfig({...tempConfig, ollamaEndpoint: e.target.value})}
                      placeholder="例: http://localhost:11434"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">モデル名</label>
                    <input 
                      type="text" 
                      value={tempConfig.ollamaModel} 
                      onChange={e => setTempConfig({...tempConfig, ollamaModel: e.target.value})}
                      placeholder="例: llama3"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={handleSaveSettings}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none whitespace-pre-wrap'}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%] flex-row">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-purple-100 text-purple-600">
                <Bot size={16} />
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200 rounded-tl-none flex gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-300 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-slate-200 p-3 pb-safe shrink-0 w-full flex flex-col gap-2">
        {selectedTemplate && (
          <div className="absolute inset-0 bg-black/50 z-20 flex items-end justify-center sm:items-center sm:p-4">
            <div className="bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-xl max-w-sm max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>{selectedTemplate.icon}</span> {selectedTemplate.label}
                </h3>
                <button onClick={() => setSelectedTemplate(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                <p className="text-sm text-slate-500">{selectedTemplate.description}</p>
                
                {selectedTemplate.fields.map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{field.label}</label>
                    <input 
                      type="text" 
                      placeholder={field.placeholder}
                      value={templateFormData[field.id] || ''}
                      onChange={e => setTemplateFormData({...templateFormData, [field.id]: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none transition"
                    />
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0 sm:rounded-b-2xl">
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={() => {
                    const prompt = selectedTemplate.generatePrompt(templateFormData);
                    setSelectedTemplate(null);
                    setTemplateFormData({});
                    setInput(prompt);
                  }}
                  className="flex-1 py-3 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> AIに相談
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {PRACTICE_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => {
                setTemplateFormData({});
                setSelectedTemplate(tpl);
              }}
              className="whitespace-nowrap px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            >
              <span>{tpl.icon}</span>
              {tpl.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 bg-slate-100 p-1.5 rounded-3xl border border-slate-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="次の練習で重点的にやるべきことは？"
            className="flex-1 bg-transparent border-none p-2 pl-4 text-sm outline-none resize-none max-h-32 min-h-[60px]"
            rows={2}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-purple-600 text-white rounded-full shrink-0 disabled:bg-slate-300 disabled:text-slate-500 transition-colors mb-0.5 mr-0.5"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

