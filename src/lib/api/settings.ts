export interface TPlatformSettings {
  vatPercentage: number;
  restaurantCommissionPercentage: number;
  deliveryFeeBase: number;
  riderCommissionPercentage: number;
  freeDeliveryThreshold: number;
  updatedAt?: string;
}

export async function getPlatformSettings(): Promise<{ success: boolean; data?: TPlatformSettings; message?: string }> {
  try {
    const res = await fetch('/api/settings', {
      cache: 'no-store',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to fetch platform settings.',
    };
  }
}

export async function updatePlatformSettings(
  payload: Partial<TPlatformSettings>
): Promise<{ success: boolean; data?: TPlatformSettings; message?: string }> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
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
      message: err?.message || 'Failed to update platform settings.',
    };
  }
}
