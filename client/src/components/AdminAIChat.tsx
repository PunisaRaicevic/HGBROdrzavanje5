import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AdminAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Pozdrav! Ja sam AI asistent za analizu podataka hotela. Mogu da vam dam analizu:\n\n- Trendove u prijavljivanjima\n- Analizu zadataka po odeljenju\n- Statistiku odgovora\n- Preporuke za poboljšanja\n\nSta biste hteli da saznate?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initSpeechRecognition = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const available = await SpeechRecognition.available();
          setSpeechAvailable(available.available);
          console.log('[SPEECH] Native speech recognition available:', available.available);
          
          if (available.available) {
            const permission = await SpeechRecognition.checkPermissions();
            console.log('[SPEECH] Permission status:', permission.speechRecognition);
            
            if (permission.speechRecognition === 'prompt' || permission.speechRecognition === 'prompt-with-rationale') {
              const requested = await SpeechRecognition.requestPermissions();
              console.log('[SPEECH] Permission requested:', requested.speechRecognition);
            }
          }
        } catch (error) {
          console.error('[SPEECH] Error initializing native speech:', error);
          setSpeechAvailable(false);
        }
      } else {
        const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'sr-RS';

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                setInput(prev => (prev + transcript).trim());
              }
            }
          };

          recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            toast({
              title: 'Greska pri prepoznavanju govora',
              description: 'Molim pokusajte ponovo.',
              variant: 'destructive'
            });
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = recognition;
          setSpeechAvailable(true);
          console.log('[SPEECH] Web Speech API available');
        } else {
          console.log('[SPEECH] No speech recognition available');
          setSpeechAvailable(false);
        }
      }
    };

    initSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.stop().catch(() => {});
      }
    };
  }, [toast]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleVoiceInput = async () => {
    if (!speechAvailable) {
      toast({
        title: 'Glasovni unos nije dostupan',
        description: 'Vas uredaj ne podrzava prepoznavanje govora.',
        variant: 'destructive'
      });
      return;
    }

    if (Capacitor.isNativePlatform()) {
      if (isListening) {
        try {
          await SpeechRecognition.stop();
          setIsListening(false);
        } catch (error) {
          console.error('[SPEECH] Error stopping:', error);
        }
      } else {
        try {
          setInput('');
          setIsListening(true);
          
          const result = await SpeechRecognition.start({
            language: 'sr-RS',
            maxResults: 5,
            prompt: 'Govorite...',
            partialResults: true,
            popup: false
          });
          
          console.log('[SPEECH] Recognition result:', result);
          
          if (result.matches && result.matches.length > 0) {
            setInput(result.matches[0]);
          }
          
          setIsListening(false);
        } catch (error: any) {
          console.error('[SPEECH] Recognition error:', error);
          setIsListening(false);
          
          if (error?.message !== 'User denied access to speech recognition') {
            toast({
              title: 'Greska pri prepoznavanju',
              description: 'Molim pokusajte ponovo.',
              variant: 'destructive'
            });
          }
        }
      }
    } else {
      if (!recognitionRef.current) {
        toast({
          title: 'Glasovni unos nije dostupan',
          description: 'Vas pretrazivac ne podrzava prepoznavanje govora.',
          variant: 'destructive'
        });
        return;
      }

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        setInput('');
        recognitionRef.current.start();
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const questionText = input;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: questionText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      console.log('[AI CHAT] Sending question to backend...');
      const response = await apiRequest('POST', '/api/admin/analyze', { question: questionText });

      if (!response.ok) {
        throw new Error('Greska pri dohvatu analize');
      }

      const data = await response.json();
      console.log('[AI CHAT] Received response:', data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.analysis,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[AI CHAT] Error:', error);
      toast({
        title: 'Greska',
        description: 'Nije moguce dobiti analizu. Pokusajte ponovo.',
        variant: 'destructive'
      });
      
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <ScrollArea className="flex-1 border rounded-lg p-4">
        <div className="space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <span className="text-xs opacity-70 mt-2 block">
                  {msg.timestamp.toLocaleTimeString('sr-RS', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          placeholder="Pitajte AI o trendovima, prijavljivanjima..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !loading && handleSend()}
          disabled={loading || isListening}
          data-testid="input-ai-question"
        />
        <Button
          onClick={handleVoiceInput}
          disabled={loading || !speechAvailable}
          size="icon"
          variant={isListening ? 'default' : 'outline'}
          data-testid="button-voice-input"
          title={isListening ? 'Zaustaviti snimanje' : 'Glasovni unos'}
        >
          <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
        </Button>
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="icon"
          data-testid="button-send-ai-question"
        >
          {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
