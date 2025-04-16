'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Fetch a property by ID with its related images
 */
export async function getPropertyById(id: number) {
  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        unstaged_images: true,
        other_images: true,
      },
    })

    return property
  } catch (error) {
    console.error('Error fetching property:', error)
    throw new Error('Failed to fetch property')
  }
}

/**
 * Get all properties where contacted_agent is false
 */
export async function getNewLeads() {
  try {
    const newLeads = await prisma.property.findMany({
      where: {
        contacted_agent: false,
      },
      select: {
        id: true,
        street_address: true,
        state: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    return newLeads
  } catch (error) {
    console.error('Error fetching new leads:', error)
    throw new Error('Failed to fetch new leads')
  }
}

/**
 * Get the first property to display initially
 */
export async function getInitialProperty() {
  try {
    const property = await prisma.property.findFirst({
      include: {
        unstaged_images: true,
        other_images: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    return property
  } catch (error) {
    console.error('Error fetching initial property:', error)
    throw new Error('Failed to fetch initial property')
  }
}

/**
 * Toggle the contacted_agent status for a property
 */
export async function toggleContactedAgent(id: number) {
  try {
    // First, get the current status
    const property = await prisma.property.findUnique({
      where: { id },
      select: { contacted_agent: true },
    })

    if (!property) {
      throw new Error('Property not found')
    }

    // Toggle the status
    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        contacted_agent: !property.contacted_agent,
      },
    })

    // Revalidate the path to refresh data
    revalidatePath('/property-workbench')

    return updatedProperty
  } catch (error) {
    console.error('Error toggling contacted_agent status:', error)
    throw new Error('Failed to update property')
  }
}
