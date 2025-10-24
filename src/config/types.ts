export interface Config {
  // Server
  port: number;
  clientOrigin: string;
  
  // Database
  mongoUri: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;

  //azure
  azureClientId: string;
  azureClientSecret: string;
  azureTenantId: string;
  
  // Security
  jwtSecret: string;
  
  // Email Service
  smtpUser: string;
  sendgridApiKey:string;
  
  // Third-party services
  googleClientId: string;

  //Payos
  payosClientId: string;
  payosApiKey: string;
  payosChecksumKey: string;

  payosPOClientId: string;
  payosPOApiKey: string;
  payosPOChecksumKey: string;
  payosApiUrl: string;

  //Cloudinary
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  cloudinaryCloudName: string;
  
  // Environment
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
}
