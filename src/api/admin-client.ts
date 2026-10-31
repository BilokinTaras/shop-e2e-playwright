import type { APIRequestContext } from '@playwright/test';

import {
  AdminOrderResponseSchema,
  AdminProductResponseSchema,
  DeleteResponseSchema,
  PromotionResponseSchema,
} from '../schemas/store';
import { BaseClient } from './base-client';

export interface NewPromotion {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  currencyCode?: string;
  targetType?: 'order' | 'items' | 'shipping_methods';
  allocation?: 'each' | 'across';
}

export interface NewProduct {
  title: string;
  handle: string;
  salesChannelId: string;
  shippingProfileId?: string;
  prices: { currency_code: string; amount: number }[];
}

/** Medusa Admin API with a bearer token of an admin user. */
export class AdminClient extends BaseClient {
  constructor(request: APIRequestContext, baseUrl: string, token: string) {
    super(request, baseUrl, { authorization: `Bearer ${token}` });
  }

  async createPromotion(p: NewPromotion) {
    return (
      await this.call(PromotionResponseSchema, 'POST', '/admin/promotions', {
        data: {
          code: p.code,
          type: 'standard',
          status: 'active',
          is_automatic: false,
          application_method: {
            type: p.type,
            value: p.value,
            target_type: p.targetType ?? 'order',
            ...(p.allocation ? { allocation: p.allocation } : {}),
            ...(p.currencyCode ? { currency_code: p.currencyCode } : {}),
          },
        },
      })
    ).promotion;
  }

  async getPromotion(id: string) {
    return (await this.call(PromotionResponseSchema, 'GET', `/admin/promotions/${id}`)).promotion;
  }

  deletePromotion(id: string) {
    return this.call(DeleteResponseSchema, 'DELETE', `/admin/promotions/${id}`);
  }

  async createProduct(p: NewProduct) {
    return (
      await this.call(AdminProductResponseSchema, 'POST', '/admin/products', {
        data: {
          title: p.title,
          handle: p.handle,
          status: 'published',
          ...(p.shippingProfileId ? { shipping_profile_id: p.shippingProfileId } : {}),
          sales_channels: [{ id: p.salesChannelId }],
          options: [{ title: 'Default option', values: ['Default option value'] }],
          variants: [
            {
              title: 'Default',
              manage_inventory: false,
              options: { 'Default option': 'Default option value' },
              prices: p.prices,
            },
          ],
        },
      })
    ).product;
  }

  deleteProduct(id: string) {
    return this.call(DeleteResponseSchema, 'DELETE', `/admin/products/${id}`);
  }

  async getOrder(id: string) {
    // The admin order endpoint omits email and currency by default; ask for them explicitly.
    return (
      await this.call(AdminOrderResponseSchema, 'GET', `/admin/orders/${id}`, {
        params: { fields: '+email,+currency_code,*items' },
      })
    ).order;
  }
}
