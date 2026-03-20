import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";

/* ─────────── Animation helpers ─────────── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Shield, Zap, BarChart3, FileText, Users,
  CheckCircle2, ArrowRight, ChevronDown, Star, Lock,
  Globe, Cpu, Clock, Phone, Mail, ChevronUp,
  RefreshCw, Database, Play, Rocket, Menu, X,
  Calculator, ArrowUpRight,
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
function AnimatedNumber({ target, suffix = "", prefix = "", decimals = 0 }: { target: number; suffix?: string; prefix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const totalSteps = 40;
          const step = target / totalSteps;
          let current = 0;
          const timer = setInterval(() => {
            current++;
            start = Math.min(target, step * current);
            if (current >= totalSteps) { setVal(target); clearInterval(timer); }
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
  return (
    <span ref={ref}>
      {prefix}
      {decimals > 0 ? val.toFixed(decimals) : val.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

/* ─────────── Data ─────────── */
const PLANS = [
  {
    name: "Starter",
    price: 97,
    subtitle: "Seu primeiro escritório",
    highlight: false,
    features: [
      "1 usuário",
      "Até 3 empresas",
      "100 NFS-e/mês",
      "Certificado Digital A1",
      "Painel de controle",
      "Suporte por e-mail",
    ],
    economy: { hours: "5h/semana", value: "R$ 250", payback: "PAGA EM 3 DIAS" },
    cta: "Comece Grátis",
    ctaVariant: "outline" as const,
    trial: "7 dias grátis",
    ctaSecondary: "ou compare planos →",
    ctaSecondaryTarget: "pricing",
  },
  {
    name: "Professional",
    price: 197,
    subtitle: "Crescimento real. Melhor preço.",
    highlight: true,
    badge: "70% dos contadores escolhem",
    features: [
      "Até 5 usuários",
      "Até 15 empresas",
      "500 NFS-e/mês",
      "Certificado Digital A1",
      "API REST Completa",
      "Importação via CSV",
      "Webhooks real-time",
      "Relatórios avançados",
      "Suporte prioritário (2h)",
    ],
    economy: { hours: "20h/semana", value: "R$ 1.000+", payback: "PAGA EM 1 MÊS" },
    cta: "Quero Este Plano (70% escolhem) ✨",
    ctaVariant: "default" as const,
    trial: "🎁 30 dias grátis",
    ctaSecondary: "Dúvidas? FAQ →",
    ctaSecondaryTarget: "faq",
  },
  {
    name: "Enterprise",
    price: 497,
    subtitle: "Operação com escala. White-glove.",
    highlight: false,
    features: [
      "Usuários ilimitados",
      "Empresas ilimitadas",
      "NFS-e ilimitadas",
      "API REST + Webhooks",
      "Importação em massa",
      "Multi-filiais",
      "Gerente dedicado",
      "SLA 99.9% uptime",
      "Onboarding white-glove",
    ],
    economy: { hours: "60h/semana", value: "R$ 5.000+", payback: "PAGA EM 2 SEMANAS" },
    cta: "Agendar Demo com Especialista",
    ctaVariant: "outline" as const,
    trial: "Demo personalizada",
    ctaSecondary: "Falar com especialista →",
    ctaSecondaryTarget: "lead-form",
  },
];

const FEATURES = [
  { icon: FileText, title: "NFS-e Nacional", desc: "Uma nota. Todas as 20 prefeituras. 10 segundos." },
  { icon: Shield, title: "Certificado Digital A1", desc: "Certificado 100% seguro + alertas 30 dias antes do vencimento." },
  { icon: Zap, title: "Emissão em Lote", desc: "300 notas por minuto. Sem erro manual." },
  { icon: Users, title: "Multi-Tenant", desc: "50 empresas = 1 dashboard. Não × 50 abas." },
  { icon: Globe, title: "API REST Completa", desc: "Conecte seu sistema em 30 min. Sync automático." },
  { icon: BarChart3, title: "Relatórios Inteligentes", desc: "Sabe EXATAMENTE quantas notas vão perder prazo amanhã." },
  { icon: Lock, title: "Segurança Bancária", desc: "Seus dados são mais seguros que banco. Seus clientes dormem tranquilo." },
  { icon: RefreshCw, title: "Webhooks Real-Time", desc: "Saiba em tempo real quando nota é autorizada ou rejeitada." },
  { icon: Database, title: "Backup Automático", desc: "Nunca. Perde. Uma. Nota. Mesmo. Redundância geográfica." },
];

