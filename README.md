# Sistema de Gestão de Coleções – Coleoptera INPA

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
