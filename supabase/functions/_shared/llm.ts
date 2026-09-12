// Structured-output call to Google Gemini. Swapped in for the Anthropic Claude
// API referenced in the design handoff because this POC's secret is a Gemini
// key — same "structured output, single tool-like call" interface either way.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export async function callLLM(opts: {
  system: string
  userText: string
  schema: Record<string, unknown>
}) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: [{ text: opts.userText }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: opts.schema,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content')
  return JSON.parse(text)
}
