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
}

export async function fetchCnpj(cnpj: string): Promise<CnpjData> {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  if (cleanCnpj.length !== 14) throw new Error("CNPJ inválido");
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
  if (!res.ok) throw new Error("CNPJ não encontrado");
  return res.json();
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
