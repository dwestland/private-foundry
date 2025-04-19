import {
  getNewLeads,
  getPropertyById,
  getRecentlyContactedProperties,
} from './actions'
import PropertyWorkbenchClient from './PropertyWorkbenchClient'

export default async function PropertyWorkbenchPage() {
  // Default to the first property for initial load
  const initialProperty = await getPropertyById(1)
  const newLeads = await getNewLeads()
  const recentlyContactedProperties = await getRecentlyContactedProperties()

  return (
    <PropertyWorkbenchClient
      initialProperty={initialProperty}
      newLeads={newLeads}
      recentlyContactedProperties={recentlyContactedProperties}
    />
  )
}
