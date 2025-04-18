/**
 * Constructs a full URL for an image stored in S3
 * @param imagePath - The image path or filename
 * @returns The complete URL to the image
 */
export function getS3ImageUrl(imagePath: string): string {
  // Use the hardcoded S3 bucket URL
  const baseUrl = 'https://fast-stager.s3.us-west-2.amazonaws.com/'

  // Return the complete URL
  return `${baseUrl}${imagePath}`
}
