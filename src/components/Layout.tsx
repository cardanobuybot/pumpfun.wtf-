import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0e1a' }}>
      <Header />
      <main className="flex-1 pt-14 pb-16 px-3">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
