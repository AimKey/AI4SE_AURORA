import { ServicePackage } from '@models/services.models';
import type { ServiceResponseDTO } from 'types/service.dtos'; 
import mongoose from 'mongoose';

export const getServicesByMuaId = async (muaId: string) => {
  return ServicePackage.find({ muaId: new mongoose.Types.ObjectId(muaId) }).sort({ createdAt: -1 });
};

export const createService = async (muaId: string, serviceData: Partial<ServiceResponseDTO>) => {
  const service = new ServicePackage({
    ...serviceData,
    muaId: new mongoose.Types.ObjectId(muaId),
  });
  return service.save();
};

export const updateService = async (serviceId: string, serviceData: Partial<ServiceResponseDTO>) => {
  return ServicePackage.findByIdAndUpdate(serviceId, serviceData, { new: true, runValidators: true });
};

export const deleteService = async (serviceId: string) => {
  return ServicePackage.findByIdAndDelete(serviceId);
};

export const getServiceById = async (serviceId: string) => {
  return ServicePackage.findById(serviceId);
};
