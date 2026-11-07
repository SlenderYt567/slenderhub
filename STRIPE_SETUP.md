# Stripe na ZW Store

O checkout usa **USD**, consulta preços e variantes no Supabase e cria uma sessão hospedada na Stripe. Não é necessário cadastrar manualmente os produtos na Stripe: cada sessão recebe um retrato dos preços atuais do catálogo. Preços alterados depois da abertura da sessão não alteram uma cobrança já criada.

## Proteção dos pedidos

A política de inserção foi endurecida no projeto atual: clientes só podem criar pedidos pendentes, sem marcar pagamento confirmado ou se passar por Stripe. A migração `restrict_browser_payment_confirmation` já foi aplicada. Para outros bancos, aplique `server/stripe-order-policy.sql` depois das migrações da loja. O webhook usa a chave de serviço para registrar pagamentos confirmados.

## Configuração

1. Crie um **sandbox separado** no painel Stripe para testar a integração. A conta conectada ao plugin é `zwhub.store`, atualmente em produção; a instalação do plugin não configura as credenciais da aplicação.
2. Crie uma **chave restrita** para a aplicação. Ela precisa permitir criar/consultar Checkout Sessions e acessar os recursos utilizados pelo checkout (Products, Prices e PaymentIntents). Valide as permissões no sandbox; corrija eventuais erros 403 sem liberar acesso desnecessário.
3. Configure as variáveis no projeto Vercel (use variáveis sensíveis para segredos):

   | Variável | Valor |
   | --- | --- |
   | `SITE_URL` | `https://www.zwhub.store` em produção; URL do ambiente de teste ao testar |
   | `STRIPE_SECRET_KEY` | Chave restrita do ambiente correspondente (`rk_test_…` ou `rk_live_…`) |
   | `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook, `whsec_…` |
   | `SUPABASE_URL` | URL do projeto usado pela loja |
   | `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço, somente no servidor |
   | `STRIPE_ENABLED` | `true` depois de configurar o servidor e webhook |
   | `VITE_STRIPE_ENABLED` | `true` quando estiver pronto para exibir a opção no checkout |

   O checkout hospedado não usa `VITE_STRIPE_PUBLISHABLE_KEY`. Nunca coloque uma chave restrita, secreta ou de serviço em variáveis `VITE_` ou no Git.

4. Publique o código inicialmente com os dois indicadores `STRIPE_ENABLED` e `VITE_STRIPE_ENABLED` em `false`.
5. No Workbench da Stripe, adicione um destino de webhook **snapshot** para a URL do ambiente correspondente. Em produção: `https://www.zwhub.store/api/webhooks/stripe`. Selecione estes eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`

   Use a versão de API do SDK instalado (Stripe Node 23.1.0: `2026-10-28.endive`). Copie o segredo desse destino para `STRIPE_WEBHOOK_SECRET`. A assinatura usa o corpo bruto da requisição; não use um middleware que o transforme em JSON antes da validação.
6. Habilite os dois indicadores no ambiente de teste e publique novamente. `VITE_` é incorporado durante o build. Teste o fluxo abaixo antes de repetir a configuração com credenciais de produção.

## Testes antes da ativação

- Faça login, adicione produto/variante ao carrinho e confira que a Stripe mostra preço unitário × quantidade em USD.
- Use um cartão de teste da Stripe, por exemplo `4242 4242 4242 4242`, apenas no sandbox, com validade futura e CVC de teste.
- Confira o pedido no painel da loja: pagamento confirmado, itens e usuário Roblox corretos, entrega pendente.
- Reenvie o mesmo evento pelo Workbench e confirme que continua existindo apenas um pedido e que a etapa de entrega não volta para pendente.
- Teste cancelamento, cartão recusado e confirmação atrasada. Voltar pela página de sucesso não pode confirmar pagamento por si só.
- Se a página disser que está aguardando o registro mesmo após pagar, confira a entrega do webhook. Não faça outra cobrança; corrija o erro e reenvie o evento.

`npm run dev` atualmente executa somente o frontend: as funções `api/` devem ser testadas com o runtime da Vercel ou em um deploy de teste. Use um banco de teste para testes completos: o webhook grava pedidos no banco configurado.

## Comportamento e limites

- O webhook assinado grava o pedido pago em `chat_sessions`; o identificador da sessão Stripe é a chave única. Retentativas não duplicam o pedido nem alteram entregas já realizadas.
- A página de retorno só consulta o pagamento e o registro do pedido, com verificação de titularidade. Ela não autoriza a entrega.
- A entrega permanece manual. O estoque é verificado na abertura do checkout, mas ainda não há reserva entre clientes nem baixa automática de estoque; compras simultâneas exigem controle operacional. Automatizar estoque requer uma transação no banco e um fluxo de reserva/expiração.
- Carrinhos permanecem intactos após o retorno, para não apagar alterações feitas em outra aba.
- Reembolsos e disputas devem ser acompanhados na Stripe; essa integração inicial não sincroniza esses eventos com a entrega.
- O endpoint antigo `/api/stripe-intent`, que aceitava valores fornecidos pelo navegador, foi desativado.
- Testes locais cobrem cálculo, validação, autorização, assinatura e idempotência com serviços simulados. Eles não substituem uma compra completa no sandbox.

Referências: [Checkout](https://docs.stripe.com/payments/checkout), [webhooks](https://docs.stripe.com/webhooks), [sandboxes](https://docs.stripe.com/sandboxes), [chaves restritas](https://docs.stripe.com/keys).

## Alertas preexistentes do banco

A checagem de segurança do Supabase não apontou novos alertas ligados a essa política, mas há alertas anteriores em funções de licenciamento (permissões de execução e `search_path`), na extensão `pg_net`, em `key_executions` sem políticas e na proteção contra senhas vazadas. Esses componentes não foram alterados nesta integração. Consulte [funções expostas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
