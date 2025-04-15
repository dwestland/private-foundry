'use server'

function countTokens(text: string): number {
  // Split text on whitespace to get words
  const words = text.trim().split(/\s+/)
  // Assume each word corresponds to roughly 1/0.8 tokens (~1.25 tokens per word).
  // Dividing the word count by 0.8 gives a better approximation of the token count.
  return Math.ceil(words.length / 0.8)
}

export async function sendChatMessage(formData: FormData) {
  const message = formData.get('message')
  if (typeof message !== 'string' || !message)
    throw new Error('Message is required.')

  // Retrieve current conversation history; default to an empty array.
  const historyStr = formData.get('history')
  let history: { role: string; content: string }[] = []
  if (typeof historyStr === 'string' && historyStr) {
    try {
      history = JSON.parse(historyStr)
    } catch {
      // ignore parse errors; use empty history
    }
  }

  // Append the new user message.
  history.push({ role: 'user', content: message })

  // Calculate inbound tokens (tokens in all messages sent to the API).
  const inboundTokens = history.reduce(
    (sum, msg) => sum + countTokens(msg.content),
    0
  )

  // Call the OpenAI Chat Completion API.
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: history,
    }),
  })
  const data = await response.json()
  const reply = data.choices?.[0]?.message
  let outboundTokens = 0
  if (reply) {
    history.push(reply)
    // Calculate outbound tokens (tokens in the reply from the API).
    outboundTokens = countTokens(reply.content)
  }
  // Return the updated conversation and token counts as a JSON string.
  return JSON.stringify({
    history,
    inboundTokens,
    outboundTokens,
  })
}
