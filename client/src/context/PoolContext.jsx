import { createContext, useContext } from 'react'

/**
 * DropPool Context Stub
 * Hardcoded POOL_MEMBERS and REJECTED_SCENARIO removed in favor of real server state.
 */
const PoolContext = createContext({})

export function PoolProvider({ children }) {
  return <PoolContext.Provider value={{}}>{children}</PoolContext.Provider>
}

export function usePool() {
  return useContext(PoolContext) || {}
}
