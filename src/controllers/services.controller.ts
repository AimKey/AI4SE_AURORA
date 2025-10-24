import type { Request, Response } from 'express';
import * as servicesService from '@services/services.service';
import { ApiResponse } from 'utils/apiResponse';
import mongoose from 'mongoose';

// Get all services for a specific MUA
export const getAllByMua = async (req: Request, res: Response) => {
  try {
    const { muaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(muaId)) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid MUA ID'));
    }
    const services = await servicesService.getServicesByMuaId(muaId);
    res.status(200).json(new ApiResponse(200, services, 'Services retrieved successfully'));
  } catch (error: any) {
    res.status(500).json(new ApiResponse(500, null, error.message));
  }
};

// Create a new service for an MUA
export const create = async (req: Request, res: Response) => {
  try {
    const { muaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(muaId)) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid MUA ID'));
    }
    // TODO: Add validation for request body
    const newService = await servicesService.createService(muaId, req.body);
    res.status(201).json(new ApiResponse(201, newService, 'Service created successfully'));
  } catch (error: any) {
    res.status(500).json(new ApiResponse(500, null, error.message));
  }
};

// Update an existing service
export const update = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid Service ID'));
    }
    // TODO: Add validation for request body
    const updatedService = await servicesService.updateService(serviceId, req.body);
    if (!updatedService) {
      return res.status(404).json(new ApiResponse(404, null, 'Service not found'));
    }
    res.status(200).json(new ApiResponse(200, updatedService, 'Service updated successfully'));
  } catch (error: any) {
    res.status(500).json(new ApiResponse(500, null, error.message));
  }
};

// Delete a service
export const remove = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid Service ID'));
    }
    const deletedService = await servicesService.deleteService(serviceId);
    if (!deletedService) {
      return res.status(404).json(new ApiResponse(404, null, 'Service not found'));
    }
    res.status(200).json(new ApiResponse(200, null, 'Service deleted successfully'));
  } catch (error: any) {
    res.status(500).json(new ApiResponse(500, null, error.message));
  }
};
