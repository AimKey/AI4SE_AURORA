export interface CertificateImageDTO {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
  }
  
  export interface CreateCertificateDTO {
    title: string;
    issuer: string;
    description?: string;
    issueDate: Date | string;
    expireDate?: Date | string;
    image: CertificateImageDTO;
  }
  
  export interface UpdateCertificateDTO {
    title?: string;
    issuer?: string;
    description?: string;
    issueDate?: Date | string;
    expireDate?: Date | string;
    image?: CertificateImageDTO;
  }
  
  export interface CertificateResponseDTO {
    _id: string;
    muaId: string;
    title: string;
    issuer: string;
    description?: string;
    issueDate: string;
    expireDate?: string;
    image: CertificateImageDTO;
    createdAt: string;
    updatedAt: string;
  }