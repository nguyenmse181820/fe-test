import React from 'react';
import styles from './About.module.css';

const About = () => {
    return (
        <div className={styles.aboutPage}>
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>About Boeing Airways</h1>
                    <p className={styles.heroSubtitle}>Your Premier Choice for Air Travel Excellence</p>
                </div>
            </div>

            <div className={styles.content}>
                <section className={styles.missionSection}>
                    <h2>Our Mission</h2>
                    <p>To provide safe, comfortable, and reliable flights while delivering exceptional service to our passengers worldwide.</p>
                </section>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>✈️</div>
                        <div className={styles.statNumber}>100+</div>
                        <div className={styles.statLabel}>Destinations</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>👥</div>
                        <div className={styles.statNumber}>1M+</div>
                        <div className={styles.statLabel}>Happy Passengers</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>🛩️</div>
                        <div className={styles.statNumber}>50+</div>
                        <div className={styles.statLabel}>Modern Aircraft</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>⭐</div>
                        <div className={styles.statNumber}>4.9</div>
                        <div className={styles.statLabel}>Customer Rating</div>
                    </div>
                </div>

                <section className={styles.valuesSection}>
                    <h2>Our Values</h2>
                    <div className={styles.valuesGrid}>
                        <div className={styles.valueCard}>
                            <h3>Safety First</h3>
                            <p>We prioritize the safety and security of our passengers above all else.</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3>Customer Excellence</h3>
                            <p>Delivering exceptional service and memorable travel experiences.</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3>Innovation</h3>
                            <p>Continuously improving our services and embracing new technologies.</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3>Sustainability</h3>
                            <p>Committed to reducing our environmental impact and promoting eco-friendly practices.</p>
                        </div>
                    </div>
                </section>

                <section className={styles.teamSection}>
                    <h2>Our Leadership Team</h2>
                    <div className={styles.teamGrid}>
                        <div className={styles.teamCard}>
                            <div className={styles.teamImage}>👨‍✈️</div>
                            <h3>John Smith</h3>
                            <p>Chief Executive Officer</p>
                        </div>
                        <div className={styles.teamCard}>
                            <div className={styles.teamImage}>👩‍✈️</div>
                            <h3>Sarah Johnson</h3>
                            <p>Chief Operations Officer</p>
                        </div>
                        <div className={styles.teamCard}>
                            <div className={styles.teamImage}>👨‍💼</div>
                            <h3>Michael Chen</h3>
                            <p>Chief Technology Officer</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default About; 