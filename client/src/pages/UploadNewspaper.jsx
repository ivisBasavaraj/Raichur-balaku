import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as pdfjs from 'pdfjs-dist';
import styles from './UploadNewspaper.module.css';

// Use unpkg for worker which is more reliable for specific npm versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

const UploadNewspaper = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const generatePDFThumbnail = async (pdfBase64) => {
        try {
            // pdfBase64 is a dataURL, we need the raw base64
            const base64Data = pdfBase64.split(',')[1];
            const binaryData = atob(base64Data);
            const uint8Array = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                uint8Array[i] = binaryData.charCodeAt(i);
            }

            const loadingTask = pdfjs.getDocument({ data: uint8Array });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 0.5 }); // Use a lower scale for gallery thumbnails
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            console.error("Thumbnail generation error details:", error);
            console.error("Error Message:", error.message);
            return '';
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();

        if (!file) {
            alert('Please select a PDF file');
            return;
        }

        setUploading(true);

        try {
            const pdfData = await readFileAsBase64(file);

            // AUTOMATICALLY generate thumbnail from the PDF
            const coverData = await generatePDFThumbnail(pdfData);

            if (coverData) {
                console.log("Thumbnail generated successfully, size:", Math.round(coverData.length / 1024), "KB");
                // Optional: alert(`Thumbnail generated: ${Math.round(coverData.length / 1024)} KB`);
            } else {
                console.warn("Thumbnail generation failed, proceeding without cover image.");
                alert("Warning: Could not generate PDF thumbnail automatically. The paper will be uploaded without a preview.");
            }

            await axios.post('/api/admin/newspaper/upload', {
                title,
                description,
                date,
                pdfData,
                coverData
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
