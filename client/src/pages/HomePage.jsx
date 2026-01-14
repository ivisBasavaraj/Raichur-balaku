import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import NewsAPIFeed from '../components/NewsAPIFeed';
import styles from './HomePage.module.css'; // Assuming we create this or use inline styles converted

const HomePage = () => {
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNewspapers = async () => {
            try {
                const { data } = await axios.get('/api/user/newspapers');
                setNewspapers(data.newspapers);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchNewspapers();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className={styles.container}>
            <h1>Paper Gallery</h1>
            <div className={styles.galleryGrid}>
                {newspapers.map((paper) => (
                    <div key={paper._id} className={styles.card}>
                        <Link to={`/newspaper/${paper._id}`}>
                            <div className={styles.preview}>
                                {paper.coverImageUrl ? (
                                    <img src={paper.coverImageUrl} alt={paper.title} />
                                ) : (
                                    <span>{paper.title}</span>
                                )}
                            </div>
                            <div className={styles.info}>
                                <h3>{paper.title}</h3>
                                <p className={styles.date}>{new Date(paper.date).toLocaleDateString()}</p>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            <NewsAPIFeed />
        </div>
    );
};

export default HomePage;
