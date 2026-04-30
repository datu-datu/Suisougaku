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

export const AIPlannerView = () => {
  const { selectedDate, logs } = useAppState();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: '今後の練習計画や指導の悩みについて、なんでも相談してください！今日の合奏録のデータも踏まえてアドバイスできます。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [aiConfig, setAiConfig] = useLocalStorage<AIConfig>('ai_planner_config', DEFAULT_AI_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [tempConfig, setTempConfig] = useState<AIConfig>(aiConfig);

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
      if (currentLog && (currentLog.marks.length > 0 || currentLog.overallNotes)) {
        systemContext += `【${selectedDate}の合奏記録データ】\n曲名: ${currentLog.pieceTitle || '不明'}\n`;
        currentLog.marks.forEach(m => {
          systemContext += `- 練習番号 ${m.markName}: 指導内容[${m.guidance}], 残りの課題[${m.remainingTasks}]\n`;
        });
        systemContext += `全体メモ: ${currentLog.overallNotes}\n\n`;
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

      <div className="flex-1 overflow-auto p-4 pb-20 space-y-4">
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

      <div className="bg-white border-t border-slate-200 p-3 pb-safe absolute bottom-16 left-0 right-0 z-10 w-full">
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
            className="flex-1 bg-transparent border-none p-2 pl-4 text-sm outline-none resize-none max-h-32 min-h-[40px]"
            rows={1}
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

