# Roteiro de teste manual · Fatia 1B (banco, histórico, cópias, Configurações, instalador)

## A. Instalação (no computador da loja, se possível)

| # | Passo | Esperado |
|---|---|---|
| 1 | Rodar `npm run instalador` e levar `dist\BigLake-Gestao-Instalador-0.1.0.exe` no pen drive | Arquivo de ≈116 MB |
| 2 | Dar dois cliques no instalador | O Windows mostra "O Windows protegeu o computador" (sem assinatura, D-006). Clicar **Mais informações › Executar assim mesmo** |
| 3 | Seguir o instalador (em português) | Atalho **BIG LAKE** na área de trabalho e no menu Iniciar, com o ícone do sorvete |
| 4 | Abrir pelo atalho | Abre maximizado em até 5 s. Anotar o tempo e a memória no Gerenciador de Tarefas |
| 5 | Dar dois cliques no atalho de novo | Não abre outra janela; a que já está aberta vem para a frente |
| 6 | Se o antivírus bloquear | Anotar o nome do antivírus e a mensagem (risco 7 do plano) |

## B. Cópia de segurança

| # | Passo | Esperado |
|---|---|---|
| 7 | Abrir o sistema sem pen drive | Topo em amarelo: "Ainda não há cópia no pen drive. Conecte o pen drive e toque em "Fazer cópia agora"." |
| 8 | Abrir `Documentos\BigLake\Backups` no Explorador | Já tem uma cópia `biglake_AAAA-MM-DD_HHMMSS.db` (feita ao abrir) e nenhum arquivo `-wal`, `-shm` ou `.parcial` |
| 9 | Configurações › "Fazer cópia agora" sem pen drive | "Cópia feita na pasta do computador. O pen drive não está conectado." |
| 10 | Conectar o pen drive e esperar uns segundos | "Pen drive (E:)" com etiqueta "Conectado" |
| 11 | "Fazer cópia agora" | "Cópia feita na pasta do computador e no pen drive."; topo verde "Cópia de segurança feita hoje, HH:MM"; no pen drive aparece a pasta `BigLake-Backups` |
| 12 | Fechar o sistema pelo X e olhar o pen drive | Mais uma cópia (ao fechar) |
| 13 | Desligar "Copiar sozinho ao fechar", fechar e olhar o pen drive | Botão fica vermelho "Desligado"; ao fechar, nenhuma cópia nova |

## C. Preferências, empresa e histórico

| # | Passo | Esperado |
|---|---|---|
| 14 | Tamanho da letra › Grande | Tudo cresce na hora; o Histórico mostra "Mudou o tamanho padrão da letra: Normal → Grande" |
| 15 | A− duas vezes, fechar e abrir | Abre de novo em Grande (A−/A+ valem só até fechar) |
| 16 | Apagar o nome da empresa e Salvar | "Digite o nome da empresa." em vermelho |
| 17 | Preencher CNPJ, telefone e endereço e Salvar | "✓ Dados da empresa salvos." e uma linha no Histórico com o que mudou |
| 18 | Salvar de novo sem mudar nada | Nenhuma linha nova no Histórico |

## D. Restaurar

| # | Passo | Esperado |
|---|---|---|
| 19 | Mudar o telefone para "A", Salvar, "Fazer cópia agora" | — |
| 20 | Mudar o telefone para "B" e Salvar | — |
| 21 | "Restaurar uma cópia" | Modal com as cópias (pasta e pen drive), da mais nova para a mais antiga |
| 22 | "Restaurar esta" na primeira → Não | A linha volta ao normal |
| 23 | "Restaurar esta" → Sim | A tela recarrega; telefone volta para "A"; Histórico: "Restaurou a cópia de segurança de hoje, HH:MM…"; na pasta há uma cópia nova (a de antes de restaurar) |

## E. Problema no arquivo de dados (só no computador do Lucas)

| # | Passo | Esperado |
|---|---|---|
| 24 | Fechar o sistema. Em `%APPDATA%\BigLake`, abrir `biglake.db` no Bloco de Notas, apagar um pedaço do meio e salvar | — |
| 25 | Abrir o sistema | Mensagem "O arquivo de dados está com problema." com "Usar a cópia mais recente" |
| 26 | Escolher "Usar a cópia mais recente" | Avisa a data da cópia usada; o sistema abre; o arquivo estragado fica guardado como `biglake.db.danificado-…` |
