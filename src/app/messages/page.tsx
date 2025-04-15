import { sendMessage } from './actions'

export default function MessagesPage() {
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Send a Message</h1>
      <form action={sendMessage} className="space-y-4">
        <div className="flex flex-col">
          <label htmlFor="name" className="mb-1 font-semibold">
            Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            className="p-2 border rounded text-[#0a0a0a]"
            required
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="email" className="mb-1 font-semibold">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="p-2 border rounded text-[#0a0a0a]"
            required
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="message" className="mb-1 font-semibold">
            Message
          </label>
          <textarea
            name="message"
            id="message"
            rows={5}
            className="p-2 border rounded text-[#0a0a0a]"
            required
          ></textarea>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send Message
        </button>
      </form>
    </div>
  )
}
