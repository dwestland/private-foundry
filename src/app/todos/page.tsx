import { prisma } from '@/lib/prisma'
import { TodoList } from '@/components/todo-list'
import { TodoForm } from '@/components/todo-form'

export default async function TodosPage() {
  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Todo List</h1>
      <TodoForm />
      <TodoList todos={todos} />
    </div>
  )
}
