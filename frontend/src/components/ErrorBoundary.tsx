import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  Container,
  Code,
  Collapse,
  useDisclosure,
  Icon,
} from '@chakra-ui/react';
import { MdError, MdRefresh, MdExpandMore, MdExpandLess } from 'react-icons/md';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
    console.error('Error logged to service:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReload={this.handleReload}
          showDetails={this.props.showDetails !== false}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
  showDetails: boolean;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onReset,
  onReload,
  showDetails,
}: FallbackProps) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Icon as={MdError} boxSize={16} color="red.500" mb={4} />
          <Heading size="xl" mb={2}>
            Oops! Something went wrong
          </Heading>
          <Text color="gray.600" fontSize="lg">
            We're sorry for the inconvenience. An unexpected error occurred.
          </Text>
        </Box>

        {error && (
          <Box
            bg="red.50"
            border="1px"
            borderColor="red.200"
            borderRadius="md"
            p={4}
          >
            <Text fontWeight="bold" color="red.700" mb={2}>
              Error: {error.message}
            </Text>
          </Box>
        )}

        <VStack spacing={3}>
          <Button
            leftIcon={<MdRefresh />}
            colorScheme="blue"
            size="lg"
            onClick={onReset}
            width="full"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onReload}
            width="full"
          >
            Reload Page
          </Button>
        </VStack>

        {showDetails && error && (
          <Box>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              rightIcon={isOpen ? <MdExpandLess /> : <MdExpandMore />}
              width="full"
            >
              {isOpen ? 'Hide' : 'Show'} Technical Details
            </Button>

            <Collapse in={isOpen} animateOpacity>
              <Box mt={4} p={4} bg="gray.50" borderRadius="md" overflowX="auto">
                <Text fontWeight="bold" mb={2}>
                  Stack Trace:
                </Text>
                <Code
                  display="block"
                  whiteSpace="pre-wrap"
                  p={3}
                  borderRadius="md"
                  fontSize="xs"
                >
                  {error.stack}
                </Code>

                {errorInfo?.componentStack && (
                  <>
                    <Text fontWeight="bold" mt={4} mb={2}>
                      Component Stack:
                    </Text>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={3}
                      borderRadius="md"
                      fontSize="xs"
                    >
                      {errorInfo.componentStack}
                    </Code>
                  </>
                )}
              </Box>
            </Collapse>
          </Box>
        )}

        <Box bg="blue.50" p={4} borderRadius="md">
          <Text fontSize="sm" color="gray.700">
            If this problem persists, please contact support with the error
            details above.
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}

/**
 * Functional Error Boundary Hook
 * For use with React 19+ when error boundaries become functional
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { handleError, resetError, error };
}
