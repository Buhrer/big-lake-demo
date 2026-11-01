# 06 · Requisitos não funcionais

## Plataforma e instalação
- **Windows 10** (64 bits; confirmar se há máquina 32 bits) e compatível com Windows 11.
- Entregue como **instalador .exe** (ou MSI dentro de um .exe) em português: atalho na área de trabalho e no menu Iniciar, ícone da BIG LAKE, desinstalador.
- Instalação **sem exigir conhecimento técnico**; dependências embutidas ou instaladas pelo próprio instalador (por exemplo, o WebView2, se a stack precisar).
- **Assinatura de código** recomendada, para evitar o alerta "O Windows protegeu o computador" (SmartScreen) e falsos positivos de antivírus. Discutir custo do certificado.
- **Atualização**: um instalador novo atualiza sem perder dados (migrações automáticas com backup antes). Atualização automática pela internet é opcional **[DECIDIR]**.

## Funcionamento offline
- **100% offline.** Nenhuma tela, fonte, ícone ou biblioteca pode depender de internet.
- Dados guardados **no próprio computador**, num banco local (ex.: SQLite) dentro da pasta de dados do usuário (não na pasta do programa).

## Desempenho (PC simples de loja)
- Abrir o sistema em até **5 segundos**; trocar de tela em menos de **1 segundo**; relatórios do ano em até **3 segundos**.
- Funcionar bem com **4 GB de RAM** e processador de entrada **[confirmar o PC]**.
- Volume esperado: alguns milhares de registros por ano (fechamentos diários, pedidos, contas). Projetar para pelo menos **10 anos** de dados sem degradar.

## Confiabilidade e dados
- **Gravação imediata e em transação** de toda ação confirmada; resistir a queda de energia (ex.: SQLite em modo WAL).
- **Backup automático ao fechar**: pasta `Documentos\BigLake\Backups` e pen drive (quando conectado). Manter as N últimas cópias. "Fazer cópia agora" e "Restaurar uma cópia" em Configurações.
- **Backup antes de cada migração** de versão e antes de restaurar.
- Verificação de integridade do banco ao abrir; se houver problema, oferecer restaurar a última cópia boa.
- **Auditoria** de todas as alterações (como não há login, não há "quem"; registrar data, hora e o que mudou).
- Dinheiro sem erro de arredondamento (centavos/decimal) e **retratos** de preço e custo nos lançamentos (o passado não muda).

## Segurança e privacidade
- **Sem login** (decisão do cliente). **[DECIDIR]**: um PIN simples só para "Restaurar cópia" e para mudar a divisão dos sócios.
- Dados pessoais de clientes (nome, telefone, CPF/CNPJ, endereço) ficam só no computador da loja; tratar conforme a LGPD (uso interno, sem compartilhar). **[DECIDIR]**: criptografar os backups no pen drive.

## Usabilidade e acessibilidade
- Ver `05-padroes-de-interface.md`. Resolução mínima 1280×720; principal 1366×768; sem rolagem horizontal; letra de 80% a 130%.
- Todos os textos em **português do Brasil**; datas `dd/mm/aaaa`; moeda `R$ 1.234,56`.

## Impressão e exportação
- Impressão do comprovante de pedido e de todos os relatórios na impressora padrão do Windows.
- **Salvar em PDF** sem depender de programa externo.
- **[DECIDIR]**: exportar relatórios para Excel/CSV para o contador.

## Qualidade de engenharia
- Código versionado (Git), com README de como rodar, testar e gerar o instalador.
- Módulo de **regras e cálculos** puro, com cobertura de testes alta (meta ≥ 90% nesse módulo).
- Testes de integração do banco (migrações, transações) e testes ponta a ponta dos fluxos principais (lançar o dia, fazer pedido, cadastrar receita, pagar conta com cartão pessoal, ver a divisão dos sócios).
- Lint, formatação automática e checagem de tipos no padrão do projeto.
- Logs de erro locais (arquivo rotativo) para suporte, sem dados sensíveis.

## Escalabilidade (pensar agora, construir depois)
A arquitetura deve permitir, **sem reescrever**, evoluir para:
1. **Mais de um computador na loja** (rede local), por exemplo balcão + escritório.
2. **Sincronização/backup na nuvem** opcional.
3. **Consulta pelo celular** para os sócios (só leitura: lucro do mês, avisos).

Para isso: regras de negócio isoladas da interface e do banco (camada de serviço), identificadores estáveis, datas com fuso, e um lugar único de acesso a dados (repositórios), para trocar SQLite local por um servidor no futuro.
