'use client'

import { useState, useCallback } from 'react'
import { uploadImageToS3 } from './actions'
import imageCompression from 'browser-image-compression'

interface ImageUploaderProps {
  propertyId: number
  streetAddress: string | null
}

export default function ImageUploader({
  propertyId,
  streetAddress,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [compressionProgress, setCompressionProgress] = useState(0)

  const slugifyAddress = (address: string | null) => {
    if (!address) return 'property'
    return address
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Process image - resize and compress
  const processImage = async (file: File): Promise<File> => {
    try {
      setCompressionProgress(0)

      // Compression options
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 768,
        useWebWorker: true,
        fileType: 'image/jpeg',
        quality: 0.6, // 60% quality
        onProgress: (progress: number) => {
          setCompressionProgress(Math.round(progress * 100))
        },
      }

      // Compress the image
      const compressedFile = await imageCompression(file, options)

      // Convert to jpeg with .jpg extension
      const jpegFile = new File(
        [compressedFile],
        file.name.split('.')[0] + '.jpg',
        { type: 'image/jpeg' }
      )

      return jpegFile
    } catch (error) {
      console.error('Error processing image:', error)
      throw new Error('Failed to process image')
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file')
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setUploadSuccess(false)

    try {
      // Process the image - resize and compress
      const processedFile = await processImage(file)

      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('propertyId', propertyId.toString())
      formData.append('streetAddress', slugifyAddress(streetAddress))

      // Upload the image using the server action
      const result = await uploadImageToS3(formData)

      if (result.success) {
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
      } else {
        setErrorMessage(result.error || 'Upload failed')
        setTimeout(() => setErrorMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setErrorMessage('An error occurred while uploading')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setIsUploading(false)
      setCompressionProgress(0)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return

      const file = e.dataTransfer.files[0]
      await handleFileUpload(file)
    },
    [handleFileUpload]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      await handleFileUpload(file)

      // Clear the input value to allow uploading the same file again
      e.target.value = ''
    },
    [handleFileUpload]
  )

  return (
    <div className="mb-6 border rounded-lg p-4 bg-white shadow">
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        UPLOAD GENERATED IMAGE
      </h2>

      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer relative
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {isUploading ? (
            <div className="text-center">
              {compressionProgress > 0 && compressionProgress < 100 ? (
                <div className="mb-2">
                  <p className="text-blue-500">
                    Processing image: {compressionProgress}%
                  </p>
                  <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${compressionProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-medium text-blue-500">
                  Uploading...
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-lg font-medium">
                Drag and drop your image here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Images will be compressed and converted to JPG
              </p>
              <p className="text-sm text-gray-500">
                Max width: 768px, Quality: 60%
              </p>
            </>
          )}
        </div>

        {uploadSuccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-100 bg-opacity-90 rounded-lg">
            <div className="text-green-600 text-xl font-medium">
              Image uploaded successfully!
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-90 rounded-lg">
            <div className="text-red-600 text-xl font-medium">
              {errorMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
