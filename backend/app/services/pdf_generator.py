from datetime import date as date_type
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from io import BytesIO
from app.models.bill import Bill
from app.models.user import User
from app.models.consumption import Consumption
from typing import List

def generate_invoice_pdf(user: User, bill: Bill, consumptions: List[Consumption]) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = styles['Title']
    title_style.textColor = colors.HexColor("#1e293b") # Slate 800
    title_style.fontSize = 20
    title_style.alignment = 0 # Left align

    label_style = styles['Normal']
    label_style.fontSize = 9
    label_style.textColor = colors.HexColor("#64748b") # Slate 500

    value_style = styles['Normal']
    value_style.fontSize = 10
    value_style.textColor = colors.HexColor("#0f172a") # Slate 900
    value_style.fontName = 'Helvetica-Bold'

    elements = []

    # Header Row
    elements.append(Paragraph("DairyOS Invoice", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Period: {bill.month}", label_style))
    elements.append(Spacer(1, 24))

    # Info Grid (Customer & Bill Info)
    info_data = [
        [Paragraph("CUSTOMER DETAILS", label_style), Paragraph("INVOICE DETAILS", label_style)],
        [Paragraph(user.name, value_style), Paragraph(f"Invoice ID: {str(bill.id)[:8]}...", value_style)],
        [Paragraph(f"Phone: {user.phone or 'N/A'}", label_style), Paragraph(f"Issued On: {date_type.today()}", label_style)],
        [Paragraph(f"Email: {user.email or 'N/A'}", label_style), Paragraph(f"Status: {bill.status}", value_style)]
    ]
    info_table = Table(info_data, colWidths=[250, 250])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 32))

    # Table Data
    data = [[
        Paragraph('DATE', label_style),
        Paragraph('DESCRIPTION', label_style),
        Paragraph('QUANTITY', label_style),
        Paragraph('UNIT PRICE', label_style),
        Paragraph('SUBTOTAL', label_style)
    ]]

    for c in consumptions:
        subtotal = float(c.quantity) * float(user.price_per_liter)
        data.append([
            str(c.date),
            'Fresh Milk Consumption',
            f"{c.quantity} L",
            f"₹{user.price_per_liter}/L",
            f"₹{subtotal:.2f}"
        ])

    # Grand Total
    data.append(['', '', '', Paragraph('TOTAL AMOUNT', value_style), Paragraph(f"₹{bill.total_amount:.2f}", value_style)])

    # Table Style
    table = Table(data, colWidths=[80, 160, 80, 100, 80])
    table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#e2e8f0")), # Border Bottom Header
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'), # Right align quantity and amounts
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#475569")),
        ('GRID', (0, 0), (-1, -2), 0.1, colors.HexColor("#f1f5f9")), # Subtle grid
        ('LINEABOVE', (3, -1), (-1, -1), 1, colors.HexColor("#1e293b")), # Total separator
    ]))

    elements.append(table)
    elements.append(Spacer(1, 40))

    # Footer
    footer_style = styles['Normal']
    footer_style.fontSize = 8
    footer_style.alignment = 1 # Center
    footer_style.textColor = colors.grey

    elements.append(Paragraph("This is a computer generated invoice. No signature required.", footer_style))
    elements.append(Paragraph("Powered by DairyOS Enterprise v1.0", footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
