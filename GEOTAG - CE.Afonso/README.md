# GBP Foto Tagger (lote)

Ferramenta local para **salvar configurações por cliente** e **processar fotos em lote** (renomear + escrever metadados EXIF/IPTC/XMP + opcional GPS) e gerar um **pacote final (.zip)** com relatório.

## Como usar (Windows)

1) Rode:

- `start.cmd`

2) Abra no navegador:

- `http://localhost:3000`

## IA (briefing → configuração / foto → tags)

A IA só funciona se você informar uma chave de **Gemini** ou **OpenAI**.

Opções:

- Temporário (não salva): cole a chave na tela em **Configurações**.
- Permanente: defina `GEMINI_API_KEY` e/ou `OPENAI_API_KEY` no seu ambiente.

Padrão:

- Provedor: **Gemini**
- Modelo: **`gemini-2.5-flash`**

Referências (Gemini API):
- https://ai.google.dev/api
- https://ai.google.dev/gemini-api/docs/models/gemini
- https://ai.google.dev/gemini-api/docs/structured-output

Referências (OpenAI Responses + Structured Outputs + Visão):
- https://platform.openai.com/docs/api-reference/responses/create
- https://platform.openai.com/docs/guides/structured-outputs
- https://platform.openai.com/docs/guides/images-vision

## Observações importantes

- O Google Business Profile aceita fotos em **JPG/PNG**, com **10 KB a 5 MB** e recomenda **720×720**. (Veja a ajuda oficial do Google.)
- O app **não altera suas fotos originais**: ele gera uma cópia e trabalha em cima da cópia.
