'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const fileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'Please select a file')
    .refine((file) => file.type === 'application/json', 'File must be JSON'),
})

type FileFormData = z.infer<typeof fileSchema>

export default function JsonUploaderPage() {
  const [jsonContent, setJsonContent] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FileFormData>({
    resolver: zodResolver(fileSchema),
  })

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        setValue('file', file)
        parseJsonFile(file)
      }
    },
    [setValue]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const parseJsonFile = async (file: File) => {
    try {
      const content = await file.text()
      const formattedJson = JSON.stringify(JSON.parse(content), null, 2)
      setJsonContent(formattedJson)
    } catch (error) {
      console.error('Error parsing JSON file:', error)
      setJsonContent(null)
    }
  }

  const onSubmit = async (data: FileFormData) => {
    await parseJsonFile(data.file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      parseJsonFile(file)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">JSON Uploader</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
        <div
          className={`border-2 border-dashed p-8 rounded-lg text-center cursor-pointer mb-4 
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} 
            ${errors.file ? 'border-red-500' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <svg
              className="w-12 h-12 text-gray-400 mb-2"
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
            <p className="text-lg font-medium">
              Drag and drop your JSON file here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Only JSON files are accepted
            </p>
            <input
              id="file"
              type="file"
              accept="application/json"
              className="hidden"
              {...register('file')}
              onChange={handleFileChange}
            />
          </div>
        </div>

        {errors.file && (
          <p className="text-red-500 text-sm mb-4">
            {errors.file.message as string}
          </p>
        )}

        <button
          type="button"
          onClick={() => document.getElementById('file')?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
        >
          Browse Files
        </button>

        <button
          type="button"
          onClick={() => {
            reset()
            setJsonContent(null)
          }}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Clear
        </button>
      </form>

      {jsonContent && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">JSON Content</h2>
          <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-[500px]">
            <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap">
              {jsonContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
