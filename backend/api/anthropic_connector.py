"""Anthropic + MCP helper utilities.

Quick start:

```python
from backend.api import anthropic_connector as claude

print(claude.ask_sync("Summarise Pathfinder AI in one sentence."))
print(claude.ask_sync("Summarise the colleges in our database.", use_mcp=True))
```

Use the async helpers (`await claude.ask(...)`, `await claude.prompt(...)`) if you
are already inside an async context. MCP newcomers should find `ask`/`ask_sync`
and `list_mcp_tools()` sufficient for most workflows. The connector keeps a
single MCP server process running in the background by default so repeated calls
stay fast; call `await claude.reset_mcp_session()` if you need a clean restart.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from anthropic import Anthropic
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")
DEFAULT_MAX_OUTPUT_TOKENS = int(os.getenv("CLAUDE_MAX_OUTPUT_TOKENS", "1024"))


class AnthropicMCPConnector:
    """High-level helper for talking to Anthropic and optional MCP tools.

    Set ``reuse_mcp_session=False`` to restore the previous behaviour of starting a
    fresh MCP process for every call.
    """
    def __init__(
        self,
        *,
        model: str | None = None,
        max_output_tokens: int | None = None,
        anthropic_client: Anthropic | None = None,
        mcp_script_path: Path | None = None,
        reuse_mcp_session: bool = True,
    ) -> None:
        self.default_model = model or DEFAULT_MODEL
        self.default_max_output_tokens = max_output_tokens or DEFAULT_MAX_OUTPUT_TOKENS
        self._mcp_script_path = mcp_script_path or Path(__file__).resolve().with_name("db_mcp_server.py")
        if not self._mcp_script_path.exists():
            raise FileNotFoundError(f"MCP server script not found at {self._mcp_script_path}")

        self._anthropic_client = anthropic_client
        self._anthropic_api_key = os.getenv("CLAUDE_KEY")
        self._reuse_mcp_session = reuse_mcp_session
        self._shared_session: ClientSession | None = None
        self._shared_session_lock = asyncio.Lock()
        self._shared_session_stack: AsyncExitStack | None = None
        self._shared_session_env: Dict[str, str] | None = None

    @property
    def anthropic_client(self) -> Anthropic:
        """Return an initialised Anthropic SDK client."""

        if self._anthropic_client is None:
            if not self._anthropic_api_key:
                raise ValueError("CLAUDE_KEY environment variable must be set before using Anthropic prompts.")
            self._anthropic_client = Anthropic(api_key=self._anthropic_api_key)
        return self._anthropic_client

    def _mcp_env(self) -> Dict[str, str]:
        keys = ("SUPABASE_URL", "SUPABASE_KEY", "CLAUDE_KEY")
        return {key: value for key in keys if (value := os.getenv(key))}

    async def _create_message(
        self,
        *,
        model: str,
        messages: list[Dict[str, Any]],
        max_output_tokens: int,
        system: str | None = None,
        tools: list[Dict[str, Any]] | None = None,
    ):
        """Call the Anthropic API, supporting both new and legacy argument names."""

        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_output_tokens": max_output_tokens,
        }
        if system is not None:
            kwargs["system"] = system
        if tools is not None:
            kwargs["tools"] = tools

        try:
            return await asyncio.to_thread(self.anthropic_client.messages.create, **kwargs)
        except TypeError as error:
            message = str(error)
            if "max_tokens" not in message:
                raise

        fallback_kwargs = {key: value for key, value in kwargs.items() if key != "max_output_tokens"}
        fallback_kwargs["max_tokens"] = max_output_tokens
        return await asyncio.to_thread(self.anthropic_client.messages.create, **fallback_kwargs)

    @asynccontextmanager
    async def mcp_session(self, extra_env: Dict[str, str] | None = None):
        """Yield a connected MCP session, handling lifecycle automatically."""

        if self._reuse_mcp_session:
            async with self._shared_session_lock:
                session = await self._ensure_shared_session(extra_env)
                try:
                    yield session
                finally:
                    pass
            return

        server_params = StdioServerParameters(
            command="python3",
            args=[str(self._mcp_script_path)],
            env={**self._mcp_env(), **(extra_env or {})},
        )

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session

    async def _ensure_shared_session(self, extra_env: Dict[str, str] | None) -> ClientSession:
        if self._shared_session is not None:
            if extra_env and extra_env != self._shared_session_env:
                # Environment overrides only apply when the session is first created.
                # Subsequent calls ignore differing extras to keep the shared session stable.
                pass
            return self._shared_session

        merged_env = {**self._mcp_env(), **(extra_env or {})}
        server_params = StdioServerParameters(
            command="python3",
            args=[str(self._mcp_script_path)],
            env=merged_env,
        )

        stack = AsyncExitStack()
        read, write = await stack.enter_async_context(stdio_client(server_params))
        session = await stack.enter_async_context(ClientSession(read, write))
        await session.initialize()

        self._shared_session_stack = stack
        self._shared_session = session
        self._shared_session_env = merged_env
        return session

    async def reset_mcp_session(self) -> None:
        """Close and forget the shared MCP session so a fresh one can be created."""

        if self._shared_session_stack is not None:
            try:
                await self._shared_session_stack.aclose()
            finally:
                self._shared_session_stack = None
                self._shared_session = None
                self._shared_session_env = None

    async def fetch_mcp_tools(self, session: ClientSession | None = None):
        """Fetch raw MCP tool metadata, reusing an existing session when given."""

        if session is not None:
            result = await session.list_tools()
            return result.tools

        async with self.mcp_session() as session_ctx:
            try:
                result = await session_ctx.list_tools()
            except Exception:
                if self._reuse_mcp_session:
                    await self.reset_mcp_session()
                    async with self.mcp_session() as retry_session:
                        result = await retry_session.list_tools()
                else:
                    raise
            return result.tools

    async def list_mcp_tools(self) -> Dict[str, Dict[str, Any]]:
        """Return MCP tools in an easy-to-read dictionary for quick introspection."""

        tools: Dict[str, Dict[str, Any]] = {}
        for tool in await self.fetch_mcp_tools():
            schema = tool.inputSchema or {}
            required = set(schema.get("required", []))
            properties = schema.get("properties", {})

            arguments = {}
            for arg_name, arg_schema in properties.items():
                arguments[arg_name] = {
                    "type": arg_schema.get("type", "any"),
                    "required": arg_name in required,
                    "description": arg_schema.get("description", ""),
                }

            tools[tool.name] = {
                "usage": tool.description or tool.title or tool.name,
                "arguments": arguments,
            }

        return tools

    async def call_mcp_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any] | None = None,
        session: ClientSession | None = None,
    ) -> Dict[str, Any]:
        """Call a specific MCP tool and return normalised text/structured output."""

        arguments = arguments or {}

        if session is None:
            async with self.mcp_session() as session_ctx:
                try:
                    return await self._call_tool_with_session(session_ctx, tool_name, arguments)
                except Exception:
                    if self._reuse_mcp_session:
                        await self.reset_mcp_session()
                        async with self.mcp_session() as retry_session:
                            return await self._call_tool_with_session(retry_session, tool_name, arguments)
                    raise

        return await self._call_tool_with_session(session, tool_name, arguments)

    async def _call_tool_with_session(
        self,
        session: ClientSession,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        result = await session.call_tool(tool_name, arguments)

        if result.isError:
            text_messages = [item.text for item in result.content if getattr(item, "type", None) == "text"]
            raise RuntimeError(f"Tool '{tool_name}' returned an error: {' '.join(text_messages)}")

        text_outputs = [item.text for item in result.content if getattr(item, "type", None) == "text"]
        return {
            "structured": result.structuredContent,
            "text": "\n".join(text_outputs) if text_outputs else None,
            "raw_content": [item.model_dump() for item in result.content],
        }

    @staticmethod
    def _format_tool_result_text(tool_result: Dict[str, Any]) -> str:
        result_text = tool_result["text"]
        if result_text:
            return result_text
        if tool_result["structured"] is not None:
            return json.dumps(tool_result["structured"], indent=2)
        return json.dumps(tool_result["raw_content"], indent=2)

    async def prompt_with_claude_plain(
        self,
        prompt: str,
        *,
        model: str | None = None,
        system: str | None = None,
        max_output_tokens: int | None = None,
    ) -> Dict[str, Any]:
        """Send a prompt to Claude without exposing any MCP tools."""

        model = model or self.default_model
        max_output_tokens = max_output_tokens or self.default_max_output_tokens

        response = await self._create_message(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_output_tokens=max_output_tokens,
        )

        text = "\n".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()

        return {
            "text": text,
            "raw_response": response,
        }

    async def prompt_with_claude_mcp(
        self,
        prompt: str,
        *,
        model: str | None = None,
        system: str | None = None,
        max_output_tokens: int | None = None,
        max_tool_interactions: int = 8,
    ) -> Dict[str, Any]:
        """Send a prompt to Claude and permit it to select and call MCP tools."""

        model = model or self.default_model
        max_output_tokens = max_output_tokens or self.default_max_output_tokens

        attempts = 2 if self._reuse_mcp_session else 1
        last_error: Exception | None = None

        for attempt in range(attempts):
            try:
                async with self.mcp_session() as session:
                    tools = await self.fetch_mcp_tools(session)
                    tool_specs = [
                        {
                            "name": tool.name,
                            "description": tool.description or tool.title or tool.name,
                            "input_schema": tool.inputSchema or {"type": "object"},
                        }
                        for tool in tools
                    ]

                    messages: list[Dict[str, Any]] = [{"role": "user", "content": prompt}]
                    tool_interactions = 0

                    while True:
                        response = await self._create_message(
                            model=model,
                            system=system,
                            tools=tool_specs,
                            messages=messages,
                            max_output_tokens=max_output_tokens,
                        )

                        messages.append({"role": "assistant", "content": response.content})

                        tool_uses = [block for block in response.content if getattr(block, "type", None) == "tool_use"]
                        if not tool_uses:
                            final_text = "\n".join(
                                block.text for block in response.content if getattr(block, "type", None) == "text"
                            ).strip()
                            return {
                                "text": final_text,
                                "raw_response": response,
                                "messages": messages,
                            }

                        if tool_interactions >= max_tool_interactions:
                            raise RuntimeError("Exceeded maximum allowed tool interactions.")

                        for tool_use in tool_uses:
                            tool_interactions += 1
                            tool_result = await self._call_tool_with_session(session, tool_use.name, tool_use.input)
                            result_text = self._format_tool_result_text(tool_result)

                            messages.append(
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "tool_result",
                                            "tool_use_id": tool_use.id,
                                            "content": [{"type": "text", "text": result_text}]
                                        }
                                    ],
                                }
                            )
            except Exception as error:
                last_error = error
                if not self._reuse_mcp_session or attempt == attempts - 1:
                    raise
                await self.reset_mcp_session()

        assert last_error is not None  # for type checkers
        raise last_error


    async def prompt(
        self,
        prompt: str,
        *,
        use_mcp: bool = False,
        model: str | None = None,
        system: str | None = None,
        max_output_tokens: int | None = None,
        max_tool_interactions: int | None = None,
        include_messages: bool = False,
    ) -> Dict[str, Any]:
        """Unified prompt helper that hides MCP complexity by default."""

        if use_mcp:
            tool_limit = max_tool_interactions if max_tool_interactions is not None else 8
            result = await self.prompt_with_claude_mcp(
                prompt,
                model=model,
                system=system,
                max_output_tokens=max_output_tokens,
                max_tool_interactions=tool_limit,
            )
        else:
            result = await self.prompt_with_claude_plain(
                prompt,
                model=model,
                system=system,
                max_output_tokens=max_output_tokens,
            )

        if not include_messages and result.get("messages") is not None:
            result = {key: value for key, value in result.items() if key != "messages"}

        return result

    async def ask(
        self,
        prompt: str,
        *,
        use_mcp: bool = False,
        model: str | None = None,
        system: str | None = None,
        max_output_tokens: int | None = None,
        max_tool_interactions: int | None = None,
    ) -> str:
        """Return only Claude's text so teammates do not need to parse payloads."""

        result = await self.prompt(
            prompt,
            use_mcp=use_mcp,
            model=model,
            system=system,
            max_output_tokens=max_output_tokens,
            max_tool_interactions=max_tool_interactions,
        )
        return result["text"]


