import type { APIRequestContext } from '@playwright/test';

import {
  CartResponseSchema,
  CompleteCartSchema,
  CustomerResponseSchema,
  OrderListSchema,
  PaymentCollectionSchema,
  ProductListSchema,
  RegionListSchema,
  ShippingOptionListSchema,
} from '../schemas/store';
import { BaseClient } from './base-client';

export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}

/** Medusa Store API. Every request carries the publishable key; customer calls add a bearer token. */
export class StoreClient extends BaseClient {
  constructor(request: APIRequestContext, baseUrl: string, publishableKey: string, customerToken?: string) {
    super(request, baseUrl, {
      'x-publishable-api-key': publishableKey,
      ...(customerToken ? { authorization: `Bearer ${customerToken}` } : {}),
    });
  }

  /** Same key, acting as a signed-in customer. */
  asCustomer(token: string): StoreClient {
    return new StoreClient(
      this.request,
      this.baseUrl,
      this.defaultHeaders['x-publishable-api-key'] ?? '',
      token,
    );
  }

  listProducts(params: Record<string, string | number | string[] | undefined> = {}) {
    return this.call(ProductListSchema, 'GET', '/store/products', { params });
  }

  async productByHandle(handle: string, regionId: string) {
    const { products } = await this.listProducts({
      handle,
      region_id: regionId,
      fields: '*variants.calculated_price,+variants.inventory_quantity',
    });
    const product = products[0];
    if (!product) throw new Error(`Product with handle ${handle} not found`);
    return product;
  }

  listRegions() {
    return this.call(RegionListSchema, 'GET', '/store/regions');
  }

  async createCart(regionId: string, extra: Record<string, unknown> = {}) {
    return (
      await this.call(CartResponseSchema, 'POST', '/store/carts', { data: { region_id: regionId, ...extra } })
    ).cart;
  }

  async getCart(cartId: string) {
    return (await this.call(CartResponseSchema, 'GET', `/store/carts/${cartId}`)).cart;
  }

  async updateCart(cartId: string, data: Record<string, unknown>) {
    return (await this.call(CartResponseSchema, 'POST', `/store/carts/${cartId}`, { data })).cart;
  }

  async addItem(cartId: string, variantId: string, quantity: number) {
    return (
      await this.call(CartResponseSchema, 'POST', `/store/carts/${cartId}/line-items`, {
        data: { variant_id: variantId, quantity },
      })
    ).cart;
  }

  async updateItem(cartId: string, lineId: string, quantity: number) {
    return (
      await this.call(CartResponseSchema, 'POST', `/store/carts/${cartId}/line-items/${lineId}`, {
        data: { quantity },
      })
    ).cart;
  }

  async applyPromotions(cartId: string, codes: string[]) {
    return (
      await this.call(CartResponseSchema, 'POST', `/store/carts/${cartId}/promotions`, {
        data: { promo_codes: codes },
      })
    ).cart;
  }

  async removePromotions(cartId: string, codes: string[]) {
    return (
      await this.call(CartResponseSchema, 'DELETE', `/store/carts/${cartId}/promotions`, {
        data: { promo_codes: codes },
      })
    ).cart;
  }

  async shippingOptions(cartId: string) {
    return (
      await this.call(ShippingOptionListSchema, 'GET', '/store/shipping-options', {
        params: { cart_id: cartId },
      })
    ).shipping_options;
  }

  async addShippingMethod(cartId: string, optionId: string) {
    return (
      await this.call(CartResponseSchema, 'POST', `/store/carts/${cartId}/shipping-methods`, {
        data: { option_id: optionId },
      })
    ).cart;
  }

  /** Payment with Medusa's built-in system provider (no external payment service). */
  async initSystemPayment(cartId: string) {
    const { payment_collection } = await this.call(
      PaymentCollectionSchema,
      'POST',
      '/store/payment-collections',
      {
        data: { cart_id: cartId },
      },
    );
    await this.raw('POST', `/store/payment-collections/${payment_collection.id}/payment-sessions`, {
      data: { provider_id: 'pp_system_default' },
    });
    return payment_collection.id;
  }

  completeCart(cartId: string) {
    return this.call(CompleteCartSchema, 'POST', `/store/carts/${cartId}/complete`);
  }

  async me() {
    return (await this.call(CustomerResponseSchema, 'GET', '/store/customers/me')).customer;
  }

  async createCustomerProfile(data: { email: string; first_name: string; last_name: string }) {
    return (await this.call(CustomerResponseSchema, 'POST', '/store/customers', { data })).customer;
  }

  async updateMe(data: Record<string, unknown>) {
    return (await this.call(CustomerResponseSchema, 'POST', '/store/customers/me', { data })).customer;
  }

  listOrders() {
    return this.call(OrderListSchema, 'GET', '/store/orders', { params: { fields: '+email' } });
  }
}
