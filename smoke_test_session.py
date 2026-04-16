import asyncio
import json
import os
import sys
from pathlib import Path

# Add the project root to sys.path so we can import openclaude modules
sys.path.append(str(Path(__file__).parent))

from openclaude.session import OpenClaudeSession

async def smoke_test():
    print("=== OpenClaude Session Smoke Test ===")
    
    # Configuration
    working_dir = Path(r"D:\Dev\repos\claude-code-test")
    working_dir.mkdir(parents=True, exist_ok=True)
    
    # Use the default model from the user's setup or a safe bet
    model = "gemma4:26b-a4b" 
    
    env = {
        "CLAUDE_CODE_USE_OPENAI": "1",
        "OPENAI_BASE_URL": "http://localhost:11434/v1",
        "OPENAI_MODEL": model,
        "OPENAI_API_KEY": "ollama",
        "OLLAMA_BASE_URL": "http://localhost:11434",
    }
    
    session = OpenClaudeSession(
        session_id="smoke-test-1",
        working_dir=working_dir,
        model=model,
        env=env,
        kairos_enabled=False
    )
    
    print(f"Starting session in {working_dir}...")
    await session.start()
    
    # Wait for session to reach 'running' status
    for _ in range(30):
        if session._status == "running":
            break
        await asyncio.sleep(1)
        print(f"  Status: {session._status}...")
    else:
        print("Timeout waiting for session to start.")
        await session.stop()
        return

    print("Session is RUNNING. Sending prompt...")
    
    # Test prompt
    prompt = "Reply with exactly the word 'ACKNOWLEDGE' and nothing else."
    
    # We want to see the RAW output, so we'll wrap session.send but also 
    # the background reader should be logging to session._output_buffer.
    
    try:
        result = await session.send(prompt)
        print("\n--- Result ---")
        print(json.dumps(result, indent=2))
        
        print("\n--- Full Output Buffer (NDJSON) ---")
        for line in session._output_buffer:
            print(line)
            
    except Exception as e:
        print(f"Error during send: {e}")
    finally:
        print("\nStopping session...")
        await session.stop()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(smoke_test())
