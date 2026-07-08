import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Sidebar from './Sidebar';
import Header from './Header';

gsap.registerPlugin(useGSAP);

export default function AppShell({ children, currentTab, onTabChange, user, onLogout, title }) {
  const contentRef = useRef(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(contentRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  }, { dependencies: [children], scope: contentRef, revertOnUpdate: true });

  return (
    <div className="app-shell">
      <Sidebar currentTab={currentTab} onTabChange={onTabChange} />
      <div className="app-shell__workspace">
        <Header user={user} onLogout={onLogout} title={title} />
        <main className="app-shell__content overflow-x-hidden w-full max-w-full" id="main-content" ref={contentRef}>
          {children}
        </main>
      </div>
    </div>
  );
}
