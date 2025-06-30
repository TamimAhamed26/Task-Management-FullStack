'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard'; 
import { FaPaperPlane, FaCommentDots, FaSpinner } from 'react-icons/fa';

interface Message {
  id: number | string;
  content: string;
  timestamp: string;
  sender: {
    id: number;
    username: string;
    email?: string;
  };
  conversationId: number;
}

export default function ChatWidget() {
  const { user, loading, chatSocket, socketStatus } = useAuthGuard();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentTargetUser, setCurrentTargetUser] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    fetch('http://localhost:3001/chat/available-users', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then(setAvailableUsers)
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!chatSocket) return;

    const handleReceiveMessage = (newMessage: Message) => {
      setMessages((prevMessages) => {
        const isAlreadyPresent = prevMessages.some(m => m.id === newMessage.id);
        if (isAlreadyPresent) return prevMessages;
        
        const optimisticIndex = prevMessages.findIndex(m => typeof m.id === 'string' && m.content === newMessage.content);
        if (optimisticIndex > -1) {
          const updated = [...prevMessages];
          updated[optimisticIndex] = newMessage;
          return updated;
        }
        return [...prevMessages, newMessage];
      });
    };

    chatSocket.on('receiveMessage', handleReceiveMessage);

    return () => {
      chatSocket.off('receiveMessage', handleReceiveMessage);
    };
  }, [chatSocket]);

  const startChatWith = async (userId: number) => {
    if (!user) return;
    try {
      const res = await fetch('http://localhost:3001/chat/conversations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId], type: 'direct' }),
      });
      if (!res.ok) throw new Error('Failed to start conversation.');
      
      const convo = await res.json();
      setCurrentConversationId(convo.id);
      setCurrentTargetUser(availableUsers.find((u) => u.id === userId));

      chatSocket?.emit('joinConversation', { conversationId: convo.id });

      const msgRes = await fetch(`http://localhost:3001/chat/conversations/${convo.id}/messages?page=1&limit=50`, {
        credentials: 'include',
      });
      if (!msgRes.ok) throw new Error('Failed to load messages.');

      const msgs = await msgRes.json();
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  const handleSend = () => {
    // The check now relies on the explicit status
    if (!message.trim() || !currentConversationId || socketStatus !== 'connected' || !user) {
      console.warn('handleSend aborted: Requirements not met.', { socketStatus });
      return;
    }

    const optimisticMessage: Message = {
      id: `temp_${Date.now()}`,
      content: message,
      sender: { id: user.id, username: user.username },
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    if (chatSocket) {
      chatSocket.emit(
        'sendMessage',
        { conversationId: currentConversationId, content: message },
        (response: { success: boolean; message?: Message; error?: string }) => {
          if (!response.success) {
            console.error('Message failed to send:', response.error);
            alert(`Failed to send message: ${response.error}`);
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
            return;
          }

          const confirmedMessage = response.message!;
          setMessages((prevMessages) => {
            return prevMessages.map(m => m.id === optimisticMessage.id ? confirmedMessage : m);
          });
        }
      );
    }

    setMessage('');
  };

  if (loading || !user) {
    return null;
  }
  
  const isChatReady = socketStatus === 'connected';

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="btn btn-primary btn-circle shadow-lg"
        >
          <FaCommentDots />
        </button>
      </div>

      {open && (
        <div className="fixed bottom-20 right-5 w-96 bg-base-100 shadow-xl rounded-xl z-50 border border-base-300 flex flex-col max-h-[90vh]">
          <div className="p-4 flex justify-between items-center border-b">
            <h3 className="font-bold">{currentTargetUser ? `Chat with ${currentTargetUser.username}` : 'Chat'}</h3>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setOpen(false)}>X</button>
          </div>

          {!currentConversationId ? (
            <div className="p-2 overflow-y-auto">
              <p className="font-semibold mb-1">Start a Conversation:</p>
              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChatWith(u.id)}
                  className="btn btn-sm btn-outline btn-primary mb-1 w-full text-left justify-start"
                >
                  {u.username || u.email}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat ${msg.sender.id === user?.id ? 'chat-end' : 'chat-start'}`}
                  >
                    <div className="chat-header text-xs opacity-50 pb-1">
                      {msg.sender.username}
                    </div>
                    <div className={`chat-bubble ${msg.sender.id === user?.id ? 'chat-bubble-primary' : ''}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex items-center p-2 border-t gap-2">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className="btn btn-primary" onClick={handleSend} disabled={!message.trim()}>
                  <FaPaperPlane />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}