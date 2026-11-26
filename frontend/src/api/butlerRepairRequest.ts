import api from './api';
import type {
  CreateRepairTicketInput,
  RepairTicket,
  RepairTicketListResponse,
  TicketStatus,
  UpdateRepairTicketInput,
} from '@/types/butlerRepairRequest';

export async function getButlerRepairRequestsApi(
  status?: 'all' | TicketStatus,
): Promise<RepairTicketListResponse> {
  const { data } = await api.get<RepairTicketListResponse>('/butler-repair-request', {
    params: status && status !== 'all' ? { status } : undefined,
  });
  return data;
}

export async function createButlerRepairRequestApi(
  payload: CreateRepairTicketInput,
): Promise<RepairTicket> {
  const { data } = await api.post<RepairTicket>('/butler-repair-request', payload);
  return data;
}

export async function updateButlerRepairRequestApi(
  id: string,
  payload: UpdateRepairTicketInput,
): Promise<RepairTicket> {
  const { data } = await api.patch<RepairTicket>(`/butler-repair-request/${id}`, payload);
  return data;
}

export async function deleteButlerRepairRequestApi(id: string): Promise<void> {
  await api.delete(`/butler-repair-request/${id}`);
}
