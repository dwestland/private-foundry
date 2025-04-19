'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomBytes } from 'crypto'

/**
 * Get a property by ID with its related images
 */
export async function getPropertyById(id: number) {
  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        unstaged_images: true,
        other_images: true,
        generated_images: true,
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
 * Get recently contacted properties (contacted_agent is true)
 */
export async function getRecentlyContactedProperties() {
  try {
    const contactedProperties = await prisma.property.findMany({
      where: {
        contacted_agent: true,
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
    return contactedProperties
  } catch (error) {
    console.error('Error fetching contacted properties:', error)
    throw new Error('Failed to fetch contacted properties')
  }
}

/**
 * Toggle the contacted_agent status for a property
 */
export async function toggleContactedAgent(id: number) {
  try {
    // Get current status
    const property = await prisma.property.findUnique({
      where: { id },
      select: { contacted_agent: true },
    })

    if (!property) {
      throw new Error('Property not found')
    }

    // Toggle the status
    await prisma.property.update({
      where: { id },
      data: {
        contacted_agent: !property.contacted_agent,
      },
    })

    // Revalidate the page
    revalidatePath('/property-workbench')

    return { success: true }
  } catch (error) {
    console.error('Error toggling contacted_agent status:', error)
    throw new Error('Failed to update property')
  }
}

/**
 * Upload an image to AWS S3 and save the reference in the database
 */
export async function uploadImageToS3(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const propertyId = parseInt(formData.get('propertyId') as string)
    const streetAddress = formData.get('streetAddress') as string

    if (!file || !propertyId) {
      return {
        success: false,
        error: 'Missing required data',
      }
    }

    // Ensure the file is an image
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image',
      }
    }

    // Generate a unique file name with .jpg extension
    const randomString = randomBytes(6).toString('hex')
    const fileName = `${streetAddress}-${randomString}.jpg`

    // Setup AWS S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || '',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    })

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to S3
    const bucketName = process.env.AWS_BUCKET_NAME || 'fast-stager'
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/jpeg',
    })

    await s3Client.send(command)

    // Save reference to database
    await prisma.generatedImage.create({
      data: {
        property_id: propertyId,
        image_url: fileName,
      },
    })

    // Revalidate the page
    revalidatePath('/property-workbench')

    return { success: true }
  } catch (error) {
    console.error('Error uploading image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Update property notes
 */
export async function updatePropertyNotes(id: number, notes: string) {
  try {
    await prisma.property.update({
      where: { id },
      data: { notes },
    })

    // Revalidate the page
    revalidatePath('/property-workbench')

    return { success: true }
  } catch (error) {
    console.error('Error updating property notes:', error)
    throw new Error('Failed to update property notes')
  }
}

/**
 * Delete a property by ID and all its related records
 */
export async function deleteProperty(id: number) {
  try {
    // Use a transaction to ensure all related data is deleted
    await prisma.$transaction(async (tx) => {
      // Delete related images first (foreign key constraints)
      await tx.otherImage.deleteMany({
        where: { property_id: id },
      })

      await tx.generatedImage.deleteMany({
        where: { property_id: id },
      })

      await tx.unstagedImage.deleteMany({
        where: { property_id: id },
      })

      // Delete the property itself
      await tx.property.delete({
        where: { id },
      })
    })

    // Revalidate the page
    revalidatePath('/property-workbench')

    return { success: true }
  } catch (error) {
    console.error('Error deleting property:', error)
    throw new Error('Failed to delete property')
  }
}

/**
 * Search properties by street address, display name, phone number or ID
 * Supports fuzzy matching, acronyms, and partial matches
 * Adding quotes allows exact matching
 */
export async function searchProperties(searchTerm: string, idOnly = false) {
  try {
    // Check if search term is empty
    if (!searchTerm.trim()) {
      return []
    }

    // Check if search term is a numeric ID - only for ID-only search
    const isNumeric = /^\d+$/.test(searchTerm.trim())

    // Handle ID-only search mode
    if (idOnly) {
      // In ID-only mode, only search for numeric IDs
      if (!isNumeric) {
        return [] // Return empty if not a number in ID-only mode
      }

      const propertyById = await prisma.property.findUnique({
        where: { id: parseInt(searchTerm.trim()) },
        select: {
          id: true,
          street_address: true,
          state: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
          contacted_agent: true,
        },
      })

      return propertyById ? [propertyById] : []
    }

    // For non-ID-only mode, continue with normal search

    // Check for exact ID match first (but in normal mode, this is just one option)
    if (isNumeric) {
      const exactIdMatch = await prisma.property.findUnique({
        where: { id: parseInt(searchTerm.trim()) },
        select: {
          id: true,
          street_address: true,
          state: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
          contacted_agent: true,
        },
      })

      // If we found an exact ID match, include it in the results
      // but still continue with the fuzzy search
      const fuzzyMatches = await performFuzzySearch(searchTerm)

      if (exactIdMatch) {
        // Check if the exact match is already in the fuzzy results
        const isDuplicate = fuzzyMatches.some((p) => p.id === exactIdMatch.id)

        if (!isDuplicate) {
          // Add the exact ID match at the beginning of results
          return [exactIdMatch, ...fuzzyMatches]
        }
      }

      return fuzzyMatches
    }

    // Check if the search is for an exact match (enclosed in quotes)
    const exactMatch = searchTerm.match(/^"(.*)"$/)
    if (exactMatch) {
      return performExactSearch(exactMatch[1])
    }

    // For standard fuzzy/partial matching
    return performFuzzySearch(searchTerm)
  } catch (error) {
    console.error('Error searching properties:', error)
    throw new Error('Failed to search properties')
  }
}

/**
 * Helper function to perform exact search with quoted terms
 */
async function performExactSearch(term: string) {
  return await prisma.property.findMany({
    where: {
      OR: [
        { street_address: { equals: term, mode: 'insensitive' } },
        { display_name: { equals: term, mode: 'insensitive' } },
        { phone_number: { equals: term, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      street_address: true,
      state: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      contacted_agent: true,
    },
    orderBy: {
      updated_at: 'desc',
    },
    take: 31, // Get one more than we need to check for more results
  })
}

/**
 * Helper function to perform fuzzy search for partial matches
 */
async function performFuzzySearch(searchTerm: string) {
  const term = searchTerm.trim()

  return await prisma.property.findMany({
    where: {
      OR: [
        { street_address: { contains: term, mode: 'insensitive' } },
        { display_name: { contains: term, mode: 'insensitive' } },
        { phone_number: { contains: term, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      street_address: true,
      state: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      contacted_agent: true,
    },
    orderBy: {
      updated_at: 'desc',
    },
    take: 31, // Get one more than we need to check for more results
  })
}
