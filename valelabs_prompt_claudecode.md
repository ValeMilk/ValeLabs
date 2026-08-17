# Prompt — ValeLabs Dashboard (Nível 2 + Nível 3)

## Contexto do sistema

Você está construindo o **dashboard de acompanhamento microbiológico** do sistema **ValeLabs**, usado internamente por uma empresa de laticínios. Os usuários são a **Diretora** e a **Supervisora de Qualidade** — elas precisam identificar de primeira olhada qual produto e microrganismo está com alta taxa de reprovação.

### Entidades relevantes para o dashboard

- **Produto** — nome, categoria (ex: IOGURTE, PROTEICO, QUEIJO, LÁCTEOS)
- **Microrganismo** — nome (ex: E. coli, Bolores e Leveduras, Coliformes 30°C, Staphylococcus aureus, Bactérias Lácticas)
- **Padrao** — por categoria + microrganismo: limite mínimo, limite máximo, unidade (ex: UFC/g), criticidade (CRÍTICO, CONFORME)
- **Analise** — produto, categoria, microrganismo, ponto de coleta, data de inoculação, data prevista de leitura, data real de leitura, resultado numérico, `statusCiclo` (inoculada | aguardando_leitura | atrasada | lida), `statusConformidade` (APROVADO | REPROVADO | PENDENTE | SEM_PADRÃO)

### Regras de negócio importantes

- Conformidade é **binária**: APROVADO ou REPROVADO. Não existe status "atenção" na conformidade.
- Uma análise está **atrasada** quando passou da data prevista de leitura sem ter sido lida.
- O resultado é comparado ao padrão vigente daquela categoria + microrganismo (limites min/max).

---

## O que construir

### Nível 2 — Dashboard principal (`/dashboard`)

**Layout geral:** página com padding lateral, fonte limpa, sem gradientes. Organizado em 3 seções verticais.

---

#### Seção 1 — KPIs (topo)

Três cards lado a lado:

| Card | Valor | Cor |
|---|---|---|
| Total de análises | contagem total | azul/neutro |
| Aprovadas | contagem de APROVADO | verde |
| Reprovadas | contagem de REPROVADO | vermelho |

Sem card de "atenção" — conformidade é binária.

---

#### Seção 2 — Mapa de calor Produto × Microrganismo

Card com tabela onde:
- **Linhas** = produtos
- **Colunas** = microrganismos
- **Células** = % de reprovação daquela combinação (reprovadas / total lidas × 100)

**Escala de cor das células por % de reprovação:**

| Faixa | Cor de fundo | Cor do texto |
|---|---|---|
| 0% | verde claro `#EAF3DE` | verde escuro `#27500A` |
| 1–25% | âmbar claro `#FAEEDA` | âmbar escuro `#633806` |
| 26–74% | vermelho claro `#F09595` | vermelho escuro `#791F1F` |
| ≥75% | vermelho forte `#E24B4A` | branco `#fff` |
| Sem análises | cinza neutro | cinza |

Células com cor (exceto 0% e cinza) são **clicáveis** e navegam para o Nível 3 (`/dashboard/detalhe?produto=X&micro=Y`).

Legenda abaixo da tabela explicando as faixas.

---

#### Seção 3 — Focos e backlog (dois cards lado a lado)

**Card esquerdo — Pares com maior reprovação:**

Lista rankeada (top 5) das combinações Produto × Microrganismo com maior % de reprovação entre as análises já lidas. Cada item mostra:
- Posição no ranking (número)
- Nome do par: `Produto × Microrganismo`
- Categoria do produto
- Barra de progresso proporcional à % (colorida conforme a faixa)
- % numérico alinhado à direita

Itens são clicáveis e navegam para o Nível 3.

**Card direito — Backlog de leituras:**

Lista de análises com `statusCiclo` = `atrasada` ou `aguardando_leitura`, ordenadas por urgência (atrasadas primeiro, depois por data prevista mais próxima). Cada item mostra:
- Badge: `Atrasada` (vermelho) ou `Aguardando` / `Vence hoje` (âmbar)
- Nome do produto
- Nome do microrganismo
- Tempo relativo (ex: "há 3 dias", "vence hoje", "amanhã")

---

### Nível 3 — Detalhe do par (`/dashboard/detalhe?produto=X&micro=Y`)

Página de detalhe aberta ao clicar em uma célula do mapa de calor ou item da lista de pares críticos.

**Topo da página:**
- Botão "← Voltar ao mapa de calor" que retorna ao Nível 2
- Título: `[Produto] × [Microrganismo]`
- Subtítulo com: categoria, padrão mínimo, padrão máximo e unidade (ex: `PROTEICO · Padrão: mín. 0 UFC/g · máx. 100 UFC/g`)

**KPIs do par (4 cards):**
- Total analisadas
- Aprovadas
- Reprovadas
- Aguardando leitura (PENDENTE)

---

#### Gráfico de evolução dos resultados

Gráfico de linha com o histórico de resultados daquele par ao longo do tempo.

**Eixo X:** data de leitura real de cada análise (ordenada cronologicamente).

**Eixo Y:** escala numérica com padding acima e abaixo dos limites — por exemplo, se o padrão for mín. 0 e máx. 100, o eixo vai de -10 a ~130 (dinâmico com base no maior resultado real). A escala deve ser calculada automaticamente com base nos dados reais: `Y_min = min(0, menor_resultado) - padding`, `Y_max = max(max_padrao, maior_resultado) + padding`.

**Linhas de padrão (horizontais, pontilhadas):**
- Linha pontilhada **verde escura** no valor do **máximo** do padrão, com label "Máx. (valor)"
- Linha pontilhada **vermelha escura** no valor do **mínimo** do padrão, com label "Mín. (valor)"
- Caso o padrão só tenha máximo (mínimo = 0 ou nulo), omitir a linha de mínimo ou desenhá-la em 0 apenas se fizer sentido visual

**Linha de resultado:**
- Cor **azul** `#2a78d6` quando o segmento está dentro da faixa (entre mín e máx)
- Cor **vermelha** `#E24B4A` quando o segmento ultrapassa máx ou fica abaixo de mín
- Pontos: **azuis** se aprovado, **vermelhos** se reprovado, com borda branca
- Tooltip ao hover: valor + unidade + status (Aprovada / Reprovada)

Análises PENDENTE (sem resultado ainda) **não aparecem** no gráfico.

---

#### Tabela histórica de análises

Tabela abaixo do gráfico, ordenada da mais recente para a mais antiga. Colunas:

| Data inoculação | Data leitura | Ponto de coleta | Resultado | Conformidade |
|---|---|---|---|---|

- Resultado: valor numérico + unidade, ou "Aguardando" se PENDENTE (cor muted)
- Conformidade: pill colorida — verde "Aprovada", vermelho "Reprovada", cinza "Pendente"
- Análises PENDENTE mostram "—" na data de leitura

---

## Observações técnicas

- Os dados virão da API já existente no ValeLabs — adaptar os endpoints conforme a estrutura do backend
- O período de referência do dashboard (últimos 30 / 90 / 180 dias) pode ser adicionado como filtro no topo, mas não é obrigatório na primeira versão
- O mapa de calor deve funcionar bem com até ~15 produtos e ~8 microrganismos sem perder legibilidade — adicionar scroll horizontal se necessário
- No gráfico do Nível 3, usar Chart.js ou Recharts conforme o stack do projeto
- O eixo Y do gráfico deve ser **dinâmico**: calcular min e max com base nos dados reais + padding, não hardcoded

