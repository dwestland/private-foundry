'use client'

import { useState } from 'react'
import { Property, OtherImage, UnstagedImage } from '@prisma/client'
import { getPropertyById, toggleContactedAgent } from './actions'

interface PropertyWithRelations extends Property {
  unstaged_images: UnstagedImage[]
  other_images: OtherImage[]
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
}

export default function PropertyWorkbenchClient({
  initialProperty,
  newLeads: initialLeads,
}: PropertyWorkbenchClientProps) {
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyWithRelations | null>(initialProperty)
  const [isLoading, setIsLoading] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [newLeads, setNewLeads] = useState<LeadProperty[]>(initialLeads)

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
    } catch (error) {
      console.error('Error fetching property:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle toggling the contacted_agent status
  const handleToggleContactedAgent = async () => {
    if (!selectedProperty || isToggling) return

    setIsToggling(true)
    try {
      // Call the server action to toggle the status
      // We don't need the return value as we manually update the UI for better UX
      await toggleContactedAgent(selectedProperty.id)

      // Update the selected property with the new status
      setSelectedProperty({
        ...selectedProperty,
        contacted_agent: !selectedProperty.contacted_agent,
      })

      // If the property was marked as contacted, remove it from newLeads
      if (!selectedProperty.contacted_agent) {
        setNewLeads(newLeads.filter((lead) => lead.id !== selectedProperty.id))
      }
      // If it was unmarked as contacted, add it back to newLeads
      else {
        // We would need to fetch all leads again or add it back with the right format
        // For simplicity, we'll just refresh the property
        const freshProperty = await getPropertyById(selectedProperty.id)
        setSelectedProperty(freshProperty)
      }
    } catch (error) {
      console.error('Error toggling contacted_agent status:', error)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="container mx-auto p-4 text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-gray-100">
        PROPERTY WORKBENCH
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column - Property Details */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
            </div>
          ) : selectedProperty ? (
            <>
              {/* Property Info Section */}
              <div className="mb-8 border rounded-lg p-4 bg-white shadow">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                  PROPERTY INFO
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Street Address</p>
                    <p>{renderValue(selectedProperty.street_address)}</p>
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
                    <p className="font-medium">Days on Zillow</p>
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
                    <p className="font-medium">Created At</p>
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
                    <p>{selectedProperty.contacted_agent ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Toggle Contact Status</p>
                    <button
                      onClick={handleToggleContactedAgent}
                      disabled={isToggling}
                      className={`mt-1 px-3 py-1 rounded text-white ${
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
              <div className="mb-8 border rounded-lg p-4 bg-white shadow">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                  AGENT INFO
                </h2>
                <div className="flex">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="font-medium">Name</p>
                        <p>{renderValue(selectedProperty.display_name)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Business Name</p>
                        <p>{renderValue(selectedProperty.business_name)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Phone</p>
                        <p>{renderValue(selectedProperty.phone_number)}</p>
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
                                  : `https://${selectedProperty.profile_url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {selectedProperty.profile_url}
                            </a>
                          ) : (
                            <span className="text-gray-400">No Info</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 h-24 ml-4">
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
                </div>
              </div>

              {/* Images Section */}
              <div className="border rounded-lg p-4 bg-white shadow">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                  IMAGES
                </h2>

                {/* Unstaged Images */}
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Unstaged Images</h3>
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
                  <h3 className="font-medium mb-2">Other Images</h3>
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
            </>
          ) : (
            <div className="border rounded-lg p-4 bg-white shadow text-center">
              <p className="text-gray-500">No property data available</p>
            </div>
          )}
        </div>

        {/* Right Column - New Leads */}
        <div className="md:w-64 lg:w-80">
          <div className="border rounded-lg p-4 bg-white shadow">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              NEW LEADS
            </h2>
            {newLeads.length > 0 ? (
              <div className="overflow-auto max-h-[80vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
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
        </div>
      </div>
    </div>
  )
}
