# Sistema de Gestão de Coleções – Coleoptera INPA

> **Inclusões anuais (nova arquitetura):** consulte [INCLUSAO_ANUAL.md](./INCLUSAO_ANUAL.md). O GitHub Pages gera um catálogo único `data/public-catalog.json` a partir dos 26 registros preservados de 2025–2026 e de novos arquivos `data/year-AAAA.json`. O exemplo de esquema está em [examples/year-2024.example.json](./examples/year-2024.example.json). Um novo ano não exige alteração no dashboard; não colocar documentos originais ou dados de contato no GitHub público.

Código-fonte inicial, portável e **versionado em repositório público**, do painel de consulta a guias de movimentação da Coleção Entomológica do INPA.

**Origem dos documentos:** [pasta Google Drive compartilhada](https://drive.google.com/drive/u/1/folders/1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP), subpasta `Guias de empréstimo`, anos 2009–2026. O aplicativo lê os documentos com autenticação Google e **não copia PDFs/Word para o GitHub nem para um servidor da aplicação**.

## Situação da migração (v0.1)

Este pacote reproduz a arquitetura funcional documentada na conversa, mas **não é uma exportação literal do código do site anterior**: o código-fonte original não estava acessível neste ambiente. Código mantido no repositório público `acarvalho-wcs/inpa-coleoptera-collections`. A publicação via GitHub Pages depende da ativação da fonte GitHub Actions; o OAuth Google precisa ser configurado para consultar documentos.

### Funcionalidades implementadas no pacote

- Autenticação Google OAuth no navegador, escopo **somente leitura** `drive.readonly`.
- Navegação por pastas anuais de guias, com seleção inicial de 2026 e opção de todos os anos.
- Paginação da API para pastas com mais de 100 arquivos, sem limite artificial de 100.
- Consulta e pesquisa pelo nome do pesquisador ou identificação, ano, número, tipo de movimentação e formato.
- Reconhecimento de `EMP` (empréstimo), `DEV` / `DEVO` (devolução), `DOA` (doação), `TRAN` (transferência), `PER` (permuta).
- Deduplicação **conservadora** de PDF e Word pelo conjunto ano + número + pesquisador + tipo, com preferência ao PDF e manutenção dos links originais.
- Tabela, indicadores documentais, modal de detalhes, links e download autenticado do original, exportação de metadados CSV.
- Mapa Leaflet/OSM que apresenta somente países **confirmados manualmente** na sessão. Pontos em centros aproximados dos países, sem endereços inventados.
- Validação manual de instituição, país, ordem taxonômica e família **somente em memória**, sem alteração no Drive.

### Limitações reconhecidas

- **Não foi possível extrair automaticamente o HTML ou o código do site construído anteriormente no ChatGPT Sites.** É uma implementação de continuidade, não uma cópia byte a byte.
- Ainda não há integração de backend, banco de dados ou persistência compartilhada das validações. É necessário exportar CSV antes de encerrar a sessão para reter os ajustes efetuados.
- O país e a ordem taxonômica não são inferidos do nome do pesquisador, da cidade ou da pasta. Para distinguir Coleoptera de outros grupos, será necessária a leitura estruturada e validação dos campos do documento (etapa seguinte).
- A existência de documentos `EMP` e `DEV` não basta para declarar um empréstimo aberto, vencido ou devolvido: é necessária conciliação entre remessas, quantitativos, datas e guias históricas.
- Documentos de pastas `Escaneadas` e `Internos` não entram automaticamente na consulta por ano; precisam de regras próprias antes de consolidação.
- O site está pronto para rodar localmente ou ser hospedado, **mas a conexão real com Drive exige configurar um Client ID do Google Cloud e autorizar sua origem**. O OAuth pode exigir a configuração de usuários de teste/verificação conforme a política Google.
- Não foi executado um teste ponta a ponta do login Google em um domínio publicado.

## Início rápido

Requer Node.js 20+ apenas para o servidor estático local. Sem dependências NPM.

```bash
cp config.example.js config.js
# Edite config.js com seu Client ID Google OAuth
npm start
# Abrir http://localhost:4173
```

### Configurar Google Cloud (OAuth no navegador)

1. Em [Google Cloud Console](https://console.cloud.google.com/), escolha um projeto institucional com OAuth consent screen configurado.
2. Habilite a **Google Drive API**.
3. Crie uma credencial **OAuth 2.0 Client ID**, tipo **Web application** (aplicação web).
4. Inclua em **Authorized JavaScript origins** o endereço exato usado (por exemplo `http://localhost:4173` ou o domínio HTTPS da implantação).
5. Copie o Client ID para `config.js` no campo `googleClientId`.
6. Em consentimento OAuth, adicione os pesquisadores autorizados como usuários de teste, se o projeto estiver em modo de testes. A aplicação solicita o escopo `https://www.googleapis.com/auth/drive.readonly`.
7. Conecte usando uma conta com acesso à pasta compartilhada de guias. O token fica apenas na memória da aba, nunca no código publicado ou no servidor.

> Nunca adicione arquivos institucionais, tokens OAuth, client secrets ou `config.js` ao GitHub. O **Client ID** por si só não é segredo, mas a configuração local deve permanecer separada para implantação controlada.

## Versionamento e futura publicação

- Repositório de origem (público): `acarvalho-wcs/inpa-coleoptera-collections`.
- Os documentos originais permanecem no Google Drive; não faça commit de dados institucionais, tokens ou `config.js`.
- Configure OAuth antes de testar a integração real com o Google Drive; use uma origem HTTPS autorizada no Google Cloud.
- Para disponibilizar a terceiros, implemente controle de acesso institucional apropriado, além do login Google. **O código no GitHub não equivale a um site já implantado.**
- Esta versão é um protótipo documental, não um sistema validado de empréstimos em atraso.

## Arquitetura

```text
Google Drive institucional
  └─ Guias de empréstimo / 2009 ... 2026
       └─ PDF / DOCX originais
           ↓ OAuth Google (drive.readonly)
Navegador do pesquisador autorizado
  ├─ listagem e filtro por ano
  ├─ classificação documental e PDF preferencial
  ├─ dashboard / detalhe / mapa validado
  └─ download autorizado e exportação CSV
GitHub público
  └─ somente código, testes e documentação
```

## Integridade e segurança

- Não incluir dados de exemplo de empréstimos reais no repositório.
- Não salvar tokens em `localStorage`, `sessionStorage` ou cookies da aplicação.
- Não compartilhar links de PDFs com usuários sem permissão Drive.
- Não usar números documentais como único identificador de empréstimos.
- Não computar inadimplência/prazo vencido sem conciliação.
- `robots noindex` reduz indexação, mas **não substitui** controle de acesso ao site.
- As bibliotecas Google Identity Services e Leaflet são carregadas externamente; em produção, revisar CSP e pinagem de dependências.

## Testes

```bash
npm test
```

Teste as interfaces e, com uma conta institucional, o login, as permissões, as pastas de 2026/2025 e as guias duplicadas antes de publicar uma versão operacional.


## Publicação no GitHub Pages (repositório público)

O fluxo `.github/workflows/pages.yml` publica automaticamente em commits na branch `main` (e aceita execução manual). Se o Client ID OAuth ainda não estiver configurado, publica apenas a interface, com a consulta Google Drive desativada. O build utiliza uma allowlist de oito arquivos (HTML, CSS, scripts JS, `.nojekyll` e configuração OAuth pública), nunca as guias ou tokens.

A configuração de OAuth exige cadastrar `https://acarvalho-wcs.github.io` como **Authorized JavaScript origin** da credencial no Google Cloud. O domínio de destino do GitHub Pages costuma ser `https://acarvalho-wcs.github.io/inpa-coleoptera-collections/`, mas esse link **não deve ser considerado ativo antes do deploy real ser confirmado no GitHub**.

**Restrições importantes:**

- Como o repositório agora é público, o GitHub Free permite GitHub Pages. Os arquivos de origem do Drive não são incluídos no site.
- O site e o código-fonte são públicos. O acesso às guias permanece condicionado à autenticação e às permissões do Google Drive.
- Até configurar OAuth e a origem permitida, a página será somente uma interface demonstrativa sem registros reais; não há consulta autenticada.
- O repositório é público por decisão do mantenedor; nunca adicione PDFs, DOCX, CSVs institucionais, tokens ou dados pessoais.

Para conferir o build localmente **sem publicar**:

```bash
npm test
GOOGLE_OAUTH_CLIENT_ID='CLIENT_ID_DO_GOOGLE.apps.googleusercontent.com' npm run build:pages
```

### Próximas etapas de ativação

1. Em `Settings > Pages > Build and deployment > Source`, selecionar `GitHub Actions` se necessário.
2. No Google Cloud Console, habilitar `Google Drive API` e cadastrar um `OAuth 2.0 Client ID` de aplicação Web.
3. Em `Authorized JavaScript origins`, adicionar `https://acarvalho-wcs.github.io` (sem o caminho do projeto).
4. No GitHub, em `Settings > Secrets and variables > Actions > Variables`, adicionar `GOOGLE_OAUTH_CLIENT_ID` (Client ID público, nunca um client secret).
5. Executar `Actions > Publicar site no GitHub Pages > Run workflow`, para publicar novamente com OAuth habilitado.

O URL previsto (ainda não confirmado ativo) é `https://acarvalho-wcs.github.io/inpa-coleoptera-collections/`.

## Rotina canônica de Coleoptera (v1)

O código inclui `js/canonical.js` para produzir registros auditáveis a partir dos documentos originais, `js/document-extract.js` para extrair texto PDF/DOCX no navegador autenticado e uma seção de triagem por lotes no dashboard. O usuário pode selecionar **Triagem taxonômica**, processar lotes de 25 documentos, revisar evidências e salvar um índice JSON versionado no **Google Drive** (mediante consentimento `drive.file`, sem alterar guias originais). A rotina também permite exportação local para revisão, com aviso de não publicar dados no GitHub. Veja [ROTINA_CANONICA.md](ROTINA_CANONICA.md) para o protocolo operacional e as limitações.

**Sem OAuth Google configurado, a base canônica não se popula sozinha:** o Pages publica somente a interface vazia. A indexação real ocorre depois da conexão de uma conta autorizada, por solicitação explícita do usuário no painel.


## Prévia pública em produção (outubro de 2026)

Enquanto o OAuth da API Drive não estiver configurado, o GitHub Pages exibe um **recorte público anonimizado** de quatro guias (2026/013, /020, /035, /063), verificadas diretamente nos documentos do Drive. O arquivo `data/public-preview.json` contém somente ano, número, família(s), contagem documental, tipo de movimentação e país de destino declarado. Não contém nomes de pesquisadores, IDs, documentos, URLs, e-mails, tokens, ou qualquer índice integral. **Não é uma base sincronizada:** representa exclusivamente um retrato parcial de 20/10/2026, não comprova remessas, retornos ou pendências.

Para ativar acesso aos documentos sem precisar alterar o GitHub imediatamente, clique **Conectar Google Drive** e informe o **Client ID OAuth Web** do seu projeto Google Cloud na janela de configuração. Em Google Cloud, habilite Drive API, defina a tela de consentimento e autorize `https://acarvalho-wcs.github.io` em **Authorized JavaScript origins**. Essa origem não inclui caminho `/inpa-coleoptera-collections/`. Autorize como usuários de teste as contas que consultarão o Drive. Em seguida use o login Google na própria aplicação. O Client ID é um identificador público, mantido somente na memória da aba. Os arquivos exigem permissão individual no Google Drive.

Depois, para configuração permanente entre sessões, defina a variável do repositório `GOOGLE_OAUTH_CLIENT_ID` em Settings > Secrets and variables > Actions > Variables e execute um deploy por push ou manual. **Nunca cole um Client Secret, service-account JSON ou refresh/access token na janela de configuração.**

## Controle de prazos de devolução

O dashboard prioriza a **data prevista de devolução** e o acompanhamento curatorial. Não classifica uma remessa como material comprovadamente atrasado apenas porque a data do formulário venceu. Exibe `Prazo vencido · devolução não confirmada`, diferencia envios futuros e exige **data de recebimento mais evidência documental** para confirmar a devolução. A prorrogação precisa ser incluída por revisão, preservando o prazo original da guia. O índice com a revisão deve ser salvo no Google Drive autorizado, nunca no repositório público.

A prévia pública mostra datas e quantidades de quatro guias anonimizadas de 2026 e funciona sem OAuth. A ficha completa da guia, seus contatos, detalhes taxonômicos, documentação e transcrição integral dependem de login Google. Os países no mapa usam somente coordenadas de centro de país, com cards por destino e prazo. Veja `ROTINA_CANONICA.md`.


## Primeira triagem ampliada de 2026 (20/10/2026)

A pasta anual continha 101 arquivos (83 DOCX, 17 PDF e 1 planilha auxiliar). O recorte de Coleoptera foi ampliado de quatro para **14 guias documentais**, identificadas em textos e caixas de texto das guias originais. O índice público contém somente ano, guia, família ou táxon, contagens, país de destino, datas e observações documentais; nenhum nome, solicitante, e-mail ou ID do Drive. O índice privado detalhado foi produzido para arquivamento na pasta autorizada do Drive. Os documentos originais permanecem na fonte.

A soma das contagens dos 14 documentos é 864 espécimes, incluindo doações e devoluções; **não é o número de animais atualmente emprestados**. A guia 2026/037 reúne DEV+DOA (22 devolvidos e 10 doados); a 2026/046 reúne 10 em empréstimo e 8 em trânsito; a 2026/047 reúne 7 em empréstimo e 1 em doação. A guia 2026/024 apresenta prazo literal ambíguo `12/03/2026` e requer revisão do original. Para a guia 2026/049, sem vencimento expresso, o prazo estimado é de um ano após o envio (27/05/2027). A guia DOCX **2026/058** foi posteriormente recuperada e identificada como Hymenoptera (não Coleoptera). A auditoria de 2026 abrangeu 100 arquivos de guias e uma planilha auxiliar, resultando em 84 movimentações distintas após consolidar 16 pares PDF/Word: **14 Coleoptera e 70 outros grupos**.

### Nome e Solicitante na prévia pública (2026)

Por orientação expressa do responsável pelo piloto, o site público exibe os campos profissionais **Nome (destinatário)** e **Solicitante**, transcritos das 14 guias de Coleoptera de 2026 selecionadas na triagem, na listagem, na ficha resumida e nos cards do mapa. A busca permite localizar ambos. Essa identificação é um resumo documental sujeito à conferência, e não um cadastro de empréstimos conciliado. **E-mails, telefones, endereços particulares, documentos e identificadores do Drive não são publicados.** A cópia completa das guias continua no Google Drive e exige autorização individual. O compilador está limitado a um conjunto explícito de campos aprovados e rejeita valores incompatíveis com nomes.


### Auditoria taxonômica completa da pasta 2026 (20/10/2026)

Em conferência posterior dos 100 arquivos de guia (83 DOCX + 17 PDF), foram consolidados 16 pares PDF/Word e identificadas 84 movimentações documentais distintas. Destas, **14 apresentam evidência de Coleoptera**, já representadas no conjunto `data/public-preview.json`, e **70 pertencem a outros grupos taxonômicos**. Cinco documentos sem ordem explícita foram conferidos pelo conteúdo (classe, família e material discriminado), sem evidência de Coleoptera. A planilha auxiliar não foi contabilizada como guia. Veja `data/triage-2026-audit.json`. A ausência de novas guias não autoriza presumir devoluções efetivadas. A revisão é restrita ao estado atual da pasta 2026.
