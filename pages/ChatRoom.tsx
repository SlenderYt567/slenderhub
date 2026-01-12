import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Send, User, ShieldAlert, Lock, ArrowLeft, Clock, CheckCircle } from 'lucide-react';

const ChatRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chats, messages, sendMessage, closeChat, verifyPayment, isAuthenticated, user } = useStore();
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatSession = chats.find(c => c.id === id);
  const chatMessages = messages.filter(m => m.chatId === id);
  const role = isAuthenticated ? 'admin' : 'user';

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (!chatSession) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-white">Chat Session Not Found</h2>
            <button onClick={() => navigate('/')} className="text-blue-500 hover:underline">Return Home</button>
        </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(chatSession.id, inputText, role);
    setInputText('');
  };

  const handleCloseTicket = () => {
     // Direct action
     closeChat(chatSession.id);
     navigate('/admin-dashboard');
  };

  const handleApprovePayment = () => {
      // Direct action
      verifyPayment(chatSession.id);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-4xl flex-col bg-slate-950 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4 md:rounded-t-2xl">
        <div className="flex items-center gap-3">
            {role === 'admin' && (
                 <button onClick={() => navigate('/admin-dashboard')} className="text-gray-400 hover:text-white mr-2">
                    <ArrowLeft className="h-5 w-5" />
                 </button>
            )}
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${role === 'admin' ? 'bg-blue-600' : 'bg-green-600'}`}>
                {role === 'admin' ? <ShieldAlert className="h-5 w-5 text-white" /> : <User className="h-5 w-5 text-white" />}
            </div>
            <div>
                <h1 className="font-bold text-white">
                    {role === 'admin' ? `Chatting with: ${chatSession.customerName}` : 'Support Agent'}
                </h1>
                <div className="flex items-center gap-2 text-xs">
                    {chatSession.status === 'open' && (
                        <>
                             <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                             <span className="text-gray-400">Online</span>
                        </>
                    )}
                    {chatSession.status === 'pending_payment' && (
                        <>
                             <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                             <span className="text-yellow-500">Verifying Payment</span>
                        </>
                    )}
                    {chatSession.status === 'closed' && (
                        <>
                             <span className="h-2 w-2 rounded-full bg-red-500"></span>
                             <span className="text-gray-400">Closed</span>
                        </>
                    )}
                </div>
            </div>
        </div>
        
        {role === 'admin' && chatSession.status !== 'closed' && (
            <button 
                onClick={handleCloseTicket}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition"
            >
                <Lock className="h-3 w-3" />
                Close Ticket
            </button>
        )}
      </div>

      {/* Payment Proof Context (Admin Only or User Confirmation) */}
      {chatSession.status === 'pending_payment' && (
          <div className="border-b border-yellow-500/20 bg-yellow-500/10 p-4">
              <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-black border border-yellow-500/30">
                      {chatSession.proofImage ? (
                          <img src={chatSession.proofImage} alt="Payment Proof" className="h-full w-full object-cover" />
                      ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No Img</div>
                      )}
                  </div>
                  <div className="flex-1">
                      <h4 className="font-bold text-white text-sm">Payment Verification Needed</h4>
                      <p className="text-xs text-gray-400">Total: ${chatSession.totalAmount?.toFixed(2)}</p>
                  </div>
                  {role === 'admin' && (
                      <button 
                        onClick={handleApprovePayment}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500"
                      >
                          Approve Payment
                      </button>
                  )}
                  {role === 'user' && (
                      <div className="flex items-center gap-2 text-yellow-500 text-sm font-semibold">
                          <Clock className="h-4 w-4" />
                          Waiting for admin...
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:border-x md:border-slate-800 space-y-4">
        {chatMessages.map((msg) => {
            const isMe = msg.sender === role;
            return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-gray-200 rounded-bl-none'
                    }`}>
                        <div className="text-sm">{msg.text}</div>
                        <div className={`mt-1 text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>
            );
        })}
        {chatSession.status === 'closed' && (
            <div className="my-4 flex items-center justify-center">
                <span className="rounded-full bg-slate-800 px-4 py-1 text-xs text-gray-500">
                    This conversation has been closed by the admin.
                </span>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-slate-900 p-4 md:rounded-b-2xl">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <input
                type="text"
                disabled={chatSession.status === 'closed'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={chatSession.status === 'open' || chatSession.status === 'pending_payment' ? "Type your message..." : "Chat is closed"}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 py-3 pl-4 pr-12 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
                type="submit"
                disabled={chatSession.status === 'closed' || !inputText.trim()}
                className="absolute right-2 rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500 disabled:bg-slate-700 disabled:text-gray-500"
            >
                <Send className="h-4 w-4" />
            </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
