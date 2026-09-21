import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TOrder } from "@/types/order";

async function getLogoBase64(): Promise<string | null> {
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = "/foodNav.png";
    });
  } catch {
    return null;
  }
}

export async function downloadInvoicePdf(order: TOrder) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = [255, 107, 53]; // #FF6B35 CraveYard FoodFlow Primary Orange
    const darkColor = [30, 41, 59]; // Slate 800
    const lightGray = [248, 250, 252]; // Slate 50

    const displayId = order.orderId || order._id || order.id || "INVOICE";

    // Header Banner (Primary Orange)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 36, "F");

    // Load FoodFlow Official Logo
    const logoDataUrl = await getLogoBase64();
    let textStartX = 14;
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, 7, 20, 20, 3, 3, "F");
        doc.addImage(logoDataUrl, "PNG", 15, 8, 18, 18);
        textStartX = 38;
      } catch {
        textStartX = 14;
      }
    }

    // Brand Title (FOODFLOW)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("FOODFLOW", textStartX, 17);

    // Sub-text / Tagline
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text("Official Order Invoice & Voucher", textStartX, 25);

    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

    const deliveredDate = order.deliveredAt
      ? new Date(order.deliveredAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "Pending / In Transit";

    const paymentText =
      order.paymentMethod === "STRIPE" ? "Online (Stripe)" : "COD";

    // Invoice Meta Right Aligned
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`INVOICE #${displayId}`, 196, 14, { align: "right" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formattedDate}`, 196, 20, { align: "right" });
    doc.text(`Payment: ${paymentText}`, 196, 26, { align: "right" });

    // Section 1: Customer & Restaurant/Rider Details Card (Rounded Border Box)
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(14, 40, 182, 48, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 40, 182, 48, 3, 3, "D");

    // Left column: Customer Info
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("CUSTOMER DETAILS", 20, 48);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const addr = order.deliveryAddress;
    const recipientName = addr?.fullName || order.userName || "Valued Customer";
    const phone = addr?.phoneNumber || "N/A";
    const fullAddrStr = addr
      ? [addr.streetAddress, addr.area, (addr as any)?.city, addr.postalCode]
          .filter(Boolean)
          .join(", ")
      : "Standard Delivery Address";

    doc.text(`Recipient Name: ${recipientName}`, 20, 54);
    doc.text(`Phone: ${phone}`, 20, 59);
    const splitAddr = doc.splitTextToSize(`Delivery Address: ${fullAddrStr}`, 85);
    doc.text(splitAddr, 20, 64);

    // Right column: Restaurant & Rider Info
    const primaryRestaurant =
      order.items?.[0]?.restaurantName || "CraveYard Partner Kitchen";
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("RESTORANT & RIDER", 110, 48);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`Store Name: ${primaryRestaurant}`, 110, 54);
    const riderName = order.riderInfo?.name
      ? `${order.riderInfo.name} (${order.riderInfo.phone || "No phone"})`
      : "FoodFlow Express Delivery";
    doc.text(`Delivery Partner: ${riderName}`, 110, 59);

    // Status Pill Badge (STATUS: DELIVERED & PAID)
    const isDelivered = (order.orderStatus || "").toLowerCase() === "delivered";
    const isPaid =
      (order.paymentStatus || "").toLowerCase() === "paid" ||
      order.paymentMethod === "STRIPE" ||
      isDelivered;

    if (isDelivered && isPaid) {
      doc.setFillColor(16, 185, 129); // Emerald green
      doc.roundedRect(110, 63, 78, 7, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("STATUS: DELIVERED & PAID", 149, 68, { align: "center" });
    } else {
      doc.setFillColor(245, 158, 11); // Amber
      doc.roundedRect(110, 63, 78, 7, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`STATUS: ${(order.orderStatus || "PROCESSING").toUpperCase()}`, 149, 68, {
        align: "center",
      });
    }

    // Bottom Bar Inside Details Card: Timestamps (Order Placed & Delivered At)
    doc.setDrawColor(226, 232, 240);
    doc.line(18, 74, 192, 74);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("Order Placed: ", 20, 81);
    doc.setFont("helvetica", "normal");
    doc.text(`${formattedDate}`, 42, 81);

    doc.setFont("helvetica", "bold");
    doc.text("Delivered At: ", 110, 81);
    doc.setFont("helvetica", "normal");
    doc.text(`${deliveredDate}`, 132, 81);

    // Section 2: Items Table with Orange Header & Clean Borders
    const tableBody = (order.items || []).map((item, idx) => {
      const unitPrice = item.discountPrice || item.price || 0;
      const qty = item.quantity || 1;
      const lineTotal = unitPrice * qty;
      return [
        (idx + 1).toString(),
        item.name,
        item.restaurantName || primaryRestaurant,
        qty.toString(),
        `Tk ${unitPrice.toFixed(2)}`,
        `Tk ${lineTotal.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: 92,
      head: [
        ["#", "Food Item Description", "Restaurant / Kitchen", "Qty", "Unit Price", "Total Price"],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [255, 107, 53], // #FF6B35 Orange
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 45 },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 27, halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    // Final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Financial Summaries Breakdown
    let itemsSubtotal = 0;
    (order.items || []).forEach((i) => {
      itemsSubtotal += (i.discountPrice || i.price || 0) * (i.quantity || 1);
    });

    const subtotal = order.subtotal || itemsSubtotal;
    const deliveryFee = order.deliveryFee || 0;
    const platformFee = order.platformFee || 0;
    const deliveryAndPlatform = deliveryFee + platformFee;
    const vat = order.vatAmount || 0;
    const discount = order.discount || 0;
    const couponCode = order.couponCode || null;
    const grandTotal = order.totalAmount || (subtotal + deliveryAndPlatform + vat - discount);

    // Section 3: Financial Summary Box (Right Aligned Box)
    const boxHeight = discount > 0 ? 50 : 44;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(115, finalY + 6, 81, boxHeight, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(115, finalY + 6, 81, boxHeight, 2, 2, "D");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    let currY = finalY + 13;
    doc.text("Items Subtotal:", 120, currY);
    doc.text(`Tk ${subtotal.toFixed(2)}`, 190, currY, { align: "right" });

    currY += 5.5;
    doc.text("Delivery & Platform Fee:", 120, currY);
    doc.text(
      deliveryAndPlatform === 0 ? "FREE" : `Tk ${deliveryAndPlatform.toFixed(2)}`,
      190,
      currY,
      { align: "right" }
    );

    currY += 5.5;
    doc.text("Vat Amount:", 120, currY);
    doc.text(`Tk ${vat.toFixed(2)}`, 190, currY, { align: "right" });

    if (discount > 0) {
      currY += 5.5;
      doc.setTextColor(220, 38, 38); // Crimson for minus discount
      const couponLabel = couponCode ? `Coupon Discount (${couponCode}):` : "Coupon Discount:";
      doc.text(couponLabel, 120, currY);
      doc.text(`-Tk ${discount.toFixed(2)}`, 190, currY, { align: "right" });
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(120, currY + 3, 190, currY + 3);

    currY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); // Highlighted Orange
    doc.text("Grand Total:", 120, currY);
    doc.text(`Tk ${grandTotal.toFixed(2)}`, 190, currY, { align: "right" });

    // Payment Note Left Side
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (!isPaid) {
      doc.text(
        "* Cash on Delivery order. Please hand exact cash amount to rider upon delivery.",
        14,
        finalY + 14
      );
    } else {
      doc.text(
        "* Payment verified & received. Thank you for choosing CraveYard FoodFlow!",
        14,
        finalY + 14
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
      "CraveYard FoodFlow Platform • Support: support.foodflow@gmail.com • www.foodflow.com",
      105,
      pageHeight - 10,
      { align: "center" }
    );

    doc.save(`FoodFlow_Invoice_${displayId}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF invoice:", error);
    alert("Could not generate invoice PDF. Please try again.");
  }
}

