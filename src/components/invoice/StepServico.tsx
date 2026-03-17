import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lista de códigos de tributação nacional (LC 116) — itens mais comuns
const NATIONAL_TAX_CODES = [
  { code: "01.01", desc: "Análise e desenvolvimento de sistemas." },
  { code: "01.02", desc: "Programação." },
  { code: "01.03", desc: "Processamento, armazenamento ou hospedagem de dados, textos, imagens, vídeos, páginas eletrônicas, aplicativos e sistemas de informação, entre outros formatos, e congêneres." },
  { code: "01.04", desc: "Elaboração de programas de computadores, inclusive de jogos eletrônicos, independentemente da arquitetura construtiva da máquina em que o programa será executado, incluindo tablets, smartphones e congêneres." },
  { code: "01.05", desc: "Licenciamento ou cessão de direito de uso de programas de computação." },
  { code: "01.06", desc: "Assessoria e consultoria em informática." },
  { code: "01.07", desc: "Suporte técnico em informática, inclusive instalação, configuração e manutenção de programas de computação e bancos de dados." },
  { code: "01.08", desc: "Planejamento, confecção, manutenção e atualização de páginas eletrônicas." },
  { code: "01.09", desc: "Disponibilização de conteúdos de áudio, vídeo, imagem e texto por meio da internet, respeitada a imunidade de livros, jornais e periódicos." },
  { code: "02.01", desc: "Serviços de pesquisas e desenvolvimento de qualquer natureza." },
  { code: "07.01", desc: "Engenharia, agronomia, agrimensura, arquitetura, geologia, urbanismo, paisagismo e congêneres." },
  { code: "07.02", desc: "Execução, por administração, empreitada ou subempreitada, de obras de construção civil, hidráulica ou elétrica e de outras obras semelhantes." },
  { code: "07.03", desc: "Elaboração de planos diretores, estudos de viabilidade, estudos organizacionais e outros." },
  { code: "10.01", desc: "Agenciamento, corretagem ou intermediação de câmbio, de seguros, de cartões de crédito, de planos de saúde e de planos de previdência privada." },
  { code: "10.02", desc: "Agenciamento, corretagem ou intermediação de títulos em geral, valores mobiliários e contratos quaisquer." },
  { code: "10.05", desc: "Agenciamento, corretagem ou intermediação de bens móveis ou imóveis." },
  { code: "14.01", desc: "Lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos." },
  { code: "17.01", desc: "Assessoria ou consultoria de qualquer natureza, não contida em outros itens desta lista." },
  { code: "17.02", desc: "Datilografia, digitação, estenografia, expediente, secretaria em geral, resposta audível, redação, edição, interpretação, revisão, tradução, apoio e infra-estrutura administrativa e congêneres." },
  { code: "17.04", desc: "Recrutamento, agenciamento, seleção e colocação de mão-de-obra." },
  { code: "17.05", desc: "Fornecimento de mão-de-obra, mesmo em caráter temporário." },
  { code: "17.06", desc: "Propaganda e publicidade, inclusive promoção de vendas, planejamento de campanhas ou sistemas de publicidade, elaboração de desenhos, textos e demais materiais publicitários." },
  { code: "17.19", desc: "Contabilidade, inclusive serviços técnicos e auxiliares." },
  { code: "17.20", desc: "Auditoria." },
  { code: "17.22", desc: "Assessoria, análise, avaliação, atendimento, consulta, cadastro, seleção, gerenciamento de informações, administração de contas a receber ou a pagar e em geral." },
  { code: "25.01", desc: "Funerais, inclusive fornecimento de caixão, urna ou esquife; aluguel de capela; transporte do corpo cadavérico; fornecimento de flores, coroas e outros paramentos; desembaraço de certidão de óbito; fornecimento de véu, essa e outros adornos; embalsamento, embelezamento, conservação ou restauração de cadáveres." },
  { code: "25.02", desc: "Translado intramunicipal e cremação de corpos e partes de corpos cadavéricos." },
  { code: "25.03", desc: "Planos ou convênio funerários." },
  { code: "25.04", desc: "Manutenção e conservação de jazigos e cemitérios." },
];

interface StepServicoProps {
  form: {
    service_description: string;
    tax_code: string;
    nbs_code: string;
    municipal_tax_code: string;
    issqn_exemption: boolean;
    issqn_city: string;
  };
  set: (key: string, value: string | boolean) => void;
}

function TaxCodeCombobox({ value, onChange, label, codes, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  codes: { code: string; desc: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return codes.slice(0, 30);
    const q = search.toLowerCase();
    return codes.filter(c => c.code.includes(q) || c.desc.toLowerCase().includes(q)).slice(0, 30);
  }, [search, codes]);

  const selected = codes.find(c => c.code === value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-left font-normal"
          >
            <span className="truncate">
              {selected ? `${selected.code} - ${selected.desc}` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar código..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>Nenhum código encontrado.</CommandEmpty>
              <CommandGroup>
                {filtered.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={c.code}
                    onSelect={() => { onChange(c.code); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c.code ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{c.code} - {c.desc}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function StepServico({ form, set }: StepServicoProps) {
  // Gerar códigos complementares municipais a partir do código nacional selecionado
  const municipalCodes = useMemo(() => {
    if (!form.tax_code) return [];
    return [
      { code: `${form.tax_code}.001`, desc: NATIONAL_TAX_CODES.find(c => c.code === form.tax_code)?.desc || "Serviço" },
      { code: `${form.tax_code}.002`, desc: "Outros serviços relacionados" },
    ];
  }, [form.tax_code]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <FileText className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Serviço Prestado</h2>
        <p className="text-sm text-muted-foreground">Informe os códigos fiscais e descreva o serviço</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <TaxCodeCombobox
            value={form.tax_code}
            onChange={(v) => {
              set("tax_code", v);
              set("municipal_tax_code", "");
            }}
            label="Código de Tributação Nacional *"
            codes={NATIONAL_TAX_CODES}
            placeholder="Selecione o código de tributação..."
          />

          <TaxCodeCombobox
            value={form.municipal_tax_code}
            onChange={(v) => set("municipal_tax_code", v)}
            label="Código Complementar Municipal *"
            codes={municipalCodes}
            placeholder={form.tax_code ? "Selecione o código complementar..." : "Selecione primeiro o código nacional"}
          />

          <div className="space-y-2">
            <Label>NBS</Label>
            <Input className="h-12" value={form.nbs_code} onChange={(e) => set("nbs_code", e.target.value)} placeholder="Código NBS (opcional)" />
          </div>

          <div className="space-y-3">
            <Label>O serviço prestado é um caso de: imunidade, exportação de serviço ou não incidência do ISSQN? *</Label>
            <RadioGroup
              value={form.issqn_exemption ? "sim" : "nao"}
              onValueChange={(v) => set("issqn_exemption", v === "sim")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="issqn-nao" />
                <Label htmlFor="issqn-nao" className="font-normal cursor-pointer">Não</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="issqn-sim" />
                <Label htmlFor="issqn-sim" className="font-normal cursor-pointer">Sim</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Município de incidência do ISSQN</Label>
            <Input className="h-12" value={form.issqn_city} onChange={(e) => set("issqn_city", e.target.value)} placeholder="Ex: São Paulo/SP" />
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço *</Label>
            <Textarea
              className="min-h-[120px]"
              value={form.service_description}
              onChange={(e) => set("service_description", e.target.value)}
              placeholder="Descreva detalhadamente o serviço prestado..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
