import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TOrder } from "@/types/order";

export async function downloadInvoicePdf(order: TOrder) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = [255, 107, 53]; // #FF6B35 FoodFlow Primary Orange
    const darkColor = [30, 41, 59]; // Slate 800
    const lightGray = [248, 250, 252]; // Slate 50

    // Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 36, "F");

    // Brand Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("FOODFLOW", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Official Order Invoice & Voucher", 14, 25);

    // Invoice Meta Right Aligned
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`INVOICE #${order.orderId}`, 196, 16, { align: "right" });

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleDateString();

    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, 196, 22, { align: "right" });
    doc.text(`Payment: ${order.paymentMethod}`, 196, 28, { align: "right" });

    // Section 1: Customer & Delivery Address Card
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(14, 44, 182, 38, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 44, 182, 38, 3, 3, "D");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text("Delivery & Recipient Details", 20, 52);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    const addr = order.deliveryAddress;
    const recipientName = addr?.fullName || order.userName || "Customer";
    const phone = addr?.phoneNumber || "N/A";
    const fullAddrStr = addr
      ? `${addr.streetAddress || ""}, ${addr.area || ""}${
          addr.postalCode ? ` - ${addr.postalCode}` : ""
        }`
      : "Standard Address";

    doc.text(`Recipient: ${recipientName}`, 20, 60);
    doc.text(`Phone: ${phone}`, 20, 66);
    doc.text(`Address: ${fullAddrStr}`, 20, 72);

    // Restaurant details if available
    const primaryRestaurant = order.items?.[0]?.restaurantName || "FoodFlow Partner Kitchen";
    doc.text(`Restaurant: ${primaryRestaurant}`, 110, 60);

    // Payment & Delivery Status Pill
    const isDelivered = (order.orderStatus || "").toLowerCase() === "delivered";
    if (isDelivered) {
      doc.setFillColor(16, 185, 129); // Emerald
      doc.roundedRect(110, 66, 72, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("STATUS: DELIVERED & PAID", 146, 71.5, { align: "center" });
    } else {
      doc.setFillColor(245, 158, 11); // Amber
      doc.roundedRect(110, 66, 76, 8, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("STATUS: PENDING DELIVERY", 148, 71.5, { align: "center" });
    }

    // Section 2: Items Table
    const tableBody = (order.items || []).map((item, idx) => {
      const unitPrice = item.discountPrice || item.price;
      const lineTotal = unitPrice * item.quantity;
      return [
        (idx + 1).toString(),
        item.name,
        item.restaurantName || primaryRestaurant,
        `Tk ${unitPrice.toFixed(2)}`,
        item.quantity.toString(),
        `Tk ${lineTotal.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: 90,
      head: [["#", "Item Description", "Restaurant", "Unit Price", "Qty", "Total"]],
      body: tableBody,
      theme: "striped",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9.5,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 65 },
        2: { cellWidth: 45 },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 25, halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    // Final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Financial Summary Table / Card
    const subtotal = order.subtotal || order.totalAmount - (order.deliveryFee || 0);
    const deliveryFee = order.deliveryFee || 0;
    const discount = order.discount || 0;
    const grandTotal = order.totalAmount || subtotal + deliveryFee - discount;
    const isPaid = (order.paymentStatus || "").toLowerCase() === "paid" || order.paymentMethod === "STRIPE";

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, finalY + 8, 76, 38, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(120, finalY + 8, 76, 38, 2, 2, "D");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    doc.text("Subtotal:", 125, finalY + 16);
    doc.text(`Tk ${subtotal.toFixed(2)}`, 190, finalY + 16, { align: "right" });

    doc.text("Delivery Fee:", 125, finalY + 22);
    doc.text(deliveryFee === 0 ? "FREE" : `Tk ${deliveryFee.toFixed(2)}`, 190, finalY + 22, {
      align: "right",
    });

    if (discount > 0) {
      doc.text("Discount:", 125, finalY + 28);
      doc.text(`-Tk ${discount.toFixed(2)}`, 190, finalY + 28, { align: "right" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Grand Total:", 125, finalY + 38);
    doc.text(`Tk ${grandTotal.toFixed(2)}`, 190, finalY + 38, { align: "right" });

    // Note for COD / Payment
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    if (!isPaid) {
      doc.text(
        "* Note: For Cash on Delivery, please hand exact cash to the rider upon package arrival.",
        14,
        finalY + 20
      );
    } else {
      doc.text(
        "* Thank you for ordering with FoodFlow Online Payment. Your order is confirmed!",
        14,
        finalY + 20
      );
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 16, 196, pageHeight - 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "FoodFlow Platform • Support: support.foodflow@gmail.com • www.foodflow.com",
      105,
      pageHeight - 10,
      { align: "center" }
    );

    doc.save(`FoodFlow_Invoice_${order.orderId}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF invoice:", error);
    alert("Could not generate invoice PDF. Please try again.");
  }
}
