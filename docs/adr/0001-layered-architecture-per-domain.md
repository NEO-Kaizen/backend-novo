---
status: aceito
---

# Arquitetura em camadas por domínio

O backend legado organiza o código em pastas por domínio, mas dentro de cada pasta as camadas não se separam: regra de negócio aparece dentro de repositórios e controllers, o serviço de solicitações tem 1.330 linhas misturando seis casos de uso, e serviços e repositórios abrem transações ao mesmo tempo, deixando indefinido o escopo real de cada escrita.

Decidimos que a unidade de modularização é o **domínio**, e que dentro de cada domínio existem quatro camadas com responsabilidades distintas — router, controller, service e repository — apoiadas em classes base (`BaseController`, `BaseService`, `BaseRepository`) que concentram o comportamento compartilhado. A transação é aberta pela classe base do serviço: toda operação de escrita é um método `execute*` que passa por `execute()`, e o repositório nunca abre transação nem recebe `trx` como parâmetro — ao contrário, ele **exige** uma transação corrente para gravar, de modo que a garantia não dependa da herança. Domínios não importam repositórios uns dos outros: quando precisam de dados de outro domínio, consomem a porta publicada por ele.

## Alternativas consideradas

- **Manter as pastas por domínio como estão.** Preserva a familiaridade e o histórico do time, mas mantém os defeitos: sem separação de camadas, sem injeção, sem teste possível.
- **Arquitetura hexagonal com porta para cada operação.** É o desenho mais fiel ao princípio, mas multiplica a indireção em um time que já tem dificuldade em sustentar limites. A versão adotada mantém a hexagonal nos pontos que importam — persistência, autorização, tempo, identificadores — sem portar cada operação a uma interface.
- **Deixar o repositório abrir a transação.** É a opção mais simples, e é o que o legado faz — com o resultado de que cada escrita commita sozinha e um caso de uso que toca duas tabelas deixa estado parcial. Descartado pela mesma razão que a recusa de passar `trx` como parâmetro: a fronteira transacional precisa ter um dono, e o dono é quem conhece o caso de uso.
- **Abrir uma transação por requisição, no middleware.** Torna a fronteira implícita, segura a transação durante upload e chamada externa, e cobra transação até das requisições de leitura. Descartado: a fronteira precisa ser visível no código.
- **Uma camada de caso de uso acima do serviço.** O serviço já é a camada de caso de uso; acrescentar outra seria um passe-through sem ganho.

## Consequências

- Um serviço grande é sinal de que há dois casos de uso no mesmo arquivo, não de que falta espaço.
- A herança existe para concentração de comportamento real. Se uma classe de domínio não usa nada da base, ela é eliminada em vez de herdada.
- Mudança de regra acontece em um lugar; o efeito nos outros domínios aparece pelos eventos.
- O nome do método declara a intenção: `execute*` é escrita e é transacional; os demais são leitura e não são.
- A herança é conveniência, não garantia. Quem garante é o repositório, que exige transação corrente para gravar — assim um service que não herda a base não consegue produzir estado parcial, apenas erra mais cedo.
- **A fronteira é por caso de uso, não por statement.** Autocommit já paga uma transação e um COMMIT por statement, então agrupar os statements de um caso de uso em uma transação é um desconto: um caso de uso com quatro escritas custa um COMMIT em vez de quatro. O custo real está no round trip adicional por fronteira e na duração do lock — e por isso as transações são curtas e não seguram I/O externo. Uma transação aberta prende o snapshot MVCC e impede o *vacuum* de remover tuplas mortas, o que gera bloat no banco inteiro.
- Para a carga deste portal — dezenas de escritas por hora — o custo é irrelevante. A afirmação vale **relativo à carga**: se o volume crescer, o ajuste é `execute` por chunk e, no limite, ajuste de infraestrutura (`synchronous_commit`, WAL), nunca de arquitetura.
