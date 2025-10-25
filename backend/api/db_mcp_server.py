from fastmcp import FastMCP
from pg_connector import SupabaseConnector

server = FastMCP("DB Writer")
try:
    db_conn = SupabaseConnector()
except Exception as e:
    print("Exception caught!",e)
    raise Exception()

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

if __name__ == "__main__":
    server.run(transport="stdio")