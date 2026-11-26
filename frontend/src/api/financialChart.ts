import api from './api';
import type { FinancialChartResponse, FinancialPeriod } from '@/types/financialChart';

export async function getFinancialChartApi(
  period: FinancialPeriod = '6m',
): Promise<FinancialChartResponse> {
  const { data } = await api.get<FinancialChartResponse>('/financial-chart', {
    params: { period },
  });
  return data;
}

export async function exportFinancialChartCsvApi(): Promise<Blob> {
  const { data } = await api.get<Blob>('/financial-chart/export', {
    responseType: 'blob',
  });
  return data;
}
