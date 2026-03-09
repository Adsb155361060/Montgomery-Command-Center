import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Loader2, Bot, User, Zap, BarChart2 } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../api/client';
import type { ChatMessage } from '../../types';

const MODULE_OPTIONS = [
  { value: 'cross_module', label: 'Cross-Module', color: '#6366f1' },
  { value: 'sentinel', label: 'Sentinel', color: '#ef4444' },
  { value: 'youthshield', label: 'YouthShield', color: '#8b5cf6' },
  { value: 'blight', label: 'Blight-to-Bright', color: '#3b82f6' },
  { value: 'compass', label: 'Compass', color: '#10b981' },
];

const SUGGESTIONS = [
  'What are the highest-risk zones in Montgomery right now?',
  'Which districts have the most blight concentration?',
  'How will the Meta data center impact housing prices?',
  'What interventions are most effective for youth violence prevention?',
  'Summarize the current SB298 compliance situation.',
];

export default function AIChatPage() {
  const { error: toastError } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [module, setModule] = useState('cross_module');
  const [sending, setSending] = useState(false);
  const [aiStats, setAiStats] = useState<Record<string, unknown> | null>(null);
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    aiApi.stats().then(setAiStats).catch(() => {});
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const r = await aiApi.chat({ message: input, module });
      const aiMsg: ChatMessage = { role: 'assistant', content: r.response || r.analysis || JSON.stringify(r), timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      toastError('AI Chat failed', getErrorMessage(e));
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const selectedModule = MODULE_OPTIONS.find(m => m.value === module);

  return (
    <div className="h-full flex gap-6 animate-slide-in-up" style={{maxHeight: 'calc(100vh - 7rem)'}}>
      {/* Chat */}
      <div className="flex-1 flex flex-col glass rounded-2xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: `${selectedModule?.color}25`, border: `1px solid ${selectedModule?.color}40`}}>
              <Bot className="w-5 h-5" style={{color: selectedModule?.color}} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Montgomery AI Assistant</p>
              <p className="text-xs text-slate-400">Powered by Gemini · {selectedModule?.label} context</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {MODULE_OPTIONS.map(m => (
                <button key={m.value} onClick={() => setModule(m.value)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all`}
                  style={module === m.value ? {background: `${m.color}25`, color: m.color, border: `1px solid ${m.color}40`} : {color: '#94a3b8', border: '1px solid transparent'}}>
                  {m.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowStats(!showStats)} className={`p-1.5 rounded-lg transition-colors ${showStats ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-400'}`}>
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-white">Montgomery AI Assistant</h3>
                <p className="text-slate-400 text-sm mt-1">Ask me anything about Montgomery's public safety, youth, blight, or economic data.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-left px-4 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600/50 text-xs text-slate-300 transition-all">
                    <Zap className="inline w-3 h-3 text-indigo-400 mr-2" />{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className={`flex gap-3 ${msg.role==='user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${msg.role==='user' ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-slate-700/60 border border-slate-600/50'}`}>
                  {msg.role==='user' ? <User className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-slate-300" />}
                </div>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role==='user' ? 'bg-indigo-500/15 border border-indigo-500/20 text-white rounded-tr-none' : 'bg-slate-800/70 border border-slate-700/50 text-slate-200 rounded-tl-none'}`}>
                  {msg.content}
                  <p className={`text-xs mt-2 ${msg.role==='user' ? 'text-indigo-400/60' : 'text-slate-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-slate-700/60 border border-slate-600/50">
                <Bot className="w-4 h-4 text-slate-300" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-slate-800/70 border border-slate-700/50">
                <div className="flex gap-1.5 items-center py-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{animationDelay: `${i*0.15}s`}} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-700/50">
          <div className="flex items-end gap-3">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1}
              placeholder="Ask about Montgomery's data..."
              className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none max-h-32 leading-relaxed" />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
              style={{background: input.trim() && !sending ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#334155'}}>
              {sending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">Press Enter to send · Shift+Enter for newline</p>
        </div>
      </div>

      {/* Stats sidebar */}
      {showStats && (
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="w-64 glass rounded-2xl border border-slate-700/50 p-5 space-y-4 overflow-auto">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-white text-sm">AI Usage Stats</h3>
          </div>
          {aiStats ? (
            <>
              {aiStats.analysesByModule && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">By Module</p>
                  <div className="space-y-2">
                    {((aiStats.analysesByModule as {module:string;count:number}[]) || []).map(m => (
                      <div key={m.module} className="flex justify-between text-xs">
                        <span className="text-slate-400 capitalize">{m.module}</span>
                        <span className="text-white font-medium">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiStats.totalAnalyses && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">By Model</p>
                  <div className="space-y-2">
                    {((aiStats.totalAnalyses as {model:string;count:number}[]) || []).map(m => (
                      <div key={m.model} className="flex justify-between text-xs">
                        <span className="text-slate-400 truncate">{m.model?.split('/').pop()}</span>
                        <span className="text-white font-medium">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-500 text-center py-4">Loading stats...</div>
          )}
        </motion.div>
      )}
    </div>
  );
}
