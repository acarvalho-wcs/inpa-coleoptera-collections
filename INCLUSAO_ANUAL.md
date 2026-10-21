# Inclusão canônica de novos anos — Coleoptera INPA

## Arquitetura de publicação

O site usa um **único catálogo público compilado**: `data/public-catalog.json`, gerado automaticamente pelo GitHub Actions no build do Pages. Este arquivo **não deve ser editado à mão**. O dashboard, seus filtros, detalhes e mapa leem esse mesmo arquivo; a tabela inicial também é gerada com os dados compilados, para que os anos não desapareçam em erros de carregamento.

Origens atualmente preservadas e não modificadas:
- `data/public-preview.json`: 14 registros documentais de 2026 (adaptador legado).
- `data/preliminary-2025.json`: 12 movimentações de 2025 (adaptador legado).
- `data/year-AAAA.json`: novos anos, um arquivo por ano, validados pelo esquema `inpa.coleoptera.public-year.v1`.

A pasta `data/staging/` **não entra no build público**. Originais DOCX/PDF, e-mails, telefone, links privados e identificadores internos devem permanecer no Drive autorizado. **O site e o repositório público divulgam nomes profissionais do destinatário e do solicitante quando já autorizados para a prévia documental**; não inclua dados de contato ou informações não documentadas.

## Procedimento canônico para um novo ano (ex.: 2024)

1. Inventariar todas as guias da pasta do ano no Drive (nomes, IDs internos, formatos e movimentações). Recuperar PDF e DOCX, **inclusive caixas de texto OOXML**; não interpretar a ausência de texto extraído como ausência documental.
2. Agrupar cópias PDF/Word somente quando número, ano, pessoa e movimentação coincidirem. Um mesmo número pode corresponder a pessoas diferentes; não juntar empréstimo e devolução, nem componentes diferentes de uma guia composta.
3. Classificar Coleoptera por evidência taxonômica do conteúdo. Marcar explicitamente `preliminary` quando a revisão integral estiver pendente; não presumir homologação.
4. Transcrever Nome, Solicitante, táxons, quantidade, data e tipo da movimentação, preservando a discriminação literal e o resumo estruturado. Conferir somas. Para empréstimo/doação ou empréstimo/trânsito, usar `type: MIX` e dividir `components` pelas quantidades documentadas.
5. Georreferenciar a instituição documentada com coordenadas aproximadas e `role: recipient` ou `linked_institution`. Para devoluções, não afirmar que é o destino físico. Nunca confundir local de coleta com destino da guia.
6. Criar `data/year-2024.json` a partir do **exemplo fictício** `examples/year-2024.example.json`, substituindo todos os campos pelos dados validados. Não incluir campos extras, dados pessoais privados ou links das guias.
7. Fazer o commit na branch `main`. O workflow valida e compila automaticamente todos os anos, sem alterar arquivos de 2025 e 2026 ou o código do dashboard. Falhas nos testes impedem o deploy.
8. Verificar a execução do GitHub Actions e a prévia publicada. Não interpretar presença no repositório como prova de implantação.

**Não há contagem fixa por ano**. A base pode crescer conforme os registros sejam homologados.

## Modelo — `data/year-AAAA.json`

- `kind`: valor fixo `inpa.coleoptera.public-year.v1`
- `year`: ano de quatro dígitos
- `records`: lista de guias ou movimentações documentais, sem limite de 12 ou 14
- `id`: identificador estável **dentro do arquivo anual**, sem IDs do Drive
- `number`: guia, aceitando sufixo como `007a`
- `type`: `EMP`, `DEV`, `DOA`, `TRAN`, `PER` ou `MIX`
- `specimenCount`: soma inteira não negativa das quantidades de `components`
- `components`: lista de partes `{type,specimenCount}`; uma parte para movimento simples, duas ou mais partes com tipos distintos para `MIX`
- `family`: resumo taxonômico sem inferência além da guia
- `recipient` e `requestedBy`: campos transcritos e permitidos para publicação
- `taxa`: `order: Coleoptera`, listas de famílias/subfamílias/gêneros/espécies e `discrimination`
- `reviewStatus`: `reviewed` ou `preliminary`
- `note`: ressalva clara, sem e-mails ou URL
- `sentDate`, `dueDate`: ISO `AAAA-MM-DD` ou `null` quando ausente/ambíguo
- `dueSource`: `document`, `one_year`, `missing`, `not_applicable`, `ambiguous_document` ou `extension`. Não calcular automaticamente um prazo para registro preliminar
- `destination`: instituição, cidade, país, latitude, longitude, `precision`, `role` e `note`, com distinção entre ponto institucional e destino físico

A validação bloqueia campos desconhecidos, informações de contato, datas inválidas, coordenadas fora de faixa, movimentos duplicados, totais incompatíveis, prazos indevidos e componentes sem classificação.

## Arquivos de implementação

- `js/public-catalog.js`: validação central + adaptadores legados + normalização.
- `scripts/build-pages.mjs`: coleta `data/year-AAAA.json`, verifica cada arquivo, gera catálogo único e inclui no Pages.
- `scripts/render-public-preview.mjs`: renderização inicial do catálogo, inclusive sem JavaScript.
- `js/app.js`: leitura do catálogo único com anos dinâmicos.
- `tests/public-catalog.test.mjs`: cenários de ano adicional, mistos, privacidade, duplicação e preservação dos 26 registros.

**Escopo**: esta migração melhora publicação/validação de arquivos anuais curados. A extração dos documentos originais ainda depende da pasta Google Drive e do processo documental; nenhum processo de extração ou varredura automática em segundo plano foi ativado.
