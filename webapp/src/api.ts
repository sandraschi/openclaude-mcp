/**
 * MCP API client — talks to the FastMCP + REST bridge backend on :10932
 *
 * In dev: Vite proxies /tools, /api, /sse → :10932
 * In prod: same origin (both served from :10932 or reverse-proxied)
 */

const BASE = ''  // relative — Vite proxy handles it in dev

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const r = await fetch(`${BASE}/tools/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }))
    throw new Error(err.error ?? `Tool ${name} failed: ${r.status}`)
  }
  return r.json()
}

export async function getHealth() {
  const r = await fetch(`${BASE}/api/health`)
  if (!r.ok) throw new Error('health check failed')
  return r.json()
}

export async function getCapabilities() {
  const r = await fetch(`${BASE}/api/capabilities`)
  if (!r.ok) throw new Error('capabilities fetch failed')
  return r.json()
}

export const api = {
  // Models
  listModels: () => callTool('list_models'),
  setDefaultModel: (model_tag: string) => callTool('set_default_model', { model_tag }),
  modelStatus: (model_tag?: string) =>
    callTool('model_status', model_tag ? { model_tag } : {}),

  // Sessions
  startSession: (
    working_dir: string,
    model_tag?: string,
    enable_kairos = false,
  ) => callTool('start_session', { working_dir, ...(model_tag ? { model_tag } : {}), enable_kairos }),
  sendPrompt: (session_id: string, prompt: string) =>
    callTool('send_prompt', { session_id, prompt }),
  sessionStatus: (session_id: string) =>
    callTool('session_status', { session_id }),
  listSessions: () => callTool('list_sessions'),
  stopSession: (session_id: string) =>
    callTool('stop_session', { session_id }),

  // KAIROS
  kairosEnable: (session_id: string, idle_threshold_seconds = 60) =>
    callTool('kairos_enable', { session_id, idle_threshold_seconds }),
  kairosDisable: (session_id: string) =>
    callTool('kairos_disable', { session_id }),
  kairosLog: (session_id: string, lines = 50) =>
    callTool('kairos_log', { session_id, lines }),

  // ULTRAPLAN
  ultraplan: (session_id: string, goal: string) =>
    callTool('ultraplan', { session_id, goal }),
}
