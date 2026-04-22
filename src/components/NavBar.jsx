import { NavLink } from "react-router-dom";
import { Map, Activity, User } from "lucide-react";
import styles from "./NavBar.module.css";

export default function NavBar() {
  return (
    <nav className={`${styles.nav} glass-panel`}>
      <ul className={styles.navList}>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <Map className={styles.icon} size={24} />
            <span className={styles.label}>Map</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <Activity className={styles.icon} size={24} />
            <span className={styles.label}>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ""}`
            }
          >
            <User className={styles.icon} size={24} />
            <span className={styles.label}>Profile</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
