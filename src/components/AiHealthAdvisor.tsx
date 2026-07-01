import { Bot, Lightbulb, Send, Sparkles, UserCheck } from 'lucide-react';
import React, { useState } from 'react';
import { askGeminiAssistant } from '../services/lifelineService';
import { DonorProfile } from '../types';

interface AiHealthAdvisorProps {
  currentUser: DonorProfile | null;
}

export const AiHealthAdvisor: React.FC<AiHealthAdvisorProps> = ({ currentUser }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `🩸 **Hello ${currentUser?.name || 'Friend'}! I am your LifelineBD AI Health Hub Advisor.**\n\nHow can I support you today? You can ask me about:\n- 🥗 Best Bangladeshi iron-rich foods for rapid donor recovery (*Kochu Shak, Lal Shak, Dates*)\n- ⏱️ Donation safety intervals & eligibility criteria\n- 📱 Drafting an urgent WhatsApp appeal message for your emergency request`
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (customPrompt?: string) => {
    const query = customPrompt || prompt;
    if (!query.trim() || loading) return;

    const newMsgs = [...messages, { role: 'user' as const, text: query }];
    setMessages(newMsgs);
    if (!customPrompt) setPrompt('');
    setLoading(true);

    try {
      const reply = await askGeminiAssistant(query, currentUser);
      setMessages([...newMsgs, { role: 'assistant', text: reply }]);
    } catch {
      setMessages([...newMsgs, { role: 'assistant', text: 'Sorry, I encountered a network delay. Please check your connection or try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Draft urgent WhatsApp appeal for 2 bags O- blood',
    'What foods in Bangladesh help rebuild hemoglobin fast?',
    'What are the health benefits of regular blood donation?'
  ];

  return (
    <section className="p-6 lg:p-10 flex flex-col h-full bg-white max-w-5xl mx-auto">
      {/* Header */}
      <header className="border-b border-slate-100 pb-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 blood-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="editorial-title text-3xl font-black text-slate-900">AI Health & Recovery Advisor</h1>
              <span className="text-[9px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                Powered by Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Personalized screening & medical guidance for {currentUser?.bloodGroup || 'Donors'}
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            Hemoglobin: {currentUser.healthInfo?.hemoglobin || 14.2} g/dL
          </div>
        )}
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-6 custom-scroll pr-2 pb-6">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3.5 max-w-3xl ${
              m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              m.role === 'user' ? 'bg-slate-900 text-white' : 'blood-gradient text-white'
            }`}>
              {m.role === 'user' ? <UserCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`p-5 rounded-3xl text-sm leading-relaxed whitespace-pre-line ${
              m.role === 'user' 
                ? 'bg-slate-900 text-white rounded-tr-none font-medium shadow-md' 
                : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none font-medium shadow-2xs'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-rose-600 font-bold text-xs animate-pulse p-4 bg-rose-50 rounded-2xl w-max border border-rose-100">
            <Sparkles className="w-4 h-4 animate-spin" />
            Lifeline AI Medical Advisor is consulting hematology guidelines...
          </div>
        )}
      </div>

      {/* Quick Suggestions Chips */}
      <div className="my-4 flex flex-wrap gap-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 self-center mr-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggestions:
        </span>
        {quickPrompts.map(qp => (
          <button
            key={qp}
            onClick={() => handleSend(qp)}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-semibold text-slate-700 transition-colors border border-slate-200/60 cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner"
      >
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask about diet, recovery, or request drafting..."
          disabled={loading}
          className="flex-1 px-4 py-3 bg-transparent text-sm font-semibold outline-hidden placeholder:text-slate-400 text-slate-800"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="px-6 py-3 blood-gradient text-white rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-md hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </section>
  );
};
