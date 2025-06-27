import React, { useState, useEffect } from 'react';
import styles from './Contact.module.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // Here you would typically send the form data to your backend
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    useEffect(() => {
        // Initialize map with Tan Son Nhat Airport coordinates
        const map = L.map('map').setView([10.8185, 106.6520], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add marker for Tan Son Nhat Airport
        L.marker([10.8185, 106.6520])
            .addTo(map)
            .bindPopup('Tan Son Nhat International Airport')
            .openPopup();

        // Cleanup
        return () => {
            map.remove();
        };
    }, []);

    return (
        <div className={styles.contactPage}>
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>Contact Us</h1>
                    <p>We're here to help. Reach out to us with any questions or concerns.</p>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.contactGrid}>
                    <div className={styles.contactInfo}>
                        <div className={styles.infoCard}>
                            <div className={styles.infoIcon}>📞</div>
                            <h3>Call Us</h3>
                            <p>+84-28-3848-5383</p>
                            <p className={styles.infoSubtext}>Available 24/7 for customer support</p>
                        </div>

                        <div className={styles.infoCard}>
                            <div className={styles.infoIcon}>✉️</div>
                            <h3>Email Us</h3>
                            <p>support@boeingairways.com</p>
                            <p className={styles.infoSubtext}>We'll respond within 24 hours</p>
                        </div>

                        <div className={styles.infoCard}>
                            <div className={styles.infoIcon}>🏢</div>
                            <h3>Visit Us</h3>
                            <p>Tan Son Nhat International Airport</p>
                            <p>Ho Chi Minh City, Vietnam</p>
                            <p className={styles.infoSubtext}>Monday - Friday, 9AM - 5PM</p>
                        </div>
                    </div>

                    <div className={styles.contactForm}>
                        <h2>Send us a Message</h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="subject">Subject</label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="message">Message</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows="5"
                                />
                            </div>

                            <button type="submit" className={styles.submitButton}>
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>

                <div className={styles.mapSection}>
                    <h2>Find Us</h2>
                    <div id="map" className={styles.map}></div>
                </div>
            </div>
        </div>
    );
};

export default Contact; 