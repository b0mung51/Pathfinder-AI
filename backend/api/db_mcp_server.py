from fastmcp import FastMCP
from pg_connector import SupabaseConnector
import inspect
import json

server = FastMCP("DB Writer")
try:
    db_conn = SupabaseConnector()
except Exception as e:
    print("Exception caught!",e)
    raise Exception(str(e))

# Store tool registry for introspection
tool_registry = {}

@server.tool()
async def select(table: str) -> list[dict]:
    """Select data from the database."""
    data = db_conn.selectData(table, columns=["*"])
    return data

@server.tool()
async def select_where(table: str, conditions: dict) -> list[dict]:
    """Select data from the database with conditions."""
    data = db_conn.selectWhere(table, columns=["*"], conditions=conditions)
    return data

@server.tool()
async def num_rows(table: str, conditions: dict) -> int:
    """Get number of rows in the database table with conditions."""
    count = db_conn.numRows(table, conditions=conditions)
    return count

@server.tool()
async def insert(table: str, data: dict) -> list[dict]:
    """Insert data into the database."""
    response = db_conn.insertData(table, data)
    return response

@server.tool()
async def update(table: str, data: dict, conditions: dict) -> list[dict]:
    """Update data in the database with conditions."""
    response = db_conn.updateData(table, data, conditions)
    return response

@server.tool()
async def delete(table: str, conditions: dict) -> list[dict]:
    """Delete data from the database with conditions."""
    response = db_conn.deleteData(table, conditions)
    return response

@server.tool()
async def upsert(table: str, data: dict) -> list[dict]:
    """Upsert data into the database."""
    response = db_conn.upsertData(table, data)
    return response
@server.tool()
async def check_value_exists(table: str, column: str, value) -> bool:
    """Check if a value exists in the database."""
    exists = db_conn.checkIfValueExists(table, column, value)
    return exists

@server.tool()
async def get_column_value(table: str, column: str, conditions: dict) -> list:
    """Get column value from the database with conditions."""
    values = db_conn.getColumnValue(table, column, conditions)
    return values

@server.tool()
async def ping_db() -> str:
    """Ping the database to check connectivity."""
    try:
        _ = db_conn.selectData(tableName=list(db_conn.requiredTables)[0], columns=["*"])
        return "Database connection is healthy."
    except Exception as e:
        return f"Database connection failed: {str(e)}"
    
@server.tool()
async def get_table_columns(table: str) -> list[str]:
    """Get column names of a table in the database."""
    columns = db_conn.getTableColumns(table)
    return columns

@server.tool()
async def join_tables(tables: list[str], join_on: dict, columns: list[str]) -> list[dict]:
    """Join multiple tables in the database."""
    data = db_conn.joinTables(tables, join_on, columns)
    return data

@server.tool()
async def get_programs_by_user(user_id: str) -> list[dict]:
    """Get all programs created by a specific user."""
    programs = db_conn.selectWhere("programs", columns=["*"], conditions={"owner_id": user_id})
    return programs

@server.tool()
async def list_tools() -> dict:
    """List all available MCP tools in a structured dictionary format.
    
    Returns:
        Dictionary with tool names as keys and metadata as values:
        {
            "tool_name": {
                "usage": "Description and usage instructions",
                "arguments": {
                    "arg_name": {
                        "type": "string/dict/etc",
                        "required": true/false,
                        "description": "Parameter description"
                    }
                }
            }
        }
    """
    tools_dict = {}
    
    # Get all registered tools from the server
    server_tools = await server.get_tools()
    
    # server_tools is a dict with tool names as keys
    for tool_name, tool_obj in server_tools.items():
        # Extract tool information
        usage = tool_obj.description if hasattr(tool_obj, 'description') else "No description available"
        
        # Extract arguments from parameters (FastMCP uses 'parameters' not 'input_schema')
        arguments = {}
        if hasattr(tool_obj, 'parameters') and isinstance(tool_obj.parameters, dict):
            properties = tool_obj.parameters.get('properties', {})
            required_fields = tool_obj.parameters.get('required', [])
            
            for arg_name, arg_schema in properties.items():
                arguments[arg_name] = {
                    "type": arg_schema.get('type', 'any'),
                    "required": arg_name in required_fields,
                    "description": arg_schema.get('description', '')
                }
        
        tools_dict[tool_name] = {
            "usage": usage,
            "arguments": arguments
        }
    
    return tools_dict

@server.tool()
async def call_tool(tool_name: str, arguments: dict) -> dict:
    """Dynamically call any MCP tool by name with the provided arguments.
    
    Args:
        tool_name: The name of the tool to call
        arguments: Dictionary of arguments to pass to the tool
        
    Returns:
        Dictionary containing:
        - success: Whether the call succeeded (true/false)
        - result: The tool's return value (if successful)
        - error: Error message (if failed)
        - tool_name: Name of the tool that was called
        
    Examples:
        call_tool("select", {"table": "colleges"})
        call_tool("insert", {"table": "programs", "data": {"name": "CS"}})
        call_tool("ping_db", {})
    """
    try:
        # Get the tool from the server
        tool = await server.get_tool(tool_name)
        
        if tool is None:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' not found. Use list_tools() to see available tools.",
                "tool_name": tool_name
            }
        
        # Call the tool's function with the provided arguments
        if hasattr(tool, 'fn'):
            result = await tool.fn(**arguments)
        else:
            result = await tool(**arguments)
        
        return {
            "success": True,
            "result": result,
            "tool_name": tool_name
        }
    
    except TypeError as e:
        return {
            "success": False,
            "error": f"Invalid arguments: {str(e)}",
            "tool_name": tool_name
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}",
            "tool_name": tool_name
        }


if __name__ == "__main__":
    # Bind to the port provided by Heroku (or default to 5000) and prefer an HTTP transport.
    # This attempts several common signatures for FastMCP server.run to maximize compatibility.
    """
    import os

    port = int(os.environ.get("PORT", "5067"))
    host = "0.0.0.0"

    # Try an HTTP transport (preferred for Heroku web dynos). Fall back to stdio if not supported.
    try:
        server.run(transport="http", host=host, port=port)
    except TypeError:
        # Some implementations accept different keyword ordering
        try:
            server.run(transport="http", port=port, host=host)
        except Exception:
            try:
                # Some servers may accept host/port without transport
                server.run(host=host, port=port)
            except Exception as e:
                print("Couldn't start HTTP transport (falling back to stdio). Error:", e)
                server.run(transport="stdio")
    except Exception as e:
        # If anything else goes wrong, show the error and try stdio as a last resort.
        print("Error starting server with HTTP transport:", e)
        """
    server.run(transport="stdio")