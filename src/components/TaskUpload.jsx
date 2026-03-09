import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Paperclip, X, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_EXTENSIONS = '.pdf,.docx,.jpg,.jpeg,.png,.gif,.webp';
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TaskUpload = ({ conversationId, onUploaded, onCancel }) => {
  const { currentUser, userRole, sendMessage } = useAuth();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  // Prevent tab close while uploading
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploadState === 'uploading') {
        e.preventDefault();
        e.returnValue = 'Hay una subida en progreso. ¿Estás seguro de que quieres salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadState]);

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return 'Tipo de archivo no permitido. Solo PDF, DOCX e imágenes (JPG, PNG, GIF, WEBP).';
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `El archivo supera el límite de 20 MB (tamaño actual: ${formatBytes(f.size)}).`;
    }
    return '';
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const error = validateFile(selected);
    setValidationError(error);
    setFile(selected);
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    const error = validateFile(dropped);
    setValidationError(error);
    setFile(dropped);
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage('');
  }, []);

  const handleDragOver = (e) => e.preventDefault();

  const handleUpload = () => {
    if (!file || validationError || uploadState === 'uploading' || !currentUser) return;

    // Sanitize filename: remove special chars, keep extension
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `tareas/${currentUser.uid}/${conversationId}/${safeName}`;
    const storageRef = ref(storage, storagePath);

    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('[TaskUpload] Storage error:', error.code, error.message);
        setUploadState('error');
        setErrorMessage(
          error.code === 'storage/unauthorized'
            ? 'Sin permisos para subir archivos. Verifica las reglas de Storage.'
            : 'Error al subir el archivo. Intenta nuevamente.'
        );
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, 'tareas'), {
            conversationId,
            uploadedBy: currentUser.uid,
            uploaderName: currentUser.displayName || 'Usuario',
            uploaderRole: userRole || 'student',
            fileName: safeName,
            originalName: file.name,
            fileSize: file.size,
            fileType: file.type,
            downloadURL,
            storagePath,
            uploadedAt: new Date().toISOString(),
          });

          await sendMessage(conversationId, '', {
            downloadURL,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          });

          setUploadState('success');
          onUploaded?.({ fileName: safeName, downloadURL, fileType: file.type, fileSize: file.size });
        } catch (err) {
          console.error('[TaskUpload] Firestore error:', err.message);
          setUploadState('error');
          setErrorMessage('Archivo subido pero no se pudo guardar el registro. Contacta al soporte.');
        }
      }
    );
  };

  const handleReset = () => {
    setFile(null);
    setValidationError('');
    setUploadProgress(0);
    setUploadState('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Paperclip className="w-4 h-4 text-academic-blue" />
            Adjuntar Tarea
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={uploadState === 'uploading'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop zone */}
        {uploadState !== 'success' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer
              ${file && !validationError ? 'border-academic-blue bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS}
              className="hidden"
              onChange={handleFileChange}
            />
            {!file ? (
              <div className="space-y-1">
                <UploadCloud className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600 font-medium">Arrastra un archivo o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400">PDF, DOCX, imágenes — máximo 20 MB</p>
              </div>
            ) : (
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-10 bg-academic-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Paperclip className="w-5 h-5 text-academic-blue" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
                {uploadState === 'idle' && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    title="Quitar archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Validation error */}
        {validationError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{validationError}</p>
          </div>
        )}

        {/* Progress bar */}
        {uploadState === 'uploading' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Subiendo…
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-academic-blue to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">No cierres esta pestaña hasta que termine la subida.</p>
          </div>
        )}

        {/* Success state */}
        {uploadState === 'success' && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700">¡Archivo subido correctamente!</p>
              <p className="text-xs text-gray-500 truncate">{file?.name}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-green-600 hover:text-green-800 font-semibold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Upload error */}
        {uploadState === 'error' && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-700">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setUploadState('idle')}
              className="text-xs text-red-600 hover:text-red-800 font-semibold flex-shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Action buttons */}
        {uploadState === 'idle' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || !!validationError}
              className="flex-1 py-2 bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Subir Archivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskUpload;
