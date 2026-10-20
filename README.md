# Sistema de Gestão de Coleções – Coleoptera INPA

Código-fonte inicial, portável e **versionado em repositório privado**, do painel de consulta a guias de movimentação da Coleção Entomológica do INPA.

**Origem dos documentos:** [pasta Google Drive compartilhada](https://drive.google.com/drive/u/1/folders/1RdZAIbK9_Hn6o2E_x-vv0HQMpUEeMSxP), subpasta `Guias de empréstimo`, anos 2009–2026. O aplicativo lê os documentos com autenticação Google e **não copia PDFs/Word para o GitHub nem para um servidor da aplicação**.

## Situação da migração (v0.1)

Este pacote reproduz a arquitetura funcional documentada na conversa, mas **não é uma exportação literal do código do site anterior**: o código-fonte original não estava acessível neste ambiente. Código mantido no repositório privado `acarvalho-wcs/inpa-coleoptera-collections`. A aplicação ainda não está publicada em domínio operacional e o OAuth Google ainda precisa ser configurado.

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

- Repositório de origem (privado): `acarvalho-wcs/inpa-coleoptera-collections`.
- Os documentos originais permanecem no Google Drive; não faça commit de dados institucionais, tokens ou `config.js`.
- Configure OAuth antes de testar o site na hospedagem pretendida; use uma origem HTTPS autorizada no Google Cloud.
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
GitHub privado
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

## GitHub Pages (sem Netlify)

A implantação será feita exclusivamente pelo GitHub Actions + GitHub Pages. **Não foi ativada automaticamente** porque a aplicação exige o Client ID OAuth da aplicação Google Web para carregar as guias com autorização individual e porque a visibilidade do site GitHub Pages é diferente da visibilidade do repositório.

1. Configure no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) um OAuth Client ID do tipo **Web application**, com origem JavaScript autorizada `https://acarvalho-wcs.github.io`.
2. Cadastre o **Client ID** (identificador público, não client secret) em **GitHub → Settings → Secrets and variables → Actions → Variables** com a chave `GOOGLE_OAUTH_CLIENT_ID`. Não adicione tokens nem client secrets ao repositório.
3. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**. Confira disponibilidade do Pages para repositórios privados no plano atual.
4. Execute manualmente **Actions → Publicar site no GitHub Pages → Run workflow**. O workflow bloqueia a publicação sem Client ID válido.
5. Teste com conta autorizada a ler o Drive. A aplicação não divulga documentos por conta própria; o navegador usa somente o token de cada usuário para consultar a API do Drive.

**Importante:** o GitHub Pages pode ficar publicamente acessível mesmo com o repositório privado. Na versão atual, usuários externos ainda podem ver a interface, mas não consultar os dados sem autorização do próprio Google Drive. Se a interface inteira precisar de acesso restrito, não ativar o GitHub Pages sem revisar a política institucional e o controle de acesso.
