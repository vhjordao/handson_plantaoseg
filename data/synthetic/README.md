# Ficha do componente: dados sintéticos

- **Frentes:** A1 (gerador) e A2 (análise). Código em `services/matching-api/app/synthetic`; contrato em [docs/dados/dicionario-de-dados.md](../../docs/dados/dicionario-de-dados.md).
- **Tudo é simulação.** Nome, CRM, telefone, coordenadas e valores são inventados e não têm validade médica ou legal.

## 1. O que é e qual dor resolve

Um mundo simulado de **pronto-socorros de hospitais privados** (ADR 0001): 3 hospitais fictícios de uma rede, 300 médicos de clínica médica e pediatria, 12 meses de vagas noturnas e de fim de semana, e o histórico de ofertas de um processo manual (a coordenação chama médicos em cascata, sem checar a jornada). Existe porque ainda não há dado real nem entrevistas; permite desenvolver, testar e medir o motor sem expor ninguém.

## 2. Como funciona

Parâmetros em [`params.json`](params.json) e semente fixa (`20261030`) → gerador → 10 tabelas em CSV, manifesto com checksums e relatório de qualidade. As respostas dos médicos seguem uma probabilidade verdadeira (`truth.py`): aceite cai com a distância e com a fadiga, sobe com a preferência de período e com a confiabilidade latente; o comparecimento fica entre 90% e 99%.

## 3. Como foi feito

1. Dicionário de dados primeiro; depois as tabelas como `dataclass` na mesma ordem das colunas (`app/models.py`).
2. Cadastro: médicos com zona, raio, preferência, especialidade secundária e janelas semanais de disponibilidade (inclusive janelas parciais e dias bloqueados).
3. Vagas: noturnas todos os dias e diurnas só no fim de semana, por hospital e especialidade.
4. Pedidos em texto livre em 5 estilos (formal, abreviado, com erros, ambíguo e adversarial) com gabarito.
5. Cascata do processo manual: sorteio ponderado por proximidade, exposição e "dobra" (quem já está no hospital); o médico responde conforme a probabilidade verdadeira.
6. `HISTORICAL_BIAS_SCENARIO` ligado: zonas centrais e a faixa de 35 a 44 anos recebem mais ofertas sem que o aceite dependa do grupo (risco do exemplo de recrutamento).
7. Oito regras de qualidade, manifesto e uma amostra pequena e íntegra.

## 4. Código-chave

| Arquivo | O que faz |
| --- | --- |
| `synthetic/params.py` | Parâmetros padrão e leitura do `params.json` |
| `synthetic/truth.py` | Probabilidade verdadeira de aceite e comparecimento (o "mundo") |
| `synthetic/generator.py` | Gera as tabelas, grava os CSV, o manifesto e a amostra |
| `synthetic/texts.py` | Pedidos em texto livre e os 10 tipos de ataque |
| `synthetic/quality.py` | Regras de qualidade e relatório |

## 5. Ferramentas e versões

Python 3.12 (biblioteca padrão: `random`, `csv`, `json`, `hashlib`). Sem Faker, pandas ou numpy: nomes saem de listas fixas e a geração leva cerca de meio segundo. Custo zero.

## 6. Como rodar e testar

```
make seed                  # ou: python -m app.cli seed --report ../../docs/dados/relatorio-de-qualidade.md --sample ../../data/synthetic/sample
python -m pytest tests/test_synthetic.py
```

Saída em `data/synthetic/out/` (ignorada pelo Git; qualquer um regenera). `sample/` traz um conjunto **pequeno e íntegro** (40 médicos, duas semanas) para testar sem gerar tudo, sem a tabela de gabarito.

## 7. Testes e resultados

Mesma semente e mesmos arquivos (testado e conferido na CI em Linux contra a máquina do autor), 8 regras de qualidade sem violação e nenhuma vaga com campo de pagamento. Volumes e indicadores em [docs/dados/relatorio-de-qualidade.md](../../docs/dados/relatorio-de-qualidade.md): 2.448 vagas, 7.555 ofertas, aceite de 30,8%, 4,8% de vagas sem cobertura e 1,3% de aceites que violam a jornada.

## 8. Dados e segurança

`crm_sim` sempre com prefixo `SIM`, telefone `+55 00 ...`, nomes de lista fixa: nada pode ser confundido com dado real (regra de qualidade). A tabela `doctors_latent` (gabarito do simulador) nunca vai ao modelo, ao LLM nem à amostra. Valor do plantão fica em `shift_compensation`, separado.

## 9. Limitações e honestidade

- Os parâmetros são **premissas do projeto**, sem fonte externa; o tempo até preencher a vaga é simulado e **não** é linha de base real.
- Como os rótulos nascem do simulador, qualquer modelo bom aqui só mostra que aprendeu o simulador.
- Só se observa a resposta de quem foi chamado (viés de seleção).
- Os textos de vaga vêm de modelos; o acerto da extração em texto real é desconhecido.
- A taxa de violações de jornada (1,3%) é **resultado da simulação** com as premissas de "dobra", não a premissa de 3% do dicionário v0.

## 10. Uso de IA no desenvolvimento

Gerador, testes e relatório escritos pelo Claude Code e revisados pelo Victor. A simulação das dobras foi acrescentada depois que a primeira versão mostrou zero violações de jornada (sem elas, o filtro não teria o que barrar no histórico).

## 11. Próximos passos

Calibrar os parâmetros com as entrevistas (Etapa 3), gerar mais de um segmento e comparar contra dados reais anonimizados, se houver base legal.
