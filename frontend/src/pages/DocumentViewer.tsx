import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useDocumentStore } from '../store/document.store';
import { websocketService } from '../services/websocket';

export default function DocumentViewer() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentDocument, fetchDocument, isLoading } = useDocumentStore();
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (!documentId) {
      navigate('/dashboard');
      return;
    }

    fetchDocument(documentId);

    // Connect to WebSocket
    const token = localStorage.getItem('accessToken');
    if (token && user?.id) {
      websocketService
        .connect(documentId, token, user.id)
        .then(() => {
          setWsConnected(true);
        })
        .catch((error) => {
          console.error('WebSocket connection failed:', error);
        });
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [documentId, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Document not found</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary mt-4">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              ← Back
            </button>
            <h1 className="text-lg font-medium text-gray-900">
              {currentDocument.originalFilename}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {wsConnected && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Connected
              </span>
            )}
            <button className="btn btn-secondary text-sm">Share</button>
            <button className="btn btn-primary text-sm">Export</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer Area */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">PDF Viewer</p>
            <p className="text-sm mt-2">
              PDF rendering with PDF.js will be implemented here
            </p>
            <p className="text-sm mt-1">Document ID: {documentId}</p>
            <p className="text-sm">Pages: {currentDocument.pageCount || 'Unknown'}</p>
          </div>
        </div>

        {/* Sidebar for annotations/comments */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Annotations</h3>
            <p className="text-sm text-gray-500">
              Annotation tools and comment threads will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
