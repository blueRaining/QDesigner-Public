import { createContext, useContext } from 'react'
import type { QDesignUser } from '/@/api/local/auth'

export interface HomeContextValue {
  user: QDesignUser | null
  loading: boolean
  viewMode: 'admin' | 'user'
  handleLogin: () => void
}

export const HomeContext = createContext<HomeContextValue>({
  user: null,
  loading: false,
  viewMode: 'user',
  handleLogin: () => {},
})

export const useHomeContext = () => useContext(HomeContext)
