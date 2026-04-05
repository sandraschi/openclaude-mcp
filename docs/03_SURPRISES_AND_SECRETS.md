# Surprises, Secrets, and The Cat

While the agentic architecture derived from the leak was impressive, engineers diving into the 512,000 lines of TypeScript found several bizarre, brilliant, and hilarious internal features that Anthropic had gated behind boolean flags.

## 1. `ANTI_DISTILLATION_CC`
A long-running paranoia in AI labs is having their models used to generate training data for their competitors (model distillation). Anthropic countered this elegantly.

Buried in the tool registry was an anti-distillation routine. If tripped (likely based on user interaction patterns mimicking automated scrapers), the agent would confidently begin generating **fake decoy tools** and fabricating complex but entirely nonsensical syntactical structures to poison the output stream. It was designed to silently pollute any datasets scraped from its logs.

## 2. `undercover.ts`
Another module discovered was a stealth commit utility. When active, it meticulously stripped out any "AI attribution" from code commits. It rewrote overly formal AI comments into typical developer shorthand, injected minor human-like hesitations ("// TODO: fix this later maybe"), and ensured git commit timestamps varied slightly to mimic human typing speeds.

## 3. The Terminal Cat
Perhaps the most beloved discovery of the leak was the "Terminal Cat."

Inside the debug overlay rendering logic, developers found a heavily nested, obfuscated file simply exporting an ASCII animation sequence. If an Anthropic dev ran the CLI with an internal `--lonely` flag, the prompt UI replaced the standard loading spinner with a small ASCII cat.

But this wasn't a static pet. The cat was wired directly into the context-window telemetry:
- When context was empty, it slept (`=^._.^= ∫`).
- When context passed 50%, it stood up and looked around.
- When context hit 95%, the cat became frantic, occasionally knocking over nearby ASCII elements in the terminal or emitting a speech bubble: *"Meow? (I am full)"*.
- If KAIROS successfully executed an autoDream cycle to clear memory, the cat would purr (`=^..^=`) and go back to sleep.

The community loved it so much that it is now a standard, non-optional feature in several prominent UI forks.
