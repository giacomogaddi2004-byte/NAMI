import { Link, NavLink } from 'react-router-dom'
import { Icon, ICONS } from './Icon'

const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined)

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      <NavLink to="/" end className={tabClass}>
        <Icon d={ICONS.home} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/movimenti" className={tabClass}>
        <Icon d={ICONS.list} />
        <span>Movimenti</span>
      </NavLink>
      <Link to="/aggiungi" className="plus" aria-label="Aggiungi movimento">
        <Icon d={ICONS.plus} size={28} color="#FFFFFF" width={2.6} />
      </Link>
      <NavLink to="/salvadanai" className={tabClass}>
        <Icon d={ICONS.piggy} />
        <span>Salvadanai</span>
      </NavLink>
      <NavLink to="/statistiche" className={tabClass}>
        <Icon d={ICONS.stats} />
        <span>Statistiche</span>
      </NavLink>
    </nav>
  )
}
