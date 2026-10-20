# Homologação das guias Coleoptera de 2025

Este diretório é **somente preparação**, fora do pacote do GitHub Pages.

## Inventário e revisão
- 94 arquivos: 81 DOCX e 13 PDF, na pasta anual de 2025 do Drive.
- 13 pares com taxonomia equivalente (12 pares por nome + a guia 026, cujo PDF omite o sufixo EMP).
- 81 movimentações documentais conservadoras; duas guias diferentes usam o número 027.
- 12 candidatos com indícios de Coleoptera; só a guia SBPC-UFRPE contém a palavra da ordem em sua discriminação, e nela há várias ordens (28 de 116).
- Evidência de famílias/gêneros atribuídos a Coleoptera nos demais 11 candidatos; classificação **não homologada**.
- Não afirmar que houve atraso ou devolução do empréstimo sem conciliação documental.
- O material do Drive tem campos em caixas de texto DOCX ausentes na extração do conector. Nenhuma data, instituição, país ou destinatário foi inventado.
- Nomes de pesquisadores, IDs privados de origem e contatos não aparecem na base preliminar. Os links de fonte são protegidos pelas permissões do Drive.

## Publicação

1. Validar todas as caixas de texto e tabelas nos 12 candidatos usando o DOCX/PDF original, preferencialmente via extrator OOXML do navegador autenticado.
2. Conferir registros sem taxonomia demonstrada antes de fechar a auditoria negativa dos demais 69 movimentos.
3. Confirmar movimentações (EMP, DEV, TRAN), especialmente 062 EMP/DEV, 027 com número compartilhado, e 040/041 (não fundir).
4. Verificar quantitativos, datas, destinatário, solicitante, instituição, país, e precisão de georreferência exclusivamente pelos documentos.
5. Produzir JSON público no schema `public-anonymized-preview` **somente para registros homologados**. Este arquivo staging não atende ao schema publicável e não entra na allowlist de build.
6. Executar os testes e atualizar `data/public-preview.json` apenas após a conclusão das verificações. Manter os registros de 2026 inalterados.

Arquivos: `2025-triage-audit.json` (inventário e pendências) e `2025-publication-candidates.json` (dados propostos, **não publicar**).
