

## Plano de Implementação — 5 Melhorias na Emissão de NFS-e

### 1. Aviso ao sair do formulário de nova nota (salvar rascunho ou descartar)

**Problema:** Ao clicar no botão "Voltar" do topo ou navegar para outro menu durante o preenchimento, o rascunho é salvo silenciosamente no sessionStorage sem perguntar ao usuário.

**Solução:**
- Em `src/pages/InvoiceForm.tsx`:
  - Adicionar state `showExitDialog` para controlar um AlertDialog.
  - No botão "Voltar" do topo (linha 419), em vez de `navigate("/invoices")` direto, verificar se o formulário foi preenchido (algum campo alterado) e abrir o dialog.
  - O dialog terá 3 opções: "Salvar Rascunho" (mantém sessionStorage e navega), "Descartar" (limpa sessionStorage e navega), "Continuar Editando" (fecha dialog).
  - Usar `useBlocker` do react-router-dom para interceptar navegação via sidebar/links externos ao formulário, exibindo o mesmo dialog.

**Arquivos:** `src/pages/InvoiceForm.tsx`

---

### 2. Campos de tributação municipal livres para Simples Nacional

**Problema:** Quando a empresa é do Simples Nacional, os campos Alíquota (%), BC ISSQN e Valor ISSQN estão sendo preenchidos automaticamente, mas deveriam ficar livres para preenchimento manual.

**Solução:**
- Em `src/components/invoice/StepValores.tsx`:
  - Remover o `readOnly` do campo Valor ISSQN (linha 278) — atualmente é readOnly com valor calculado.
  - Para empresas do Simples Nacional (`tax_assessment_regime === "1"` ou `"2"`), os campos Alíquota, BC ISSQN e Valor ISSQN devem ser editáveis e iniciar vazios/zerados em vez de auto-calculados.
  - Alterar o banner informativo (linhas 171-176) para exibi-lo somente quando NÃO for Simples Nacional, ou ajustar o texto.

**Arquivos:** `src/components/invoice/StepValores.tsx`, possivelmente `src/pages/InvoiceForm.tsx` (valores default)

---

### 3. Download direto em PDF (DANFS-e) após emissão

**Problema:** Após emissão, o download DANFS-e só baixa XML. Não há geração de PDF real.

**Solução:**
- Criar uma edge function `generate-danfse` que recebe o `invoice_id`, busca os dados da nota no banco, e gera um PDF usando uma lib disponível no Deno (como jsPDF ou html-to-pdf).
- O PDF terá layout padrão DANFS-e com: dados do emitente, tomador, serviço, valores, número da nota, chave de acesso, etc.
- Em `src/pages/Invoices.tsx`, o menu "Download DANFS-e" chamará essa edge function e fará o download do blob PDF.
- Após emissão bem-sucedida no `InvoiceForm.tsx`, adicionar botão/toast com link para download do PDF.

**Arquivos:** `supabase/functions/generate-danfse/index.ts` (nova), `src/pages/Invoices.tsx`, `src/pages/InvoiceForm.tsx`

---

### 4. Coluna de número da nota fiscal na listagem

**Problema:** A coluna "Nº" mostra `invoice_number || rps_number`, mas não diferencia entre DPS e nota emitida. O número da NFS-e emitida deve ter destaque.

**Solução:**
- Em `src/pages/Invoices.tsx`, separar a coluna em duas informações:
  - Exibir o `invoice_number` como número principal quando existir (nota emitida).
  - Exibir o `rps_number` como informação secundária menor (DPS).
  - Se só houver `rps_number`, mostrar como "DPS nº X" em estilo diferenciado.

**Arquivos:** `src/pages/Invoices.tsx`

---

### 5. Bloquear emissão com plano inativo

**Problema:** Mesmo com plano inativo, o usuário consegue emitir notas.

**Solução:**
- Em `src/pages/InvoiceForm.tsx`:
  - Importar `useSubscription` e verificar `subscribed`.
  - Se não subscrito, desabilitar o botão "Salvar e Emitir" e "Salvar Rascunho", exibindo mensagem.
- Em `src/pages/Invoices.tsx`:
  - Se não subscrito, desabilitar os botões "Emitir" e "Reenviar".
- Na edge function `emit-nfse`, adicionar validação server-side: verificar se o tenant tem assinatura ativa antes de processar a emissão (proteção backend).

**Arquivos:** `src/pages/InvoiceForm.tsx`, `src/pages/Invoices.tsx`, `supabase/functions/emit-nfse/index.ts`

