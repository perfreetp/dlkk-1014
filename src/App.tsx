import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Owners } from '@/pages/Owners';
import { Bills } from '@/pages/Bills';
import { Tasks } from '@/pages/Tasks';
import { Notifications } from '@/pages/Notifications';
import { Receipts } from '@/pages/Receipts';
import { Reports } from '@/pages/Reports';
import { Reconciliation } from '@/pages/Reconciliation';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
