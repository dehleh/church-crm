const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ChurchOS API',
      version: '1.0.0',
      description: 'Church CRM management platform API. Multi-tenant, JWT-secured.',
      contact: { name: 'ChurchOS Support' },
    },
    servers: [
      { url: '/api', description: 'API base path' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            member_number: { type: 'string', example: 'MBR-00001' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            gender: { type: 'string', enum: ['male', 'female'] },
            membership_status: { type: 'string', enum: ['active', 'inactive', 'transferred', 'deceased'] },
            membership_class: { type: 'string', enum: ['full', 'associate', 'youth', 'child'] },
            branch_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            transaction_type: { type: 'string', enum: ['income', 'expense'] },
            amount: { type: 'number' },
            description: { type: 'string' },
            reference: { type: 'string' },
            payment_method: { type: 'string', enum: ['cash', 'transfer', 'card', 'cheque', 'ussd'] },
            transaction_date: { type: 'string', format: 'date' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            event_type: { type: 'string', enum: ['sunday_service', 'midweek', 'special', 'conference', 'outreach'] },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time' },
            expected_attendance: { type: 'integer' },
            actual_attendance: { type: 'integer' },
          },
        },
        Communication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            body: { type: 'string' },
            channel: { type: 'string', enum: ['email', 'sms', 'whatsapp', 'push', 'in_app'] },
            audience: { type: 'string', enum: ['all', 'members', 'department', 'branch', 'custom'] },
            status: { type: 'string', enum: ['draft', 'scheduled', 'sent', 'failed'] },
            sent_count: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ChurchOS API Docs',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}

module.exports = { setupSwagger };
