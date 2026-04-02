import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle, Send, X, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  tenant_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const STORAGE_KEY = "support-widget-pos";
const DEFAULT_POS = { x: -1, y: -1 }; // -1 means use default (bottom-right)

export default function SupportChatWidget() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState(DEFAULT_POS);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPos(JSON.parse(saved));
    } catch {}
  }, []);

  // Load unread count
  useEffect(() => {
    if (!tenant) return;
    loadUnread();
  }, [tenant]);

  // Load messages when opened
  useEffect(() => {
    if (!open || !tenant) return;
    loadMessages();
  }, [open, tenant]);

  // Realtime
  useEffect(() => {
    if (!tenant) return;
    const channel = supabase
      .channel("client-support")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `tenant_id=eq.${tenant.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (open) {
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_type === "admin") {
            supabase.from("support_messages").update({ is_read: true }).eq("id", msg.id).then();
          }
        } else if (msg.sender_type === "admin") {
          setUnread((prev) => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenant, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadUnread() {
    if (!tenant) return;
    const { count } = await supabase
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("sender_type", "admin")
      .eq("is_read", false);
    setUnread(count || 0);
  }

  async function loadMessages() {
    if (!tenant) return;
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark admin messages as read
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("tenant_id", tenant.id)
      .eq("sender_type", "admin")
      .eq("is_read", false);
    setUnread(0);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !tenant || !user) return;
    await supabase.from("support_messages").insert({
      tenant_id: tenant.id,
      sender_id: user.id,
      sender_type: "client",
      message: newMessage.trim(),
    });
    setNewMessage("");
  }

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    didDragRef.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragRef.current.origX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragRef.current.origY + dy));
    setPos({ x: newX, y: newY });
  }, [dragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragging && pos.x >= 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    }
    setDragging(false);
    dragRef.current = null;
    if (!didDragRef.current) {
      setOpen((prev) => {
        if (!prev) loadMessages();
        return !prev;
      });
    }
  }, [dragging, pos]);

  const style: React.CSSProperties =
    pos.x >= 0 && pos.y >= 0
      ? { position: "fixed", left: pos.x, top: pos.y, zIndex: 50 }
      : { position: "fixed", right: 24, bottom: 24, zIndex: 50 };

  if (!tenant || !user) return null;

  return (
    <>
      {/* FAB */}
      <div ref={btnRef} style={style} className="select-none touch-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={`relative flex h-12 w-12 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:cursor-grabbing active:scale-95 ${
                dragging ? "cursor-grabbing scale-95" : ""
              }`}
            >
              <MessageCircle className="h-5 w-5" />
              {unread > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-[10px] px-1 bg-destructive text-destructive-foreground border-2 border-background">
                  {unread}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Sugestões, dúvidas ou contato — fale conosco!</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[51] flex flex-col w-[340px] h-[460px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          style={
            pos.x >= 0 && pos.y >= 0
              ? { left: Math.min(pos.x - 280, window.innerWidth - 350), top: Math.max(10, pos.y - 470) }
              : { right: 24, bottom: 80 }
          }
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground">
            <div>
              <h3 className="text-sm font-semibold">Fale Conosco</h3>
              <p className="text-[10px] opacity-80">Envie sugestões, dúvidas ou feedback</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-primary-foreground/10 transition-colors">
                <Minus className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-primary-foreground/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2.5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <MessageCircle className="h-8 w-8 opacity-30" />
                  <p className="text-xs text-center">Envie uma mensagem para iniciar a conversa</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                      msg.sender_type === "client"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p
                      className={`text-[9px] mt-1 ${
                        msg.sender_type === "client" ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-2.5 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 h-8 text-xs"
              />
              <Button type="submit" size="sm" disabled={!newMessage.trim()} className="h-8 w-8 p-0">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
