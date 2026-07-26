# Matriz de verificação

## Fluxos cobertos

| Fluxo | Implementação |
|---|---|
| Login e sessão | Argon2id, cookie HTTP-only e sessão persistida |
| Multiempresa | `Tenant`, `Membership`, `Company` e `CompanyAccess` |
| Acesso do RH | Convite temporário e conta permanente vinculada à empresa |
| Campanha | Link público, QR, status e respostas anônimas |
| Questionário | Respostas objetivas, numéricas e mapa corporal |
| Vistoria | Registro por empresa/GHE e cálculos versionados |
| Documento | Tipo, seções editáveis, snapshot e revisões |
| Emissão | Job assíncrono e PDF/DOCX/XLSX |
| Assinatura | Interna, registro externo e upload de PDF assinado |
| Plano de ação | 5W2H, status, evidências e validação |
| Comunicação | Conversas, participantes, notas internas e notificações |
| Backup | Empresa/plataforma, checksum, criptografia e importação |
| Migração | Docker, PostgreSQL e storage compatível com S3 |

## Comandos de validação

```bash
npm run check
npm run typecheck
npm run build
```

`npm run check` valida sintaxe, imports relativos, JSON, estrutura relacional Prisma e testes de domínio.
