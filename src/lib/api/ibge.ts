export interface MunicipioIBGE {
  id: number;
  nome: string;
  uf: string;
}

let municipiosCache: MunicipioIBGE[] | null = null;

export async function fetchMunicipios(): Promise<MunicipioIBGE[]> {
  if (municipiosCache) return municipiosCache;
  const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome");
  if (!res.ok) throw new Error("Erro ao buscar municípios");
  const data = await res.json();
  municipiosCache = data.map((m: any) => ({
    id: m.id,
    nome: m.nome,
    uf: m.microrregiao?.mesorregiao?.UF?.sigla || "",
  }));
  return municipiosCache!;
}

export function searchMunicipios(list: MunicipioIBGE[], query: string): MunicipioIBGE[] {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return [];
  return list.filter(m => 
    m.nome.toLowerCase().includes(q) || 
    `${m.nome}/${m.uf}`.toLowerCase().includes(q) ||
    String(m.id).includes(q)
  ).slice(0, 30);
}
