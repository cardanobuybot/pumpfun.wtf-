import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import TokenDetail from './pages/TokenDetail';
import LaunchToken from './pages/LaunchToken';
import Portfolio from './pages/Portfolio';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/token/:id" element={<TokenDetail />} />
        <Route path="/launch" element={<LaunchToken />} />
        <Route path="/portfolio" element={<Portfolio />} />
      </Route>
    </Routes>
  );
}