const TESTIMONIALS = [
  {
    name: "Ricardo Mendes",
    role: "Sócio, Mendes Contabilidade",
    avatar: "RM",
    quote: "Reduzi 80% do tempo = liberei 1 contador para novos clientes",
    detail: "Cada novo contador que pego rende R$ 5.000/mês. Em 2 meses já recuperei o investimento.",
    stats: "📊 10 empresas | Desde Jan/2025",
    tag: "💼 Precisamos escalar rápido",
  },
  {
    name: "Carla Souza",
    role: "Gerente Fiscal, CS Assessoria",
    avatar: "CS",
    quote: "Evitei 5 multas em 3 meses — R$ 2.790 economizados",
    detail: "Antes dormia mal sabendo que poderia perder prazos. Agora sistema avisa 10 dias antes.",
    stats: "🔐 Segurança é tudo",
    tag: "⏰ Setup: 3 minutos",
  },
  {
    name: "André Lima",
    role: "CEO, Lima & Associados",
    avatar: "AL",
    quote: "Gerencio 40 empresas de um lugar só. Impensável antes.",
    detail: "Testei Omie, eNotas — tudo cobrava por empresa. Aqui pago fixo e escalo sem medo.",
    stats: "📊 40 empresas | Desde Nov/2024",
    tag: "💰 ROI em 3 semanas",
  },
];

const FAQ = [
  { q: "Preciso instalar algum software?", a: "Não. O ContábilFlow é 100% web, acessível de qualquer navegador. Sem instalação, sem atualizações manuais." },
  { q: "Como funciona o certificado digital?", a: "Você faz upload do seu certificado A1 (.pfx) pelo painel. Ele é criptografado com AES-256 e armazenado com segurança bancária. A validação de dados e validade é automática." },
  { q: "Posso migrar de outro sistema?", a: "Sim! Nosso time de onboarding cuida de toda a migração. Importamos seus dados e configuramos tudo sem parar sua operação." },
  { q: "E se eu ultrapassar o limite de notas?", a: "Você recebe um aviso e pode fazer upgrade instantâneo. Nenhuma nota é bloqueada durante o processo." },
  { q: "Tem contrato de fidelidade?", a: "Não. Todos os planos são mensais sem fidelidade. Cancele quando quiser, sem burocracia." },
  { q: "A plataforma atende à Reforma Tributária?", a: "Sim. Estamos 100% alinhados com o padrão NFS-e Nacional exigido pela Receita Federal, incluindo as mudanças da reforma." },
  {
    q: "Qual a diferença para NFe.io ou eNotas?",
    a: "Eles cobram POR EMPRESA. Com 10 empresas, você pagaria R$ 1.790/mês no NFe.io. No ContábilFlow, paga R$ 197 fixo — independente de quantas empresas.",
    hasCta: true,
  },
  { q: "Meus dados estão seguros?", a: "Criptografia AES-256, isolamento por tenant (RLS), backup automático com redundância geográfica, e conformidade total com LGPD. Seus dados são mais seguros que em muitos bancos." },
];

const COMPETITORS_VISUAL = [
  { name: "NFe.io", cost10: 1790, cost20: 3580, note: "Cobra POR empresa. Sem API = trabalho manual = +5h/semana", color: "hsl(var(--destructive))" },
  { name: "eNotas", cost10: 1490, cost20: 2990, note: "Pula de R$149 para R$299 com features. Foco em infoprodutos.", color: "hsl(var(--warning))" },
  { name: "IntegraNotas", cost10: 2600, cost20: 5200, note: "API básica = integração cara. Suporte lento.", color: "hsl(var(--warning))" },
  { name: "Omie", cost10: 1990, cost20: 3980, note: "ERP complexo demais = 30 dias de setup. Bazuca para matar formiga.", color: "hsl(var(--muted-foreground))" },
];

