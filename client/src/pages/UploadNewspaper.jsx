import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './UploadNewspaper.module.css';

const UploadNewspaper = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const submitHandler = async (e) => {
        e.preventDefault();

        if (!file) {
            alert('Please select a file');
            return;
        }

        setUploading(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const pdfData = reader.result; // This is the Base64 string

                await axios.post('/api/admin/newspaper/upload', {
                    title,
                    description,
                    date,
                    pdfData
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                setUploading(false);
                navigate('/admin/dashboard');
            } catch (error) {
                console.error("Upload failed", error);
                setUploading(false);
                alert('Upload failed: ' + (error.response?.data?.message || error.message));
            }
        };

        reader.onerror = () => {
            console.error('File reading failed');
            setUploading(false);
            alert('Failed to read file');
        };
    };

    return (
        <div className={styles.uploadContainer}>
            <div className={styles.formCard}>
                <h1>Upload New Newspaper</h1>
                <form onSubmit={submitHandler}>
                    <div className={styles.formGroup}>
                        <label>Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter newspaper title"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description"
                            rows="3"
                        ></textarea>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>PDF File</label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files[0])}
                            accept=".pdf"
                            required
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload Newspaper'}
                    </button>
                    <button type="button" className={styles.backBtn} onClick={() => navigate('/admin/dashboard')}>
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UploadNewspaper;