_DEFAULT_CONNECTOR: AnthropicMCPConnector | None = None


def get_default_connector() -> AnthropicMCPConnector:
    """Lazily instantiate a shared connector for simple module-level helpers."""

    global _DEFAULT_CONNECTOR
    if _DEFAULT_CONNECTOR is None:
        _DEFAULT_CONNECTOR = AnthropicMCPConnector()
    return _DEFAULT_CONNECTOR


@asynccontextmanager
async def mcp_session(extra_env: Dict[str, str] | None = None):
    """Module-level convenience wrapper around `AnthropicMCPConnector.mcp_session`."""

    connector = get_default_connector()
    async with connector.mcp_session(extra_env=extra_env) as session:
        yield session


async def fetch_mcp_tools(session: ClientSession | None = None):
    """Convenience wrapper mirroring `AnthropicMCPConnector.fetch_mcp_tools`."""

    connector = get_default_connector()
    return await connector.fetch_mcp_tools(session)


async def list_mcp_tools() -> Dict[str, Dict[str, Any]]:
    """List available MCP tools using the shared connector instance."""

    connector = get_default_connector()
    return await connector.list_mcp_tools()


async def summarize_tools() -> str:
    """Return a human-readable summary of the MCP tools for quick sharing."""

    tools = await list_mcp_tools()
    if not tools:
        return "No MCP tools are currently registered."

    lines = ["MCP tools available:"]
    for name, meta in tools.items():
        usage = meta.get("usage") or ""
        lines.append(f"- {name}: {usage}")
        if meta.get("arguments"):
            for arg_name, arg_meta in meta["arguments"].items():
                requirement = "required" if arg_meta["required"] else "optional"
                description = arg_meta.get("description") or ""
                lines.append(f"    {arg_name} ({arg_meta['type']}, {requirement}) - {description}")

    return "\n".join(lines)


