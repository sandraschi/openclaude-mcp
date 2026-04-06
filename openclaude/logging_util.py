import logging
import sys

# Centralized logger for the entire application
logger = logging.getLogger("openclaude")
logger.setLevel(logging.INFO)

# Default to stderr if no handlers attached yet
if not logger.handlers:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

def get_logger(name: str) -> logging.Logger:
    """Get a child logger for the given module name."""
    return logger.getChild(name)
