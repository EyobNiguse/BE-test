import { SignupCredentials } from '@/types/types';
import { LoginCredentials } from '@/types/types';
import { apiClient } from './api-client';
import { AxiosError } from 'axios';



export const auth = {
    // Login: Authenticate a user with email and password
    async login(credentials: LoginCredentials) {
        try {
            const response = await apiClient.post('/auth/login', credentials);
            console.log(response,"not working") 
            return response.data;
        } catch (error) {
            if (error instanceof AxiosError) {
                throw new Error(error.response?.data.message || 'Login failed');
            }
            throw error;

        }

    },
    // Signup: Create a new user with email and password
    async signup(credentials: SignupCredentials) {
        try {
            const response = await apiClient.post('/auth/register', credentials);
            return response.data;
        } catch (error) {
            if (error instanceof AxiosError) {
                throw new Error(error.response?.data.message || 'Signup failed');
            }
            throw error;
        }
    }
}