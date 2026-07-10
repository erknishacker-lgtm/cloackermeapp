# Product

## Register

product

## Users

- **Admin (louzada)**: dono da plataforma; gerencia usuários, listas globais de roteamento, domínios e vê todas as campanhas.
- **Cliente**: operador de campanhas; vê só o que criou; precisa onboarding claro (whitelist / teste) e painel simples no mobile.

## Product Purpose

Cloaker.lol é um painel + motor de roteamento anti-bot: link `/r/slug` decide URL principal vs alternativa com base em UA, IP (CIDR), headers e listas. Persistência em `store.json`. Sucesso = cliente configura campanha, testa, mede acessos, sem confusão de UI.

## Brand Personality

Operacional, confiante, limpo — “console de controle”, não marketing flashy.

## Anti-references

- SaaS creme genérico, cards idênticos em grade infinita
- WhatsApp flutuante e ruído de suporte na sidebar
- Cadastro aberto / telas que misturam admin e cliente

## Design Principles

1. **Task first** — hierarquia clara: campanhas, acessos, segurança.
2. **Role-aware** — cliente vê o mínimo; admin vê o resto.
3. **Teach once** — tutorial na 1ª entrada; depois atalho discreto.
4. **Mobile usable** — shell e formulários usáveis no telefone.
5. **No function loss** — reorganizar visual sem remover capacidades.

## Accessibility & Inclusion

Contraste legível em dark UI; `prefers-reduced-motion`; alvos de toque ≥ 44px no mobile.
