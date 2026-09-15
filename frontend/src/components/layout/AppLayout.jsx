import Navbar from "./Navbar";
import "./AppLayout.css";

export function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-layout__main" id="main-content">
        {children}
      </main>
      <footer className="app-layout__footer">
        <div className="app-layout__footer-inner">
          <p className="app-layout__footer-text">
            © {new Date().getFullYear()} The National Institute of Engineering (NIE), Mysuru. All rights reserved.
          </p>
          <div className="app-layout__footer-links">
            <span className="app-layout__footer-link">Campus Security</span>
            <span className="app-layout__footer-link">Student Welfare</span>
            <span className="app-layout__footer-link">Institutional Portal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
