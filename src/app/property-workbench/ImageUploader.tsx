'use client'

import { useState, useCallback, useEffect } from 'react'
import { uploadImageToS3 } from './actions'
import imageCompression from 'browser-image-compression'

interface ImageUploaderProps {
  propertyId: number
  streetAddress: string | null
  onImageUploaded?: () => void
}

export default function ImageUploader({
  propertyId,
  streetAddress,
  onImageUploaded,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [isPasteFocused, setIsPasteFocused] = useState(false)
  const [watermarkProgress, setWatermarkProgress] = useState(0)

  const slugifyAddress = (address: string | null) => {
    if (!address) return 'property'
    return address
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  // Apply watermark to the image
  const applyWatermark = async (imageFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        setWatermarkProgress(10)

        // Create Image objects for the source image and watermark
        const sourceImage = new Image()
        const watermarkImage = new Image()

        // Load the watermark image first
        watermarkImage.onload = () => {
          setWatermarkProgress(40)

          // Create a FileReader to read the source image
          const reader = new FileReader()
          reader.onload = (e) => {
            if (!e.target?.result) {
              reject(new Error('Failed to read source image'))
              return
            }

            // Once the source image is read, create an Image from it
            sourceImage.onload = () => {
              setWatermarkProgress(70)

              // Create a canvas to combine the images
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')

              if (!ctx) {
                reject(new Error('Failed to create canvas context'))
                return
              }

              // Set canvas dimensions to match the source image
              canvas.width = sourceImage.width
              canvas.height = sourceImage.height

              // Draw the source image
              ctx.drawImage(sourceImage, 0, 0)

              // Draw the watermark, scaled to fit the source image
              ctx.drawImage(
                watermarkImage,
                0,
                0,
                sourceImage.width,
                sourceImage.height
              )

              setWatermarkProgress(90)

              // Convert the canvas to a blob
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Failed to create image blob'))
                    return
                  }

                  // Create a new File from the blob
                  const watermarkedFile = new File(
                    [blob],
                    `watermarked-${imageFile.name}`,
                    { type: 'image/jpeg' }
                  )

                  setWatermarkProgress(100)
                  resolve(watermarkedFile)
                },
                'image/jpeg',
                0.95
              )
            }

            // Set the source of the source image
            sourceImage.src = e.target.result as string
          }

          // Start reading the source image
          reader.readAsDataURL(imageFile)
        }

        // Load the watermark image
        watermarkImage.src = '/watermark.png'

        // Handle watermark loading error
        watermarkImage.onerror = () => {
          reject(new Error('Failed to load watermark image'))
        }
      } catch (error) {
        console.error('Error applying watermark:', error)
        reject(error)
      }
    })
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

      // Apply watermark to the processed image
      const watermarkedFile = await applyWatermark(processedFile)

      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append('file', watermarkedFile)
      formData.append('propertyId', propertyId.toString())
      formData.append('streetAddress', slugifyAddress(streetAddress))

      // Upload the image using the server action
      const result = await uploadImageToS3(formData)

      if (result.success) {
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
        if (onImageUploaded) {
          onImageUploaded()
        }
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
      setWatermarkProgress(0)
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

  const triggerFileInput = () => {
    document.getElementById('file-upload')?.click()
  }

  // Handle clipboard paste
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      // Only process paste events if the paste area is focused
      if (
        !isPasteFocused &&
        !document.getElementById('paste-area')?.contains(document.activeElement)
      ) {
        return
      }

      // Check if there are items in the clipboard
      if (!e.clipboardData || !e.clipboardData.items) return

      // Prevent the default paste behavior
      e.preventDefault()

      // Look for image data in the clipboard
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i]

        // Check if item is an image
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            console.log(
              'Processing pasted image:',
              file.name,
              file.type,
              file.size
            )
            await handleFileUpload(file)
            break // Process only the first image found
          }
        }
      }
    },
    [handleFileUpload, isPasteFocused]
  )

  // Set up and clean up the paste event listener
  useEffect(() => {
    // Add the paste event listener
    window.addEventListener('paste', handlePaste)

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  return (
    <div className="mb-6 border rounded-lg p-4 bg-white shadow">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-2xl font-semibold">UPLOAD GENERATED IMAGE</h2>
        <button
          onClick={triggerFileInput}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center shadow-sm"
          disabled={isUploading}
        >
          {isUploading ? (
            <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-solid border-white border-r-transparent rounded-full"></span>
          ) : (
            <svg
              className="w-5 h-5 mr-2"
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
          )}
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      <div
        id="paste-area"
        className={`
          border-2 border-dashed rounded-lg p-8 text-center relative
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : isPasteFocused
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        onFocus={() => setIsPasteFocused(true)}
        onBlur={() => setIsPasteFocused(false)}
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
              {watermarkProgress > 0 && watermarkProgress < 100 ? (
                <div className="mb-2">
                  <p className="text-green-500">
                    Applying watermark: {watermarkProgress}%
                  </p>
                  <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${watermarkProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : compressionProgress > 0 && compressionProgress < 100 ? (
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
                Drag and drop your image here or paste from clipboard
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Images will be compressed, watermarked, and converted to JPG
              </p>
              <p className="text-sm text-gray-500">
                Max width: 768px, Quality: 60%
              </p>
              <div className="mt-3 p-2 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm font-medium">
                  To paste: Click here and press{' '}
                  <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+V</kbd> or{' '}
                  <kbd className="px-2 py-1 bg-gray-200 rounded">⌘+V</kbd>
                </p>
              </div>
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
