const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { z } = require('zod');
const ButlerRepairRequest = require('../models/ButlerRepairRequest');
const PropertyStatusAsset = require('../models/PropertyStatusAssets');

const TICKET_STATUS_VALUES = ['pending', 'in_progress', 'completed'];
const TICKET_PRIORITY_VALUES = ['urgent', 'normal', 'inspection'];

const listQuerySchema = z.object({
  status: z.enum(['all', ...TICKET_STATUS_VALUES]).optional(),
});

const createTicketSchema = z.object({
  roomNumber: z.string().trim().min(1, '請填寫房號').max(50),
  address: z.string().trim().max(200).optional().default(''),
  tenantName: z.string().trim().max(100).optional().default(''),
  category: z.string().trim().min(1).max(50).optional().default(''),
  title: z.string().trim().min(1, '請填寫報修／派工事項說明').max(200),
  butlerName: z.string().trim().min(1).max(50).optional().default(''),
  priority: z.enum(TICKET_PRIORITY_VALUES).optional().default('normal'),
  status: z.enum(TICKET_STATUS_VALUES).optional().default('pending'),
  estimatedCost: z.coerce.number().finite().nonnegative().max(1000000000).optional().default(0),
});

const updateTicketSchema = z
  .object({
    roomNumber: z.string().trim().min(1).max(50).optional(),
    address: z.string().trim().max(200).optional(),
    tenantName: z.string().trim().max(100).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    butlerName: z.string().trim().min(1).max(50).optional(),
    priority: z.enum(TICKET_PRIORITY_VALUES).optional(),
    status: z.enum(TICKET_STATUS_VALUES).optional(),
    estimatedCost: z.coerce.number().finite().nonnegative().max(1000000000).optional(),
  })
  .strict();

function serializeTicket(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
  return {
    id: String(item._id),
    ticketCode: item.ticketCode,
    roomNumber: item.roomNumber || '',
    address: item.address || '未填寫地址',
    tenantName: item.tenantName || '無特定房客',
    category: item.category || null,
    title: item.title || '',
    butlerName: item.butlerName || null,
    priority: item.priority || 'normal',
    status: item.status || 'pending',
    estimatedCost: Number(item.estimatedCost || 0),
    createdAt: createdDate.toISOString().slice(0, 10).replace(/-/g, '/'),
  };
}

async function generateTicketCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = String(crypto.randomInt(1000, 9999));
    const ticketCode = `WO-${suffix}`;
    const existing = await ButlerRepairRequest.exists({ ticketCode });
    if (!existing) {
      return ticketCode;
    }
  }
  throw new Error('工單編號生成失敗');
}

// 同步處於 maintenance 狀態且尚未建立工單的物件
async function syncMaintenanceAssetsToTickets() {
  const maintenanceAssets = await PropertyStatusAsset.find(
    { status: 'maintenance' },
    'roomNumber address tenantName maintenanceReason'
  ).lean();

  if (maintenanceAssets.length === 0) return;

  const existingRooms = new Set(
    await ButlerRepairRequest.distinct('roomNumber')
  );

  for (const asset of maintenanceAssets) {
    if (existingRooms.has(asset.roomNumber)) continue;

    const ticketCode = `WO-${asset.roomNumber}`;
    try {
      await ButlerRepairRequest.updateOne(
        { ticketCode },
        {
          $setOnInsert: {
            ticketCode,
            roomNumber: asset.roomNumber,
            address: asset.address || '託管地址',
            tenantName: asset.tenantName || '裝修空置',
            category: '裝修維護',
            title: asset.maintenanceReason || '全室定期裝修維護與設備翻新工程',
            butlerName: null,
            priority: 'normal',
            status: 'in_progress',
            estimatedCost: 4500,
          },
        },
        { upsert: true }
      );
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }
}

async function listRepairRequests(req, res) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: '查詢參數格式錯誤' });
  }

  await syncMaintenanceAssetsToTickets();

  const [allTickets, assets] = await Promise.all([
    ButlerRepairRequest.find({}).sort({ createdAt: -1 }).lean(),
    PropertyStatusAsset.find({}, 'roomNumber roomType address tenantName')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const counts = {
    all: allTickets.length,
    pending: allTickets.filter((t) => t.status === 'pending').length,
    in_progress: allTickets.filter((t) => t.status === 'in_progress').length,
    completed: allTickets.filter((t) => t.status === 'completed').length,
    totalCost: allTickets.reduce((sum, t) => sum + Number(t.estimatedCost || 0), 0),
  };

  const { status } = parsed.data;
  const filtered =
    status && status !== 'all'
      ? allTickets.filter((t) => t.status === status)
      : allTickets;

  const roomOptions = assets.map((asset) => ({
    id: String(asset._id),
    roomNumber: asset.roomNumber,
    roomType: asset.roomType || '',
    address: asset.address || '',
    tenantName: asset.tenantName || '',
  }));

  return res.json({
    tickets: filtered.map((t) => serializeTicket(t)),
    counts,
    roomOptions,
  });
}

async function createRepairRequest(req, res) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || '輸入格式錯誤' });
  }

  let ticketCode;
  try {
    ticketCode = await generateTicketCode();
  } catch {
    return res.status(409).json({ message: '工單編號生成失敗，請稍後再試' });
  }

  try {
    const created = await ButlerRepairRequest.create({
      ticketCode,
      roomNumber: parsed.data.roomNumber,
      address: parsed.data.address || '未填寫地址',
      tenantName: parsed.data.tenantName || '無特定房客',
      category: parsed.data.category,
      title: parsed.data.title,
      butlerName: parsed.data.butlerName,
      priority: parsed.data.priority,
      status: parsed.data.status,
      estimatedCost: Number(parsed.data.estimatedCost || 0),
    });

    return res.status(201).json(serializeTicket(created));
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.ticketCode) {
      return res.status(409).json({ message: '工單編號衝突，請稍後再試' });
    }
    throw error;
  }
}

async function updateRepairRequest(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: '無效的工單 ID' });
  }

  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: parsed.error.issues[0]?.message || '輸入格式錯誤' });
  }

  const updated = await ButlerRepairRequest.findByIdAndUpdate(
    id,
    { $set: parsed.data },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return res.status(404).json({ message: '找不到報修派工單' });
  }

  return res.json(serializeTicket(updated));
}

async function deleteRepairRequest(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: '無效的工單 ID' });
  }

  const deleted = await ButlerRepairRequest.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ message: '找不到報修派工單' });
  }

  return res.status(204).end();
}

module.exports = {
  listRepairRequests,
  createRepairRequest,
  updateRepairRequest,
  deleteRepairRequest,
};
