'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createTodo(title: string) {
  const todo = await prisma.todo.create({
    data: { title },
  })
  revalidatePath('/todos')
  return todo
}

export async function toggleTodo(id: number) {
  const todo = await prisma.todo.findUnique({ where: { id } })
  if (!todo) return null

  const updated = await prisma.todo.update({
    where: { id },
    data: { completed: !todo.completed },
  })
  revalidatePath('/todos')
  return updated
}

export async function deleteTodo(id: number) {
  await prisma.todo.delete({ where: { id } })
  revalidatePath('/todos')
}
