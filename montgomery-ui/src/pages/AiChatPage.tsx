import { useState, useRef, useEffect } from 'react';
import { useAction } from '@/hooks/useFetch';
import { ai } from '@/lib/api';
import { ModuleHeader } from '@/components/shared';
import { Markdown } from '@/components/shared/Markdown';
import { ExportButton } from '@/lib/export';
import { MessageSquare, Send, RefreshCw, Bot, User, Sparkles, Download } from 'lucide-react';
import { smartText } from '@/components/shared/AdaptiveRenderer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  module?: string;
  timestamp: Date;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [module, setModule] = useState('cross_module');
  const action = useAction(ai.chat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || action.loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, module, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const resp = await action.execute({ message: input, module }) as any;
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: resp?.response || resp?.message || resp?.answer || smartText(resp),
        module,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.', timestamp: new Date() }]);
    }
  };

  const modules = [
    { value: 'cross_module', label: 'Command Center', color: 'bg-amber-500' },
    { value: 'sentinel', label: 'Sentinel MGM', color: 'bg-sentinel-500' },
    { value: 'youthshield', label: 'YouthShield', color: 'bg-youthshield-500' },
    { value: 'blight', label: 'Blight-to-Bright', color: 'bg-blight-500' },
    { value: 'compass', label: 'DataCenter Compass', color: 'bg-compass-500' },
    { value: 'executive', label: 'Executive', color: 'bg-red-500' },
  ];

  const suggestions = [
    'What are the top safety concerns in Montgomery?',
    'Show me the youth crime statistics for District 3',
    'What blight zones need immediate attention?',
    'Analyze the economic impact of data center investment',
    'Generate a deployment recommendation for tonight',
  ];

  const exportChatHistory = () => {
    const md = messages.map(m =>
      m.role === 'user' ? `**You:** ${m.content}` : `**AI Assistant:**\n${m.content}`
    ).join('\n\n---\n\n');
    return md;
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col animate-fade-in">
      <ModuleHeader title="AI Assistant" subtitle="Intelligent assistant powered by Montgomery's data ecosystem" accentColor="bg-gradient-to-r from-blue-500 to-purple-500" icon={<Bot className="w-6 h-6" />}>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <ExportButton content={exportChatHistory()} filename="montgomery-ai-chat" title="AI Chat History" />
          )}
          {modules.map(m => (
            <button key={m.value} onClick={() => setModule(m.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${module === m.value ? `${m.color} text-white shadow-lg` : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </ModuleHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4 px-1 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-blue-400/50" />
            </div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">Montgomery AI Assistant</h2>
            <p className="text-sm text-slate-500 max-w-md mb-8">Ask about public safety, youth programs, urban renewal, or economic development. I have access to Montgomery's complete data ecosystem.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)} className="text-left p-3 glass-card text-xs text-slate-400 hover:text-slate-300 hover:border-blue-500/30 transition-all">
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
            )}
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100' : 'glass-card text-slate-300'}`}>
              {msg.role === 'assistant' ? (
                <Markdown size="sm">{msg.content}</Markdown>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {action.loading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="glass-card px-4 py-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-3 pt-4 border-t border-slate-800/50">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about Montgomery's data..." className="input-field flex-1 text-sm" disabled={action.loading} autoFocus />
        <button type="submit" disabled={action.loading || !input.trim()} className="btn-primary px-5 flex items-center gap-2 disabled:opacity-30">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
