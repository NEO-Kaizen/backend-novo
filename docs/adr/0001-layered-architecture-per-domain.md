# Arquitetura em camadas por domínio

O backend legado organiza o código em pastas por domínio, mas dentro de cada pasta as camadas não se separam: regra de negócio aparece dentro de repositórios e controllers, o serviço de solicitações tem 1.330 linhas misturando seis casos de uso, e serviços e repositórios abrem transações ao mesmo tempo, deixando indefinido o escopo real de cada escrita.

Decidimos que a unidade de modularização é o **domínio**, e que dentro de cada domínio existem quatro camadas com responsabilidades distintas — router, controller, service e repository — apoiadas em classes base (`BaseController`, `BaseService`, `BaseRepository`) que concentram o comportamento compartilhado. Repositórios nunca abrem transação e nunca recebem `trx` como parâmetro; só a camada de serviço abre. Domínios não importam repositórios uns dos outros: quando precisam de dados de outro domínio, consomem a porta publicada por ele.

## Alternativas consideradas

- **Manter as pastas por domínio como estão.** Preserva a familiaridade e o histórico do time, mas mantém os defeitos: sem separação de camadas, sem injeção, sem teste possível.
- **Arquitetura hexagonal com porta para cada operação.** É o desenho mais fiel ao princípio, mas multiplica a indireção em um time que já tem dificuldade em sustentar limites. A versão adotada mantém a hexagonal nos pontos que importam — persistência, autorização, tempo, identificadores — sem portar cada operação a uma interface.

## Consequências

- Um serviço grande é sinal de que há dois casos de uso no mesmo arquivo, não de que falta espaço.
- A herança existe para concentração de comportamento real. Se uma classe de domínio não usa nada da base, ela é eliminada em vez de herdada.
- Mudança de regra acontece em um lugar; o efeito nos outros domínios aparece pelos eventos.
