from pg_connector import *

newCon = SupabaseConnector()

print(newCon.joinTables("programs", "colleges", col1_key="college_id", col2_key="id"))