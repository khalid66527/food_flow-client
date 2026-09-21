export interface TCoupon {
  _id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  isFirstOrderOnly: boolean;
  expiryDate?: string;
  isActive: boolean;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TApplyCouponResponse {
  success: boolean;
  code?: string;
  discountAmount?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  isFirstOrderOnly?: boolean;
  message: string;
}

export async function getCoupons(
  mode?: 'active',
  userId?: string
): Promise<{ success: boolean; data?: TCoupon[]; message?: string }> {
  try {
    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    if (userId) params.append('userId', userId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/coupons${qs}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to fetch coupons.',
    };
  }
}

export async function createCoupon(payload: Partial<TCoupon>): Promise<{ success: boolean; data?: TCoupon; message?: string }> {
  try {
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to create coupon.',
    };
  }
}

export async function toggleCouponStatus(id: string, isActive: boolean): Promise<{ success: boolean; data?: TCoupon; message?: string }> {
  try {
    const res = await fetch('/api/coupons', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, isActive }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to toggle coupon status.',
    };
  }
}

export async function updateCoupon(
  id: string,
  payload: Partial<TCoupon>
): Promise<{ success: boolean; data?: TCoupon; message?: string }> {
  try {
    const res = await fetch('/api/coupons', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...payload }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to update coupon.',
    };
  }
}

export async function deleteCoupon(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/coupons?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to delete coupon.',
    };
  }
}

export async function applyCouponApi(
  code: string,
  userId: string,
  subtotal: number
): Promise<TApplyCouponResponse> {
  try {
    const res = await fetch('/api/coupons/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, userId, subtotal }),
    });
    const json = await res.json();
    return json as TApplyCouponResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to validate coupon code.',
    };
  }
}
