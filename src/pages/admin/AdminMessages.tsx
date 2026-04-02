import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, MessageCircle, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tenant {
  id: string;
  name: string;
  email: string;
  unread: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Message {
  id: string;
  tenant_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminMessages() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tenants with unread counts
  useEffect(() => {
    loadTenants();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const msg = payload.new as Message;
          if (selectedTenant && msg.tenant_id === selectedTenant.id) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_type === "client") {
              supabase.from("support_messages").update({ is_read: true }).eq("id", msg.id).then();
            }
          }
          loadTenants();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTenant]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadTenants() {
    const { data: allTenants } = await supabase.from("tenants").select("id, name, email").order("name");
    if (!allTenants) { setLoading(false); return; }

    const { data: unreadData } = await supabase
      .from("support_messages")
      .select("tenant_id, id")
      .eq("sender_type", "client")
      .eq("is_read", false);

    const { data: lastMessages } = await supabase
      .from("support_messages")
      .select("tenant_id, message, created_at")
      .order("created_at", { ascending: false });

    const unreadMap: Record<string, number> = {};
    unreadData?.forEach((m) => { unreadMap[m.tenant_id] = (unreadMap[m.tenant_id] || 0) + 1; });

    const lastMap: Record<string, { message: string; created_at: string }> = {};
    lastMessages?.forEach((m) => {
      if (!lastMap[m.tenant_id]) lastMap[m.tenant_id] = { message: m.message, created_at: m.created_at };
    });

    const mapped: Tenant[] = allTenants.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      unread: unreadMap[t.id] || 0,
      lastMessage: lastMap[t.id]?.message,
      lastMessageAt: lastMap[t.id]?.created_at,
    }));

    // Sort: unread first, then by last message time
    mapped.sort((a, b) => {
      if (a.unread && !b.unread) return -1;
      if (!a.unread && b.unread) return 1;
      if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.name.localeCompare(b.name);
    });

    setTenants(mapped);
    setLoading(false);
  }

  async function selectTenant(tenant: Tenant) {
    setSelectedTenant(tenant);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark client messages as read
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("tenant_id", tenant.id)
      .eq("sender_type", "client")
      .eq("is_read", false);

    loadTenants();
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedTenant || !user) return;
    await supabase.from("support_messages").insert({
      tenant_id: selectedTenant.id,
      sender_id: user.id,
      sender_type: "admin",
      message: newMessage.trim(),
    });
    setNewMessage("");
  }

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Contato com Clientes</h1>
        <p className="text-sm text-muted-foreground">Gerencie as conversas com os clientes da plataforma</p>
      </div>

      <div className="flex flex-1 border border-border rounded-xl overflow-hidden bg-card min-h-0">
        {/* Tenant list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredTenants.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">Nenhum cliente encontrado</p>
            ) : (
              filteredTenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTenant(t)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-secondary/50 ${
                    selectedTenant?.id === t.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[0.8125rem] font-medium text-foreground truncate">{t.name}</span>
                      </div>
                      {t.lastMessage && (
                        <p className="text-[11px] text-muted-foreground mt-1 truncate pl-5">{t.lastMessage}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {t.unread > 0 && (
                        <Badge className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
                          {t.unread}
                        </Badge>
                      )}
                      {t.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(t.lastMessageAt), "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedTenant ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageCircle className="h-10 w-10 opacity-30" />
              <p className="text-sm">Selecione um cliente para ver a conversa</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-border bg-secondary/30">
                <h2 className="text-[0.8125rem] font-semibold text-foreground">{selectedTenant.name}</h2>
                <p className="text-[11px] text-muted-foreground">{selectedTenant.email}</p>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda</p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-xl px-4 py-2.5 text-[0.8125rem] ${
                          msg.sender_type === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender_type === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 h-9 text-sm"
                  />
                  <Button type="submit" size="sm" disabled={!newMessage.trim()} className="h-9 px-4">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
