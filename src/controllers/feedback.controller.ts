import type { Request, Response } from 'express'; 
import { FeedbackService } from '../services/feedback.service'; 
import { MUA } from '../models/muas.models';


const svc = new FeedbackService(); 


export class FeedbackController { 
  async getMine(req: Request, res: Response) { 
    try { 
      const userId = (req as any).user?.userId as string; 
      const bookingId = (req.query.bookingId as string) || ''; 
      const data = await svc.getMine(userId, bookingId); 
      res.status(200).json(data); 
    } catch (e: any) { 
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' }); 
    } 
  } 

  async getRecentByMua(req: Request, res: Response) { 
    try { 
      const { muaId } = req.params as { muaId: string }; 
      const limit = Number((req.query.limit as string) || '5'); 
      const data = await svc.getRecentByMua(muaId, limit); 
      res.status(200).json({ status: 200, success: true, data }); 
    } catch (e: any) { 
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' }); 
    } 
  } 

  async create(req: Request, res: Response) { 
    try { 
      const userId = (req as any).user?.userId as string; 
      const { bookingId, rating, comment } = req.body || {}; 
      const data = await svc.create(userId, { bookingId, rating, comment }); 
      res.status(201).json(data); 
    } catch (e: any) { 
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' }); 
    } 
  } 

  async update(req: Request, res: Response) { 
    try { 
      const userId = (req as any).user?.userId as string; 
      const feedbackId = req.params.id; 
      const { rating, comment } = req.body || {}; 
      const data = await svc.update(userId, feedbackId, { rating, comment }); 
      res.status(200).json(data); 
    } catch (e: any) { 
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' }); 
    } 
  } 

  async remove(req: Request, res: Response) { 
    try { 
      const userId = (req as any).user?.userId as string; 
      const feedbackId = req.params.id; 
      await svc.remove(userId, feedbackId); 
      res.status(204).send(); 
    } catch (e: any) { 
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' }); 
    } 
  } 

  async getFeedbackSummaryByMua(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ code: 'unauthenticated' });
  
      let muaId: string | undefined = user.muaId;
      if (!muaId) {
        const mua = await MUA.findOne({ userId: user.userId }).select('_id');
        muaId = mua?._id?.toString();
      }
      if (!muaId) {
        return res.status(403).json({ code: 'forbidden', message: 'Only MUA can access this resource' });
      }
  
      const data = await svc.getFeedbackSummaryByMua(muaId);
      res.status(200).json({ status: 200, success: true, data });
    } catch (e: any) {
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' });
    }
  }

  async getFeedbackForService(req: Request, res: Response) {
    try {
      // Ensure user is authenticated
      const user = (req as any).user;
      if (!user) return res.status(401).json({ code: 'unauthenticated' });

      // Derive muaId from token or fallback lookup by userId
      let muaId: string | undefined = user.muaId;
      if (!muaId) {
        const mua = await MUA.findOne({ userId: user.userId }).select('_id');
        muaId = mua?._id?.toString();
      }
      if (!muaId) {
        return res.status(403).json({ code: 'forbidden', message: 'Only MUA can access this resource' });
      }

      const { serviceId } = req.params;
      const page = Number(req.query.page || '1');
      const limit = Number(req.query.limit || '5');
      const data = await svc.getFeedbackForService(muaId, serviceId, page, limit);
      res.status(200).json({ status: 200, success: true, data });
    } catch (e: any) {
      res.status(e.status || 500).json({ code: e.code || 'internal_error', message: e.message || 'Server error' });
    }
  }
} 
