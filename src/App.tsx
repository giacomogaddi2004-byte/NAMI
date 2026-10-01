import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Gate } from './auth/screens'
import { TabBar } from './components/TabBar'
import { DataProvider } from './data/store'
import { SetupGate } from './screens/Setup'
import { Invita } from './screens/Invita'
import { Aggiungi } from './screens/Aggiungi'
import { Conto } from './screens/Conto'
import { Home } from './screens/Home'
import { Impostazioni } from './screens/Impostazioni'
import { Movimenti } from './screens/Movimenti'
import { Salvadanai } from './screens/Salvadanai'
import { SpeseFisse } from './screens/SpeseFisse'
import { Statistiche } from './screens/Statistiche'

function WithTabBar() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

export function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <Gate>
      <DataProvider>
      <SetupGate>
      <Routes>
        <Route element={<WithTabBar />}>
          <Route path="/" element={<Home />} />
          <Route path="/movimenti" element={<Movimenti />} />
          <Route path="/salvadanai" element={<Salvadanai />} />
          <Route path="/statistiche" element={<Statistiche />} />
        </Route>
        <Route path="/aggiungi" element={<Aggiungi />} />
        <Route path="/impostazioni" element={<Impostazioni />} />
        <Route path="/spese-fisse" element={<SpeseFisse />} />
        <Route path="/movimento/:id" element={<Aggiungi />} />
        <Route path="/conto/:id" element={<Conto />} />
        <Route path="/invita" element={<Invita />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </SetupGate>
      </DataProvider>
      </Gate>
    </div>
  )
}
