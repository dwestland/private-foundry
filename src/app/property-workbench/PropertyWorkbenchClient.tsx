'use client'

import { useState } from 'react'
import {
  Property,
  OtherImage,
  UnstagedImage,
  GeneratedImage,
} from '@prisma/client'
import {
  getPropertyById,
  toggleContactedAgent,
  updatePropertyNotes,
  deleteProperty,
} from './actions'
import ImageUploader from './ImageUploader'
import { getS3ImageUrl } from '@/lib/utils'
import ConfirmationDialog from '@/components/ConfirmationDialog'

interface PropertyWithRelations extends Property {
  unstaged_images: UnstagedImage[]
  other_images: OtherImage[]
  generated_images: GeneratedImage[]
}

interface LeadProperty {
  id: number
  street_address: string | null
  state: string | null
  created_at: Date
}

interface PropertyWorkbenchClientProps {
  initialProperty: PropertyWithRelations | null
  newLeads: LeadProperty[]
  recentlyContactedProperties: LeadProperty[]
}

export default function PropertyWorkbenchClient({
  initialProperty,
  newLeads: initialLeads,
  recentlyContactedProperties: initialContactedProperties,
}: PropertyWorkbenchClientProps) {
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyWithRelations | null>(initialProperty)
  const [isLoading, setIsLoading] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [newLeads, setNewLeads] = useState<LeadProperty[]>(initialLeads)
  const [recentlyContactedProperties, setRecentlyContactedProperties] =
    useState<LeadProperty[]>(initialContactedProperties)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const renderValue = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">No Info</span>
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    return value
  }

  // Function to fetch a property by id using server action
  const fetchProperty = async (id: number) => {
    setIsLoading(true)
    try {
      const property = await getPropertyById(id)
      setSelectedProperty(property)
      setNotes(property?.notes || '')
    } catch (error) {
      console.error('Error fetching property:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle notes editing
  const handleEditNotes = () => {
    setIsEditingNotes(true)
  }

  // Function to save notes
  const handleSaveNotes = async () => {
    if (!selectedProperty) return

    setIsSavingNotes(true)
    try {
      await updatePropertyNotes(selectedProperty.id, notes)

      // Update local state
      const updatedProperty = {
        ...selectedProperty,
        notes,
      }
      setSelectedProperty(updatedProperty)
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Function to cancel notes editing
  const handleCancelEdit = () => {
    setNotes(selectedProperty?.notes || '')
    setIsEditingNotes(false)
  }

  // Function to refresh property data after image upload
  const handleImageUploaded = () => {
    if (selectedProperty) {
      fetchProperty(selectedProperty.id)
    }
  }

  // Function to toggle contacted_agent status
  const handleToggleContact = async () => {
    if (!selectedProperty || isToggling) return

    setIsToggling(true)
    try {
      await toggleContactedAgent(selectedProperty.id)

      // Update local state
      const updatedProperty = {
        ...selectedProperty,
        contacted_agent: !selectedProperty.contacted_agent,
      }
      setSelectedProperty(updatedProperty)

      // Create a property entry for the lists
      const propertyForList = {
        id: selectedProperty.id,
        street_address: selectedProperty.street_address,
        state: selectedProperty.state,
        created_at: selectedProperty.created_at,
      }

      // Update leads lists based on the new status
      if (!selectedProperty.contacted_agent) {
        // Property was NOT contacted, now it IS contacted
        // Remove from newLeads and add to recentlyContactedProperties
        setNewLeads(newLeads.filter((lead) => lead.id !== selectedProperty.id))
        setRecentlyContactedProperties([
          propertyForList,
          ...recentlyContactedProperties,
        ])
      } else {
        // Property WAS contacted, now it is NOT contacted
        // Remove from recentlyContactedProperties and add to newLeads
        setRecentlyContactedProperties(
          recentlyContactedProperties.filter(
            (property) => property.id !== selectedProperty.id
          )
        )
        setNewLeads([propertyForList, ...newLeads])
      }
    } catch (error) {
      console.error('Error toggling contact status:', error)
    } finally {
      setIsToggling(false)
    }
  }

  // Function to handle property deletion
  const handleDeleteProperty = async () => {
    if (!selectedProperty || isDeleting) return

    setIsDeleting(true)
    try {
      // Store property info for feedback
      const propertyAddress = selectedProperty.street_address || 'property'

      await deleteProperty(selectedProperty.id)

      // After successful deletion, clear selected property and refresh leads
      setSelectedProperty(null)

      // Update both lists to remove the deleted property
      if (selectedProperty.contacted_agent === false) {
        setNewLeads(newLeads.filter((lead) => lead.id !== selectedProperty.id))
      } else {
        setRecentlyContactedProperties(
          recentlyContactedProperties.filter(
            (property) => property.id !== selectedProperty.id
          )
        )
      }

      // Show success notification (optional)
      alert(
        `Property '${propertyAddress}' and all related images have been deleted.`
      )
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('Failed to delete the property. Please try again.')
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  // Function to open delete confirmation dialog
  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">PROPERTY WORKBENCH</h1>

      <div className="flex flex-col md:flex-row gap-6 text-gray-800">
        {/* Left Column */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
            </div>
          ) : selectedProperty ? (
            <>
              {/* Property Info Section */}
              <div className="mb-6 border rounded-lg p-4 bg-white shadow">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
                  PROPERTY INFO
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Street Address</p>
                    <p className="text-3xl">
                      {renderValue(selectedProperty.street_address)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">City</p>
                    <p>{renderValue(selectedProperty.city)}</p>
                  </div>
                  <div>
                    <p className="font-medium">State</p>
                    <p>{renderValue(selectedProperty.state)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Zipcode</p>
                    <p>{renderValue(selectedProperty.zipcode)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Price</p>
                    <p>
                      {selectedProperty.price ? (
                        `$${selectedProperty.price.toLocaleString()}`
                      ) : (
                        <span className="text-gray-400">No Info</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Days on Zillow (When scraped)</p>
                    <p>{renderValue(selectedProperty.days_on_zillow)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Listing Status</p>
                    <p>{renderValue(selectedProperty.listing_status)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Building ID</p>
                    <p>{renderValue(selectedProperty.building_id)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Record created at</p>
                    <p>
                      {selectedProperty.created_at?.toLocaleString() || (
                        <span className="text-gray-400">No Info</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Fast Stager ID</p>
                    <p>{renderValue(selectedProperty.id)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Agent Contacted</p>
                    <p className="text-3xl">
                      {selectedProperty.contacted_agent ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleToggleContact}
                      disabled={isToggling}
                      className={`px-3 py-1 rounded text-white ${
                        isToggling
                          ? 'bg-gray-400 cursor-not-allowed'
                          : selectedProperty.contacted_agent
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isToggling
                        ? 'Updating...'
                        : selectedProperty.contacted_agent
                        ? 'Mark as Not Contacted'
                        : 'Mark as Contacted'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent Info Section */}
              <div className="mb-6 border rounded-lg p-4 bg-white shadow">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
                  AGENT INFO
                </h2>
                <div className="flex flex-wrap">
                  {/* Left column - Agent details */}
                  <div className="w-1/2">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="font-medium">Name</p>
                        <p className="text-3xl">
                          {renderValue(selectedProperty.display_name)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Business Name</p>
                        <p>{renderValue(selectedProperty.business_name)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-3xl">
                          {renderValue(selectedProperty.phone_number)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Agent Type</p>
                        <p>{renderValue(selectedProperty.agent_badge_type)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Profile URL</p>
                        <p>
                          {selectedProperty.profile_url ? (
                            <a
                              href={
                                selectedProperty.profile_url.startsWith('http')
                                  ? selectedProperty.profile_url
                                  : `https://zillow.com${selectedProperty.profile_url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              https://zillow.com{selectedProperty.profile_url}
                            </a>
                          ) : (
                            <span className="text-gray-400">No Info</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right column - Photo and Notes */}
                  <div className="w-1/2 pl-4">
                    {/* Photo */}
                    <div className="w-28 h-28 mb-4">
                      {selectedProperty.photo_url ? (
                        <img
                          src={selectedProperty.photo_url}
                          alt={selectedProperty.display_name || 'Agent'}
                          className="w-full h-full object-cover border rounded-md"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 border rounded-md">
                          <span className="text-gray-400 text-xs text-center">
                            No Photo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes Section directly below photo */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium">Notes</h3>
                        {isEditingNotes ? (
                          <div className="space-x-2">
                            <button
                              onClick={handleSaveNotes}
                              disabled={isSavingNotes}
                              className={`px-2 py-1 text-sm rounded text-white ${
                                isSavingNotes
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-green-500 hover:bg-green-600'
                              }`}
                            >
                              {isSavingNotes ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSavingNotes}
                              className="px-2 py-1 text-sm rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleEditNotes}
                            className="px-2 py-1 text-sm rounded text-white bg-blue-500 hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {isEditingNotes ? (
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full h-24 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                          placeholder="Add notes about this property..."
                          disabled={isSavingNotes}
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 rounded min-h-[6rem] text-sm">
                          {selectedProperty.notes ? (
                            <p className="whitespace-pre-wrap">
                              {selectedProperty.notes}
                            </p>
                          ) : (
                            <p className="text-gray-400">No notes available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Generated Image Section */}
              {selectedProperty && (
                <ImageUploader
                  propertyId={selectedProperty.id}
                  streetAddress={selectedProperty.street_address}
                  onImageUploaded={handleImageUploaded}
                />
              )}

              {/* Images Section */}
              <div className="border rounded-lg p-4 bg-white shadow">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
                  IMAGES
                </h2>

                {/* Generated Images */}
                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-2">Generated Images</h3>
                  {selectedProperty.generated_images?.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      {selectedProperty.generated_images.map((image) => (
                        <div
                          key={image.id}
                          className="border rounded overflow-hidden aspect-square"
                        >
                          <img
                            src={getS3ImageUrl(image.image_url)}
                            alt="Generated property"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No generated images found</p>
                  )}
                </div>

                {/* Unstaged Images */}
                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-2">Unstaged Images</h3>
                  {selectedProperty.unstaged_images?.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      {selectedProperty.unstaged_images.map((image) => (
                        <div
                          key={image.id}
                          className="border rounded overflow-hidden aspect-square"
                        >
                          <img
                            src={image.unstaged_images}
                            alt="Unstaged property"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No unstaged images found</p>
                  )}
                </div>

                {/* Other Images */}
                <div>
                  <h3 className="text-xl font-medium mb-2">All Images</h3>
                  {selectedProperty.other_images?.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      {selectedProperty.other_images.map((image) => (
                        <div
                          key={image.id}
                          className="border rounded overflow-hidden aspect-square"
                        >
                          <img
                            src={image.image_url}
                            alt="Property"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No other images found</p>
                  )}
                </div>
              </div>

              {/* Delete Property Button - Bottom right of Images section */}
              <div className="flex justify-end mt-6 mb-6">
                <button
                  onClick={openDeleteDialog}
                  className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700 flex items-center shadow-md"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className="inline-block animate-spin mr-2 h-5 w-5 border-2 border-solid border-white border-r-transparent rounded-full"></span>
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                  <span className="font-medium">
                    {isDeleting ? 'Deleting...' : 'Delete Property'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="border rounded-lg p-4 bg-white shadow text-center">
              <p className="text-gray-500">
                Select a property from the New Leads list
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Property Lists */}
        <div className="md:w-64 lg:w-80 flex flex-col gap-6">
          {/* New Leads Section */}
          <div className="border rounded-lg p-4 bg-white shadow">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
              NEW LEADS
            </h2>
            {newLeads.length > 0 ? (
              <div className="overflow-auto h-[640px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Address</th>
                      <th className="p-2 text-left">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          selectedProperty?.id === lead.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => fetchProperty(lead.id)}
                      >
                        <td className="p-2">
                          {lead.street_address || (
                            <span className="text-gray-400">No Address</span>
                          )}
                        </td>
                        <td className="p-2">
                          {lead.state || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">No new leads found</p>
            )}
          </div>

          {/* Recently Contacted Section */}
          <div className="border rounded-lg p-4 bg-white shadow">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
              RECENTLY CONTACTED
            </h2>
            {recentlyContactedProperties.length > 0 ? (
              <div className="overflow-auto h-[640px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Address</th>
                      <th className="p-2 text-left">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentlyContactedProperties.map((property) => (
                      <tr
                        key={property.id}
                        className={`border-b hover:bg-gray-50 cursor-pointer ${
                          selectedProperty?.id === property.id
                            ? 'bg-blue-50'
                            : ''
                        }`}
                        onClick={() => fetchProperty(property.id)}
                      >
                        <td className="p-2">
                          {property.street_address || (
                            <span className="text-gray-400">No Address</span>
                          )}
                        </td>
                        <td className="p-2">
                          {property.state || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400">No contacted properties found</p>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Deleting Property */}
      {selectedProperty && (
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteProperty}
          title="Delete Property"
          message={`Are you sure you want to delete '${
            selectedProperty.street_address || 'this property'
          }'? This will also delete all related images.`}
        />
      )}
    </div>
  )
}
