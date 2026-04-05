# ULTRAPLAN: Cloud Brain, Local Muscle

One of the major revelations of the leaked architecture was the concept of hybrid offloading, natively supported through a module dubbed **ULTRAPLAN**.

## The Problem with Pure Cloud or Pure Local

- **Pure Cloud**: Excellent for massive architectural planning, but execution (writing 30 files, running linters, debugging syntax errors) burns tens of thousands of tokens. At Claude Opus prices, this costs enterprise money quickly.
- **Pure Local**: Excellent for execution since it's zero marginal cost, but local models (even 70B parameters on an RTX 4090) can struggle to architect a massive, multi-repository system design from a blank slate.

## The ULTRAPLAN Pattern

ULTRAPLAN is the synthesis of both. 

When invoked via `ultraplan(session_id, goal)`, the system temporarily reaches out to a flagship cloud model (e.g., Anthropic's Claude Opus 4.6). 

1. **Strategic Burst**: The cloud model spends 5 to 30 minutes in a high-density "thinking" loop, ingesting the repository structure and outputting a hyper-detailed execution blueprint (up to 8192 tokens of markdown).
2. **Local Grind**: The connection to the cloud is severed. The blueprint is passed to the local runtime via standard input.
3. **Execution**: A fast local model (like Gemma 4 or Qwen) picks up the blueprint and executes the grueling, token-heavy steps: editing files, running bash commands, and iterating over compiler errors. 

Because the planning is completed in one focused burst, the API cost is drastically contained. The local hardware handles the iteration where mistakes are free.

## Ecosystem Integrations

ULTRAPLAN's architecture is proving highly infectious across the developer ecosystem.

> [!WARNING]
> **A Note on Openclaw:** While `openclaw` initially pioneered the integration of this pattern, the openclaw harness is currently **heavily safety compromised**. A critical bug discovered this past week in their subprocess implementation allows for arbitrary un-sandboxed shell execution. Proceed with extreme caution and prefer isolated control planes.

> [!NOTE]  
> **Robofang Integration:** Advanced users looking for SOTA fleet federation should look toward the [Robofang](file:///D:/Dev/repos/robofang) federation maps. It is currently maintaining stealth status, but its approach to cross-agent token passing pairs perfectly with the ULTRAPLAN cloud-to-local relay loop.