async def call_mcp_tool(
    tool_name: str,
    arguments: Dict[str, Any] | None = None,
    session: ClientSession | None = None,
) -> Dict[str, Any]:
    connector = get_default_connector()
    return await connector.call_mcp_tool(tool_name, arguments, session)


async def prompt_with_claude_plain(
    prompt: str,
    *,
    model: str | None = None,
    system: str | None = None,
    max_output_tokens: int | None = None,
) -> Dict[str, Any]:
    """Module-level helper to prompt Claude without MCP tools."""

    connector = get_default_connector()
    return await connector.prompt_with_claude_plain(
        prompt,
        model=model,
        system=system,
        max_output_tokens=max_output_tokens,
    )


async def prompt_with_claude_mcp(
    prompt: str,
    *,
    model: str | None = None,
    system: str | None = None,
    max_output_tokens: int | None = None,
    max_tool_interactions: int = 8,
) -> Dict[str, Any]:
    """Module-level helper to prompt Claude with MCP tool usage enabled."""

    connector = get_default_connector()
    return await connector.prompt_with_claude_mcp(
        prompt,
        model=model,
        system=system,
        max_output_tokens=max_output_tokens,
        max_tool_interactions=max_tool_interactions,
    )


async def prompt(
    prompt: str,
    *,
    use_mcp: bool = False,
    model: str | None = None,
    system: str | None = None,
    max_output_tokens: int | None = None,
    max_tool_interactions: int | None = None,
    include_messages: bool = False,
) -> Dict[str, Any]:
    """Unified module-level prompt helper that hides MCP complexity."""

    connector = get_default_connector()
    return await connector.prompt(
        prompt,
        use_mcp=use_mcp,
        model=model,
        system=system,
        max_output_tokens=max_output_tokens,
        max_tool_interactions=max_tool_interactions,
        include_messages=include_messages,
    )


