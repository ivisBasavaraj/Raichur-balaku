import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from './InteractivePDFViewer.module.css';

// Worker src should be set once in the app, but safe to set here if needed, or in App.jsx
// 'pdfjs-dist/build/pdf.worker.min.mjs'

const InteractivePDFViewer = ({
    pdfUrl,
    mappedAreas,
    onAreaClick,
    pageNumber = 1,
    scale = 1.0,
    onDocumentLoadSuccess
}) => {

    function internalOnLoadSuccess({ numPages }) {
        if (onDocumentLoadSuccess) {
            onDocumentLoadSuccess({ numPages });
        }
    }

    // Filter areas for current page
    const currentAreas = mappedAreas ? mappedAreas.filter(area => Number(area.pageNumber) === Number(pageNumber)) : [];

    useEffect(() => {
        console.log(`Page ${pageNumber}: Showing ${currentAreas.length} areas out of ${mappedAreas?.length || 0}`);
    }, [pageNumber, mappedAreas, currentAreas.length]);

    return (
        <div className={styles.viewerContainer}>
            {/* Controls moved to parent */}

            <div className={styles.pdfWrapper}>
                <Document
                    file={pdfUrl}
                    onLoadSuccess={internalOnLoadSuccess}
                    className={styles.document}
                    loading={<div style={{ color: 'white' }}>Loading PDF...</div>}
                >
                    <div className={styles.pageContainer}>
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            renderMode="canvas"
                            className={styles.pdfPage}
                        />
                        {/* Overlay Mapped Areas */}
                        {currentAreas.map((area, index) => {
                            if (area.extractedImageUrl) {
                                console.log(`Applying area "${area.headline}" at ${area.coordinates.x}% , ${area.coordinates.y}%`);
                            }
                            return (
                                <div
                                    key={index}
                                    className={styles.mappedArea}
                                    style={{
                                        width: `${area.coordinates.width}%`,
                                        height: `${area.coordinates.height}%`,
                                        left: `${Number(area.coordinates.x).toFixed(4)}%`,
                                        top: `${Number(area.coordinates.y).toFixed(4)}%`,
                                        zIndex: 100 + index
                                    }}
                                    onClick={() => onAreaClick(area)}
                                    title={area.headline}
                                >
                                    {area.extractedImageUrl && (
                                        <img
                                            src={area.extractedImageUrl}
                                            alt=""
                                            className={styles.areaSnippet}
                                            style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Document>
            </div>
        </div>
    );
};

export default InteractivePDFViewer;
