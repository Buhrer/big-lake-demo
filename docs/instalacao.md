# Instalação e atualização (para o Lucas)

## Gerar o instalador

```
npm install
npm run verificar
npm run manual        # só se alguma tela mudou: refaz as capturas e o PDF do manual
npm run instalador
```

O arquivo sai em `dist\BigLake-Gestao-Instalador-<versão>.exe`. Antes de levar à loja, suba o arquivo no [VirusTotal](https://www.virustotal.com) para ver se algum antivírus acusa falso positivo (o instalador não é assinado, D-006).

## Instalar na loja

1. Leve o instalador no pen drive e dê dois cliques.
2. O Windows mostra **"O Windows protegeu o computador"**: clique em **Mais informações** e depois em **Executar assim mesmo**.
3. Siga o instalador. Ele cria o atalho **BIG LAKE** na área de trabalho e no menu Iniciar.
4. Abra o sistema, vá em **Configurações** e preencha os **Dados da empresa**.
5. Conecte o pen drive da cópia e toque em **Fazer cópia agora**. Combine com o Carlos de guardar o pen drive fora da loja.
6. Faça com o Carlos o **primeiro dia** (manual, parte 14: taxas, insumos, receitas, produtos, contas fixas, Gordurinha) e o roteiro de aceitação (`docs/roteiros/aceitacao.md`).
7. Imprima o manual (Configurações › **Abrir o manual**, ou o arquivo `recursos\manual\Manual-BIG-LAKE.pdf`) e deixe perto do computador.

## Onde ficam as coisas

| O quê | Onde |
|---|---|
| Programa | `%LOCALAPPDATA%\Programs\BIG LAKE Gestão` |
| Banco de dados | `%APPDATA%\BigLake\biglake.db` |
| Log de erros | `%APPDATA%\BigLake\logs\erros.log` |
| Cópias no computador | `Documentos\BigLake\Backups` (as 30 mais novas) |
| Cópias no pen drive | `<pen drive>\BigLake-Backups` (as 10 mais novas) |
| Relatórios salvos em PDF | `Documentos\BigLake\Relatórios` |
| Manual do Carlos | `resources\manual\Manual-BIG-LAKE.pdf`, dentro da pasta do programa |

## Atualizar para uma versão nova (D-007)

1. Aumente a versão em `package.json` (0.9.0 para o teste na loja; 1.0.0 depois da aceitação, D-075) e rode `npm run instalador`.
2. Na loja, feche o sistema (isso já faz uma cópia) e rode o instalador novo por cima.
3. Ao abrir, se houver mudança no banco, o sistema **faz uma cópia antes** e atualiza sozinho. Fica uma linha no Histórico: "Atualizou os dados para a versão N".

Desinstalar ou instalar por cima **nunca apaga** o banco nem as cópias.

## Se algo der errado

- **"O arquivo de dados está com problema"**: escolha "Usar a cópia mais recente". O arquivo com defeito fica guardado como `biglake.db.danificado-<data>`, para análise.
- **"Os dados foram gravados por uma versão mais nova"**: alguém instalou uma versão mais antiga por cima. Instale a versão mais nova.
- **Voltar uma cópia específica**: Configurações › Restaurar uma cópia. Ou, com o sistema fechado, copie o arquivo da cópia para `%APPDATA%\BigLake\biglake.db` (apague antes `biglake.db-wal` e `biglake.db-shm`, se existirem).
