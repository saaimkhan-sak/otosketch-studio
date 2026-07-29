# Local Ollama Extraction

Ollama support is optional. The app works without it in `mock` and `rules` mode.

Use Ollama only with synthetic notes.

## Setup

1. Install and start Ollama locally:

```bash
brew install ollama
brew services start ollama
```

2. Pull a model that can follow structured JSON instructions. The current verified local demo
   model is `qwen2.5:3b`.

```bash
ollama pull qwen2.5:3b
```

3. Configure environment variables:

```env
ENABLE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
```

4. Start the app:

```bash
pnpm dev
```

5. Select `Ollama optional` in the extractor selector.

Check local readiness:

```bash
pnpm verify:providers
pnpm verify:ollama
```

## Safety

- Keep Ollama bound to localhost.
- Do not expose port `11434` to a network.
- Do not use real patient notes.
- If Ollama is unavailable or returns invalid JSON, the app fails safely and asks you to use mock/rules mode or manual correction.
