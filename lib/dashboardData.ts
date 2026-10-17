import { supabase } from './supabaseClient';
import type { Order } from '../types';

interface CartSnapshot {
  productId?: string;
  title?: string;
  variant?: string;
  quantity?: number;
  unitPrice?: number;
  image?: string;
}

interface SessionRow {
  id: string;
  customer_name: string | null;
  contact_email: string | null;
  roblox_username: string | null;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  delivery_status: string | null;
  total_amount: number | null;
  created_at: string;
  verified_at: string | null;
  cart_items: CartSnapshot[] | null;
}

function toOrder(row: SessionRow): Order {
  const items = Array.isArray(row.cart_items) ? row.cart_items : [];
  const first = items[0];
  const delivery = row.delivery_status;
  const status: Order['status'] = delivery === 'cancelled' ? 'Cancelado'
    : delivery === 'delivered' ? 'Entregue'
    : delivery === 'delivering' ? 'Em entrega'
    : row.payment_status === 'verified' ? 'Em aprovação' : 'Pendente';
  const created = new Date(row.created_at);
  const verified = row.verified_at ? new Date(row.verified_at) : null;
  const emailFromName = row.customer_name?.match(/\(([^()\s]+@[^()\s]+)\)/)?.[1];
  return {
    id: row.id,
    orderNumber: `#${row.id.slice(-8)}`,
    customerName: row.customer_name?.split(' (')[0] || 'Cliente',
    customerEmail: row.contact_email || emailFromName || 'Não informado',
    robloxUsername: row.roblox_username || 'Não informado',
    productId: first?.productId,
    productName: first?.title ? `${first.title}${items.length > 1 ? ` + ${items.length - 1} item(ns)` : ''}` : 'Itens não registrados no pedido antigo',
    productCategory: first?.variant || '',
    productThumb: first?.image || '/images/hero_banner.jpg',
    variantName: first?.variant,
    priceUsd: Number(row.total_amount || 0),
    paymentMethod: row.payment_method || (row.customer_name?.includes('Pix') ? 'Pix' : 'Não informado'),
    paymentStatus: row.payment_status === 'verified' ? 'Confirmado' : 'Pendente',
    paymentId: row.id,
    paymentDate: verified ? verified.toLocaleString('pt-BR') : 'Não registrada',
    status,
    createdAt: created.toLocaleString('pt-BR'),
    createdAtIso: row.created_at,
    customerNotes: items.length ? items.map(item => `${item.quantity || 1}× ${item.title || 'Item'}${item.variant ? ` — ${item.variant}` : ''}`).join(', ') : undefined,
  };
}

export async function fetchDashboardOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('chat_sessions')
    .select('id,customer_name,contact_email,roblox_username,payment_method,payment_status,status,delivery_status,total_amount,created_at,verified_at,cart_items')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as SessionRow[]).map(toOrder);
}

export async function updateDashboardDelivery(orderId: string, status: 'delivering' | 'delivered' | 'cancelled'): Promise<void> {
  const changes: Record<string, string> = { delivery_status: status };
  if (status === 'cancelled') changes.status = 'closed';
  const { data, error } = await supabase.from('chat_sessions').update(changes).eq('id', orderId).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('O banco não confirmou a alteração do pedido.');
}

export interface DashboardMetrics {
  totalOrders: number;
  totalRevenueUsd: number;
  totalRevenueBrl: number;
  pendingOrders: number;
  approvalOrders: number;
  inDeliveryOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  uniqueCustomers: number;
  recentSales: { date: string; amount: number }[];
}

export function calculateDashboardMetrics(orders: Order[], exchangeRate: number, days: number): DashboardMetrics {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  const selected = orders.filter(order => order.createdAtIso && new Date(order.createdAtIso) >= start);
  const paid = selected.filter(order => order.paymentStatus === 'Confirmado' && order.status !== 'Cancelado');
  const totalRevenueUsd = paid.reduce((sum, order) => sum + order.priceUsd, 0);
  const sales = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    sales.set(day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 0);
  }
  paid.forEach(order => {
    const key = new Date(order.createdAtIso!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    sales.set(key, (sales.get(key) || 0) + order.priceUsd);
  });
  return {
    totalOrders: selected.length,
    totalRevenueUsd,
    totalRevenueBrl: totalRevenueUsd * exchangeRate,
    pendingOrders: selected.filter(order => order.status === 'Pendente').length,
    approvalOrders: selected.filter(order => order.status === 'Em aprovação').length,
    inDeliveryOrders: selected.filter(order => order.status === 'Em entrega').length,
    deliveredOrders: selected.filter(order => order.status === 'Entregue').length,
    cancelledOrders: selected.filter(order => order.status === 'Cancelado').length,
    uniqueCustomers: new Set(selected.map(order => order.customerEmail !== 'Não informado' ? order.customerEmail : order.customerName)).size,
    recentSales: [...sales].map(([date, amount]) => ({ date, amount })),
  };
}
