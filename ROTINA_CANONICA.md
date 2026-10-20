# Rotina canônica de ingestão — Coleoptera INPA (versão 1)

**Única fonte documental:** pasta Google Drive `1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP` → `Guias de empréstimo` → anos 2009–2026, conforme permissões da conta autenticada. O repositório GitHub e o GitHub Pages hospedam somente o código.

## Fluxo de inclusão

1. **Inventário:** listar integralmente cada pasta anual com paginação; registrar Drive File ID, nome, MIME, data de modificação e link original.
2. **Consolidação:** preferir PDF sobre DOCX para cópias do mesmo ano/número/pesquisador/tipo. Jamais fundir apenas pelo número da guia. Normalizar `DEV`/`DEVO` e `DOA`/`DOAÇÃO`.
3. **Extração autenticada:** ler o original no navegador do usuário autorizado, de maneira sequencial, em lotes de até 25. PDFs textuais e DOCX são aceitos. Imagens e PDFs sem camada textual aguardam transcrição/OCR validado; **não inventar dados**.
4. **Classificação com evidência:** ordem Coleoptera explícita no corpo taxonômico → `coleoptera`; outra ordem explícita → `other`; ambas → `mixed`; não demonstrada ou extração falha → `pending`. Família isolada nunca substitui a prova da ordem.
5. **Registro canônico:** schema `inpa.coleoptera.loan.v1`, chave composta, guia, fontes, taxonomia, movimentação, datas propostas, destino, controle de qualidade e proveniência. Datas e quantidades propostas não equivalem a fatos revisados.
6. **Auditoria:** editar a classificação e os dados de destino na guia original. Registros sem confirmação não devem entrar em estatísticas definitivas de empréstimos ou atrasos. A ação *Aplicar na sessão* marca a revisão e grava a anotação no índice em memória.
7. **Persistência Drive:** mediante autorização adicional `drive.file`, salvar **novo** `inpa-coleoptera-canonical-<timestamp>.json` na pasta raiz. O app lê automaticamente a versão mais recente ao conectar. Sem permissão de escrita, exportar JSON e arquivar manualmente no Drive. **Nunca enviar índice contendo dados pessoais ao GitHub público.**
8. **Reconciliação futura:** vincular EMP/DEV e alterações de prazo por elementos da guia e análise curatorial; nunca considerar `não apareceu DEV` como `em atraso`. `DOA`, `TRAN` e `PER` ficam separados de `EMP`.
9. **Georreferenciamento:** identificar destino apenas a partir da guia. Ausência de país/cidade significa *sem georreferenciamento*. Mapa de país é localização aproximada; coordenadas pontuais exigem revisão.
10. **Rastreabilidade:** preservação dos IDs de origem e dos arquivos alternativos, da classificação proposta, de alertas e de evidência taxonômica curta. Mudança documental exige nova revisão.

## Tratamento especial

- Arquivos históricos agregados (por exemplo, `Guias 2009.pdf`) podem conter **muitas guias** e não se tornam um único empréstimo. Exigem segmentação por página e revisão para evitar contagem incorreta.
- Ausência de camada de texto não equivale a ausência de Coleoptera.
- Registros com ordens distintas não são excluídos silenciosamente; permanecem em `mixed` para análise.
- A inclusão no **piloto Coleoptera** exige `taxonomy.classification === 'coleoptera'`. Dentro do grupo, as movimentações são contabilizadas em categorias separadas.

## Limites atuais do piloto

A extração no navegador depende de login OAuth Google e das permissões para ler os documentos. PDF.js e Mammoth são bibliotecas JavaScript externas carregadas sob demanda. Não há processamento automático em segundo plano ou reconciliação das devoluções. A classificação por texto necessita auditoria; o campo `validation.status` distingue extração de conferência humana.
