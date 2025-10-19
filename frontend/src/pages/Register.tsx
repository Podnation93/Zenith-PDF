import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Center,
  Container,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
  Link,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { useAuthStore } from '../store/auth.store';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { register, error, isLoading, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await register({ email, password, firstName, lastName });
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <Center minH="100vh" bgGradient="linear(to-br, brand.50, brand.100)">
      <Container maxW="md">
        <Box bg="white" p={8} borderRadius="lg" boxShadow="xl">
          <VStack spacing={6} align="stretch">
            <Box textAlign="center">
              <Heading size="xl" color="gray.900">
                Create Account
              </Heading>
              <Text color="gray.600" mt={2}>
                Join Zenith PDF
              </Text>
            </Box>

            <form onSubmit={handleSubmit}>
              <VStack spacing={4} align="stretch">
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <FormControl>
                      <FormLabel htmlFor="firstName">First Name</FormLabel>
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                    </FormControl>
                  </GridItem>

                  <GridItem>
                    <FormControl>
                      <FormLabel htmlFor="lastName">Last Name</FormLabel>
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                      />
                    </FormControl>
                  </GridItem>
                </Grid>

                <FormControl isRequired>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                  />
                  <FormHelperText>At least 8 characters</FormHelperText>
                </FormControl>

                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  loadingText="Creating account..."
                >
                  Create account
                </Button>
              </VStack>
            </form>

            <Text textAlign="center" fontSize="sm" color="gray.600">
              Already have an account?{' '}
              <Link as={RouterLink} to="/login" color="brand.600" fontWeight="medium">
                Sign in
              </Link>
            </Text>
          </VStack>
        </Box>
      </Container>
    </Center>
  );
}
