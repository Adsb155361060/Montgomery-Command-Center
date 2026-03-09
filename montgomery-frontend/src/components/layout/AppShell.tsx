import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell() {
  const [district, setDistrict] = useState('');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header district={district} onDistrictChange={setDistrict} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet context={{ district }} />
        </main>
      </div>
    </div>
  );
}
