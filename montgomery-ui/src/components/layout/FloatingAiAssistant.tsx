import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAction } from '@/hooks/useFetch';
import { ai } from '@/lib/api';
import { Markdown } from '@/components/shared/Markdown';
import { Bot, Send, X, Minimize2, MessageSquare, RefreshCw, Sparkles, User } from 'lucide-react';
import { smartText } from '@/components/shared/AdaptiveRenderer';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function FloatingAiAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const action = useAction(ai.chat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const isAiPage = location.pathname === '/ai';

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  // Don't render on the dedicated AI chat page
  if (isAiPage) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || action.loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    try {
      const resp = await action.execute({ message: currentInput, module: 'cross_module' }) as any;
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: resp?.response || resp?.message || resp?.answer || smartText(resp),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() },
      ]);
    }
  };

  const quickQuestions = [
    'What needs attention today?',
    'Safety stats summary',
    'Blight hotspots',
  ];

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 z-[90] transition-all duration-300 ${
            minimized ? 'w-72 h-14' : 'w-96 h-[520px]'
          }`}
          style={{ animation: 'slideUpFade 0.25s ease-out' }}
        >
          <div className="h-full flex flex-col bg-white/95 dark:bg-navy-900/95 backdrop-blur-2xl border border-gray-200 dark:border-slate-700/50 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">AI Assistant</p>
                  {!minimized && (
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">Montgomery Command Center</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(!minimized)}
                  className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
                  title={minimized ? 'Expand' : 'Minimize'}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setOpen(false); setMinimized(false); }}
                  className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/15 to-purple-500/15 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-blue-400/40" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">How can I help?</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-4">Ask anything about Montgomery's data</p>
                      <div className="flex flex-col gap-1.5 w-full">
                        {quickQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(q)}
                            className="text-left px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/30 text-[11px] text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:border-blue-500/30 transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-100'
                            : 'bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/30 text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <Markdown size="sm">{msg.content}</Markdown>
                        ) : (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                    </div>
                  ))}

                  {action.loading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-blue-400" />
                      </div>
                      <div className="bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/30 rounded-2xl px-3 py-2 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 text-blue-500 dark:text-blue-400 animate-spin" />
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-gray-200 dark:border-slate-700/50 flex-shrink-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about Montgomery..."
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl text-xs text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                    disabled={action.loading}
                  />
                  <button
                    type="submit"
                    disabled={action.loading || !input.trim()}
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-xs font-medium hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          open
            ? 'bg-gray-200 dark:bg-slate-800 border border-gray-300 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:shadow-blue-500/50'
        }`}
        title="AI Assistant"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageSquare className="w-5 h-5" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          </>
        )}
      </button>
    </>
  );
}
