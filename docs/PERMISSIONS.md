# Permissões e isolamento

## Consultoria

Os perfis internos usam permissões explícitas no servidor. A interface oculta ações não permitidas, mas a proteção principal permanece nas APIs.

- `OWNER` e `ADMIN`: administração integral.
- `RESPONSIBLE_TECH`: operação técnica integral, sem configurações globais.
- `CONSULTANT`: empresas, campanhas, avaliações, documentos, ações e mensagens.
- `ASSISTANT`: apoio operacional, sem emissão e assinatura.
- `REVIEWER`: revisão, moderação e emissão.
- `COMMERCIAL`: empresas, acessos e mensagens.
- `FINANCE`: leitura empresarial e comunicação.
- `READER`: leitura empresarial.

A página `/settings/users` permite convidar, suspender, reativar e reenviar convite. Suspender um integrante encerra suas sessões ativas.

## Portal da empresa

- `RH_ADMIN`: todos os recursos do portal.
- `SST`: painel, documentos, ações, evidências e mensagens.
- `MANAGER`: painel, ações, evidências e mensagens.
- `ACTION_OWNER`: ações, evidências e mensagens.
- `DIRECTOR`: painel, documentos, ações e leitura de mensagens.
- `READER`: documentos liberados.
- `AUDITOR`: painel, documentos, ações e evidências em modo de leitura.

O acesso é sempre vinculado a uma empresa específica. Conhecer um identificador ou URL não concede acesso a outra empresa.

## Arquivos

- Backups exigem `backup.manage`.
- Arquivos internos exigem vínculo com o tenant e permissão de leitura.
- O portal só acessa PDFs oficiais de documentos liberados e evidências ligadas às ações da própria empresa.
- Arquivos privados não são liberados ao portal apenas por possuírem uma URL.

## Convites e sessões

- Convites expiram em 72 horas e são armazenados apenas como hash.
- Um novo convite invalida convites pendentes anteriores para o mesmo vínculo.
- Suspensões revogam sessões existentes.
- Cada usuário mantém no máximo dez sessões ativas.
