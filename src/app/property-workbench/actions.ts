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
