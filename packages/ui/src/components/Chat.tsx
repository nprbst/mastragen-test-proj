import { useState, useRef, useEffect } from 'react';
import { chatWithAgent, type Message } from '../lib/mastra-client';

interface ChatProps {
  agentId: string;
  agentName: string;
}

export default function Chat({ agentId, agentName }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const stream = await chatWithAgent(agentId, newMessages);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Error connecting to agent. Make sure Mastra is running on port 4111.' },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="font-semibold">{agentName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-8">
            Start a conversation by typing a message below.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isStreaming ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
