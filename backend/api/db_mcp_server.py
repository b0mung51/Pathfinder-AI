from fastmcp import FastMCP
from pg_connector import SupabaseConnector

server = FastMCP("DB Writer")
try:
    db_conn = SupabaseConnector()
except Exception as e:
    print("Exception caught!",e)
    raise Exception(str(e))

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
async def get_programs_by_user(user_id: str) -> list[dict]:
    """Get all programs created by a specific user."""
    programs = db_conn.selectWhere("programs", columns=["*"], conditions={"owner_id": user_id})
    return programs



if __name__ == "__main__":
    server.run(transport="stdio")