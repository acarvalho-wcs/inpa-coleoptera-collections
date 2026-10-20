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

## Acompanhamento de prazos (atualização de 20/10/2026)

O painel prioriza a **data esperada de devolução**. Para uma guia classificada como empréstimo (`EMP`), exibe a data prevista, eventual data revisada por prorrogação, dias até o vencimento e o estado de conciliação da devolução.

- **Prazo vencido · devolução não confirmada:** a data registrada terminou e a devolução ainda não foi conciliada. NÃO equivale a afirmar que o espécime está retido ou que há inadimplência comprovada.
- **Vence hoje / em até 30 dias:** possibilidade de alerta operacional, nunca interpretação de que o empréstimo segue efetivamente aberto.
- **Envio futuro:** a data de saída prevista ainda não chegou; não contabilizar como empréstimo em curso.
- **Devolução confirmada:** somente após anotação curatorial de data e documento ou referência de recebimento; preserva a prova no índice armazenado no Drive.
- **Prorrogação:** substitui o prazo operacional quando a data revisada for validada, mantendo a data original da guia.
- **Outras movimentações (DOA, TRAN, PER, DEV):** nunca entram nas contagens de vencimento de empréstimos.

Não inferir devolução, atraso ou prorrogação da ausência de um documento. Nenhum filtro altera o registro de origem. A ordenação prioriza prazos vencidos e próximos vencimentos. Sem indexação dos documentos, indicar prazo desconhecido e disponibilizar triagem por lotes.

## Ficha detalhada e mapa

Após login OAuth, o usuário pode abrir uma guia e acessar a extração estruturada com recipientes e instituições, datas, país e cidade, pesquisador, curador, solicitante, envio, quantidade e volumes, preservação, taxonomia, discriminação e observações, conforme o documento permita. Campos não obtidos permanecem **não identificados**, sem preenchimento inferencial. O site disponibiliza **texto integral extraído na sessão** e links para todos os originais PDF/Word disponíveis; o original conserva prioridade em caso de divergência. Para DOCX com dados em caixas de texto, também são lidos elementos OOXML `w:txbxContent`. O texto integral é mantido somente na memória do navegador, não no GitHub público.

O mapa agrupa as guias por país indicado, com card contendo situação do prazo, guia, família, quantidade de espécimes e botão de consulta. Países sem georreferência documentada não recebem pontos. Centros geográficos dos países **não representam** a localização de instituições.

A prévia pública contém exclusivamente quatro guias resumidas de 2026, com datas e quantidades documentais; não contém nomes de pesquisadores, contatos, arquivos originais ou links privados. A consulta integral depende de uma credencial OAuth Web no Google Cloud e da conta Google autorizada na pasta.

## Regra operacional aprovada (20/10/2026)

- Quando a guia não trouxer uma **data de devolução prevista**, mas tiver uma **data de empréstimo inequívoca**, calcular prazo de um ano civil após o empréstimo; o dashboard apresenta **estimado (+1 ano)** e mantém a data original vazia.
- Quando existir uma data expressa de devolução na guia, ela prevalece sobre a regra geral de um ano. Prorrogação curatorial validada prevalece sobre ambas.
- Datas como `02/12/2026` podem significar 2 de dezembro ou 12 de fevereiro: preservar a representação literal da guia, **não** atribuir um formato sem base, exigir **CONFERIR GUIA ORIGINAL** e evitar status de envio futuro provocado por interpretação automática.
- Arquivos de 2025 e 2026 terminados em `-DEV` indicam **devolução registrada** ao INPA; não contam como empréstimo vencido. Nunca marcar automaticamente como devolvido um `-EMP` distinto sem conciliação inequívoca.
- Em registros autenticados, **Nome** e **Solicitante** são campos distintos; extração do conteúdo documental é preferida ao nome do arquivo. Sem leitura do original, sinalizar não extraído ou a origem provisória da identificação.
- Apenas a prévia anônima fica no GitHub Pages público. Nomes completos, solicitantes, telefones, e-mails e transcrições devem ser consultados na sessão com OAuth Google autorizado e mantidos no Drive.
- O filtro de atraso é um indicador **documental provisório**. Até automatizar a conciliação de devoluções, status de atraso permanece sujeito à validação curatorial.


