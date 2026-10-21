# Auditoria canônica de 2024 — Coleoptera INPA

Inventário consultado em 20/10/2026 a partir da pasta anual 2024 do Google Drive. Esta nota de auditoria **não é entrada pública do catálogo nem prova de recebimento físico**.

- 96 arquivos na pasta; um arquivo identificado pelo nome como guia de 2023, a revisar na pasta de origem.
- Uma dupla PDF/Word da guia 2024/089, relacionada a outra ordem. Números alfanuméricos e tipos distintos não são deduplicados por número isoladamente.
- Primeira leitura das 96 entradas documentais, com exame de campos OOXML em caixas de texto de candidatos e casos ambíguos.
- 7 movimentos de Coleoptera preparados e inseridos em `data/year-2024.json`: 007, 015, 019, 037, 041, 048a e 073; 557 espécimes de Coleoptera ao somar os subconjuntos apresentados.
- Todos permanecem em estado preliminar. A conciliação de devoluções com empréstimos de anos anteriores **não foi executada**.

## Pendências prioritárias

- **018/2024**: devolução com 219 espécimes e anotação de 14 doados ao INPA; confirmar se os doados estão incluídos no total ou são adicionais antes de criar os componentes da movimentação.
- **075/2024**: título do arquivo contém DEV e anotação `DEVOLVIDO!`, mas formulário descreve EMP e data prevista; é necessário esclarecer o evento e vínculo à devolução antes de publicar movimentação.
- **090/2024**: guia com empréstimo e devolução, 33 Cerambycidae, 153 frascos e 2 tipos de Euglossa; total e unidades incompatíveis com o campo numérico da guia. Não converter frascos em espécimes nem somar lotes como indivíduos.
- **048b/2024**: 19 insetos para exposição, sem discriminação de Coleoptera; não incluir como Coleoptera sem prova taxonômica.
- **019/2024**: guia classificada como 2024, com data literal 22/March/2026; publicada apenas a fração de 17 Coleoptera (36 insetos no documento), mantendo data vazia.
- **041/2024**: 10 Coleoptera de 12 espécimes (2 Hemiptera excluídos); devolução sem quitação reconciliada.
- **073/2024**: 28 Coleoptera de 116 insetos em material de exposição; trata-se de trânsito, não empréstimo vigente.
- **015/2024**: 404 espécimes no campo total e ordem Coleoptera explícita; detalhamento taxonômico remete à tabela interna do original.

## Regras aplicadas

Os registros públicos contêm apenas destinatário/solicitante profissional da guia, família/táxons, movimentação, número de Coleoptera, instituição e coordenada urbana aproximada. Não trazem e-mail, contato, documento original ou identificador privado de arquivo do Drive. País ou instituição vinculada a devolução não devem ser interpretados como rota física nem como confirmação de envio/recebimento.

As bases legadas `data/preliminary-2025.json` e `data/public-preview.json` permanecem separadas e não foram alteradas nesta rodada. O compilador do GitHub Pages deve validar o novo arquivo `data/year-2024.json` no próximo workflow.
