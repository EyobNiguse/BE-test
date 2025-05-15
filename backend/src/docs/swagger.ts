// src/docs/swagger.ts
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
dotenv.config();
// Define options for Swagger JSDoc
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Self-Publishing Platform API',
            version: '1.0.0',
            description: 'API documentation for the Self-Publishing Platform',
        },
        servers: [
            {
                url: process.env.BASE_URL || 'http://localhost:5000',
            },
        ],
    },
    apis: ['./src/routes/*.ts'],  // Path to the API docs (your route files)
};

// Create Swagger specification
const swaggerSpec = swaggerJSDoc(swaggerOptions);

export { swaggerUi, swaggerSpec };
