import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield, Zap, BarChart3, FileText, Users, Building2,
  CheckCircle2, ArrowRight, ChevronDown, Star, Lock,
  Globe, Cpu, Clock, Phone, Mail, ChevronUp,
  TrendingUp, Award, Layers, RefreshCw, Database,
  ArrowUpRight, Play, Rocket
} from "lucide-react";

/* ─────────── UTM helper ─────────── */
function getUtmParams(search: string) {
  const p = new URLSearchParams(search);
  return {
    utm_source: p.get("utm_source") || undefined,
    utm_medium: p.get("utm_medium") || undefined,
    utm_campaign: p.get("utm_campaign") || undefined,
  };
}

/* ─────────── Animated counter ─────────── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.max(1, Math.floor(target / 40));
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { setVal(target); clearInterval(timer); }
            else setVal(start);
          }, 30);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ─────────── Data ─────────── */
const PLANS = [
  {
    name: "Starter",
    price: 97,
    period: "/mês",
    description: "Para escritórios iniciando a automação fiscal",
    highlight: false,
    features: [
      "1 usuário",
      "Até 3 empresas",
      "100 NFS-e / mês",
      "Certificado digital A1",
      "Painel de controle",
      "Suporte por e-mail",
      "Relatórios básicos",
    ],
    cta: "Começar Agora",
  },
  {
    name: "Professional",
    price: 197,
    period: "/mês",
    description: "Para escritórios em crescimento que precisam de escala",
    highlight: true,
    badge: "Mais Popular",
    features: [
      "Até 5 usuários",
      "Até 15 empresas",
      "500 NFS-e / mês",
      "Certificado digital A1",
      "API REST completa",
      "Importação via CSV",
      "Webhooks em tempo real",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    cta: "Quero Esse Plano",
  },
  {
    name: "Enterprise",
    price: 497,
    period: "/mês",
    description: "Para operações de alto volume com máxima automação",
    highlight: false,
    features: [
      "Usuários ilimitados",
      "Empresas ilimitadas",
      "NFS-e ilimitadas",
      "Certificado digital A1",
      "API REST + Webhooks",
      "Importação em massa",
      "Multi-filiais",
      "Gerente de sucesso dedicado",
      "SLA 99.9% uptime",
      "Onboarding white-glove",
    ],
    cta: "Falar com Especialista",
  },
];

const COMPETITORS = [
  { name: "NFe.io", price: "R$ 179", notes: "250 notas + taxa adesão R$299", limit: "Por empresa" },
  { name: "eNotas", price: "R$ 149–299", notes: "Foco em infoprodutos/Hotmart", limit: "Por empresa" },
  { name: "IntegraNotas", price: "R$ 260", notes: "API básica", limit: "Multi-emitente" },
  { name: "Omie", price: "R$ 199+", notes: "ERP completo (complexo)", limit: "Por empresa" },
  { name: "ContábilFlow", price: "R$ 97", notes: "Multi-tenant, API, CSV, Webhooks", limit: "Multi-empresa", highlight: true },
];

const FEATURES = [
  { icon: FileText, title: "NFS-e Nacional", desc: "Integração direta com o padrão nacional da Receita Federal. Sem depender de prefeituras." },
  { icon: Shield, title: "Certificado Digital A1", desc: "Upload seguro com criptografia AES-256. Validação automática de validade e dados." },
  { icon: Zap, title: "Emissão em Lote", desc: "Importe planilhas CSV ou use a API REST para emitir centenas de notas em minutos." },
  { icon: Users, title: "Multi-Tenant", desc: "Gerencie dezenas de empresas clientes em um único painel. Cada escritório com seu ambiente." },
  { icon: Globe, title: "API REST Completa", desc: "Integre com qualquer sistema. Documentação clara, webhooks em tempo real." },
  { icon: BarChart3, title: "Relatórios Inteligentes", desc: "Dashboards com métricas fiscais, status de notas, vencimentos e alertas automáticos." },
  { icon: Lock, title: "Segurança Bancária", desc: "RLS por tenant, sessão única por login, criptografia ponta a ponta. Seus dados nunca vazam." },
  { icon: RefreshCw, title: "Webhooks Real-Time", desc: "Receba notificações instantâneas de autorização, rejeição ou cancelamento de notas." },
  { icon: Database, title: "Backup Automático", desc: "Todos os XMLs autorizados são armazenados com redundância. Nunca perca um documento." },
];

const TESTIMONIALS = [
  { name: "Ricardo Mendes", role: "Sócio, Mendes Contabilidade", text: "Reduzi 80% do tempo gasto com emissão de notas. O que levava 2 dias agora leva 2 horas.", avatar: "RM" },
  { name: "Carla Souza", role: "Gerente Fiscal, CS Assessoria", text: "A integração com certificado digital é impecável. Nunca tive um sistema tão seguro e prático.", avatar: "CS" },
  { name: "André Lima", role: "CEO, Lima & Associados", text: "O multi-tenant mudou nosso jogo. Gerencio 40 empresas de um lugar só. Impensável antes.", avatar: "AL" },
];

const FAQ = [
  { q: "Preciso instalar algum software?", a: "Não. O ContábilFlow é 100% web, acessível de qualquer navegador. Sem instalação, sem atualizações manuais." },
  { q: "Como funciona o certificado digital?", a: "Você faz upload do seu certificado A1 (.pfx) pelo painel. Ele é criptografado com AES-256 e armazenado com segurança bancária. A validação de dados e validade é automática." },
  { q: "Posso migrar de outro sistema?", a: "Sim! Nosso time de onboarding cuida de toda a migração. Importamos seus dados e configuramos tudo sem parar sua operação." },
  { q: "E se eu ultrapassar o limite de notas?", a: "Você recebe um aviso e pode fazer upgrade instantâneo. Nenhuma nota é bloqueada durante o processo." },
  { q: "Tem contrato de fidelidade?", a: "Não. Todos os planos são mensais sem fidelidade. Cancele quando quiser, sem burocracia." },
  { q: "A plataforma atende à Reforma Tributária?", a: "Sim. Estamos 100% alinhados com o padrão NFS-e Nacional exigido pela Receita Federal, incluindo as mudanças da reforma." },
];

/* ─────────── COMPONENT ─────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const utm = getUtmParams(location.search);

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", company_name: "" });
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Preencha seu nome e e-mail");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      company_name: formData.company_name || null,
      plan_interest: selectedPlan,
      source: "landing_page",
      ...utm,
    });
    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
    } else {
      toast.success("Recebemos seu interesse!", { description: "Nossa equipe entrará em contato em até 24h." });
      setFormData({ name: "", email: "", phone: "", company_name: "" });
    }
    setSubmitting(false);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))/0.95] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
              <FileText className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
            </div>
            <span className="text-lg font-bold tracking-tight">ContábilFlow</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <button onClick={() => scrollTo("features")} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo("pricing")} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">Planos</button>
            <button onClick={() => scrollTo("comparison")} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">Comparativo</button>
            <button onClick={() => scrollTo("faq")} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" onClick={() => scrollTo("lead-form")}>
              Começar Grátis <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[hsl(var(--accent)/0.06)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-sm">
              <Rocket className="h-3.5 w-3.5" />
              Plataforma NFS-e Nacional — 100% cloud
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Emita notas fiscais de serviço{" "}
              <span className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(240,60%,55%)] bg-clip-text text-transparent">
                10x mais rápido
              </span>
            </h1>
            <p className="mt-6 text-lg text-[hsl(var(--muted-foreground))] sm:text-xl max-w-2xl mx-auto leading-relaxed">
              A plataforma que escritórios de contabilidade usam para gerenciar{" "}
              <strong className="text-[hsl(var(--foreground))]">dezenas de empresas</strong>, emitir em lote via{" "}
              <strong className="text-[hsl(var(--foreground))]">API e CSV</strong>, e nunca mais perder prazo fiscal.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-13 px-8 text-base font-semibold shadow-lg shadow-[hsl(var(--primary)/0.25)]" onClick={() => scrollTo("lead-form")}>
                Testar 7 Dias Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="h-13 px-8 text-base" onClick={() => scrollTo("features")}>
                <Play className="mr-2 h-4 w-4" /> Ver como funciona
              </Button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent))]" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent))]" /> Setup em 5 minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent))]" /> Sem fidelidade</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF NUMBERS ─── */}
      <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 text-center">
            {[
              { value: 5000, suffix: "+", label: "Notas emitidas" },
              { value: 150, suffix: "+", label: "Empresas gerenciadas" },
              { value: 99, suffix: ".9%", label: "Uptime garantido" },
              { value: 4, suffix: ".9★", label: "Satisfação dos clientes" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-[hsl(var(--primary))]">
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PAIN POINTS ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Cansado de perder tempo com{" "}
              <span className="text-[hsl(var(--destructive))]">processos manuais</span>?
            </h2>
            <p className="mt-4 text-lg text-[hsl(var(--muted-foreground))]">
              Se você se identifica com algum desses problemas, o ContábilFlow foi feito para você.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { emoji: "😤", title: "Emitir nota por nota no site da prefeitura", desc: "Horas perdidas em portais lentos e instáveis. Cada empresa é um login diferente." },
              { emoji: "📉", title: "Perder prazos e pagar multas", desc: "Sem alertas automáticos, notas vencem e multas se acumulam silenciosamente." },
              { emoji: "🔓", title: "Certificados espalhados em pen drives", desc: "Sem controle de validade, sem backup. Um pen drive perdido = caos total." },
            ].map(pain => (
              <div key={pain.title} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 hover:shadow-lg transition-shadow">
                <span className="text-3xl">{pain.emoji}</span>
                <h3 className="mt-4 text-lg font-semibold">{pain.title}</h3>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 sm:py-28 bg-[hsl(var(--card))]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Tudo que você precisa.{" "}
              <span className="text-[hsl(var(--primary))]">Nada que você não precisa.</span>
            </h2>
            <p className="mt-4 text-lg text-[hsl(var(--muted-foreground))]">
              Construído especificamente para escritórios de contabilidade que gerenciam múltiplas empresas.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div key={f.title} className="group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 transition-all hover:border-[hsl(var(--primary)/0.3)] hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
                  <f.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Planos & Preços</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Investimento que se paga no{" "}
              <span className="text-[hsl(var(--accent))]">primeiro mês</span>
            </h2>
            <p className="mt-4 text-lg text-[hsl(var(--muted-foreground))]">
              Compare: um funcionário para emitir notas custa R$ 2.500+/mês. O ContábilFlow faz o mesmo por uma fração.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.highlight
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--card))] shadow-xl shadow-[hsl(var(--primary)/0.1)] scale-[1.02]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.3)]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4 py-1">
                      <Star className="mr-1 h-3 w-3" /> {plan.badge}
                    </Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">R$ {plan.price}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">{plan.period}</span>
                </div>
                <ul className="mb-8 space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                  onClick={() => { setSelectedPlan(plan.name.toLowerCase()); scrollTo("lead-form"); }}
                >
                  {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section id="comparison" className="py-20 sm:py-28 bg-[hsl(var(--card))]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">Comparativo de Mercado</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Por que o ContábilFlow é{" "}
              <span className="text-[hsl(var(--primary))]">diferente</span>?
            </h2>
            <p className="mt-4 text-[hsl(var(--muted-foreground))]">
              Analisamos os principais concorrentes. Nenhum oferece o que nós oferecemos pelo mesmo preço.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                  <th className="px-6 py-4 text-left font-semibold">Plataforma</th>
                  <th className="px-6 py-4 text-left font-semibold">Preço Inicial</th>
                  <th className="px-6 py-4 text-left font-semibold">Modelo</th>
                  <th className="px-6 py-4 text-left font-semibold">Observações</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map(c => (
                  <tr
                    key={c.name}
                    className={`border-b border-[hsl(var(--border))] ${
                      c.highlight ? "bg-[hsl(var(--primary)/0.05)]" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-medium">
                      {c.name}
                      {c.highlight && <Badge className="ml-2 text-[10px]">Você está aqui</Badge>}
                    </td>
                    <td className={`px-6 py-4 font-semibold ${c.highlight ? "text-[hsl(var(--accent))]" : ""}`}>{c.price}</td>
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">{c.limit}</td>
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">{c.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
            * Preços pesquisados em março/2026. Sujeitos a alteração pelos concorrentes.
          </p>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Quem usa, <span className="text-[hsl(var(--primary))]">recomenda</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />
                  ))}
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed italic">
                  "{t.text}"
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-sm font-bold text-[hsl(var(--primary))]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LEAD CAPTURE FORM ─── */}
      <section id="lead-form" className="py-20 sm:py-28 bg-[hsl(var(--card))]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--background))] p-8 sm:p-12 shadow-xl shadow-[hsl(var(--primary)/0.05)]">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)]">
                  <Rocket className="h-7 w-7 text-[hsl(var(--primary))]" />
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Comece agora — 7 dias grátis
                </h2>
                <p className="mt-2 text-[hsl(var(--muted-foreground))]">
                  Preencha o formulário e receba acesso imediato à plataforma.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nome completo *</label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">E-mail profissional *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="voce@empresa.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">WhatsApp</label>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nome do escritório</label>
                    <Input
                      value={formData.company_name}
                      onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))}
                      placeholder="Seu escritório"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Plano de interesse</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["starter", "professional", "enterprise"].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlan(p)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          selectedPlan === p
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                            : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.3)]"
                        }`}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold shadow-lg shadow-[hsl(var(--primary)/0.25)]" disabled={submitting}>
                  {submitting ? "Enviando..." : "Quero Testar Grátis"} {!submitting && <ArrowUpRight className="ml-2 h-5 w-5" />}
                </Button>
                <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                  <Lock className="inline h-3 w-3 mr-1" />
                  Seus dados estão protegidos. Sem spam, prometemos.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Dúvidas Frequentes</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Perguntas comuns</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold pr-4">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 sm:py-28 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pronto para transformar seu escritório?
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
            Junte-se aos escritórios que já economizam horas por semana com o ContábilFlow.
            Teste grátis por 7 dias, sem compromisso.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="h-13 px-8 text-base font-semibold"
              onClick={() => scrollTo("lead-form")}
            >
              Começar Teste Grátis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
                  <FileText className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
                </div>
                <span className="font-bold">ContábilFlow</span>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Plataforma de automação fiscal para escritórios de contabilidade.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Produto</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li><button onClick={() => scrollTo("features")} className="hover:text-[hsl(var(--foreground))]">Funcionalidades</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-[hsl(var(--foreground))]">Preços</button></li>
                <li><button onClick={() => scrollTo("comparison")} className="hover:text-[hsl(var(--foreground))]">Comparativo</button></li>
                <li><button onClick={() => scrollTo("faq")} className="hover:text-[hsl(var(--foreground))]">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Empresa</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li>Termos de Uso</li>
                <li>Política de Privacidade</li>
                <li>LGPD</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Contato</h4>
              <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> contato@contabilflow.com.br</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> (11) 99999-9999</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-[hsl(var(--border))] pt-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} ContábilFlow. Todos os direitos reservados. CNPJ: 00.000.000/0001-00
          </div>
        </div>
      </footer>
    </div>
  );
}
