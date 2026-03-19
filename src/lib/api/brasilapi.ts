import { fetchMunicipios } from "@/lib/api/ibge";

export interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: { codigo: number; descricao: string }[];
  codigo_municipio: number;
  /** Código IBGE 7 dígitos resolvido (preenchido por resolveIbgeCode) */
  codigo_municipio_ibge?: string;
}

export async function fetchCnpj(cnpj: string): Promise<CnpjData> {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  if (cleanCnpj.length !== 14) throw new Error("CNPJ inválido");
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
  if (!res.ok) throw new Error("CNPJ não encontrado");
  return res.json();
}

/**
 * Resolve o código IBGE de 7 dígitos a partir do nome do município + UF.
 * A BrasilAPI retorna o código SIAFI (4-5 dígitos), não o IBGE.
 */
export async function resolveIbgeCode(cityName: string, uf: string): Promise<string> {
  if (!cityName || !uf) return "";
  try {
    const municipios = await fetchMunicipios();
    const normalizado = cityName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const ufUpper = uf.trim().toUpperCase();
    const found = municipios.find(m => {
      const nomeNorm = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nomeNorm === normalizado && m.uf === ufUpper;
    });
    return found ? String(found.id) : "";
  } catch {
    return "";
  }
}

export interface CepData {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
}

export async function fetchCep(cep: string): Promise<CepData> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) throw new Error("CEP inválido");
  const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
  if (!res.ok) throw new Error("CEP não encontrado");
  return res.json();
}

export interface CnaeItem {
  id: string;
  descricao: string;
}

let cnaeCache: CnaeItem[] | null = null;

export async function fetchCnaeList(): Promise<CnaeItem[]> {
  if (cnaeCache) return cnaeCache;
  const res = await fetch("https://brasilapi.com.br/api/cnae/v1");
  if (!res.ok) throw new Error("Erro ao buscar CNAEs");
  const data: { id: string; descricao: string }[] = await res.json();
  cnaeCache = data.map((c) => ({ id: c.id, descricao: c.descricao }));
  return cnaeCache;
}
