'use server'

import { prisma } from '@/lib/prisma'

interface PublishResult {
  success: boolean
  published: number
  skipped: number
  error?: string
}

export async function publishToDatabase(
  jsonData: string
): Promise<PublishResult> {
  try {
    const data = JSON.parse(jsonData)
    let published = 0
    let skipped = 0

    if (!data.searchResults || !Array.isArray(data.searchResults)) {
      return {
        success: false,
        published: 0,
        skipped: 0,
        error:
          'Invalid JSON structure: searchResults not found or not an array',
      }
    }

    for (const searchResult of data.searchResults) {
      try {
        // Check if there are unstaged images
        const unstagedImages =
          searchResult?.property?.media?.allPropertyPhotos?.unstaged
        if (
          !unstagedImages ||
          !Array.isArray(unstagedImages) ||
          unstagedImages.length === 0
        ) {
          skipped++
          continue
        }

        // Extract property data
        const propertyData = {
          street_address:
            searchResult?.property?.address?.streetAddress || null,
          zipcode: searchResult?.property?.address?.zipcode || null,
          city: searchResult?.property?.address?.city || null,
          state: searchResult?.property?.address?.state || null,
          building_id: searchResult?.property?.buildingId || null,
          listing_status: searchResult?.property?.listingStatus || null,
          price: parseFloat(searchResult?.property?.price) || null,
          display_name: searchResult?.property?.agent?.displayName || null,
          business_name: searchResult?.property?.agent?.businessName || null,
          phone_number: searchResult?.property?.agent?.phoneNumber || null,
          agent_badge_type: searchResult?.property?.agent?.badgeType || null,
          photo_url: searchResult?.property?.agent?.photoUrl || null,
          profile_url: searchResult?.property?.agent?.profileUrl || null,
          days_on_zillow:
            parseInt(searchResult?.property?.daysOnZillow) || null,
        }

        // Create the property record
        const property = await prisma.property.create({
          data: propertyData,
        })

        // Handle high-res images
        const highResImages =
          searchResult?.property?.media?.allPropertyPhotos?.highResolution
        if (
          highResImages &&
          Array.isArray(highResImages) &&
          highResImages.length > 0
        ) {
          await prisma.otherImage.createMany({
            data: highResImages.map((imageUrl) => ({
              property_id: property.id,
              image_url: imageUrl,
            })),
          })
        }

        // Handle unstaged images
        await prisma.unstagedImage.createMany({
          data: unstagedImages.map((imageUrl) => ({
            property_id: property.id,
            unstaged_images: imageUrl,
          })),
        })

        published++
      } catch (propertyError) {
        console.error('Error processing property:', propertyError)
        skipped++
      }
    }

    return {
      success: true,
      published,
      skipped,
    }
  } catch (error) {
    console.error('Error publishing to database:', error)
    return {
      success: false,
      published: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
