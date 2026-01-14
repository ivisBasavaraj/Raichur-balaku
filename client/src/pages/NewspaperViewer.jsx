import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
    FaSearchPlus, FaSearchMinus, FaChevronLeft, FaChevronRight,
    FaAngleDoubleLeft, FaAngleDoubleRight, FaCalendarAlt, FaThLarge
} from 'react-icons/fa';

import InteractivePDFViewer from '../components/InteractivePDFViewer';
import NewsModal from '../components/NewsModal';
import { useAuth } from '../context/AuthContext';
import styles from './NewspaperViewer.module.css';

const NewspaperViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [newspaper, setNewspaper] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Viewer State
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [selectedArea, setSelectedArea] = useState(null);

    useEffect(() => {
        const fetchNewspaper = async () => {
            try {
                // In a real app, we might fetch by date if 'id' is not provided
                // For now, we assume ID is passed or we fetch the latest based on date
                // Simplification based on existing API:
                const { data } = await axios.get(`/api/user/newspaper/${id}`);
                console.log("Full Newspaper Data Fetch:", data);
                console.log("Mapped Areas Count:", data.mappedAreas?.length);
                setNewspaper(data);
                if (data.date) {
                    setSelectedDate(new Date(data.date));
                }

                // Increment view count
                await axios.get(`/api/user/newspaper/${id}/view`);
            } catch (error) {
                console.error("Error fetching newspaper", error);
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchNewspaper();
        }
    }, [id]);

    const handleDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(user ? numPages : Math.min(numPages, 2)); // Limit for guests if needed
    };

    const changePage = (offset) => {
        setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
    };

    const setPage = (page) => {
        setPageNumber(Math.min(Math.max(1, page), numPages));
    };

    const handleZoom = (delta) => {
        setScale(prev => Math.min(Math.max(0.6, prev + delta), 2.5));
    };

    if (loading) return <div className={styles.loading}>Loading ePaper...</div>;
    if (!newspaper) return <div className={styles.error}>Newspaper not found</div>;

    return (
        <div className={styles.container}>
            {/* Header / Toolbar */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.logo}>Raichuru Belaku</div>
                    <div className={styles.datePickerWrapper}>
                        <FaCalendarAlt color="#666" />
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                </div>

                <div className={styles.headerCenter}>
                    {/* Page Navigation */}
                    <button className={styles.navButton} onClick={() => setPage(1)} disabled={pageNumber <= 1}>
                        <FaAngleDoubleLeft />
                    </button>
                    <button className={styles.navButton} onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
                        <FaChevronLeft />
                    </button>

                    <span className={styles.pageIndicator}>
                        Page {pageNumber} of {numPages}
                    </span>

                    <button className={styles.navButton} onClick={() => changePage(1)} disabled={pageNumber >= numPages}>
                        <FaChevronRight />
                    </button>
                    <button className={styles.navButton} onClick={() => setPage(numPages)} disabled={pageNumber >= numPages}>
                        <FaAngleDoubleRight />
                    </button>
                </div>

                <div className={styles.headerRight}>
                    <select style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}>
                        <option>Main Edition</option>
                    </select>

                    <button className={styles.toolButton} onClick={() => handleZoom(-0.1)} title="Zoom Out">
                        <FaSearchMinus />
                    </button>
                    <span style={{ width: '40px', textAlign: 'center', fontSize: '0.9rem' }}>{Math.round(scale * 100)}%</span>
                    <button className={styles.toolButton} onClick={() => handleZoom(0.1)} title="Zoom In">
                        <FaSearchPlus />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className={styles.mainContent}>
                {/* Sidebar Thumbnails */}
                <div className={styles.sidebar}>
                    {Array.from(new Array(numPages), (el, index) => (
                        <div
                            key={index}
                            className={`${styles.thumbnailContainer} ${pageNumber === index + 1 ? styles.thumbnailActive : ''}`}
                            onClick={() => setPage(index + 1)}
                        >
                            <div className={styles.thumbnailPage}>
                                {/* Placeholder for actual generic thumb */}
                                <span style={{ fontSize: '2rem', color: '#eee' }}>{index + 1}</span>
                            </div>
                            <div className={styles.thumbnailLabel}>Page {index + 1}</div>
                        </div>
                    ))}
                </div>

                {/* Viewer */}
                <div className={styles.viewerArea}>

                    {/* Floating Arrows */}
                    {pageNumber > 1 && (
                        <button className={`${styles.navArrow} ${styles.prevArrow}`} onClick={() => changePage(-1)}>
                            <FaChevronLeft size={24} />
                        </button>
                    )}

                    <InteractivePDFViewer
                        pdfUrl={newspaper.pdfUrl}
                        mappedAreas={newspaper.mappedAreas}
                        onAreaClick={setSelectedArea}
                        pageNumber={pageNumber}
                        scale={scale}
                        onDocumentLoadSuccess={handleDocumentLoadSuccess}
                    />

                    {pageNumber < numPages && (
                        <button className={`${styles.navArrow} ${styles.nextArrow}`} onClick={() => changePage(1)}>
                            <FaChevronRight size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* Modals */}
            {selectedArea && (
                <NewsModal area={selectedArea} onClose={() => setSelectedArea(null)} />
            )}

            {!user && (
                <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#fff3cd', color: '#856404', textAlign: 'center', padding: '10px', zIndex: 200 }}>
                    Guest Mode: Content limited. <a href="/login">Login</a> for full access.
                </div>
            )}
        </div>
    );
};

export default NewspaperViewer;
