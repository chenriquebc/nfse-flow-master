import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointerClick, UserPlus, TrendingUp, Globe, Smartphone, Monitor, ArrowRight } from "lucide-react";

export default function AdminAnalytics() {
  const landingMetrics = [
    { label: "Visitantes Únicos", value: "—", icon: Eye, description: "Visitantes este mês" },
    { label: "Page Views", value: "—", icon: Globe, description: "Total de páginas vistas" },
    { label: "Leads Captados", value: "—", icon: UserPlus, description: "Formulários preenchidos" },
    { label: "CTR do CTA", value: "—", icon: MousePointerClick, description: "Cliques no botão principal" },
    { label: "Taxa de Conversão", value: "—", icon: TrendingUp, description: "Visitante → Trial" },
    { label: "Bounce Rate", value: "—", icon: ArrowRight, description: "Saíram sem interagir" },
  ];

  const funnelSteps = [
    { step: "Visita na Landing", count: "—", percent: "100%" },
    { step: "Clicou no CTA", count: "—", percent: "—" },
    { step: "Iniciou Cadastro", count: "—", percent: "—" },
    { step: "Completou Trial", count: "—", percent: "—" },
    { step: "Pagou (Conversão)", count: "—", percent: "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics & Marketing</h1>
          <p className="text-muted-foreground">Métricas de aquisição e funil de conversão</p>
        </div>
        <Badge variant="outline" className="text-xs">Aguardando integração</Badge>
      </div>

      {/* Landing Page KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {landingMetrics.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <m.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-bold text-muted-foreground/40">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground/60">{m.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => (
              <div key={step.step} className="flex items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{step.step}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground/40">{step.count}</span>
                      <Badge variant="outline" className="text-[10px]">{step.percent}</Badge>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/20 transition-all"
                      style={{ width: i === 0 ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Para ativar o funil, conecte o <strong>Google Analytics</strong>, <strong>Facebook Pixel</strong> ou use a <strong>API de eventos</strong> da plataforma.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Device breakdown placeholder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Desktop", icon: Monitor, percent: "—" },
                { label: "Mobile", icon: Smartphone, percent: "—" },
              ].map(d => (
                <div key={d.label} className="flex items-center gap-3">
                  <d.icon className="h-5 w-5 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground flex-1">{d.label}</span>
                  <span className="text-sm font-medium text-muted-foreground/40">{d.percent}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Fontes de Tráfego</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["Google Orgânico", "Google Ads", "Redes Sociais", "Direto", "Referência"].map(s => (
                <div key={s} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                  <span className="text-sm text-muted-foreground flex-1">{s}</span>
                  <span className="text-sm font-medium text-muted-foreground/40">—</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
