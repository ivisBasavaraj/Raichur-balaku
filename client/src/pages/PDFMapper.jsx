import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import * as fabric from 'fabric'; // v6 import, or 'fabric' for v5. Let's assume v5 for stability or check package.json usually. 
// Standard fabric.js usage often requires 'fabric' default export.
// React-pdf worker setup
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

import axios from 'axios';
import styles from './PDFMapper.module.css';

// We might need to handle fabric import differently depending on version installed.
// Assuming "fabric": "^5.x" which is common for React apps currently suitable for this.
// If v6, 'fabric' export is different. I'll stick to 'fabric' global-like import or commonjs style if needed, but ES import is standard.
// Actually, for broad compatibility in Vite:
import { Canvas, Rect } from 'fabric';

const PDFMapper = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [newspaper, setNewspaper] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);

    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const pdfCanvasRef = useRef(null);
    const [activeRect, setActiveRect] = useState(null);

    // Form state
    const [headline, setHeadline] = useState('');
    const [category, setCategory] = useState('other');
    const [newsImage, setNewsImage] = useState(null);

    useEffect(() => {
        const fetchNewspaper = async () => {
            try {
                const { data } = await axios.get(`/api/user/newspaper/${id}`);
                setNewspaper(data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching newspaper:", error);
                setLoading(false);
            }
        };
        fetchNewspaper();
    }, [id]);

    // Initialize Fabric Canvas on Page Change
    useEffect(() => {
        if (!canvasRef.current || !newspaper) return;

        // Dispose old canvas if exists
        const initCanvas = async () => {
            if (fabricCanvasRef.current) {
                await fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }

            // Create new canvas
            // We need to wait for PDF page to render to know dimensions, 
            // but we can init with 0 and strict sizing later.
            // For now, let's assume standard interaction.

            const canvas = new Canvas(canvasRef.current, {
                selection: false,
                width: 0,
                height: 0
            });

            fabricCanvasRef.current = canvas;

            // Add Drawing Mode logic
            let isDown = false;
            let origX = 0;
            let origY = 0;
            let rect = null;

            canvas.on('mouse:down', function (o) {
                // If we clicked on an active object, let fabric handle it (e.g. built-in drag/resize)
                if (canvas.getActiveObject()) return;

                if (activeRect) {
                    // If there is an active rect but we clicked elsewhere, maybe deselect or start new?
                    // For this simple mapper, let's enforce finishing one before starting another
                    return;
                }

                isDown = true;
                var pointer = canvas.getScenePoint(o.e); // v6: getScenePoint or getPointer
                origX = pointer.x;
                origY = pointer.y;

                rect = new Rect({
                    left: origX,
                    top: origY,
                    originX: 'left',
                    originY: 'top',
                    width: pointer.x - origX,
                    height: pointer.y - origY,
                    fill: 'rgba(74, 144, 226, 0.3)',
                    stroke: '#4a90e2',
                    strokeWidth: 2,
                    transparentCorners: false,
                    cornerColor: 'white',
                    cornerStrokeColor: '#4a90e2',
                    borderColor: '#4a90e2',
                    cornerSize: 10,
                    padding: 5
                });

                canvas.add(rect);
                canvas.setActiveObject(rect);
            });

            canvas.on('mouse:move', function (o) {
                if (!isDown) return;
                var pointer = canvas.getScenePoint(o.e);

                if (origX > pointer.x) {
                    rect.set({ left: Math.abs(pointer.x) });
                }
                if (origY > pointer.y) {
                    rect.set({ top: Math.abs(pointer.y) });
                }

                rect.set({ width: Math.abs(origX - pointer.x) });
                rect.set({ height: Math.abs(origY - pointer.y) });

                canvas.requestRenderAll();
            });

            canvas.on('mouse:up', function (o) {
                if (isDown) {
                    isDown = false;
                    if (rect) {
                        rect.setCoords();
                        setActiveRect(rect);
                    }
                }
            });

            // Handle object selection events if needed
            canvas.on('selection:created', (e) => {
                if (e.selected && e.selected.length > 0) {
                    setActiveRect(e.selected[0]);
                }
            });

            canvas.on('selection:cleared', () => {
                // Do not clear activeRect state immediately if we want to keep the form open?
                // Or maybe we do. Let's keep it simple: no selection = no form.
                // setActiveRect(null); 
            });
        }

        initCanvas();

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [pageNumber, newspaper]);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const captureSnippet = () => {
        if (!activeRect || !fabricCanvasRef.current || !pdfCanvasRef.current) {
            console.error("Capture failed: Missing refs");
            return null;
        }

        try {
            const pdfCanvas = pdfCanvasRef.current instanceof HTMLCanvasElement
                ? pdfCanvasRef.current
                : pdfCanvasRef.current.querySelector('canvas');

            if (!pdfCanvas) return null;

            // Get the bounding box of the rectangle in Fabric's coordinate system
            const rectBounds = activeRect.getBoundingRect();

            // Get scaling factors between the display fabric canvas and the internal PDF canvas
            const scaleX = pdfCanvas.width / fabricCanvasRef.current.width;
            const scaleY = pdfCanvas.height / fabricCanvasRef.current.height;

            const cropX = rectBounds.left * scaleX;
            const cropY = rectBounds.top * scaleY;
            const cropWidth = rectBounds.width * scaleX;
            const cropHeight = rectBounds.height * scaleY;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropWidth;
            tempCanvas.height = cropHeight;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(
                pdfCanvas,
                cropX, cropY, cropWidth, cropHeight,
                0, 0, cropWidth, cropHeight
            );

            return tempCanvas.toDataURL('image/jpeg', 0.9);
        } catch (err) {
            console.error("Auto-crop execution failed:", err);
            return null;
        }
    };

    const saveMappedArea = async () => {
        if (!activeRect) return;

        // Get actual current dimensions of the canvas
        const canvasWidth = fabricCanvasRef.current.width;
        const canvasHeight = fabricCanvasRef.current.height;
        const rectBounds = activeRect.getBoundingRect();

        const coords = {
            x: (rectBounds.left / canvasWidth) * 100,
            y: (rectBounds.top / canvasHeight) * 100,
            width: (rectBounds.width / canvasWidth) * 100,
            height: (rectBounds.height / canvasHeight) * 100
        };

        const processSave = async (extractedImageData) => {
            if (!extractedImageData || extractedImageData.length < 100) {
                alert(`Capture suspicious: Data length is only ${extractedImageData ? extractedImageData.length : 0} bytes. Capture might have failed.`);
                return;
            }

            try {
                const payload = {
                    pageNumber,
                    x: coords.x,
                    y: coords.y,
                    width: coords.width,
                    height: coords.height,
                    headline,
                    category,
                    imageData: extractedImageData
                };

                console.log("Sending mapping payload:", {
                    ...payload,
                    imageData: payload.imageData.substring(0, 100) + "..."
                });

                alert(`DEBUG: Captured data length: ${extractedImageData.length} characters.`);

                await axios.post(`/api/admin/newspaper/${id}/map-area`, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });

                alert(`Area mapped successfully! Snippet size: ${Math.round(extractedImageData.length / 1024)} KB`);
                setHeadline('');
                setCategory('other');
                setNewsImage(null);
                fabricCanvasRef.current.remove(activeRect);
                setActiveRect(null);
            } catch (error) {
                console.error(error);
                alert('Failed to map area: ' + (error.response?.data?.message || error.message));
            }
        };

        // If manual image exists, use it. Otherwise, AUTO-CROP from the PDF.
        if (newsImage) {
            const reader = new FileReader();
            reader.readAsDataURL(newsImage);
            reader.onloadend = () => processSave(reader.result);
        } else {
            const autoSnippet = captureSnippet();
            if (autoSnippet) {
                processSave(autoSnippet);
            } else {
                alert("Could not capture snippet. Please upload one manually.");
            }
        }
    };

    const cancelMapping = () => {
        if (activeRect && fabricCanvasRef.current) {
            fabricCanvasRef.current.remove(activeRect);
            setActiveRect(null);
        }
    };

    if (loading) return <div>Loading PDF...</div>;

    return (
        <div className={styles.mapperContainer}>
            <div className={styles.controls}>
                <button onClick={() => navigate('/admin/dashboard')}>&larr; Back</button>
                <div className={styles.pageNav}>
                    <button disabled={pageNumber <= 1} onClick={() => setPageNumber(prev => prev - 1)}>Prev</button>
                    <span>Page {pageNumber} of {numPages}</span>
                    <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(prev => prev + 1)}>Next</button>
                </div>
            </div>

            <div className={styles.workspace}>
                <div className={styles.pdfArea}>
                    <Document
                        file={newspaper?.pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(err) => console.error("PDF Load Error:", err)}
                        loading={<div style={{ color: '#333' }}>Loading PDF Data...</div>}
                        className={styles.pdfDocument}
                    >
                        <div className={styles.pageWrapper}>
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                renderMode="canvas"
                                inputRef={pdfCanvasRef}
                                className={styles.pdfPage}
                                onRenderSuccess={(result) => {
                                    console.log("PDF Page rendered successfully");
                                }}
                                onLoadSuccess={(page) => {
                                    const viewport = page.getViewport({ scale });
                                    if (fabricCanvasRef.current) {
                                        fabricCanvasRef.current.setDimensions({
                                            width: viewport.width,
                                            height: viewport.height
                                        });
                                        fabricCanvasRef.current.renderAll();
                                    }
                                }}
                            />
                            {/* Canvas overlay */}
                            <div className={styles.canvasOverlay}>
                                <canvas ref={canvasRef} />
                            </div>
                        </div>
                    </Document>
                </div>

                <div className={styles.sidebar}>
                    <h3>Map News Area</h3>
                    <p className={styles.instruction}>Draw a rectangle on the news article.</p>

                    {activeRect ? (
                        <div className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Headline</label>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={e => setHeadline(e.target.value)}
                                    placeholder="Enter headline"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="other">Select...</option>
                                    <option value="politics">Politics</option>
                                    <option value="sports">Sports</option>
                                    <option value="business">Business</option>
                                    <option value="entertainment">Entertainment</option>
                                    <option value="local">Local</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Extracted Image (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setNewsImage(e.target.files[0])}
                                />
                                <small>Upload cropped image of the article</small>
                            </div>

                            <div className={styles.actions}>
                                <button className={styles.saveBtn} onClick={saveMappedArea}>Save Area</button>
                                <button className={styles.cancelBtn} onClick={cancelMapping}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.placeholder}>
                            Start drawing on the PDF to map an area.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PDFMapper;
