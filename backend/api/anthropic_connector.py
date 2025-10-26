from __future__ import annotations

import argparse
import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from anthropic import AI_PROMPT, HUMAN_PROMPT, Anthropic
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

anthropic_client = Anthropic(api_key=os.getenv("CLAUDE_KEY"))


def _mcp_env() -> Dict[str, str]:
    keys = ("SUPABASE_URL", "SUPABASE_KEY", "CLAUDE_KEY")
    return {key: value for key in keys if (value := os.getenv(key))}


def _mcp_script_path() -> Path:
    script_path = Path(__file__).resolve().with_name("db_mcp_server.py")
    if not script_path.exists():
        raise FileNotFoundError(f"MCP server script not found at {script_path}")
    return script_path


@asynccontextmanager
async def mcp_session(extra_env: Dict[str, str] | None = None):
    server_params = StdioServerParameters(
        command="python3",
        args=[str(_mcp_script_path())],
        env={**_mcp_env(), **(extra_env or {})},
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session


async def list_mcp_tools() -> Dict[str, Dict[str, Any]]:
    async with mcp_session() as session:
        result = await session.list_tools()

    tools: Dict[str, Dict[str, Any]] = {}
    for tool in result.tools:
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


async def call_mcp_tool(tool_name: str, arguments: Dict[str, Any] | None = None) -> Dict[str, Any]:
    arguments = arguments or {}

    async with mcp_session() as session:
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

    args = parser.parse_args(argv)

    if args.list or not args.tool:
        tools = await list_mcp_tools()
        print("Available MCP tools:\n")
        for name, meta in tools.items():
            print(f"- {name}: {meta['usage']}")
            if meta["arguments"]:
                for arg_name, arg_meta in meta["arguments"].items():
                    required = "required" if arg_meta["required"] else "optional"
                    print(f"    • {arg_name} ({arg_meta['type']}, {required})")
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


