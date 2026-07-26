# Implantação e homologação na Railway

Este roteiro usa quatro recursos no mesmo projeto Railway:

- `Postgres`: banco PostgreSQL privado;
- `Web`: aplicação Next.js com domínio público;
- `Worker`: processo persistente de fila, sem domínio público e sem healthcheck HTTP;
- `Bucket`: armazenamento privado compatível com S3.

## 1. Criar o projeto e os recursos

1. Crie um projeto vazio na Railway.
2. Adicione um PostgreSQL e renomeie o serviço para `Postgres`.
3. Adicione um Storage Bucket e renomeie para `Bucket`.
4. Adicione o repositório GitHub como serviço e renomeie para `Web`.
5. Adicione o mesmo repositório novamente e renomeie para `Worker`.

O Dockerfile na raiz é usado pelos dois serviços.

## 2. Configuração do Web

Em `Web > Settings`:

- Branch: `main`;
- Config File Path: `/railway.web.toml`;
- Custom Start Command: deixe vazio;
- Networking: gere um domínio público;
- Healthcheck: `/api/health` (já definido no arquivo Web);
- Porta: deixe a Railway fornecer `PORT`.

O Web usa o `ENTRYPOINT` e o `CMD` do Dockerfile e aplica o schema quando `RUN_DB_SCHEMA_SYNC=true`.

## 3. Configuração do Worker

Em `Worker > Settings`:

- Branch: `main`;
- Config File Path: `/railway.worker.toml`;
- Não gere domínio público;
- Não configure healthcheck HTTP;
- O start command do arquivo é `sh -c './docker/entrypoint.sh npm run worker'`.
- A política do Worker é `ON_FAILURE` com até 10 reinícios, compatível com contas Free/trial e planos pagos.

No Worker, defina `RUN_DB_SCHEMA_SYNC=false` para impedir sincronização duplicada do schema.

## 4. Variáveis compartilhadas

Use referências aos serviços da Railway sempre que possível.

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
SESSION_TTL_DAYS=14
STORAGE_DRIVER=s3
S3_ENDPOINT=${{Bucket.ENDPOINT}}
S3_REGION=${{Bucket.REGION}}
S3_BUCKET=${{Bucket.BUCKET}}
S3_ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
S3_SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
S3_FORCE_PATH_STYLE=false
FILE_ENCRYPTION_KEY=CHAVE_HEXADECIMAL_ALEATORIA_DE_64_CARACTERES
WORKER_POLL_MS=2500
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
AI_PROVIDER=disabled
EMAIL_PROVIDER=disabled
NEXT_PUBLIC_APP_NAME=Plataforma SST
```

No Web:

```env
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
RUN_DB_SCHEMA_SYNC=true
```

`APP_URL` deve resolver para o domínio público HTTPS do Web. Não use `0.0.0.0`, `localhost`, domínio privado ou porta interna do contêiner; a aplicação usa essa variável como origem canônica para login, logout e demais redirecionamentos.

No Worker:

```env
APP_URL=https://${{Web.RAILWAY_PUBLIC_DOMAIN}}
RUN_DB_SCHEMA_SYNC=false
```

## 5. Primeiro administrador

Defina temporariamente no Web:

```env
SEED_TENANT_NAME=Nome da sua consultoria
SEED_TENANT_SLUG=nome-da-sua-consultoria
SEED_ADMIN_NAME=Seu nome
SEED_ADMIN_EMAIL=seu-email@exemplo.com
SEED_ADMIN_PASSWORD=UMA_SENHA_FORTE_COM_12_OU_MAIS_CARACTERES
SEED_DEMO_DATA=false
```

Depois que Web, Worker e Postgres estiverem ativos, abra uma sessão SSH no serviço Web e execute:

```bash
npm run preflight:seed
npm run db:seed
```

O seed é idempotente, mas redefine a senha do administrador quando executado novamente. Após confirmar o primeiro login, remova `SEED_ADMIN_PASSWORD` das variáveis do Web e guarde a senha em um gerenciador seguro.

## 6. Testes de homologação

1. Abra `https://SEU-DOMINIO/api/health`.
2. Confirme `ok: true`, `database: ok` e, após o primeiro heartbeat, `worker: ok`.
3. Entre com o administrador criado pelo seed.
4. Cadastre uma empresa de teste, unidade, setor, GHE e trabalhador fictício.
5. Crie uma campanha ou inspeção e confirme que o Worker processa a fila.
6. Gere um documento PDF, faça download e valide o arquivo.
7. Faça upload de uma evidência e confirme download privado pelo Bucket.
8. Reinicie Web e Worker e confirme que banco e arquivos permanecem disponíveis.
9. Revise logs e métricas antes de cadastrar clientes reais.

## 7. Regras antes da produção

- Não use dados reais durante a homologação.
- Não exponha o Worker publicamente.
- Não publique credenciais em GitHub, logs ou arquivos `.env`.
- Mantenha Web e Worker com uma réplica cada até medir consumo.
- Configure backup periódico do PostgreSQL e teste restauração.
- Só cadastre clientes reais depois que todos os testes de homologação forem aprovados.
