import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore } from './store/auth.store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DocumentViewer from './pages/DocumentViewer';

function App() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text color="gray.600">Loading...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors to console in development
        if (import.meta.env.DEV) {
          console.error('App Error Boundary caught error:', error, errorInfo);
        }
        // In production, send to error tracking service
        // TODO: Integrate with Sentry or similar service
      }}
      showDetails={import.meta.env.DEV}
    >
      <BrowserRouter>
        <Box minH="100vh">
          <Routes>
            <Route
              path="/login"
              element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/register"
              element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/dashboard"
              element={
                <ErrorBoundary>
                  {isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
                </ErrorBoundary>
              }
            />
            <Route
              path="/document/:documentId"
              element={
                <ErrorBoundary>
                  {isAuthenticated ? <DocumentViewer /> : <Navigate to="/login" />}
                </ErrorBoundary>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Box>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
