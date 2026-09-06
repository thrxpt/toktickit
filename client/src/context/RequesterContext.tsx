import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import type { Requester } from '../types/requester'

export const STORAGE_KEY = 'toktickit_requester_id'

export interface RequesterContextValue {
  selectedRequester: Requester | null
  requesters: Requester[]
  loading: boolean
  error: string | null
  contextKey: string
  setRequester: (requester: Requester) => void
  clearRequester: () => void
  reloadRequesters: () => Promise<void>
}

const RequesterContext = createContext<RequesterContextValue | undefined>(
  undefined,
)

export interface RequesterProviderProps {
  children: React.ReactNode
}

export function RequesterProvider({ children }: RequesterProviderProps) {
  const [selectedRequester, setSelectedRequester] =
    useState<Requester | null>(null)
  const [requesters, setRequesters] = useState<Requester[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRequesters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/requesters')
      if (!response.ok) {
        throw new Error('Failed to load requesters')
      }
      const data: Requester[] = await response.json()
      setRequesters(data)

      const storedId = localStorage.getItem(STORAGE_KEY)
      if (storedId) {
        const found = data.find((r) => String(r.id) === String(storedId))
        if (found) {
          setSelectedRequester(found)
        } else {
          // AC-05: Stored id was inactive or removed — discard persisted selection
          localStorage.removeItem(STORAGE_KEY)
          setSelectedRequester(null)
        }
      } else {
        setSelectedRequester(null)
      }
    } catch {
      setError('Unable to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRequesters()
  }, [loadRequesters])

  const setRequester = useCallback((requester: Requester) => {
    localStorage.setItem(STORAGE_KEY, String(requester.id))
    setSelectedRequester(requester)
  }, [])

  const clearRequester = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSelectedRequester(null)
  }, [])

  const contextKey = selectedRequester ? `req-${selectedRequester.id}` : 'none'

  const value: RequesterContextValue = {
    selectedRequester,
    requesters,
    loading,
    error,
    contextKey,
    setRequester,
    clearRequester,
    reloadRequesters: loadRequesters,
  }

  return (
    <RequesterContext.Provider value={value}>
      {children}
    </RequesterContext.Provider>
  )
}

export function useRequester(): RequesterContextValue {
  const context = useContext(RequesterContext)
  if (!context) {
    throw new Error('useRequester must be used within a RequesterProvider')
  }
  return context
}

export default RequesterContext
