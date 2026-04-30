import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../store/AppStateContext';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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

      // Reconstruct history for Gemini API
      // Add context as part of the first prompt internally or as system instruction if supported
      const prompt = `${systemContext}\n\nユーザー: ${userMessage}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setMessages(prev => [...prev, { role: 'model', content: response.text || '申し訳ありません、回答を生成できませんでした。' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: 'エラーが発生しました。しばらく経ってから再度お試しください。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-purple-700 text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">AI練習プランナー</h2>
          <p className="text-purple-200 text-xs mt-0.5">{selectedDate.replace(/-/g, '/')} の記録を考慮</p>
        </div>
        <Sparkles className="text-purple-300" size={24} />
      </div>

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