async def ask(
    prompt: str,
    *,
    use_mcp: bool = False,
    model: str | None = None,
    system: str | None = None,
    max_output_tokens: int | None = None,
    max_tool_interactions: int | None = None,
) -> str:
    """Return only Claude's text response using the shared connector instance."""

    connector = get_default_connector()
    return await connector.ask(
        prompt,
        use_mcp=use_mcp,
        model=model,
        system=system,
        max_output_tokens=max_output_tokens,
        max_tool_interactions=max_tool_interactions,
    )


async def reset_mcp_session() -> None:
    """Close the shared MCP session so the next call creates a fresh one."""

    connector = get_default_connector()
    await connector.reset_mcp_session()


def ask_sync(
    prompt: str,
    *,
    use_mcp: bool = False,
    model: str | None = None,
    system: str | None = None,
    max_output_tokens: int | None = None,
    max_tool_interactions: int | None = None,
) -> str:
    """Synchronous helper for quick scripts or shells.

    Raises RuntimeError if an event loop is already running to avoid nested event
    loop issues. In that case call `await ask(...)` instead.
    """

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        pass
    else:
        raise RuntimeError("ask_sync() cannot run inside an active event loop; use await ask(...) instead.")

    return asyncio.run(
        ask(
            prompt,
            use_mcp=use_mcp,
            model=model,
            system=system,
            max_output_tokens=max_output_tokens,
            max_tool_interactions=max_tool_interactions,
        )
    )


