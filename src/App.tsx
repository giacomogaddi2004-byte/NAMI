import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Gate } from './auth/screens'
import { TabBar } from './components/TabBar'
import { UpdateBanner } from './components/UpdateBanner'
import { DataProvider } from './data/store'
import { SetupGate } from './screens/Setup'
import { Invita } from './screens/Invita'
import { Aggiungi } from './screens/Aggiungi'
import { Conto } from './screens/Conto'
import { Home } from './screens/Home'
import { Impostazioni } from './screens/Impostazioni'
import { Movimenti } from './screens/Movimenti'
import { Budget } from './screens/Budget'
import { Esporta } from './screens/Esporta'
import { Regole } from './screens/Regole'
import { Sicurezza } from './screens/Sicurezza'
import { Saldo } from './screens/Saldo'
import { Salvadanai } from './screens/Salvadanai'
import { Salvadanaio } from './screens/Salvadanaio'
import { SpesaFissa } from './screens/SpesaFissa'
import { VersaPreleva } from './screens/VersaPreleva'
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
      <UpdateBanner />
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
        <Route path="/spesa-fissa/:id" element={<SpesaFissa />} />
        <Route path="/salvadanaio/:id" element={<Salvadanaio />} />
        <Route path="/salvadanaio/:id/:action" element={<VersaPreleva />} />
        <Route path="/movimento/:id" element={<Aggiungi />} />
        <Route path="/conto/:id" element={<Conto />} />
        <Route path="/saldo/:view" element={<Saldo />} />
        <Route path="/regole" element={<Regole />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/sicurezza" element={<Sicurezza />} />
        <Route path="/esporta" element={<Esporta />} />
        <Route path="/invita" element={<Invita />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </SetupGate>
      </DataProvider>
      </Gate>
    </div>
  )
}
