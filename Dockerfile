FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

COPY openclaude/ openclaude/
COPY server.py .

EXPOSE 10932

ENV OPENCLAUDE_MCP_PORT=10932
ENV OLLAMA_BASE_URL=http://ollama:11434

CMD ["uv", "run", "python", "server.py"]
