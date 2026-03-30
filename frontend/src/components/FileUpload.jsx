import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUpload({ onFilesSelected, multiple = true, accept = { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'], 'application/msword': ['.doc', '.docx'], 'application/vnd.ms-excel': ['.xls', '.xlsx'] } }) {
    const [selectedFiles, setSelectedFiles] = useState([]);

    const onDrop = useCallback(acceptedFiles => {
        const newFiles = multiple ? [...selectedFiles, ...acceptedFiles] : acceptedFiles;
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
    }, [onFilesSelected, selectedFiles, multiple]);

    const removeFile = (index) => {
        const updated = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updated);
        onFilesSelected(updated);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple, accept });

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div>
            <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? 'var(--color-primary)' : '#cbd5e1'}`,
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                background: isDragActive ? 'var(--color-primary-light)' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: '#64748b'
            }}>
                <input {...getInputProps()} />
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                    <Upload size={28} color={isDragActive ? 'var(--color-primary)' : '#94a3b8'} />
                </div>
                {isDragActive ? (
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-primary)' }}>Suelte los archivos aquí...</p>
                ) : (
                    <>
                        <p style={{ margin: 0, fontWeight: 500, color: '#475569' }}>Arrastre y suelte archivos aquí, o haga clic para seleccionar</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Formatos permitidos: PDF, JPG, Word, Excel. Límite 10MB.</p>
                    </>
                )}
            </div>

            {selectedFiles.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedFiles.map((file, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', background: '#f1f5f9', borderRadius: 8,
                            fontSize: 13, color: '#334155'
                        }}>
                            <FileText size={16} color="#3b82f6" />
                            <span style={{ flex: 1, fontWeight: 500 }}>{file.name}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatSize(file.size)}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                                <X size={14} color="#ef4444" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
