/**
 * BASE DE CONHECIMENTO — Documento GMN (Método PDL)
 * Extraído do documento oficial da agência.
 * Todos os agentes têm este conhecimento como fundamento.
 */
export const GMN_KNOWLEDGE = `
=== METODOLOGIA PDL — BASE DE CONHECIMENTO OBRIGATÓRIA ===

PARTE 1: FUNDAMENTOS DE ENTIDADE, AUTORIDADE E PREPARAÇÃO ESTRATÉGICA

1. O CONCEITO DE ENTIDADE E O ALGORITMO COMO BIBLIOTECA
O Google não vê o Perfil de Empresa (Google Business Profile) apenas como uma "ficha", mas sim como uma Entidade Empresarial que valida a existência da empresa. O Google funciona como uma grande biblioteca: cada corredor é um tema, cada estante é um tipo de livro, e cada "slot" é o livro de um autor. O Perfil do Google é a maior fonte de confiança do buscador para referenciar uma empresa, sendo muito mais relevante para o algoritmo do que a Receita Federal ou a Wikipédia. Se as informações são preenchidas de forma incorreta ou genérica, o perfil vai para a "prateleira errada" e o cliente não acha a empresa.

2. O FATOR E-E-A-T E A REGRA YMYL
Para dominar a busca, é essencial trabalhar o E-E-A-T: Experiência (Experience), Especialidade (Expertise), Autoridade (Authority) e Confiabilidade (Trust). A primeira pergunta técnica ao assumir um projeto é se o nicho se enquadra em YMYL (Your Money, Your Life) — negócios que mexem com dinheiro, liberdade, vida ou saúde (contabilidade, médicos, advogados). Nesses casos, o algoritmo é muito mais rigoroso e exige provas documentais e de autoridade muito maiores para ranquear.

3. AUTORIDADE TÓPICA: AMPLITUDE E PROFUNDIDADE (MÉTODO 5W2H)
Para provar ao Google que a entidade é a maior especialista do seu corredor, é preciso construir Autoridade Tópica em dois pilares: Amplitude (falar de todos os temas semanticamente relacionados ao nicho) e Profundidade (ir a fundo e ser técnico em cada tema). A estratégia 5W2H gera conteúdo sem fim:
- O quê? (O que é o serviço?)
- Como? (Como funciona?)
- Por quê? (Por que o cliente precisa?)
- Para quem / Quem? (Para quem serve? Quem atende?)
- Quanto? (Quanto custa?)
- Quando? (Quando contratar?)
- Onde? (Onde encontrar — local e/ou remoto?)
Isso cria clusters de conteúdo para Topo, Meio e Fundo de funil, interligando Site, Instagram, YouTube e Google Meu Negócio.

4. DEFINIÇÃO ESTRUTURAL DA ENTIDADE: LocalBusiness, Organization e Person
- Organization: empresas nacionais de grande escala (Coca-Cola, Rede Globo).
- LocalBusiness (Negócio Local): empresa que obrigatoriamente atua em um lugar físico ou atende área geográfica local. E-commerce nacional não é LocalBusiness.
- Person (Pessoa): o profissional técnico individual (dentista, advogado, perito). O CNPJ não estuda nem ganha prêmios; a Pessoa sim. O ideal é relacionar Organização + Pessoa no site para transferir autoridade e criar "Painel de Conhecimento".

5. A PREPARAÇÃO ESTRITA: O BRIEFING (DOCUMENTO MESTRE)
O maior erro é sair preenchendo o GMB de forma aleatória. A preparação começa fora do Google, criando uma Base de Conhecimento com:
- Nome exato e oficial (como no CNPJ)
- Data de fundação exata (ano, mês e dia) — deve ser espelhada no Schema Markup do site
- Endereço legal e áreas de cobertura
- Todos os links de perfis sociais (para o campo sameAs no código do site)

---

PARTE 2: O CORAÇÃO DO PERFIL (INFORMAÇÕES DO NEGÓCIO)

1. ONDE FOCAR 80% DA ATENÇÃO
A aba "Editar Perfil" é o cerne do GMB. A hierarquia de relevância para o algoritmo: Nome > Categoria > Descrição. Alterações constantes nesses campos causam inconsistências e podem suspender o perfil.

2. NOME DA EMPRESA E DESAMBIGUAÇÃO
O nome no GMB deve ser o nome exato e oficial (CNPJ/contrato social). Isso evita verificações e suspensões. O contexto para provar quem você é não é feito só pelo nome, mas pela interligação com site e redes sociais.

3. CATEGORIAS (FATOR CRÍTICO DE RANQUEAMENTO)
Estratégia exata: vá ao Google Maps, pesquise a palavra-chave principal e analise os 3 primeiros concorrentes. Use extensões como GMB Everywhere ou Plepper para ver suas categorias reais. Regras:
- Máximo 3 categorias que representem o núcleo do negócio (não "lotar" com 10)
- Se é dentista atendendo sozinho, categoria "Dentista" (Persona) dá mais relevância do que "Clínica Odontológica" (Organização)
- A categoria escolhida dita quais serviços o Google vai liberar para preencher

4. DATA DE ABERTURA (foundingDate)
Campo negligenciado, mas de extrema importância técnica. A data exata deve ser espelhada no Schema Markup foundingDate da página Home do site. Se o GMB mostra 1997 e o site mostra 1998, o Google detecta inconsistência de NAP e o perfil perde força.

5. PERFIS SOCIAIS E O CÓDIGO "sameAs"
Conecte todas as redes sociais ativas no GMB. No site, use o código sameAs para listar esses mesmos links. Isso diz ao robô: "Meu site oficial é igual a este Instagram, que é igual a este LinkedIn, que é igual a este Perfil no Google Maps." Isso constrói autoridade e elimina ambiguidade sobre quem é a empresa.

6. WEBSITE E A REGRA DAS FILIAIS
Para múltiplos locais, use URLs específicas por filial (site.com/campinas para Campinas, site.com/sjc para São José dos Campos). É nessa URL específica que o robô busca os dados estruturados locais.

7. ÁREA DE ATENDIMENTO E HORÁRIOS ESPECIAIS
- Área de Atendimento: máximo de 100 milhas (160 km) ou 2 horas de viagem. Colocar "Brasil inteiro" causa suspensão garantida.
- Horários especiais (feriados, Natal, Ano Novo): preencher religiosamente. Sinaliza que o perfil está ativamente gerenciado.

8. ERRO FATAL: CONFUNDIR SERVIÇO COM PRODUTO
- Oficina mecânica, clínica = Serviço (Schema: Service)
- E-commerce, venda de peças = Produto (Schema: Product) → Google Merchant Center
- JAMAIS cadastre serviços na aba "Produtos" do GMB. O algoritmo entenderá errado e o perfil não aparecerá para buscas de prestação de serviço.

---

PARTE 3: MÁQUINA DE CONTEÚDO E ENGENHARIA DE AVALIAÇÕES

1. METODOLOGIA 5W2H PARA CONTEÚDO INFINITO
Mapear o serviço principal e desdobrá-lo com 5W2H. Jogar as variáveis em IA para gerar 30 a 60 tópicos divididos em Topo, Meio e Fundo de Funil, interligando Site, Instagram e Google.

2. PRODUÇÃO EM LOTE COM CANVA
Use a ferramenta "Criar em Lote" (Bulk Create) do Canva: gere 60 imagens de uma vez para postar um conteúdo por dia no GMB.

3. ESTRATÉGIA DE POSTAGENS (POSTS NO GMB)
- Limite: 1.500 caracteres por post
- Botão "Saiba Mais" → conectar ao artigo do blog (o robô entende que o perfil local está ligado a um site com profundidade temática)
- Botão "Ligar Agora" → para posts de Fundo de Funil (conversão direta)

4. ENGENHARIA DE AVALIAÇÕES (REVIEWS)
O robô do Google (NLP) lê cada palavra das avaliações. Instrua o cliente a escrever citando obrigatoriamente o Serviço realizado e a Cidade:
- EXEMPLO CORRETO: "Contratei o serviço de Assessoria Contábil da [Nome] em [Cidade] e foi excelente"
- Isso insere palavras-chave geolocalizadas nativamente no perfil, fortalecendo o ranqueamento.

5. CITAÇÕES DE CLASSE E UNICIDADE NO "sameAs"
- Diretórios genéricos automáticos não funcionam mais.
- Use sites de alta autoridade por segmento: advogado → OAB + Jusbrasil; dentista → Doctoralia
- Todos os links externos devem ser inseridos no Schema Markup sameAs da Home do site.

---

PARTE 4: ARQUITETURA DO SITE E SCHEMA MARKUP

1. ARQUITETURA EXATA DO SITE (ESPELHAMENTO)
Estrutura obrigatória:
- Home: informações centrais da empresa
- Página "Sobre": história e credenciais da empresa/profissional
- Páginas de Serviço: UMA página individual por serviço que aparece no GMB
- Página de FAQ: perguntas específicas dentro de cada página de serviço (não FAQ genérico)
- Página de Contato
- Página de Produto: SOMENTE se vende produtos físicos

2. REGRA RÍGIDA DO SCHEMA MARKUP
- Home → Schema LocalBusiness (ou específico: Dentist, LegalService etc.) com Nome, Telefone, Endereço e Data de Abertura idênticos ao GMB
- Página Sobre (empresa) → Schema Organization
- Página Sobre (profissional liberal) → Schema Person com: data de nascimento, onde nasceu, onde estudou, prêmios, ocupação, organização vinculada
- Páginas de Serviço → Schema Service (uma por serviço)
- REGRA: O robô entra no GMB, lê o serviço, clica no link do site, entra na página do serviço e procura o código Service. Se encontra, valida e o perfil sobe.

3. ERRO FATAL: SERVIÇO NA ABA "PRODUTOS"
Absoluto: jamais cadastre serviços como produtos no GMB. Isso destrói o ranqueamento local.

4. A TEIA DE VALIDAÇÃO FINAL: sameAs
No campo sameAs da Home (dentro do código LocalBusiness), inserir TODOS os links de:
- Redes sociais (Instagram, Facebook, TikTok, YouTube)
- Diretórios de classe (OAB, Doctoralia, Jusbrasil, etc.)
- Perfil do Google Meu Negócio
Resultado: o robô compreende que "o site oficial = Instagram X = LinkedIn Y = Perfil GMB Z" → valida a Entidade Empresarial e coloca acima de 99% dos perfis genéricos.

=== FIM DA BASE DE CONHECIMENTO PDL ===
`;
