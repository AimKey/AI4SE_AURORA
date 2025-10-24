export interface ISlot {
  slotId: string;
  customerId?: string;
  serviceId?: string;
  customerName?: string;
  serviceName?: string;
  totalPrice?: number;
  address?:string;
  phoneNumber?:string;
  status?:string;
  day: string; 
  startTime: string;
  endTime: string;
  type: string;
  note?: string;
  createdAt?:string;
  updatedAt?:string;
}


export interface IWeeklySlot {
  muaId: string;
  weekStart: string;      // ⚠️ RedisJSON không lưu được Date, nên nên đổi thành string ISO
  weekStartStr: string;
  slots: Record<string, ISlot>;
}

export interface IFinalSlot {
  muaId: string;
  weekStart: string;      // ⚠️ RedisJSON không lưu được Date, nên nên đổi thành string ISO
  weekStartStr: string;
  slots: ISlot[];
}
