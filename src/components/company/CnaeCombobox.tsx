import { useState, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown, X, Search } from "lucide-react";
import { fetchCnaeList, CnaeItem } from "@/lib/api/brasilapi";

interface CnaeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function CnaeCombobox({ value, onChange, label }: CnaeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cnaes, setCnaes] = useState<CnaeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && cnaes.length === 0) {
      setLoading(true);
      fetchCnaeList()
        .then(setCnaes)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return cnaes.slice(0, 100);
    const q = search.toLowerCase();
    return cnaes.filter((c) => c.id.includes(q) || c.descricao.toLowerCase().includes(q)).slice(0, 100);
  }, [cnaes, search]);

  const selected = cnaes.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10 text-left">
          <span className="truncate text-sm">
            {selected ? `${selected.id} - ${selected.descricao}` : label || "Selecione o CNAE..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum CNAE encontrado</p>
          ) : (
            <div className="p-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
                    value === c.id ? "bg-accent font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">{c.id}</span>
                  <span className="truncate">{c.descricao}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface CnaeMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function CnaeMultiSelect({ values, onChange }: CnaeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cnaes, setCnaes] = useState<CnaeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && cnaes.length === 0) {
      setLoading(true);
      fetchCnaeList()
        .then(setCnaes)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return cnaes.slice(0, 100);
    const q = search.toLowerCase();
    return cnaes.filter((c) => c.id.includes(q) || c.descricao.toLowerCase().includes(q)).slice(0, 100);
  }, [cnaes, search]);

  const toggle = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
    }
  };

  const selectedItems = cnaes.filter((c) => values.includes(c.id));

  return (
    <div className="space-y-2">
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs gap-1">
              {c.id}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggle(c.id)} />
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10 text-left">
            <span className="truncate text-sm text-muted-foreground">Adicionar CNAE secundário...</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar CNAE..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum CNAE encontrado</p>
            ) : (
              <div className="p-1">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
                      values.includes(c.id) ? "bg-accent font-medium" : ""
                    }`}
                    onClick={() => toggle(c.id)}
                  >
                    <span className="font-mono text-xs text-muted-foreground mr-2">{c.id}</span>
                    <span>{c.descricao}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
