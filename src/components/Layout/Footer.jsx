import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>
                <div className={styles.footerGrid}>
                    <div className={styles.footerSection}>
                        <h3>Boeing Airways</h3>
                        <p>Your premier choice for air travel excellence. We provide safe, comfortable, and reliable flights to destinations worldwide.</p>
                        <div className={styles.socialLinks}>
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <span className={styles.socialIcon}>📘</span>
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <span className={styles.socialIcon}>🐦</span>
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <span className={styles.socialIcon}>📸</span>
                            </a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                                <span className={styles.socialIcon}>💼</span>
                            </a>
                        </div>
                    </div>

                    <div className={styles.footerSection}>
                        <h4>Quick Links</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/flights">Flights</Link></li>
                            <li><Link to="/check-in">Check-in</Link></li>
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/contact">Contact</Link></li>
                        </ul>
                    </div>

                    <div className={styles.footerSection}>
                        <h4>Support</h4>
                        <ul className={styles.footerLinks}>
                            <li><Link to="/faq">FAQ</Link></li>
                            <li><Link to="/baggage">Baggage</Link></li>
                            <li><Link to="/refund">Refund Policy</Link></li>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                            <li><Link to="/terms">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div className={styles.footerSection}>
                        <h4>Contact Us</h4>
                        <ul className={styles.contactInfo}>
                            <li>
                                <span className={styles.contactIcon}>📞</span>
                                +1-800-BOEING
                            </li>
                            <li>
                                <span className={styles.contactIcon}>✉️</span>
                                support@boeingairways.com
                            </li>
                            <li>
                                <span className={styles.contactIcon}>📍</span>
                                123 Aviation Blvd, Seattle, WA 98101
                            </li>
                        </ul>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p>&copy; {new Date().getFullYear()} Boeing Airways. All rights reserved.</p>
                    <div className={styles.footerBottomLinks}>
                        <Link to="/privacy">Privacy</Link>
                        <Link to="/terms">Terms</Link>
                        <Link to="/cookies">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 