import anthropic_connector as claude

print(claude.ask_sync("Summarise Pathfinder AI in one sentence."))
print(claude.ask_sync("Using user_id= fe460144-f63c-45bd-932c-ddbb57cd63c6 in user_preferences table's GPA, SAT, budget, and interest, rate the top 10 schools in the dataset for him.", use_mcp=True))