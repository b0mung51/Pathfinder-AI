from pg_connector import *

newCon = SupabaseConnector()


newCon.batchInsertData("profiles", batchData)