## Primeira triagem ampliada de 2026 (20/10/2026)

A pasta anual continha 101 arquivos (83 DOCX, 17 PDF e 1 planilha auxiliar). O recorte de Coleoptera foi ampliado de quatro para **14 guias documentais**, identificadas em textos e caixas de texto das guias originais. O índice público contém somente ano, guia, família ou táxon, contagens, país de destino, datas e observações documentais; nenhum nome, solicitante, e-mail ou ID do Drive. O índice privado detalhado foi produzido para arquivamento na pasta autorizada do Drive. Os documentos originais permanecem na fonte.

A soma das contagens dos 14 documentos é 864 espécimes, incluindo doações e devoluções; **não é o número de animais atualmente emprestados**. A guia 2026/037 reúne DEV+DOA (22 devolvidos e 10 doados); a 2026/046 reúne 10 em empréstimo e 8 em trânsito; a 2026/047 reúne 7 em empréstimo e 1 em doação. A guia 2026/024 apresenta prazo literal ambíguo `12/03/2026` e requer revisão do original. Para a guia 2026/049, sem vencimento expresso, o prazo estimado é de um ano após o envio (27/05/2027). Uma guia DOCX (2026/058) foi listada, mas não pôde ser baixada durante esta rodada; documentos sem taxonomia explícita permanecem pendentes de conferência.


## Fechamento da triagem 2026 — 20/10/2026

O inventário atual contém 101 arquivos (100 guias e 1 planilha auxiliar). Entre os documentos de guia: 83 DOCX e 17 PDF. Foram identificados 16 pares de cópias PDF/Word, deixando **84 movimentações documentais únicas**. Há **14 movimentações com Coleoptera** já cadastradas, e **70 sem evidência de Coleoptera**. Os cinco casos sem ordem explicitada passaram por revisão do conteúdo de classe e discriminação; nenhum comprovou Coleoptera. A guia 2026/058 foi recuperada e classificada como Hymenoptera. Continuar acompanhando novos documentos que venham a ser acrescentados à pasta, com deduplicação e validação antes de incorporar ao dashboard. Não converter movimentações ou estados de devolução em fatos não documentados.


## Formatação taxonômica obrigatória — todas as guias e futuras inclusões

- Preservar a grafia original e classificar os níveis de Ordem, Família, Subfamília, Gênero e Espécie sem inferir níveis ausentes.
- Exibir gêneros e epítetos específicos em itálico na lista de registros, cards do mapa, fichas das guias e HTML inicial do site. Exemplos: *Agrilus oceanicus*, *Haplocauda lata*, *Passalus lunaris* e *P. quadricollis*. Abreviações do gênero que integram binômios também recebem itálico.
- Deixar em fonte normal nomes de ordem, família e subfamília, autoria taxonômica e qualificadores como sp., spp., cf., aff., nr., indet., n., nov., sp. nov., subsp., ssp., var. e f. O epíteto após cf./aff. ou qualificador infraespecífico permanece em itálico; o qualificador é normal.
- Exemplos: *Psilocladus* sp.; *Psilocladus* spp.; *Sennius binotatus* n. sp.; *Passalus* cf. *lunaris*. NUNCA incluir sp., spp., n. sp. ou sp. n. dentro do elemento de itálico.
- Construir a formatação a partir de campos taxonômicos estruturados e já documentados. Em textos de discriminação livre, destacar apenas gêneros e binômios que constem dos campos de taxonomia; não adivinhar nomes científicos a partir de prosa, nomes de pesquisadores ou nomes de famílias.
- O itálico é somente apresentação: não modificar os dados originais nem os termos pesquisáveis. Escapar todos os valores de documento antes de inseri-los em HTML.
- Os testes devem abranger binômios, gênero abreviado, sp./spp., cf./aff., autoria, nomes de ordens e famílias, nomes em discriminações e HTML inicial pré-renderizado.
