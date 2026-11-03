# ADR 0010: Interface web responsiva, sem PWA

- **Status:** proposta em 03/11/2026, para o ok do Victor no PR `f3/web-plataforma`.
- **Numeração:** os ADRs de web começam em 0010 para não colidir com os do banco e da API, que estão em andamento em outra sessão (0008 e 0009 ficam reservados).
- **Origem:** o Victor pediu uma **plataforma web** que abra no computador e no celular ("via web, mas com a tela menor"), e não um app. O `docs/02` e o README ainda descrevem a interface "como PWA".

## Contexto

A interface atende o coordenador (computador), o médico (celular) e a plateia da apresentação de 17/11, que entra por **QR code, sem instalar nada**. Um PWA acrescentaria manifesto instalável, service worker e cache próprio. O requisito real é que a demonstração **não dependa de serviços externos** e tenha um plano B se a rede falhar.

## Decisão

1. **Web responsiva**: um só código, que se adapta de 320 px a 1920 px. **Sem manifesto instalável, sem service worker, sem notificação push.**
2. **Plano B sem PWA**: o modo `demo` (dados e relógio simulados, no navegador, sem chamar API) e a hospedagem sem CDN (fontes, ícones, QR code e scripts saem do próprio site). Se a rede do local cair, o build roda em `next start` num notebook, na rede local, com `NEXT_PUBLIC_DATA_MODE=demo`.
3. O `docs/02` e o README passam a dizer "web responsiva, sem PWA" na mesma mudança.

## Consequências

- Sem service worker, não há risco de a plateia ver uma **versão antiga em cache** depois do congelamento de 13/11, nem de depurar cache durante o ensaio.
- Navegar para uma rota nova **exige o servidor** (a Vercel ou o notebook). O que o modo `demo` garante é que **nenhuma chamada de API** é necessária depois que a rota carrega. Não se promete "funcionar sem internet" além disso.
- Sem instalação, o QR code leva direto ao uso, que é o pedido da apresentação.
- Se um piloto real precisar de notificação push ou uso fora de linha, reavaliar PWA ou app nativo **depois** da disciplina.

## Alternativas descartadas

- **PWA com service worker:** mais complexo, com risco de cache velho no congelamento, comportamento diferente em iOS e Android, e sem ganho para a demonstração.
- **App nativo:** fora do escopo (ADR 0004) e da disciplina.
- **Vite com React Router (alternativa do `docs/02`):** serviria à demonstração, mas perde o `proxy`, o servidor e a integração com a Vercel que já estão no ar (ADR 0007).
