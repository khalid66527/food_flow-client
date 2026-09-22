import { redirect } from "next/navigation";

export default function CustomerDeliveryHistoryRedirectPage() {
  redirect("/dashboard/customer/order-history");
}
