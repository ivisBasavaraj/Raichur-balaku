import { useRef, useEffect } from 'react';
import { FaDownload, FaTimes, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import styles from './NewsModal.module.css';

const NewsModal = ({ area, onClose }) => {
    const modalRef = useRef();

    useEffect(() => {
        if (area) {
            console.log("Modal Area Keys:", Object.keys(area));
            console.log("Headline:", area.headline);
            console.log("Has Image:", !!area.extractedImageUrl);
            if (area.extractedImageUrl) {
                console.log("Image Data Sample:", area.extractedImageUrl.substring(0, 50));
            }
        }
    }, [area]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleDownload = () => {
        if (area.extractedImageUrl) {
            const link = document.createElement('a');
            link.href = area.extractedImageUrl;
            link.download = `article-${area.headline || 'news'}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!area) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} ref={modalRef}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>{area.headline || 'News Article'}</h3>
                    <div className={styles.modalActions}>
                        {area.extractedImageUrl && (
                            <button className={styles.actionBtn} onClick={handleDownload} title="Download Image">
                                <FaDownload />
                            </button>
                        )}
                        <button className={styles.closeBtn} onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    {area.extractedImageUrl ? (
                        <div className={styles.imageWrapper}>
                            <img src={area.extractedImageUrl} alt={area.headline} className={styles.newsImage} />
                        </div>
                    ) : (
                        <div className={styles.noImage}>
                            <p>No image snippet available.</p>
                            <small style={{ display: 'block', fontSize: '10px', color: '#999', marginTop: '10px' }}>
                                Object Keys: {Object.keys(area).join(', ')} <br />
                                Page: {area.pageNumber} | Headline: {area.headline} <br />
                                Data Length: {area.extractedImageUrl ? area.extractedImageUrl.length : 0} bytes
                            </small>
                        </div>
                    )}

                    <div className={styles.footer}>
                        <span className={styles.category}>{area.category}</span>
                        <div className={styles.socialShare}>
                            Share:
                            <FaWhatsapp className={styles.shareIcon} style={{ color: '#25D366' }} />
                            <FaFacebook className={styles.shareIcon} style={{ color: '#1877F2' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsModal;
