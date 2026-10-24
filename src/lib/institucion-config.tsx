'use client'

import { createContext, useContext } from 'react'

interface InstitucionConfig {
  terminoRecuperatorio: string
}

const InstitucionConfigContext = createContext<InstitucionConfig>({
  terminoRecuperatorio: 'Recuperatorio',
})

export function InstitucionConfigProvider({
  config,
  children,
}: {
  config: InstitucionConfig
  children: React.ReactNode
}) {
  return (
    <InstitucionConfigContext.Provider value={config}>
      {children}
    </InstitucionConfigContext.Provider>
  )
}

export function useInstitucionConfig() {
  return useContext(InstitucionConfigContext)
}
