'use client'
import { useState } from 'react'
import ChatClient from './ChatClient'
export default function ChatPage() {
  const [tokenCounts, setTokenCounts] = useState<{
    inboundTokens: number
    outboundTokens: number
  } | null>(null)
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      {tokenCounts && (
        <div className="mb-4 text-base">
          Inbound Tokens: {tokenCounts.inboundTokens} | Outbound Tokens:{' '}
          {tokenCounts.outboundTokens}
        </div>
      )}
      <ChatClient onTokenCountsChange={setTokenCounts} />
    </div>
  )
}
