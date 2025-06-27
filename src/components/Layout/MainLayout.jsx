import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const MainLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
};

export default MainLayout;