async def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Interact with the local MCP server.")
    parser.add_argument("--list", action="store_true", help="List available MCP tools and exit.")
    parser.add_argument("--tool", type=str, help="Name of the MCP tool to invoke.")
    parser.add_argument(
        "--args",
        type=str,
        default="{}",
        help="JSON object containing arguments for the selected tool.",
    )
    parser.add_argument("--prompt", type=str, help="Send a free-form prompt to Claude.")
    parser.add_argument("--use-mcp", action="store_true", help="Allow Claude to use MCP tools while responding to --prompt.")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Anthropic model identifier to use.")
    parser.add_argument("--system", type=str, help="Optional system prompt to steer Claude's behaviour.")
    parser.add_argument(
        "--max-output-tokens",
        type=int,
        default=DEFAULT_MAX_OUTPUT_TOKENS,
        help="Maximum tokens Claude may generate in each response.",
    )
    parser.add_argument(
        "--max-tool-interactions",
        type=int,
        default=8,
        help="Safety limit for the number of MCP tool calls in a single prompt when --use-mcp is set.",
    )

    args = parser.parse_args(argv)

    if args.prompt:
        response_text = await ask(
            args.prompt,
            use_mcp=args.use_mcp,
            model=args.model,
            system=args.system,
            max_output_tokens=args.max_output_tokens,
            max_tool_interactions=args.max_tool_interactions,
        )

        print(response_text)
        return

    if args.list or not args.tool:
        print(await summarize_tools())
        print()
        if not args.tool:
            return

    tool_args = json.loads(args.args)
    response = await call_mcp_tool(args.tool, tool_args)

    print(f"Tool '{args.tool}' response:")
    if response["text"]:
        print(response["text"])
    elif response["structured"] is not None:
        print(json.dumps(response["structured"], indent=2))
    else:
        print(json.dumps(response["raw_content"], indent=2))


if __name__ == "__main__":
    asyncio.run(main())


