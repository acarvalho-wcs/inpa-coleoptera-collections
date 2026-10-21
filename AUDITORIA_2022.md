# Auditoria canônica — Coleoptera 2022

Pasta de origem: Google Drive institucional, **Guias de empréstimo/2022**. Revisão realizada em 20/10/2026. Inventário da pasta: 99 arquivos; um documento identificado como 2025/023 arquivado fora do ano, não incorporado. Documentos originais incluem DOCX, DOC, PDF e imagem; os campos em caixas de texto Word foram extraídos sempre que disponível.

## Movimentações incorporadas ao catálogo público

| Guia | Tipo | Contagem | Evidência e ressalvas |
| --- | --- | ---: | --- |
| 2022/014 | EMP | 3 | Cerambycidae: 1 Cuicirama sp., 1 C. smithii e 1 C. fasciata; MNRJ/UFRJ, Rio de Janeiro. |
| 2022/024 | EMP | 200 | Curculionidae (Conodelinae transcrito do original); prazo 31/09/2023 é inválido, sem data de vencimento publicada. |
| 2022/032 | MIX | 14 | 3 empréstimos e 11 doações, Cerambycidae/Buprestidae; não somar a repetição de Malodon sem quantidade. |
| 2022/044 | EMP | 27 | Cerambycidae; prazo 28/06/2023 registrado; devolução não conciliada. |
| 2022/069 | EMP | 65 | Cerambycidae: discriminação 5+42+3+3+7+5; cidade do formulário (Manaus-AM) conflita com instituição UFRJ (Rio de Janeiro). |
| 2022/078 | EMP | 29 | Coleoptera com família não preenchida; UFMT sem campus definido, localização urbana de Cuiabá apenas aproximada. |

**Total dos seis registros: 338 espécimes movimentados, não um saldo de empréstimos vigentes.**

Cada registro tem fonte documental Word no índice `data/document-links.json`. Estes links permanecem sujeitos às permissões do Drive e não significam que os originais estejam hospedados no GitHub.

## Guias explicitamente retidas ou excluídas

- **002/2022**: dois Scarabaeidae, mas formulário alterna `empréstimo` e `devolução`; transação a confirmar.
- **041/2022**: menciona Coleoptera e 51 espécimes discriminados mais amostras, porém possui anotação explícita **“Cancelada, material não foi enviado”**. Não publicar como evento executado ou georreferenciar.
- **042/2022**: arquivo se chama `DEV`, mas formulário registra empréstimo de 45 Cerambycidae (42 secos + 3 em álcool). Conflito documental que requer revisão antes de publicar como empréstimo ou devolução.
- **059/2022**: 60 **amostras** em álcool de Coccinellidae, não 60 indivíduos contados. O esquema atual exige quantidade inteira de espécimes; não fabricar o número.
- **079/2022**: arquivo se chama `DEV`, mas formulário registra empréstimo de três Cerambycidae e contém uma terceira data (29/11/2023). Exige conciliação longitudinal.
- **023/2025**: arquivo fora do ano, excluído do inventário de 2022.
- **067/2022**: guia disponível apenas como JPEG. Necessita conferir taxonomia e transcrição manualmente se relevante, sem inferir pela pessoa do nome do arquivo.
- Demais guias: não apresentaram comprovação suficiente de material de Coleoptera ou pertenciam explicitamente a outros grupos na varredura dos originais.

## Regras e qualidade

1. Nunca confundir **localidade de coleta** com instituição vinculada à remessa. O georreferenciamento é urbano aproximado e está qualificado na nota de cada registro.
2. Não contar uma mesma guia em formatos diferentes duas vezes, nem juntar movimentações diferentes só por compartilharem um número.
3. Empréstimos, devoluções e doações têm categorias próprias. Uma guia composta utiliza `MIX` e componentes separados.
4. Guias canceladas não constituem movimentações executadas.
5. Prazos documentais não representam atrasos comprovados; não há conciliação de devoluções com empréstimos anteriores.
6. Os dados públicos omitem e-mails, telefones, endereços residenciais e identificadores privados, preservando apenas nomes profissionais, taxonomia, instituição, cidade e notas curatórias.

## Publicação

Arquivos: `data/year-2022.json` e `data/document-links.json`. Testes de regressão anuais: `tests/public-catalog.test.mjs`. O compilador encontra automaticamente `data/year-2022.json` e gerará cinco anos (2022–2026), com total esperado de 49 movimentos preliminares/documentais **quando os demais 43 registros permanecerem inalterados**.

A gravação na branch `main` não é confirmação de deploy concluído; verificar execução GitHub Actions e dashboard.
