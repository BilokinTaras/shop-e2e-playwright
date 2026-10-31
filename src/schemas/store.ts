import { z } from 'zod';

/**
 * Response schemas for the Medusa 2.22 Store and Admin APIs, written from real responses of the
 * pinned version. Objects are loose: unknown fields are allowed, the fields tests rely on are required.
 */

export const MedusaErrorSchema = z.looseObject({
  type: z.string().optional(),
  message: z.string().min(1),
});
export type MedusaError = z.infer<typeof MedusaErrorSchema>;

const id = (prefix: string) => z.string().startsWith(`${prefix}_`);
const money = z.number().nonnegative();

export const CalculatedPriceSchema = z.looseObject({
  calculated_amount: money,
  original_amount: money,
  currency_code: z.string().length(3),
  is_calculated_price_tax_inclusive: z.boolean(),
});

export const VariantSchema = z.looseObject({
  id: id('variant'),
  title: z.string(),
  sku: z.string().nullable(),
  manage_inventory: z.boolean().optional(),
  allow_backorder: z.boolean().optional(),
  inventory_quantity: z.number().int().optional(),
  calculated_price: CalculatedPriceSchema.optional(),
});

export const ProductSchema = z.looseObject({
  id: id('prod'),
  title: z.string().min(1),
  handle: z.string().min(1),
  // Optional: absent when the request narrows `fields`.
  description: z.string().nullish(),
  thumbnail: z.string().nullish(),
  variants: z.array(VariantSchema).optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductListSchema = z.object({
  products: z.array(ProductSchema),
  count: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
});

export const RegionSchema = z.looseObject({
  id: id('reg'),
  name: z.string(),
  currency_code: z.string().length(3),
  countries: z.array(z.looseObject({ iso_2: z.string().length(2) })).optional(),
});
export const RegionListSchema = z.looseObject({
  regions: z.array(RegionSchema),
  count: z.number().int().nonnegative(),
});

export const AdjustmentSchema = z.looseObject({
  code: z.string().nullable().optional(),
  promotion_id: z.string().nullable().optional(),
  amount: money,
});

export const LineItemSchema = z.looseObject({
  id: id('cali'),
  variant_id: z.string().nullable(),
  quantity: z.number().int().positive(),
  unit_price: money,
  adjustments: z.array(AdjustmentSchema).optional(),
});

export const CartSchema = z.looseObject({
  id: id('cart'),
  region_id: z.string().nullable(),
  currency_code: z.string().length(3),
  email: z.string().nullable(),
  completed_at: z.string().nullable(),
  items: z.array(LineItemSchema),
  promotions: z.array(z.looseObject({ id: id('promo'), code: z.string().nullable() })).optional(),
  item_subtotal: money,
  item_total: money,
  discount_total: money,
  shipping_total: money,
  tax_total: money,
  original_total: money,
  total: money,
});
export type Cart = z.infer<typeof CartSchema>;
export const CartResponseSchema = z.object({ cart: CartSchema });

export const ShippingOptionSchema = z.looseObject({
  id: id('so'),
  name: z.string(),
  amount: money.optional(),
});
export const ShippingOptionListSchema = z.object({ shipping_options: z.array(ShippingOptionSchema) });

export const PaymentCollectionSchema = z.object({
  payment_collection: z.looseObject({ id: id('pay_col') }),
});

export const OrderSchema = z.looseObject({
  id: id('order'),
  display_id: z.number().int().positive(),
  status: z.string(),
  email: z.string().nullable(),
  currency_code: z.string().length(3),
  items: z
    .array(z.looseObject({ variant_id: z.string().nullable(), quantity: z.number(), unit_price: money }))
    .optional(),
  item_total: money,
  discount_total: money,
  shipping_total: money,
  tax_total: money,
  total: money,
});
export type Order = z.infer<typeof OrderSchema>;

export const CompleteCartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('order'), order: OrderSchema }),
  z.object({ type: z.literal('cart'), cart: CartSchema, error: z.looseObject({ message: z.string() }) }),
]);

export const OrderListSchema = z.looseObject({
  orders: z.array(OrderSchema),
  count: z.number().int().nonnegative(),
});

export const CustomerSchema = z.looseObject({
  id: id('cus'),
  email: z.email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  has_account: z.boolean(),
  addresses: z.array(z.unknown()).optional(),
});
export const CustomerResponseSchema = z.object({ customer: CustomerSchema });

export const TokenSchema = z.object({ token: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'JWT') });

export const PromotionSchema = z.looseObject({
  id: id('promo'),
  code: z.string(),
  status: z.string(),
  is_automatic: z.boolean(),
  application_method: z.looseObject({
    type: z.string(),
    value: z.number(),
    target_type: z.string().optional(),
  }),
});
export const PromotionResponseSchema = z.object({ promotion: PromotionSchema });

export const AdminProductResponseSchema = z.object({ product: ProductSchema });
export const AdminOrderResponseSchema = z.object({ order: OrderSchema });
export const DeleteResponseSchema = z.looseObject({ id: z.string(), deleted: z.literal(true) });
