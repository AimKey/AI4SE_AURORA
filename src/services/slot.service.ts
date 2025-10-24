import { fromUTC, toUTC } from "utils/timeUtils";
import { MUA_WorkingSlot, MUA_OverrideSlot, MUA_BlockedSlot } from "../models/muas.models";
import dayjs from "dayjs";
import { redisClient } from "../config/redis"; // Assuming you have redis client configured
import { getMondayOfWeek } from "utils/calendarUtils";

// Helper function to invalidate cache for affected weeks
export async function invalidateWeeklyCache(muaId: string, date?: Date | string) {
  try {
    if (date) {
      // Invalidate specific week
      const weekStart = getMondayOfWeek(dayjs(date).toDate(),"YYYY-MM-DD");
      const cacheKey = `weeklySlots:${muaId}:${weekStart}`;
      await redisClient.del(cacheKey);
    } else {
      // Invalidate all weeks for this MUA (for working slots that affect all weeks)
      const pattern = `weeklySlots:${muaId}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

// Update Working Slot
export async function updateWorkingSlot(
  slotId: string,
  weekday: string,
  startTime: string,
  endTime: string,
  note?: string
) {
  const slot = await MUA_WorkingSlot.findById(slotId);
  if (!slot) throw new Error("Working slot not found.");

  // If changing weekday, check for duplicate
  if (slot.weekday !== weekday) {
    const exists = await MUA_WorkingSlot.findOne({ muaId: slot.muaId, weekday });
    if (exists) throw new Error(`A working slot already exists for ${weekday}. Please update that slot instead.`);
  }

  const result = await MUA_WorkingSlot.findByIdAndUpdate(
    slotId,
    { weekday, startTime, endTime, note },
    { new: true }
  );
  
  // Invalidate cache for all weeks since working slots affect recurring schedule
  await invalidateWeeklyCache(slot.muaId!.toString());
  
  return result;
}

// Update Override Slot
export async function updateOverrideSlot(
  slotId: string,
  overrideStart: Date,
  overrideEnd: Date,
  note?: string
) {
  const slot = await MUA_OverrideSlot.findById(slotId);
  if (!slot) throw new Error("Override slot not found.");

  const startDay = toUTC(overrideStart);
  const endDay = toUTC(overrideEnd);

  const exists = await MUA_OverrideSlot.findOne({
    _id: { $ne: slotId },
    muaId: slot.muaId,
    overrideStart: { $gte: startDay, $lte: endDay },
  });
  if (exists) throw new Error("Another override slot already exists for this date.");

  const result = await MUA_OverrideSlot.findByIdAndUpdate(
    slotId,
    { overrideStart, overrideEnd, note },
    { new: true }
  );
  
  // Invalidate cache for the specific week of the override
  await invalidateWeeklyCache(slot.muaId!.toString(), overrideStart);
  
  return result;
}

// Update Blocked Slot
export async function updateBlockedSlot(
  slotId: string,
  blockStart: Date,
  blockEnd: Date,
  note?: string
) {
  const slot = await MUA_BlockedSlot.findById(slotId);
  if (!slot) throw new Error("Blocked slot not found.");

  const startDay = toUTC(blockStart);
  const endDay = toUTC(blockEnd);

  const overlap = await MUA_BlockedSlot.findOne({
    _id: { $ne: slotId },
    muaId: slot.muaId,
    blockStart: { $lt: endDay },
    blockEnd: { $gt: startDay },
  });
  if (overlap) {
      throw new Error(`This time range overlaps with an existing blocked slot: ${dayjs(overlap.blockStart).format('HH:mm')} - ${dayjs(overlap.blockEnd).format('HH:mm')}`);
  }

  const result = await MUA_BlockedSlot.findByIdAndUpdate(
    slotId,
    { blockStart, blockEnd, note },
    { new: true }
  );
  
  // Invalidate cache for the specific week of the blocked slot
  await invalidateWeeklyCache(slot.muaId!.toString(), blockStart);
  
  return result;
}



// Add Working Slot (check if weekday already has a slot)
export async function addWorkingSlot(muaId: string, weekday: string, startTime: string, endTime: string, note?: string) {
  const existing = await MUA_WorkingSlot.findOne({ muaId, weekday });
  if (existing) {
    throw new Error(`A working slot already exists for ${weekday}. Please update instead of adding a new one.`);
  }
  const result = await MUA_WorkingSlot.create({ muaId, weekday, startTime, endTime, note });
  
  // Invalidate cache for all weeks since working slots affect recurring schedule
  await invalidateWeeklyCache(muaId);
  
  return result;
}

// Add Override Slot (check if overrideStart date already exists for this mua)
export async function addOverrideSlot(muaId: string, overrideStart: Date, overrideEnd: Date, note?: string) {
  const startDay = toUTC(overrideStart);
  const endDay = toUTC(overrideEnd);
  
  // Check for existing override slot on the same day
  const dayStart = startDay.startOf('day');
  const dayEnd = startDay.endOf('day');
  
  const existing = await MUA_OverrideSlot.findOne({ 
    muaId, 
    overrideStart: { 
      $gte: dayStart.toDate(), 
      $lt: dayEnd.toDate() 
    }
  });
  
  if (existing) {
    throw new Error(`An override slot already exists for this date. Please update instead of adding a new one.`);
  }
  const result = await MUA_OverrideSlot.create({ muaId, overrideStart, overrideEnd, note });
  
  // Invalidate cache for the specific week of the override
  await invalidateWeeklyCache(muaId, overrideStart);
  
  return result;
}

// Add Blocked Slot (check for overlap with other block slots)
export async function addBlockedSlot(muaId: string, blockStart: Date, blockEnd: Date, note?: string) {
  const startTime = toUTC(blockStart);
  const endTime = toUTC(blockEnd);
  
  // Find overlapping blocked slots
  // Two ranges overlap if: startA < endB AND startB < endA
  const overlappingBlocks = await MUA_BlockedSlot.find({
    muaId,
    $and: [
      { blockStart: { $lt: endTime.toDate() } },    // existing block starts before new block ends
      { blockEnd: { $gt: startTime.toDate() } }     // existing block ends after new block starts
    ]
  });
  
  if (overlappingBlocks.length > 0) {
    const existingBlock = overlappingBlocks[0];
    throw new Error(`This time range overlaps with an existing blocked slot: ${dayjs(existingBlock.blockStart).format('HH:mm')} - ${dayjs(existingBlock.blockEnd).format('HH:mm')}`);
  }
  const result = await MUA_BlockedSlot.create({ muaId, blockStart, blockEnd, note });
  
  // Invalidate cache for the specific week of the blocked slot
  await invalidateWeeklyCache(muaId, blockStart);
  
  return result;
}

export async function deleteWorkingSlot(slotId: string) {
  const slot = await MUA_WorkingSlot.findById(slotId);
  if (!slot) throw new Error("Working slot not found.");
  
  const deleted = await MUA_WorkingSlot.findByIdAndDelete(slotId);
  
  // Invalidate cache for all weeks since working slots affect recurring schedule
  await invalidateWeeklyCache(slot.muaId!.toString());
  
  return deleted;
}

export async function deleteOverrideSlot(slotId: string) {
  const slot = await MUA_OverrideSlot.findById(slotId);
  if (!slot) throw new Error("Override slot not found.");
  
  const deleted = await MUA_OverrideSlot.findByIdAndDelete(slotId);
  
  // Invalidate cache for the specific week of the override
  await invalidateWeeklyCache(slot.muaId!.toString(), slot.overrideStart!.toString());
  
  return deleted;
}

export async function deleteBlockedSlot(slotId: string) {
  const slot = await MUA_BlockedSlot.findById(slotId);
  if (!slot) throw new Error("Blocked slot not found.");
  
  const deleted = await MUA_BlockedSlot.findByIdAndDelete(slotId);
  
  // Invalidate cache for the specific week of the blocked slot
  await invalidateWeeklyCache(slot.muaId!.toString(), slot.blockStart!.toString());
  
  return deleted;
}
