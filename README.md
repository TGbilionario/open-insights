# Política em X Minutos

Produto digital de informação política criado para transformar os principais acontecimentos da política presidencial brasileira em vídeos curtos, objetivos e fáceis de consumir.

A experiência é centrada em vídeo vertical, com progresso diário, conteúdos salvos, busca, categorias, fontes e transparência editorial.

Este projeto foi construído com Lovable e permanece sincronizado com o GitHub.

## Desenvolvimento

O fluxo principal do projeto é:

1. alterações no repositório GitHub;
2. commit na branch `main`;
3. sincronização com o Lovable;
4. acompanhamento e teste pelo preview.

Para desenvolvimento local:

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Análise e suposição da IA

A ferramenta possui uma camada de provedor independente. A prioridade atual é:

1. Hugging Face Inference Providers, usando `HF_TOKEN`;
2. Cerebras, se configurado como fallback;
3. modo demonstração local, se nenhum provedor estiver configurado.

O token da Hugging Face deve existir **somente como variável secreta do servidor**. Nunca coloque a chave no código, no GitHub ou no navegador.

Variáveis principais:

- `HF_TOKEN`
- `HF_MODEL` (padrão: `openai/gpt-oss-120b:groq`)
- `HF_BASE_URL` (padrão: `https://router.huggingface.co/v1`)

O sistema registra os tokens retornados pelo provedor e converte o consumo em créditos próprios do microAPP. Os valores atuais da fórmula de créditos são **provisórios** e serão recalibrados após os testes reais.

### Importante sobre o plano gratuito

A documentação atual da Hugging Face informa **US$ 0,10 por mês** em créditos de Inference Providers para contas Free, sujeito a alteração. Esses créditos são mensais, não uma franquia diária. Por isso, a renovação diária da **cota comunitária do microAPP** não deve ser confundida com a renovação dos créditos da Hugging Face: o backend deve bloquear novas análises quando o orçamento do provedor estiver esgotado.

A Hugging Face também informa que não acrescenta markup aos preços dos provedores roteados. O modelo `openai/gpt-oss-120b` está disponível em vários provedores; o projeto usa Groq explicitamente nesta etapa para manter o custo previsível durante os testes.

