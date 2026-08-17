import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UpgradeBanner } from './UpgradeBanner';

export const Layout: React.FC = () => {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar onUpgradeClick={() => setUpgradeModalOpen(true)} />

      {/* Main Container */}
      <div className="flex-1 pl-60 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ openUpgradeModal: () => setUpgradeModalOpen(true) }} />
        </main>
      </div>

      {/* Upgrade Banner Modal */}
      <UpgradeBanner isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
    </div>
  );
};
