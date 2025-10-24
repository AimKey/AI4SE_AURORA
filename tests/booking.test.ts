import { BookingController } from '../src/controllers/booking.controller';
import * as bookingService from '../src/services/booking.service';
import { MUA } from '../src/models/muas.models';

// Simple mock res helper
function createMockRes() {
  const res: any = {};
  res.status = jest.fn().mockImplementation(() => res);
  res.json = jest.fn().mockImplementation(() => res);
  return res as unknown as any;
}

describe('BookingController.markCompleted', () => {
  const controller = new BookingController();

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('Happy path: token contains muaId -> calls markBookingCompleted and returns 200', async () => {
    const req: any = { params: { id: 'b1' }, user: { muaId: 'mua1', userId: 'u1' } };
    const res = createMockRes();

    const returned = { id: 'b1', status: 'COMPLETED' };
    const markSpy = jest.spyOn(bookingService, 'markBookingCompleted').mockResolvedValue(returned as any);
    const muaFindSpy = jest.spyOn(MUA, 'findOne');

    await controller.markCompleted(req as any, res as any);

    expect(markSpy).toHaveBeenCalledWith('b1', 'mua1');
    expect(muaFindSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: returned }));
  });

  test('Fallback: token missing muaId but userId present -> resolves MUA and proceeds', async () => {
    const req: any = { params: { id: 'b2' }, user: { userId: 'u2' } };
    const res = createMockRes();

    const muaDoc = { _id: 'mua2' };
    // Mock chained query: findOne().select('_id').lean()
    jest.spyOn(MUA, 'findOne').mockReturnValue({ select: () => ({ lean: () => Promise.resolve(muaDoc) }) } as any);

    const returned = { id: 'b2', status: 'COMPLETED' };
    const markSpy = jest.spyOn(bookingService, 'markBookingCompleted').mockResolvedValue(returned as any);

    await controller.markCompleted(req as any, res as any);

    expect((MUA.findOne as jest.Mock).mock.calls[0][0]).toEqual({ userId: 'u2' });
    expect(markSpy).toHaveBeenCalledWith('b2', 'mua2');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: returned }));
  });

  test('Unauthorized: no muaId and no userId -> returns 401 and does not call services', async () => {
    const req: any = { params: { id: 'b3' }, user: {} };
    const res = createMockRes();

    const muaFindSpy = jest.spyOn(MUA, 'findOne');
    const markSpy = jest.spyOn(bookingService, 'markBookingCompleted');

    await controller.markCompleted(req as any, res as any);

    expect(muaFindSpy).not.toHaveBeenCalled();
    expect(markSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 'unauthorized', message: 'Unauthorized' });
  });
});