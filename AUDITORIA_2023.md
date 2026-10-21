# Auditoria documental — Coleoptera 2023

Data da rodada: 20/10/2026. Fonte: pasta anual 2023 do Google Drive institucional (78 entradas de pasta, incluindo um arquivo de teste e anexos/cópias). Esta auditoria não comprova retorno ou entrega física.

## Resultado
- Leitura textual e original de DOCX, quatro DOC legados e dois PDFs, incluindo caixas de texto OOXML.
- Dez movimentações com evidência textual explícita de Coleoptera incluídas preliminarmente em `data/year-2023.json`.
- Um índice `data/document-links.json` vincula os dez movimentos às guias originais, sendo dois com ambas as versões PDF e Word.
- 2023/005: 1.553 exemplares declarados (1.535 + 18); procedências de coleta não são destinos.
- 2023/012: 13 exemplares de Chrysomelidae em trânsito, não empréstimo regular.
- 2023/020: 49 indivíduos secos documentados, além de 64 frascos sem total individual comprovado; só 49 foram somados.
- 2023/030: 306 exemplares de Scarabaeidae (249 + 57); dez danificados já incluídos.
- 2023/033: 13 espécimes em empréstimo; verificar discriminação adicional.
- 2023/034: 91 indivíduos na discriminação, associados à guia de Fernando Vaz de Mello; a pasta contém outra guia 034 distinta e conflituosa.
- 2023/035: 19 indivíduos secos e 67 amostras em tubos (52 + 15), sem contagem de indivíduos nos tubos; documento distinto de outra guia 035 com ordem Hymenoptera e família Chrysomelidae incongruentes.
- 2023/037: dez espécimes secos e 42 microtubos, sem número de indivíduos comprovado nos microtubos.
- 2023/043: onze espécimes, PDF e DOCX do mesmo movimento.
- 2023/058: quantidade documental 484 + 124 = 608; a expressão '124 em eppendorfs' exige revisão para assegurar se 124 designa indivíduos ou recipientes.

## Pendências não publicadas como Coleoptera
- 2023/031: nome do arquivo termina DEV, mas a guia contém EMP; também registra 11 tipos e uma mistura de material úmido sem contagem definida.
- 2023/034 (outro documento): divergência entre tipo de envio escrito no formulário e campo descritivo de doação; não fundir ao 034 de Fernando Vaz de Mello.
- 2023/035 (Luciano de A. Moura): campo de ordem Hymenoptera conflita com família Chrysomelidae, com cinco espécimes. Exige revisão antes de afirmar Coleoptera.
- 2023/036: documentos de pessoas diferentes; não fundir pelo número.
- 2023/043: PDF+DOCX representam o mesmo evento, não duplicar.
- 2023/011a e 011b: pertencem a crustáceos; seus anexos não são movimentações independentes.
- Demais guias sem evidência taxonômica suficientemente específica para o piloto permanecem fora da publicação Coleoptera.

## Restrições operacionais
- Registros `preliminary` são amostras documentadas, não demonstram saldo atualmente emprestado ou atraso confirmado.
- Não foram inferidos indivíduos a partir de tubos, amostras ou lotes.
- Coordenadas são urbanas aproximadas das instituições documentadas; jamais representam local de coleta.
- O ano é o da guia, não a data do material nem sua entrega presumida.
- Contatos pessoais e URLs de documentos não são incorporados à base anual, somente ao índice de links de visualização sujeito às permissões do Drive.
- Todas as guias 2023 deverão ser revisitadas quando ocorrer conciliação longitudinal entre empréstimos e devoluções.

## Teste de publicação
`npm test && npm run build:pages`. A compilação passa a reconhecer automaticamente `data/year-2023.json`. A presença no GitHub não é, por si só, prova de implantação no Pages.
