from anthropic import Anthropic, HUMAN_PROMPT, AI_PROMPT
from dotenv import load_dotenv
import os


ROOT_DIR = "../.."
load_dotenv(os.path.join(ROOT_DIR, ".env"))

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))