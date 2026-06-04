import { Home, Rocket, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

function NavItem({ to, icon: Icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors duration-200 ${
          isActive ? 'text-[#3B82F6]' : 'text-[#64748B]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-14 flex items-center justify-around"
      style={{
        background: 'rgba(10, 14, 26, 0.95)',
        borderTop: '1px solid #1e293b',
        backdropFilter: 'blur(12px)',
      }}
    >
      <NavItem to="/" icon={Home} label="Home" />
      <NavItem to="/launch" icon={Rocket} label="Launch" />
      <NavItem to="/portfolio" icon={BarChart3} label="Portfolio" />
    </nav>
  );
}