/* ─────────── COMPONENT ─────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const utm = getUtmParams(location.search);

  const [formData, setFormData] = useState({ name: "", email: "" });
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState([15]);
  const [showUrgency, setShowUrgency] = useState(false);

  // Urgency tooltip after 5s
  useEffect(() => {
    const timer = setTimeout(() => setShowUrgency(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Preencha seu nome e e-mail");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("E-mail inválido");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      name: formData.name.trim(),
      email: formData.email.trim(),
      plan_interest: selectedPlan,
      source: "landing_page",
      ...utm,
    });
    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
    } else {
      toast.success("Acesso liberado! 🎉", { description: "Nossa equipe entrará em contato em até 24h." });
      setFormData({ name: "", email: "" });
    }
    setSubmitting(false);
  };

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const maxCompetitorCost = 5200;

  // Calculator values
  const numCompanies = sliderValue[0];
  const costOmie = numCompanies * 199;
  const costNfeio = numCompanies * 179;
  const costEnotas = numCompanies * 149;
  const costCf = numCompanies <= 3 ? 97 : numCompanies <= 15 ? 197 : 497;
  const savings = Math.max(costNfeio, costOmie) - costCf;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ContábilFlow</span>
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <button onClick={() => scrollTo("features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo("pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</button>
            <button onClick={() => scrollTo("comparison")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Comparativo</button>
            <button onClick={() => scrollTo("faq")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
              Entrar
            </Button>
            <Button size="sm" onClick={() => scrollTo("lead-form")} className="shadow-lg shadow-primary/25 hidden sm:inline-flex">
              Liberar Acesso Grátis <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            <button onClick={() => scrollTo("features")} className="block w-full text-left text-sm py-2 text-muted-foreground">Funcionalidades</button>
            <button onClick={() => scrollTo("pricing")} className="block w-full text-left text-sm py-2 text-muted-foreground">Preços</button>
            <button onClick={() => scrollTo("comparison")} className="block w-full text-left text-sm py-2 text-muted-foreground">Comparativo</button>
            <button onClick={() => scrollTo("faq")} className="block w-full text-left text-sm py-2 text-muted-foreground">FAQ</button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}>Entrar</Button>
            <Button size="sm" className="w-full" onClick={() => scrollTo("lead-form")}>Liberar Acesso Grátis</Button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/[0.05] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-sm">
              <Rocket className="h-3.5 w-3.5" />
              Plataforma NFS-e Nacional — 100% Cloud — Pronta para Reforma Tributária 2025
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[62px] lg:leading-[1.1]">
              Gerencie 50+ Empresas em 1 Dashboard.{" "}
              <span className="bg-gradient-to-r from-primary to-[hsl(240,60%,55%)] bg-clip-text text-transparent">
                Emita NFS-e sem Erros. Sem Multas. Sem Noites Perdidas.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-3xl mx-auto leading-relaxed">
              O único sistema que emite <strong className="text-foreground">Nota Fiscal de Serviço</strong> para{" "}
              <strong className="text-foreground">TODAS</strong> as suas empresas com{" "}
              <strong className="text-foreground">3 cliques</strong>.
              Alertas automáticos evitam multas. Integração total com sua rotina (API + CSV).
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center relative">
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-semibold shadow-xl shadow-primary/25"
                onClick={() => scrollTo("lead-form")}
              >
                ⚡ Liberar Acesso Grátis (5 min) <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-base" onClick={() => scrollTo("testimonials")}>
                <Play className="mr-2 h-4 w-4" /> Ver Demo (3 min)
              </Button>
              {/* Urgency tooltip */}
              {showUrgency && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap animate-fade-in">
                  <span className="text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full shadow-sm">
                    ⚡ 230+ contadores já começaram. Seu turno?
                  </span>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Setup em 5 minutos</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-accent" /> Sem contrato ou fidelidade</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>ISO 27001 • Criptografia LGPD • Backup automático</span>
            </div>

            {/* Social proof lines */}
            <div className="mt-10 space-y-2">
              <p className="text-sm font-medium text-foreground">
                ⭐ <strong>230+ contadores</strong> já economizaram <strong>15h/semana</strong>
              </p>
              <p className="text-sm font-medium text-accent">
                💰 <strong>R$ 2.3M em multas evitadas</strong> por alertas automáticos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF NUMBERS ─── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: 15000, suffix: "+", label: "HORAS ECONOMIZADAS", sub: "vs. emissão manual (1 nota = 8 min)", icon: "🕐" },
              { value: 2.3, suffix: "M", prefix: "R$ ", label: "EVITADOS EM MULTAS", sub: "Por alertas automáticos de prazos", icon: "💰", decimals: 1 },
              { value: 230, suffix: "+", label: "CONTADORES CONFIAM", sub: "Crescimento 40% a/a", icon: "👥" },
              { value: 4.9, suffix: "/5", label: "STARS", sub: "Mais rápido que Omie. 1/3 do preço.", icon: "⭐", decimals: 1 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xs mb-1">{s.icon}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                  <AnimatedNumber target={s.value} suffix={s.suffix} prefix={s.prefix || ""} decimals={s.decimals || 0} />
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-foreground">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>
          {/* Micro-CTA after numbers */}
          <div className="mt-8 text-center">
            <button onClick={() => scrollTo("pricing")} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
              Ver planos e economias <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── PAIN POINTS (QUANTIFIED) ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Quanto você está{" "}
              <span className="text-destructive">perdendo</span> hoje com emissão manual de NFS-e?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Fizemos as contas para você. Spoiler: é mais do que imagina.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6 sm:p-8">
              <span className="text-2xl">📌</span>
              <h3 className="mt-3 text-lg font-bold">Emitir Nota Fiscal por Nota no Site da Prefeitura</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">8 min</strong> por nota × 20 empresas = <strong className="text-foreground">160 min/dia</strong></p>
                <p>= <strong className="text-foreground">13h/semana</strong> perdidas</p>
              </div>
              <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3">
                <p className="text-xs font-bold text-destructive uppercase tracking-wide">💸 Custo Real</p>
                <p className="text-lg font-extrabold text-destructive">R$ 3.200/mês</p>
                <p className="text-xs text-muted-foreground">em tempo perdido de contador</p>
              </div>
              <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3">
                <p className="text-xs font-bold text-accent uppercase tracking-wide">✅ Com ContábilFlow</p>
                <p className="text-sm font-semibold text-foreground">Emita todas as suas NFS-e em 3 cliques</p>
                <p className="text-xs text-muted-foreground">1 nota a cada 10 segundos</p>
              </div>
              <button onClick={() => scrollTo("calculator")} className="mt-4 text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ver economia para meu escritório <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-warning/20 bg-warning/[0.03] p-6 sm:p-8">
              <span className="text-2xl">⚠️</span>
              <h3 className="mt-3 text-lg font-bold">Perder Prazos & Pagar Multas</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Multa mínima: <strong className="text-foreground">R$ 558 por nota</strong> (RFB)</p>
                <p>Contador ganha R$ 2.500 = <strong className="text-foreground">2 dias perdidos</strong> por 1 multa</p>
              </div>
              <div className="mt-4 rounded-lg bg-warning/10 px-4 py-3">
                <p className="text-xs font-bold text-warning uppercase tracking-wide">💸 Custo Real</p>
                <p className="text-lg font-extrabold text-warning">R$ 8.000/ano</p>
                <p className="text-xs text-muted-foreground">em multas evitáveis</p>
              </div>
              <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3">
                <p className="text-xs font-bold text-accent uppercase tracking-wide">✅ Com ContábilFlow</p>
                <p className="text-sm font-semibold text-foreground">Alertas 10 dias antes + checklist automático</p>
                <p className="text-xs text-muted-foreground">= ZERO multas</p>
              </div>
              <button onClick={() => scrollTo("calculator")} className="mt-4 text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ver economia para meu escritório <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 sm:p-8">
              <span className="text-2xl">🔓</span>
              <h3 className="mt-3 text-lg font-bold">Certificados Espalhados em Pen Drives</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Sem controle de validade • Sem backup</p>
                <p>Pen drive perdido = <strong className="text-foreground">perder TUDO</strong></p>
              </div>
              <div className="mt-4 rounded-lg bg-primary/10 px-4 py-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">💸 Custo Real</p>
                <p className="text-lg font-extrabold text-primary">R$ 15.000+</p>
                <p className="text-xs text-muted-foreground">reprocessamento emergencial + stress</p>
              </div>
              <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3">
                <p className="text-xs font-bold text-accent uppercase tracking-wide">✅ Com ContábilFlow</p>
                <p className="text-sm font-semibold text-foreground">Criptografados + backup automático</p>
                <p className="text-xs text-muted-foreground">+ alertas de vencimento</p>
              </div>
              <button onClick={() => scrollTo("calculator")} className="mt-4 text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ver economia para meu escritório <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 sm:py-28 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              9 Recursos de Emissão de NFS-e que{" "}
              <span className="text-primary">seu escritório precisa</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Construído especificamente para escritórios de contabilidade que gerenciam múltiplas empresas.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div key={f.title} className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          {/* CTA after features */}
          <div className="mt-12 text-center">
            <Button variant="outline" onClick={() => scrollTo("pricing")}>
              Ver planos e começar agora <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
              <span className="text-accent">primeiro mês</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Compare: um funcionário para emitir notas custa R$ 2.500+/mês. O ContábilFlow faz o mesmo por uma fração.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.highlight
                    ? "border-primary bg-card shadow-2xl shadow-primary/10 scale-[1.03] z-10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 whitespace-nowrap">
                      <Star className="mr-1 h-3 w-3" /> {plan.badge}
                    </Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">R$ {plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="mb-6 space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Economy box */}
                <div className="mb-6 rounded-lg bg-accent/10 px-4 py-3">
                  <p className="text-xs font-bold text-accent uppercase tracking-wide">💡 Economia</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {plan.economy.hours} economizadas = {plan.economy.value} de ganho
                  </p>
                  <p className="text-xs font-bold text-accent mt-0.5">({plan.economy.payback})</p>
                </div>

                {plan.trial && (
                  <p className="text-center text-sm font-semibold text-primary mb-4">{plan.trial}</p>
                )}

                <Button
                  className="w-full"
                  variant={plan.ctaVariant}
                  size="lg"
                  onClick={() => { setSelectedPlan(plan.name.toLowerCase()); scrollTo("lead-form"); }}
                >
                  {plan.cta}
                </Button>
                {/* Secondary CTA link */}
                <div className="mt-3 text-center">
                  <button
                    onClick={() => scrollTo(plan.ctaSecondaryTarget || "faq")}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {plan.ctaSecondary}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Below pricing guarantees */}
          <div className="mt-12 mx-auto max-w-2xl rounded-2xl border border-accent/20 bg-accent/[0.04] p-6 sm:p-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-foreground">
              <span>✅ 7 dias grátis sem cartão</span>
              <span>✅ Não precisa cancelar</span>
              <span>✅ Fature dia 1</span>
              <span>✅ ROI médio: 2 meses</span>
            </div>
            <div className="mt-4 pt-4 border-t border-accent/20">
              <p className="text-sm text-muted-foreground">Contador ganha <strong className="text-foreground">R$ 2.500/mês</strong></p>
              <p className="text-sm text-muted-foreground">ContábilFlow custa <strong className="text-primary">R$ 197/mês</strong></p>
              <p className="text-lg font-extrabold text-accent mt-1">Diferença: R$ 2.303 no seu bolso</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPETITOR COMPARISON ─── */}
      <section id="comparison" className="py-20 sm:py-28 bg-card">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">Comparativo de Mercado</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Por que ContábilFlow custa{" "}
              <span className="text-primary">80% menos</span> que Omie, NFe.io e eNotas?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Custo mensal para gerenciar <strong className="text-foreground">10 empresas</strong>:
            </p>
          </div>

          <div className="space-y-4">
            {COMPETITORS_VISUAL.map(c => (
              <div key={c.name} className="rounded-xl border border-border bg-background p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm sm:text-base">{c.name}</h4>
                  <span className="font-extrabold text-lg" style={{ color: c.color }}>
                    R$ {c.cost10.toLocaleString("pt-BR")}/mês
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4 mb-2">
                  <div
                    className="h-4 rounded-full transition-all duration-700"
                    style={{
                      width: `${(c.cost10 / maxCompetitorCost) * 100}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}

            {/* ContábilFlow bar */}
            <div className="rounded-xl border-2 border-primary bg-primary/[0.04] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-base sm:text-lg flex items-center gap-2">
                  🎯 ContábilFlow
                  <Badge className="bg-primary text-primary-foreground text-[10px]">Você está aqui</Badge>
                </h4>
                <span className="font-extrabold text-xl text-accent">
                  R$ 197/mês
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-4 mb-2">
                <div
                  className="h-4 rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${(197 / maxCompetitorCost) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                <span>✅ 10 empresas = R$ 197 (não R$ 1.790)</span>
                <span>✅ 50 empresas = R$ 197 (não R$ 8.950)</span>
                <span>✅ API completa + Setup 5 min</span>
                <span>✅ ROI: 2 meses 💰</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            * Preços pesquisados em março/2026. Sujeitos a alteração pelos concorrentes.
          </p>

          {/* CTA after comparison */}
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => scrollTo("calculator")}>
              <Calculator className="mr-2 h-4 w-4" /> Simular economia para meu escritório
            </Button>
          </div>
        </div>
      </section>

      {/* ─── SAVINGS CALCULATOR ─── */}
      <section id="calculator" className="py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="rounded-2xl border-2 border-primary/20 bg-card p-8 sm:p-12 shadow-xl">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Calculator className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold sm:text-3xl">🧮 Quanto você economizará?</h2>
            </div>

            <div className="mb-8">
              <label className="text-sm font-medium mb-3 block">
                Quantas empresas você gerencia? <strong className="text-primary">{numCompanies}</strong>
              </label>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Com Omie:</span>
                <span className="font-bold text-destructive">R$ {costOmie.toLocaleString("pt-BR")}/mês</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Com NFe.io:</span>
                <span className="font-bold text-destructive">R$ {costNfeio.toLocaleString("pt-BR")}/mês</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Com eNotas:</span>
                <span className="font-bold text-destructive">R$ {costEnotas.toLocaleString("pt-BR")}/mês</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-4 -mx-4">
                <span className="text-sm font-semibold text-foreground">Com ContábilFlow:</span>
                <span className="font-extrabold text-xl text-accent">R$ {costCf}/mês</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-accent/10 p-6 text-center">
              <p className="text-sm text-muted-foreground">Você economiza</p>
              <p className="text-3xl font-extrabold text-accent">
                R$ {savings.toLocaleString("pt-BR")}/mês! 🎉
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                = R$ {(savings * 12).toLocaleString("pt-BR")}/ano
              </p>
            </div>

            <Button
              size="lg"
              className="w-full mt-6 h-12 text-base font-semibold shadow-lg shadow-primary/25"
              onClick={() => scrollTo("lead-form")}
            >
              Liberar este acesso → <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Quem usa, <span className="text-primary">recomenda</span>
            </h2>
            <p className="mt-4 text-muted-foreground">Resultados reais de contadores que já migraram.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl border border-border bg-background p-6 sm:p-8 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-base font-bold text-foreground leading-snug">
                  "{t.quote}"
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed italic flex-1">
                  "{t.detail}"
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{t.stats}</span>
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{t.tag}</span>
                  </div>
                </div>
                {/* Micro-CTA below testimonial */}
                <button
                  onClick={() => scrollTo("pricing")}
                  className="mt-4 text-xs text-primary hover:underline inline-flex items-center gap-1 self-start"
                >
                  Ver resultado similar no seu caso <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LEAD CAPTURE FORM (Simplified) ─── */}
      <section id="lead-form" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl border border-primary/20 bg-card p-8 sm:p-12 shadow-xl shadow-primary/[0.05]">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Rocket className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Libere seu acesso — é grátis
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Acesso imediato sem cartão de crédito
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nome completo *</label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Seu nome"
                    required
                    maxLength={100}
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
                    maxLength={255}
                  />
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
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {p === "professional" ? "⭐ Pro" : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25" disabled={submitting}>
                  {submitting ? "Enviando..." : "Liberar Meu Acesso Grátis →"}
                </Button>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>✅ Sem spam</span>
                  <span>✅ Resposta em até 24h</span>
                  <span>✅ 230+ já se juntaram</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 sm:py-28 bg-card">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Dúvidas Frequentes</Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">Perguntas comuns</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-background">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold pr-4">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    {item.hasCta && (
                      <button
                        onClick={() => scrollTo("lead-form")}
                        className="mt-3 text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Vou testar ContábilFlow <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Seu escritório merece operar no piloto automático
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
            230+ contadores já economizam 15h/semana. Teste grátis por 7 dias.
            Se não gostar, não paga nada. Simples assim.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="h-14 px-10 text-base font-semibold"
              onClick={() => scrollTo("lead-form")}
            >
              Liberar Acesso Grátis Agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm opacity-75">
            <button onClick={() => navigate("/auth")} className="underline hover:opacity-100 transition-opacity">
              Já tem conta? Entrar →
            </button>
          </p>
          <p className="mt-2 text-sm opacity-60">Sem cartão • Sem contrato • Setup em 5 minutos</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">ContábilFlow</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Plataforma de automação fiscal para escritórios de contabilidade. Emita NFS-e com velocidade e segurança.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Preços</button></li>
                <li><button onClick={() => scrollTo("comparison")} className="hover:text-foreground transition-colors">Comparativo</button></li>
                <li><button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Termos de Uso</li>
                <li>Política de Privacidade</li>
                <li>LGPD</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Contato</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> contato@contabilflow.com.br</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> (11) 99999-9999</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ContábilFlow. Todos os direitos reservados. CNPJ: 00.000.000/0001-00
          </div>
        </div>
      </footer>
    </div>
  );
}
